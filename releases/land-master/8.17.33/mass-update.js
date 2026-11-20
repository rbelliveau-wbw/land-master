(function(root){
  'use strict';
  // Same native updateRecords contract as Tax Parcel Management. This adapter
  // reuses Land's field, relationship, acknowledgement and request helpers.
  function create(ctx){
    const uncertain=new Set();let active=false;
    const copy=value=>JSON.parse(JSON.stringify(value));
    const valid=id=>typeof id==='string'&&/^\d+$/.test(id);
    const issue=message=>Object.assign(new Error(message),{uncertain:true,noReplay:true});
    async function exact(report,ids,check){
      const result=new Map();
      for(let offset=0;offset<ids.length;offset+=25){
        const part=ids.slice(offset,offset+25);check();
        const rows=await ctx.read(report,'('+part.map(id=>'(ID == '+id+')').join(' || ')+')',check);check();
        if(rows.length!==part.length||new Set(rows.map(row=>row.ID)).size!==part.length||rows.some(row=>!part.includes(row.ID)||result.has(row.ID)))throw new Error('A selected record or lookup is unavailable. Refresh before editing.');
        rows.forEach(row=>result.set(row.ID,row));
      }
      return result;
    }
    async function preflight(type,entries,check){
      if(type!=='property')return;
      entries.forEach(entry=>ctx.prepare(entry.record,entry.payload));
      const linked=entries.filter(entry=>root.LMPropertyLots.id(root.LMPropertyLots.merged(entry.record,entry.payload).Lots));
      const lotIds=[...new Set(linked.map(entry=>root.LMPropertyLots.id(root.LMPropertyLots.merged(entry.record,entry.payload).Lots)))];
      if(lotIds.some(id=>!valid(id)))throw new Error('Select a valid Lot Code.');
      if(!lotIds.length)return;
      const lots=await exact('All_Lots_All_Fields',lotIds,check);
      const subIds=[...new Set([...lots.values()].map(lot=>root.LMPropertyLots.id(lot.Subdivision)))];
      if(subIds.some(id=>!valid(id)))throw new Error('The lot must have a valid Subdivision lookup.');
      const subs=await exact('All_Subdivisions',subIds,check);
      linked.forEach(entry=>{const draft=root.LMPropertyLots.merged(entry.record,entry.payload),lot=lots.get(root.LMPropertyLots.id(draft.Lots));const message=root.LMPropertyLots.error(draft,lot,subs.get(root.LMPropertyLots.id(lot.Subdivision)));if(message)throw new Error(message);});
    }
    function acknowledge(response,entries){
      const outer=response&&typeof response==='object'&&!Array.isArray(response)?Object.assign({},response):null;
      if(outer)delete outer.result;
      if(!outer||String(outer.code)!=='3000'||ctx.failed(outer)||Object.hasOwn(outer,'data')||!Array.isArray(response.result)||response.result.length!==entries.length)throw issue('Creator did not confirm the exact batch count. Review saved records before another update.');
      const ids=new Set(entries.map(entry=>entry.id)),seen=new Set();
      for(const item of response.result){const id=item&&item.data&&item.data.ID;if(!valid(id)||!ids.has(id)||seen.has(id)||Object.hasOwn(item,'result'))throw issue('Creator returned conflicting batch destinations. Review saved records before another update.');seen.add(id);}
      return new Map(response.result.map(item=>[item.data.ID,item]));
    }
    async function run(input){
      if(active)throw new Error('A mass update is already running.');
      const scope=ctx.scope(),ids=input.ids.slice(),type=input.type,report=input.report,payload=copy(input.payload);
      if(!ids.length||ids.some(id=>ctx.demo()?typeof id!=='string'||!id:!valid(id))||new Set(ids).size!==ids.length)throw new Error('Select valid, distinct records.');
      if(ids.some(id=>uncertain.has(scope+':'+report+':'+id)))throw new Error('An earlier update needs review. Check saved records and refresh before another update.');
      const entries=ids.map(id=>{const record=ctx.record(type,id);if(!record)throw new Error('A selected record is unavailable.');return {id,record:copy(record),payload:copy(payload),state:'not-sent',error:null};});
      const ledger={type,report,entries,stage:'checking',finished:false};
      const check=()=>{if(ctx.scope()!==scope||!ctx.ready())throw new Error('The session or loaded records changed. Review saved records before another update.');};
      const publish=()=>ctx.progress(ledger);
      active=true;
      try{
        publish();check();if(!ctx.demo()&&typeof ctx.api().updateRecords!=='function')throw new Error('Creator batch update is unavailable. Refresh and try again.');
        if(!ctx.demo())await preflight(type,entries,check);else if(type==='property')entries.forEach(entry=>ctx.prepare(entry.record,entry.payload));check();
        const grouped=new Map();entries.forEach(entry=>{const key=JSON.stringify(entry.payload);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(entry);});
        ledger.stage='saving';publish();let stop=false;
        for(const values of grouped.values()){
          for(let offset=0;offset<values.length&&!stop;offset+=200){
            const group=values.slice(offset,offset+200);let dispatched=false;
            try{
              check();group.forEach(entry=>{entry.state='saving';});publish();
              const response=ctx.demo()?{code:3000,result:group.map(entry=>({code:3000,data:{ID:entry.id}}))}:await ctx.request('mass-update:'+report,()=>{check();dispatched=true;return ctx.api().updateRecords({report_name:report,payload:{criteria:group.map(entry=>'(ID == '+entry.id+')').join(' || '),data:copy(group[0].payload)}});});
              check();const outcomes=ctx.demo()?new Map(response.result.map(item=>[item.data.ID,item])):acknowledge(response,group);
              group.forEach(entry=>{const item=outcomes.get(entry.id);try{if(!ctx.demo())ctx.accept(item,entry.id);entry.state='saved';ctx.saved(type,entry.id,entry.payload);}catch(error){entry.error=error;if(/^(1060|2894|2897|2898|2899|2945|3001)$/.test(String(item.code))){entry.state='rejected';}else{entry.state='unknown';uncertain.add(scope+':'+report+':'+entry.id);stop=true;}}});
            }catch(error){group.forEach(entry=>{entry.state=dispatched?'unknown':'not-sent';entry.error=error;if(dispatched)uncertain.add(scope+':'+report+':'+entry.id);});stop=true;}
            publish();
          }
          if(stop)break;
        }
        // Native acknowledgements prove identities/counts. Refresh display data
        // without comparing editable values or invalidating accepted saves.
        const saved=entries.filter(entry=>entry.state==='saved');
        if(saved.length&&!ctx.demo()){
          ledger.stage='refreshing';publish();
          try{const rows=await exact(report,saved.map(entry=>entry.id),check);check();ctx.refreshed(type,rows);}catch(error){ledger.refreshError=error.message;}
        }
      }catch(error){ledger.error=error.message;entries.forEach(entry=>{if(entry.state==='not-sent')entry.error=error;});}
      finally{ledger.finished=true;ledger.stage='complete';active=false;publish();}
      return ledger;
    }
    return Object.freeze({run});
  }
  root.LMMassUpdate={create};
})(window);
