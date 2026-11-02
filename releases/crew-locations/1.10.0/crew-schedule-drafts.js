/* Local schedule drafts. Only an explicit Save invokes the existing native writer. */
(function(root){
 'use strict';
 const M=root.CrewModel,copy=value=>JSON.parse(JSON.stringify(value)),key=c=>c.type+':'+c.recordId;
 function create(A){
  let scope='',queue=[],baselines=new Map(),resolved=new Map(),records=new Set(),saving=false,blocked='';
  const storageKey=()=> 'crew-schedule:drafts:'+scope;
  const snapshot=r=>({start:r.start,end:r.end});
  function validExtra(op){const e=op.extra;if(!e||typeof e!=='object'||Array.isArray(e))return false;const keys=Object.keys(e);if(op.origin==='arrow')return keys.length===3&&keys.every(k=>['durationOperationId','direction','all'].includes(k))&&typeof e.durationOperationId==='string'&&[-1,1].includes(e.direction)&&typeof e.all==='boolean';if(['undo','redo'].includes(op.origin))return keys.length===1&&typeof e.reversesOperationId==='string';return keys.length===0;}
  function remember(){try{if(queue.length)root.localStorage.setItem(storageKey(),JSON.stringify({version:1,queue,baselines:[...baselines],resolved:[...resolved],blocked}));else root.localStorage.removeItem(storageKey());}catch{}}
  function overlay(){for(const [id,before] of baselines){const r=A.model()?.records.get(id);if(r)Object.assign(r,before);}records=new Set();for(const op of queue)for(const change of op.changes){const r=A.model()?.records.get(key(change));records.add(key(change));if(r)for(const [field,value] of Object.entries(change.fields))r[field]=M.date(value.after);}}
  function notify(){overlay();for(const id of baselines.keys())if(!records.has(id))baselines.delete(id);if(!queue.length)resolved.clear();remember();A.changed?.();}
  function valid(op){return op&&typeof op.id==='string'&&op.id.startsWith('draft:')&&typeof op.phaseId==='string'&&/^\d+$/.test(op.phaseId)&&['table','duration','drag','arrow','undo','redo'].includes(op.origin)&&validExtra(op)&&Array.isArray(op.changes)&&op.changes.length>0&&op.changes.every(c=>typeof c.recordId==='string'&&/^\d+$/.test(c.recordId)&&['M','T'].includes(c.type)&&c.expected&&['start','end'].every(f=>c.expected[f]===null||typeof c.expected[f]==='string'&&M.date(c.expected[f])!==null)&&c.fields&&Object.keys(c.fields).length&&Object.keys(c.fields).every(f=>['start','end'].includes(f)&&['before','after'].every(v=>c.fields[f][v]===null||typeof c.fields[f][v]==='string'&&M.date(c.fields[f][v])!==null)))&&(!op.nativeId||typeof op.nativeId==='string');}
  function attach(model,nextScope){
   if(scope!==nextScope){scope=nextScope;queue=[];baselines=new Map();resolved=new Map();blocked='';try{const saved=JSON.parse(root.localStorage.getItem(storageKey()));if(saved?.version===1&&Array.isArray(saved.queue)&&saved.queue.length<=500&&saved.queue.every(valid)&&Array.isArray(saved.baselines)&&saved.baselines.every(item=>Array.isArray(item)&&/^[MT]:\d+$/.test(item[0])&&item[1]&&['start','end'].every(f=>item[1][f]===null||Number.isInteger(item[1][f])))&&Array.isArray(saved.resolved)&&saved.resolved.every(item=>Array.isArray(item)&&item.every(v=>typeof v==='string'))){queue=saved.queue;baselines=new Map(saved.baselines.map(([id,value])=>[id,{start:value.start,end:value.end}]));resolved=new Map(saved.resolved);blocked=typeof saved.blocked==='string'?saved.blocked:'';}}catch{}}
   if(queue.length&&!queue.some(op=>op.nativeId)&&!blocked){for(const [id,before] of baselines){const r=model.records.get(id);if(!r||r.start!==before.start||r.end!==before.end){blocked='Saved dates changed or an edited record is unavailable. Refresh to review the saved schedule before continuing.';break;}}}
   overlay();return recovery();
  }
  function extraFor(op){const extra={...op.extra};if(extra.durationOperationId?.startsWith('draft:')){const native=resolved.get(extra.durationOperationId);if(!native)throw Error('Save the originating Days change before its propagation.');extra.durationOperationId=native;}return extra;}
  function recovery(){const op=queue.find(item=>item.nativeId);return op?{action:'apply',operationId:op.nativeId,subdivisionId:op.phaseId,origin:op.origin,changes:copy(op.changes),...extraFor(op)}:null;}
  function stage(p,changes,origin,extra={}){
   if(saving||blocked||queue.some(op=>op.nativeId)||!A.ready()||scope!==A.scope())throw Error(blocked||'Finish the current save or review before editing the schedule.');
   changes=changes.filter(c=>Object.keys(c.fields).length);if(!changes.length)return null;
   const op={id:'draft:'+root.crypto.randomUUID(),phaseId:p.id,origin,changes:copy(changes),extra:copy(extra)};if(!valid(op))throw Error('Invalid schedule draft identity or date fields.');
   for(const c of changes){const r=A.model().records.get(key(c));if(!r||r.phaseId!==p.id)throw Error('This schedule record is unavailable.');A.validate(p,r,c,origin);if(!baselines.has(key(c)))baselines.set(key(c),snapshot(r));}
   const plain=item=>['table','drag'].includes(item.origin)&&item.changes.length===1;
   const prior=changes.length===1?queue.filter(item=>item.changes.some(c=>key(c)===key(changes[0]))):[];
   let selected=op;
   if(plain(op)&&prior.length===1&&plain(prior[0])){selected=prior[0];const original=selected.changes[0],latest={...original.expected};for(const c of [original,changes[0]])for(const [field,value] of Object.entries(c.fields))latest[field]=value.after;original.fields={};for(const field of ['start','end'])if(latest[field]!==original.expected[field])original.fields[field]={before:original.expected[field],after:latest[field]};if(Object.keys(original.fields).length>1)selected.origin='table';if(!Object.keys(original.fields).length)queue.splice(queue.indexOf(selected),1);}
   else queue.push(op);
   notify();return {state:'staged',operationId:selected.id};
  }
  function confirm(nativeId,result){
   const index=queue.findIndex(op=>op.nativeId===nativeId);if(index<0)return false;const op=queue[index];
   for(const c of op.changes){const r=A.model().records.get(key(c));if(r){const before={...(baselines.get(key(c))||snapshot(r))},returned=result?.records?.find(item=>item.type===c.type&&item.id===c.recordId);for(const field of Object.keys(c.fields))before[field]=r[field];if(returned)for(const field of ['start','end'])if(Object.hasOwn(returned,field))before[field]=M.date(returned[field]);baselines.set(key(c),before);}}
   resolved.set(op.id,nativeId);A.resolve?.(op.id,nativeId);queue.splice(index,1);if(!queue.length){baselines.clear();resolved.clear();blocked='';}notify();return true;
  }
  function fail(nativeId,error){
   const op=queue.find(item=>item.nativeId===nativeId);if(!op)return;
   if(!nativeId)return;if(!error.unknown){delete op.nativeId;if(error.data?.confirmed?.length){op.partial=copy(error.data.confirmed);blocked='Some dates were saved. Review the result, then Refresh before making another save.';}}
   notify();
  }
  async function save(){
   if(saving||blocked||queue.some(op=>op.nativeId)||!A.ready()||scope!==A.scope())throw Error(blocked||'Finish reviewing the current operation first.');
   const actor=scope;let completed=0;saving=true;A.changed?.();
   try{while(queue.length){if(actor!==A.scope()||!A.ready())throw Error('The Creator session or schedule access changed.');const op=queue[0],p=A.model().byId.get(op.phaseId);if(!p)throw Error('An edited phase is unavailable. Refresh to review the saved schedule.');
     for(const c of op.changes){const r=A.model().records.get(key(c));if(!r)throw Error('An edited record is unavailable.');A.validate(p,{...r,start:M.date(c.expected.start),end:M.date(c.expected.end)},c,op.origin);}
     const extra=extraFor(op),nativeId=root.crypto.randomUUID();op.nativeId=nativeId;remember();A.changed?.();
     try{const result=await A.persist(p,copy(op.changes),op.origin,{...extra,operationId:op.nativeId});if(actor!==A.scope())throw Object.assign(Error('The Creator session changed while saving. Review from the original account.'),{unknown:true});if(result?.state!=='saved')throw Object.assign(Error('The saved schedule needs review.'),{unknown:true});confirm(result.operationId,result);completed++;}
     catch(error){fail(nativeId,error);error.completed=completed;throw error;}
    }return {state:'saved',completed};
   }finally{saving=false;A.changed?.();}
  }
  function discard(){if(saving||queue.some(op=>op.nativeId))throw Error('Review the uncertain save before discarding drafts.');for(const [id,before] of baselines){const r=A.model()?.records.get(id);if(r)Object.assign(r,before);}queue=[];baselines.clear();resolved.clear();records.clear();blocked='';remember();A.changed?.();}
  function deltas(){return queue.filter(op=>op.origin==='duration').map(op=>{const c=op.changes[0],before={start:M.date(c.expected.start),end:M.date(c.expected.end)},after={...before};for(const [f,v] of Object.entries(c.fields))after[f]=M.date(v.after);return {id:key(c),operationId:op.id,delta:M.duration(after)-M.duration(before),after,used:queue.filter(item=>item.origin==='arrow'&&item.extra.durationOperationId===op.id).flatMap(item=>item.changes.map(change=>change.stage))};});}
  return Object.freeze({attach,stage,save,confirm,fail,discard,recovery,deltas,has:id=>records.has(id),get dirty(){return queue.length>0;},get count(){return records.size;},get saving(){return saving;},get blocked(){return blocked;},get unknown(){return queue.some(op=>op.nativeId);},get operations(){return copy(queue);}});
 }
 root.CrewScheduleDrafts=Object.freeze({create});
})(window);
