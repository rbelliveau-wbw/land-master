(function(root,factory){
  if(typeof module==="object"&&module.exports)module.exports=factory();
  else root.LMSubdivisionCounts=factory();
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  // Count requests stay small, bounded and independent. A slow subdivision must
  // never hold the other badges behind a whole-inventory download.
  function extractCount(response){
    if(!response||String(response.code||response.result&&response.result.code||"3000")!=="3000"||response.error||response.result&&response.result.error)return null;
    var values=[response.result&&response.result.records_count,response.records_count,response.record_count,response.count];
    for(var i=0;i<values.length;i++){
      var value=values[i];
      if(typeof value!=="number"&&typeof value!=="string")continue;
      if(String(value).trim()==="")continue;
      var n=Number(value);
      if(Number.isSafeInteger(n)&&n>=0)return n;
    }
    return null;
  }
  function create(options){
    var values=new Map(),errors=new Map(),queued=new Set(),queue=[],active=0,stopped=false;
    var limit=options.concurrency||4;
    function run(){
      while(!stopped&&active<limit&&queue.length){
        var job=queue.shift();
        start(job);
      }
    }
    function start(job){
      active++;
      Promise.resolve().then(function(){if(stopped)throw new Error("Superseded count queue");return options.read(job.id,job.field)}).then(function(count){
        if(!Number.isSafeInteger(count)||count<0)throw new Error("Invalid subdivision count");
        if(stopped)return;
        var stats=values.get(job.id)||{total:0,available:null,scheduled:null,sold:null};
        stats[job.field]=count;values.set(job.id,stats);errors.delete(job.key);
        options.changed(job.id);
      }).catch(function(error){
        if(stopped)return;
        errors.set(job.key,error);options.changed(job.id);
      }).finally(function(){active--;queued.delete(job.key);run()});
    }
    function request(ids,fields){
      if(stopped)return;
      var priority=new Set(ids.map(String));
      var front=[],back=[];
      queue.forEach(function(job){(priority.has(job.id)?front:back).push(job)});
      ids.map(String).forEach(function(id){
        fields.forEach(function(field){
          var key=id+":"+field,stats=values.get(id);
          if(queued.has(key)||errors.has(key)||stats&&stats[field]!=null)return;
          queued.add(key);front.push({id:id,field:field,key:key});
        });
      });
      queue=front.concat(back);run();
    }
    return {values:values,request:request,error:function(id,field){return errors.get(String(id)+":"+field)},stop:function(){stopped=true;queue=[]}};
  }
  return {create:create,extractCount:extractCount};
});
