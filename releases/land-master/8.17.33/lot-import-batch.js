/* Native, workflow-enabled batch creates for the reviewed Lot import only. */
(function(root){
  'use strict';
  function create(ctx){
    const size=50;
    function unknown(message){return Object.assign(new Error(message),{uncertain:true,noReplay:true});}
    async function preflight(records,check){
      const ids=records.map(r=>r.Lots);
      if(ids.some(id=>typeof id!=='string'||!/^\d+$/.test(id))||new Set(ids).size!==ids.length)throw Error('Each Property needs a different saved Lot ID.');
      const lots=await ctx.read('All_Lots_All_Fields',ids.map(id=>'(ID == '+id+')').join(' || '),check);
      check();
      const byId=new Map(lots.map(l=>[l.ID,l])),subIds=[...new Set(lots.map(l=>root.LMPropertyLots.id(l.Subdivision)))];
      if(lots.length!==ids.length||subIds.some(id=>!/^\d+$/.test(id)))throw Error('A saved Lot or its subdivision is unavailable.');
      const subs=await ctx.read('All_Subdivisions',subIds.map(id=>'(ID == '+id+')').join(' || '),check);
      check();const subById=new Map(subs.map(s=>[s.ID,s]));
      return records.map(original=>{
        const record=Object.assign({},original);
        const lot=byId.get(record.Lots),sub=lot&&subById.get(root.LMPropertyLots.id(lot.Subdivision));
        const error=root.LMPropertyLots.error(record,lot,sub);
        if(error)throw Error(error);
        // This identifies the intended child destination before its first write.
        if(lot.Lot_Code!==record.Property_ID)throw Error('A returned Lot ID does not match its import row. Review saved Lots before creating Properties.');
        // Reuse this fresh parent read: Company follows the Subdivision's Dev Entity.
        const company=root.LMPropertyLots.id(sub.Company1);
        if(sub.Company1&&!/^\d+$/.test(company))throw Error('The subdivision Dev Entity needs a valid Company lookup.');
        delete record.Company1;
        if(company)record.Company1=company;
        return record;
      });
    }
    async function write(type,input){
      if(!['lot','property'].includes(type)||!Array.isArray(input)||!input.length||input.length>size)throw Error('Invalid import batch.');
      if(!ctx.live())throw Error('Creator connection required.');
      const scope=ctx.scope();let records=JSON.parse(JSON.stringify(input));
      if(type==='property')records.forEach(record=>ctx.prepare(record));
      const attempts=ctx.reserve(type,records),check=()=>{if(!ctx.live()||ctx.scope()!==scope)throw Error('The Creator session or loaded data changed. Review saved records before another import.');};
      let dispatched=false;
      try{
        check();if(type==='property'){
          records=await preflight(records,check);
          attempts.forEach((attempt,i)=>{attempt.payload=ctx.freeze(records[i]);});
        }check();
        const response=await ctx.request('import-batch:'+type,()=>{
          check();dispatched=true;
          return ctx.api().addRecords({form_name:type==='lot'?'Lots':'Property',payload:{data:records,result:{fields:[type==='lot'?'Lot_Code':'Property_ID']}}});
        });
        // An outer native error applies to the request, while individual errors
        // in result apply only to their corresponding input objects.
        const outer=response&&typeof response==='object'?Object.assign({},response):response;
        if(outer&&Array.isArray(outer.result))delete outer.result;
        ctx.accept(outer);
        const items=response&&Array.isArray(response.result)?response.result:null;
        if(items&&items.length!==records.length)throw unknown('Creator returned an incomplete batch result. Review this batch before another import.');
        const identity=type==='lot'?'Lot_Code':'Property_ID';
        const reordered=items&&items.some((item,i)=>item&&item.data&&item.data[identity]!=null&&item.data[identity]!==records[i][identity]);
        const byIdentity=new Map();
        if(reordered)items.forEach(item=>{const key=item&&item.data&&item.data[identity];if(key!=null)byIdentity.set(key,byIdentity.has(key)?null:item);});
        const results=records.map((record,i)=>{
          const item=reordered?byIdentity.get(record[identity]):items?items[i]:records.length===1?response:outer;
          if(reordered&&!item)return {ok:false,error:ctx.failure(unknown('Creator returned conflicting batch row identities. Review this row before another import.'),attempts[i])};
          try{
            ctx.accept(item);
            let id=ctx.recordId(item);
            const echo=item&&item.data&&item.data[identity];
            if(echo!=null&&echo!==record[identity])id='';
            return {ok:true,response:item,id};
          }catch(error){return {ok:false,error:ctx.failure(error,attempts[i])};}
        });
        if(type==='lot'){
          const ids=results.filter(r=>r.ok&&r.id).map(r=>r.id);
          results.forEach(result=>{if(result.id&&ids.filter(id=>id===result.id).length>1)result.id='';});
        }
        return results;
      }catch(error){
        if(!dispatched)throw error;
        return attempts.map(attempt=>({ok:false,error:ctx.failure(error,attempt)}));
      }finally{ctx.release(type,attempts);}
    }
    return Object.freeze({size,write});
  }
  root.LMLotImportBatch={create};
})(window);
