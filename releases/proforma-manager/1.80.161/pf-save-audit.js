(function(root){
 'use strict';
 const runs=[];let current=null,timer=null,view=null,sequence=0;
 const perf=()=>root.LMPerf.snapshot(),now=()=>perf().elapsedMs;
 function node(id,tag){let value=root.document.getElementById(id);if(!value){value=root.document.createElement(tag);value.id=id;}return value;}
 function snapshot(){return {schema:1,runs:JSON.parse(JSON.stringify(runs))};}
 function publish(){
  const data=node('pf-save-audit','script');data.type='application/json';if(!data.parentNode)root.document.body.appendChild(data);data.textContent=JSON.stringify(snapshot());
  if(view&&current){const s=current.latest;view.textContent='Elapsed '+(current.elapsedMs/1000).toFixed(1)+'s · Active '+s.active+' · Queued '+s.queued+'\n'+(s.rate.waitMs?'Waiting for '+s.rate.reason+' · '+(s.rate.waitMs/1000).toFixed(1)+'s remaining\n':'')+s.activeRequests.map(r=>'Running '+r.task+' · '+(r.elapsedMs/1000).toFixed(1)+'s').join('\n')+'\n'+current.entries.slice(-35).map(e=>'+'+(e.atMs/1000).toFixed(1)+'s '+e.message).join('\n');}
 }
 function entry(message){current.entries.push({atMs:now()-current.startedAtMs,message});if(current.entries.length>300)current.entries.shift();}
 function sample(){
  if(!current)return;const s=perf();current.elapsedMs=s.elapsedMs-current.startedAtMs;current.latest={active:s.active,queued:s.queued,rate:s.rate,activeRequests:s.activeRequests,queuedRequests:s.queuedRequests};
  current.requests=s.requests.filter(r=>r.id>current.baselineSequence);
  for(const r of current.requests)if(!current.logged.has(r.id)){current.logged.add(r.id);entry(r.task+' · queue '+(r.queuedMs/1000).toFixed(3)+'s · Creator '+(r.durationMs/1000).toFixed(3)+'s · '+(r.ok?'OK':'error '+r.code));}
  const wait=s.rate.waitMs>0?s.rate.reason:'';if(wait!==current.waitReason){current.waitReason=wait;entry(wait?'Queue paused: '+wait:'Queue dispatch available');}
  // Private bookkeeping is excluded from the serialized diagnostic record.
  publish();
 }
 function mount(parent){
  if(root.document.getElementById('pfSaveAuditDetails'))return;
  const details=node('pfSaveAuditDetails','details');details.style.cssText='margin-top:12px;font-size:12px;color:#475569';
  const summary=node('pfSaveAuditSummary','summary');summary.textContent='Save log';summary.style.cursor='pointer';details.appendChild(summary);
  view=node('pfSaveAuditText','pre');view.style.cssText='max-height:240px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.5 monospace;margin:8px 0 0';details.appendChild(view);parent.appendChild(details);
 }
 function begin(){
  if(timer)root.clearInterval(timer);const s=perf();current={id:++sequence,startedAt:new Date().toISOString(),startedAtMs:s.elapsedMs,baselineSequence:s.requestSequence,priorRequestsInWindow:s.rate.dispatched,status:'running',elapsedMs:0,entries:[],requests:[],latest:null};
  Object.defineProperties(current,{logged:{value:new Set()},waitReason:{value:'',writable:true}});runs.push(current);if(runs.length>3)runs.shift();entry('Save started · '+s.rate.dispatched+' requests already dispatched in the rolling window');sample();timer=root.setInterval(sample,500);
 }
 function stage(label){if(!current||current.status!=='running')return;entry(String(label));sample();}
 function end(error){if(!current||current.status!=='running')return;current.status=error?'needs-review':'verified';entry(error?'Save needs review':'Save verified');sample();if(timer)root.clearInterval(timer);timer=null;}
 root.PFSaveAudit=Object.freeze({mount,begin,stage,end,snapshot});
})(typeof window==='undefined'?globalThis:window);
