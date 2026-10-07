// Exact captured lot-field updates. Native Creator workflows remain authoritative.
(function(root){
  'use strict';
  const fields=Object.freeze([
    {key:'Builder1',label:'Builder',type:'lookup'},
    {key:'Lot_Size',label:'Size (ft)',type:'integer'},
    {key:'Base_Price',label:'Base price',type:'money'},
    {key:'Earnest_Money',label:'Earnest money',type:'money'},
    {key:'Appraised_Value',label:'Appraised Value',type:'money'},
    {key:'Additional_Tax',label:'Additional tax',type:'money'},
    {key:'Address',label:'Address',type:'text'},
    {key:'Notes',label:'Notes',type:'text'},
    {key:'On_Hold',label:'On hold',type:'boolean'}
  ]),own=(row,key)=>!!row&&Object.prototype.hasOwnProperty.call(row,key),safeId=id=>typeof id==='string'&&/^\d+$/.test(id);
  function meta(key){const field=fields.find(field=>field.key===key);if(!field)throw new Error('This lot field is not editable.');return field;}
  function value(key,raw){
    const field=meta(key);
    if(field.type==='lookup'){const ids=root.LMManageLots.relation(raw);if(ids.length>1)throw new Error('Choose one builder.');return ids[0]||'';}
    if(field.type==='boolean'){if(raw===true||raw==='true')return true;if(raw===false||raw==='false')return false;throw new Error('Choose an On hold value.');}
    if(field.type==='text'){if(raw==null)return '';if(typeof raw!=='string')throw new Error('Unreadable '+field.label+'.');return raw;}
    const text=root.LMTakedownModel.decimal(raw);
    if(field.type==='integer'&&text!==''&&!/^\d+$/.test(text))throw new Error('Size must be a nonnegative whole number of feet.');
    return text;
  }
  function payload(changes){
    if(!changes||typeof changes!=='object'||Array.isArray(changes)||!Object.keys(changes).length)throw new Error('Choose at least one field to update.');
    return Object.fromEntries(Object.keys(changes).map(key=>{const normalized=value(key,changes[key]),field=meta(key);return [key,field.type==='money'||field.type==='integer'?normalized===''?null:root.LMTakedownModel.inputNumber(normalized):field.type==='lookup'?normalized||null:normalized];}));
  }
  function matches(row,expected){return Object.keys(expected).every(key=>own(row,key)&&value(key,row[key])===value(key,expected[key]));}
  function editable(row){return row&&safeId(row.ID)&&(row.Archived===false||row.Archived==='false');}
  function freeze(object){if(object&&typeof object==='object'){Object.values(object).forEach(freeze);Object.freeze(object);}return object;}
  function create(options){
    let run=null,busy=false,nativePending=0,readPending=0;
    const emit=()=>{if(options.changed)options.changed(run);};
    const check=operation=>{if(!options.ready()||!operation.context||options.context()!==operation.context||options.generation()!==operation.generation)throw new Error('The Creator session changed. Refresh before editing.');};
    function bounded(promise){return new Promise((resolve,reject)=>{let ended=false;const timer=root.setTimeout(()=>{if(ended)return;ended=true;reject(new Error('The request timed out. Saved values need review.'));},options.timeoutMs||30000);Promise.resolve(promise).then(result=>{if(ended)return;ended=true;root.clearTimeout(timer);resolve(result);},error=>{if(ended)return;ended=true;root.clearTimeout(timer);reject(error);});});}
    async function read(ids,operation){
      check(operation);readPending++;emit();
      const request=Promise.resolve().then(()=>options.read(ids,()=>options.context()!==operation.context||options.generation()!==operation.generation));
      request.then(()=>{readPending--;emit();},()=>{readPending--;emit();});
      const rows=await bounded(request);check(operation);
      if(rows.length!==ids.length||new Set(rows.map(row=>row.ID)).size!==ids.length||rows.some(row=>!safeId(row.ID)||!ids.includes(row.ID)))throw new Error('A selected lot is missing or inaccessible. Refresh before editing.');
      return rows;
    }
    function capture(rows,changes){
      if(busy||nativePending||readPending||run&&run.rows.some(row=>row.state==='unknown'))throw new Error('Finish checking the previous lot update.');
      const data=payload(changes),keys=Object.keys(data),seen=new Set();
      if(data.Builder1&&(!options.allowedBuilder||!options.allowedBuilder(data.Builder1)))throw new Error('Choose a record with Type Builder.');
      if(!Array.isArray(rows)||!rows.length)throw new Error('Select lots to update.');
      const entries=rows.map(row=>{
        if(!editable(row)||seen.has(row.ID))throw new Error('A selected lot is archived, missing or duplicated.');seen.add(row.ID);
        const sub=root.LMManageLots.relation(row.Subdivision);if(sub.length!==1)throw new Error('A selected lot has no subdivision.');
        if(!keys.every(key=>own(row,key)))throw new Error('Selected lot fields are incomplete. Refresh before editing.');
        return {id:row.ID,label:row.Lot_Code||'Lot '+row.Lot_Number,subdivisionId:sub[0],before:Object.fromEntries(keys.map(key=>[key,row[key]])),payload:{...data}};
      });
      const operation=freeze({context:options.context(),generation:options.generation(),entries:JSON.parse(JSON.stringify(entries))});check(operation);return operation;
    }
    function sameScope(row,entry){const sub=root.LMManageLots.relation(row.Subdivision);return editable(row)&&sub.length===1&&sub[0]===entry.subdivisionId;}
    async function verify(entry,operation){const rows=await read([entry.id],operation),row=rows[0];if(!sameScope(row,entry)||!matches(row,entry.payload))throw new Error('Saved lot values could not be confirmed.');options.publish(row);entry.state='verified';entry.message='Saved and checked';emit();return row;}
    async function commit(operation){
      if(busy||nativePending||readPending||run&&run.rows.some(row=>row.state==='unknown'))throw new Error('Finish checking the previous lot update.');check(operation);
      busy=true;run={operation,stage:'checking',checked:false,finished:false,error:'',rows:operation.entries.map(entry=>({...entry,state:'not-sent',message:'Up next'}))};emit();
      try{
        const builder=operation.entries[0].payload.Builder1;
        if(builder){if(!options.validateBuilder)throw new Error('Builder choices need a refresh.');await bounded(options.validateBuilder(builder));check(operation);}
        const all=[];for(let start=0;start<run.rows.length;start+=30)all.push(...await read(run.rows.slice(start,start+30).map(row=>row.id),operation));
        const byId=new Map(all.map(row=>[row.ID,row]));
        for(const entry of run.rows){const row=byId.get(entry.id);if(!sameScope(row,entry)||!matches(row,entry.before))throw new Error(entry.label+' changed since you opened the editor. No lots were updated.');}
        run.checked=true;run.stage='saving';emit();let next=0,stop=false;
        async function worker(){
          while(!stop&&next<run.rows.length){
            const entry=run.rows[next++];let sent=false,allowDispatch=true;
            try{
              check(operation);
              if(matches(byId.get(entry.id),entry.payload)){options.publish(byId.get(entry.id));entry.state='verified';entry.message='Already matches';emit();continue;}
              entry.state='saving';entry.message='Saving';emit();
              const request=root.LMData.request('manage-lots:update',()=>{
                if(!allowDispatch)throw new Error('This queued update expired before sending.');
                check(operation);sent=true;nativePending++;emit();
                const native=Promise.resolve().then(()=>root.ZOHO.CREATOR.DATA.updateRecordById({report_name:options.report,id:entry.id,payload:{data:entry.payload}}));
                native.then(()=>{nativePending--;emit();},()=>{nativePending--;emit();});return native;
              });
              const response=await bounded(request),id=root.LMManageLots.confirmedId(response);if(id!==entry.id)throw new Error('Creator returned another lot.');
              entry.state='checking';entry.message='Checking saved values';emit();await verify(entry,operation);
            }catch(error){stop=true;const raw=error.raw||error.response||error,rejected=raw&&/^(1060|2894|2898|2899|2945)$/.test(String(raw.code))&&!['data','result','details','response','output','ID','id'].some(key=>own(raw,key));entry.state=sent?rejected?'rejected':'unknown':'not-sent';entry.message=error.message||'Update needs review';run.error=entry.message;if(options.error)options.error(error,entry);emit();}
            finally{allowDispatch=false;}
          }
        }
        await Promise.all(Array.from({length:Math.min(3,run.rows.length)},worker));
      }catch(error){run.error=error.message||'Could not check selected lots';if(options.error)options.error(error);}
      finally{busy=false;run.finished=true;run.stage=run.rows.every(row=>row.state==='verified')?'verified':'review';emit();}
      return run;
    }
    async function recheck(){
      if(!run||busy||nativePending||readPending)return false;busy=true;run.finished=false;run.stage='checking';emit();
      try{for(const entry of run.rows.filter(row=>row.state==='unknown')){try{await verify(entry,run.operation);}catch(error){entry.message=error.message||'Saved values need review';emit();}}run.error=run.rows.some(row=>row.state==='unknown')?'Some saved values still need review.':'';}
      finally{busy=false;run.finished=true;run.stage=run.rows.every(row=>row.state==='verified')?'verified':'review';emit();}return run;
    }
    return Object.freeze({capture,commit,recheck,run:()=>run,pending:()=>busy||nativePending>0||readPending>0,blocked:()=>busy||nativePending>0||readPending>0||!!(run&&run.rows.some(row=>row.state==='unknown'))});
  }
  root.LMLotEdit=Object.freeze({fields,value,payload,matches,editable,create});
})(typeof window==='undefined'?globalThis:window);
