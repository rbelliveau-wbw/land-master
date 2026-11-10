import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context=vm.createContext({setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-activity.js','utf8'),context);
const api=context.LMPOActivity;
const scope={budgetId:'999999999999999999',userAccessId:'888888888888888888'};
const event=(overrides={})=>({id:'777777777777777777',objectId:'666666666666666666',event:'Approved Email',operationId:'outcome|revision-1|Approved',recipientKey:'user-access|123',attemptNo:1,status:'Failed',recipientEmail:'contact@example.com',recipientName:'Email Contact',subject:'Purchase Order Approved',startedAt:'2026-11-10T10:00:00-06:00',sentAt:'',error:'Recipient is not configured.',revision:'revision-1',canRetry:true,retryAction:'RetryOutcomeEmail',...overrides});
const page=(events,more={})=>({contract:'po-v1',activityContract:'po-activity-v1',success:true,events,hasMore:false,...more});
const outcome=(events,notice={})=>({...page(events),writeState:'verified',outcomeNotification:{contract:'po-outcome-email-v1',state:'Sent',emailSent:true,canRetryEmail:false,message:'Outcome notifications sent.',events,...notice}});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const json=value=>JSON.parse(JSON.stringify(value));

assert.equal(api.page(page([event()]),scope).events[0].id,'777777777777777777','Record IDs remain exact strings above JS safe integer range');
assert.throws(()=>api.page(page([event({id:777})]),scope),/identit/);
assert.throws(()=>api.page(page([event(),event()]),scope),/identit/);
assert.throws(()=>api.page(page([event()],{hasMore:true,nextCursor:123}),scope),/paging/);
assert.throws(()=>api.page(page([event()]),{...scope,id:'1'}),/identit/);
assert.throws(()=>api.page(page([event({budgetId:'123'})]),scope),/identit/,'Returned attempts must belong to the exact requested Budget');
assert.throws(()=>api.page(page([event({status:'Delivered'})]),scope),/identit/,'Email sent acknowledgement must not become recipient delivery');
for(const status of ['Sent','Sending','Preparing','Unknown','Skipped'])assert.equal(api.retryEligible(event({status})),false,`${status} cannot be resent`);
assert.equal(api.retryEligible(event({retryAction:'RetryEmail'})),false,'Pending approval requests retain their separate guarded RetryEmail action');
assert.equal(api.retryEligible(event()),true,'A confirmed unsent outcome failure is retryable only with backend grant');
assert.equal(api.retryEligible(event({recipientKey:''})),false,'A retry needs the stable recipient identity, not only its mutable email address');

{
  const calls=[],refresh=deferred();let read=0;
  const ctl=api.createController({context:scope,current:()=>true,call:payload=>{calls.push(json(payload));return ++read===1?Promise.resolve(page([event()],{hasMore:true,nextCursor:'777777777777777777'})):refresh.promise;}});
  await ctl.load(false);const rows=ctl.state().events;
  const loading=ctl.load(true);assert.equal(ctl.state().events,rows,'Authorized rows stay mounted through older reads');assert.equal(ctl.state().readBusy,true);
  assert.deepEqual(calls[1],{...scope,action:'Activity',cursor:'777777777777777777'});
  refresh.resolve(page([event({id:'555555555555555555',status:'Sent',sentAt:'2026-11-09T09:00:00-06:00',canRetry:false})]));await loading;
  assert.equal(ctl.state().events.length,2);assert.equal(ctl.state().nextCursor,null);
}
{
  const calls=[],pending=deferred();
  const ctl=api.createController({context:scope,current:()=>true,call:payload=>{calls.push(json(payload));return payload.action==='Activity'?Promise.resolve(page([event()])):pending.promise;}});
  await ctl.load(false);const row=ctl.state().events[0];
  const first=ctl.retry(row);await Promise.resolve();await ctl.retry(row);
  assert.equal(calls.filter(row=>row.action==='RetryOutcomeEmail').length,1,'Double click sends one attempt');
  assert.equal(ctl.state().writeBusy,true);
  assert.deepEqual(calls[1],{...scope,action:'RetryOutcomeEmail',id:row.objectId,activityId:row.id,expectedRevision:'revision-1'});
  pending.resolve(outcome([event({id:'777777777777777778',attemptNo:2,status:'Sent',sentAt:'2026-11-10T10:01:00-06:00',canRetry:false}),event()]));await first;
  assert.equal(ctl.state().operation.status,'Sent');assert.equal(ctl.state().operation.unknown,false);
  assert.equal(ctl.state().events.find(row=>row.id===event().id).canRetry,false,'A previous Failed row cannot invite a duplicate after a successful retry');
  assert.equal(ctl.state().events[0].id,'777777777777777778','Newest attempts retain exact descending record IDs');
  ctl.dismissOperation();assert.equal(ctl.state().operation,null);
}
{
  const calls=[];
  const ctl=api.createController({context:scope,current:()=>true,call:payload=>{calls.push(json(payload));if(payload.action==='Activity')return Promise.resolve(page([event()]));if(payload.action==='RetryOutcomeEmail')return Promise.reject(new Error('Transport lost'));return Promise.resolve(outcome([event({id:'777777777777777778',attemptNo:2,status:'Sent',sentAt:'2026-11-10T10:01:00-06:00',canRetry:false}),event()]));}});
  await ctl.load(false);const row=ctl.state().events[0];await ctl.retry(row);
  assert.equal(ctl.state().operation.unknown,true);ctl.dismissOperation();assert.equal(ctl.state().operation,null,'A settled Unknown result returns to the history list');assert.equal(ctl.state().unresolved.length,1,'Its exact check/no-replay identity survives result dismissal');
  await ctl.retry(row);assert.equal(calls.filter(row=>row.action==='RetryOutcomeEmail').length,1,'Unknown reply never blindly resends');
  await ctl.checkUnresolved();assert.equal(calls.at(-1).action,'CheckOutcomeEmail');assert.equal(ctl.state().operation.status,'Sent');assert.equal(ctl.state().operation.checking,true);assert.equal(ctl.state().unresolved.length,0);
  assert.equal(calls.filter(row=>row.action==='RetryOutcomeEmail').length,1,'Read-only recovery never sends');
}
{
  const calls=[],first=event(),second=event({id:'777777777777777775',recipientKey:'user-access|456',recipientEmail:'second@example.com',recipientName:'Second Contact'});
  const ctl=api.createController({context:scope,current:()=>true,call:payload=>{
    calls.push(json(payload));
    if(payload.action==='Activity')return Promise.resolve(page([json(first),json(second)]));
    if(payload.action==='RetryOutcomeEmail'&&payload.activityId===first.id)return Promise.reject(new Error('First retry response lost'));
    if(payload.action==='RetryOutcomeEmail')return Promise.resolve(outcome([event({...second,id:'777777777777777779',status:'Sent',attemptNo:2,sentAt:'2026-11-10T10:10:00-06:00',canRetry:false}),event({...first,status:'Unknown',canRetry:false})],{state:'Unknown',emailSent:false}));
    return Promise.resolve(outcome([event({...first,id:'777777777777777778',status:'Sent',attemptNo:2,sentAt:'2026-11-10T10:11:00-06:00',canRetry:false}),event({...second,id:'777777777777777779',status:'Sent',attemptNo:2,sentAt:'2026-11-10T10:10:00-06:00',canRetry:false})]));
  }});
  await ctl.load(false);await ctl.retry(ctl.state().events.find(row=>row.id===first.id));ctl.dismissOperation();
  assert.equal(ctl.state().operation,null);assert.equal(ctl.state().unresolved[0].event.id,first.id);
  await ctl.load(false);const replacedFirst=ctl.state().events.find(row=>row.id===first.id),replacedSecond=ctl.state().events.find(row=>row.id===second.id);
  assert.equal(ctl.hasUnresolved(replacedFirst),true,'Refresh replacing row objects preserves the unresolved target');assert.equal(ctl.canRetryEvent(replacedFirst),false);assert.equal(ctl.canRetryEvent(replacedSecond),true,'Another confirmed Failed recipient remains available');
  await ctl.retry(replacedFirst);assert.equal(calls.filter(row=>row.action==='RetryOutcomeEmail').length,1,'Returning to history cannot replay the lost retry');
  await ctl.retry(replacedSecond);assert.equal(ctl.state().operation.status,'Sent');assert.equal(ctl.state().unresolved.length,1,'A second recipient result cannot overwrite the first unresolved payload');ctl.dismissOperation();
  await ctl.checkUnresolved();assert.equal(calls.at(-1).activityId,first.id);assert.equal(calls.at(-1).id,first.objectId);assert.equal(calls.at(-1).expectedRevision,first.revision);assert.equal(ctl.state().unresolved.length,0);
  assert.equal(calls.filter(row=>row.action==='RetryOutcomeEmail'&&row.activityId===first.id).length,1,'Only the original first send occurred; subsequent recovery was read-only');
}
{
  const ctl=api.createController({context:scope,current:()=>true,call:payload=>Promise.resolve(payload.action==='Activity'?page([event()]):outcome([event({status:'Unknown',canRetry:false})],{state:'Unknown',emailSent:false,message:'Delivery is unknown.'}))});
  await ctl.load(false);await ctl.retry(ctl.state().events[0]);
  assert.equal(ctl.state().operation.status,'Unknown','success:true means API read success, not mail success');assert.equal(ctl.state().operation.unknown,true);
}
{
  const ctl=api.createController({context:scope,current:()=>true,call:payload=>Promise.resolve(payload.action==='Activity'?page([event({recipientEmail:''})]):outcome([event({id:'777777777777777779',recipientKey:'sam',recipientEmail:'sam@example.com',attemptNo:7,status:'Sent',sentAt:'2026-11-10T10:00:00-06:00'}),event({id:'777777777777777778',recipientEmail:'corrected@example.com',attemptNo:2,status:'Unknown',canRetry:false})],{state:'Unknown',emailSent:false}))});
  await ctl.load(false);await ctl.retry(ctl.state().events[0]);
  assert.equal(ctl.state().operation.status,'Unknown','Corrected contact addresses reconcile by recipient key and cannot inherit another recipient’s Sent result');
}
{
  const ctl=api.createController({context:scope,current:()=>true,call:payload=>Promise.resolve(payload.action==='Activity'?page([event({recipientKey:'configuration',recipientEmail:''})]):outcome([event({status:'Sent',sentAt:'2026-11-10T10:00:00-06:00',canRetry:false})]))});
  await ctl.load(false);await ctl.retry(ctl.state().events[0]);
  assert.equal(ctl.state().operation.status,'Sent','A fixed Settings failure reconciles the newly created recipient plan as a whole');
}
{
  const read=deferred();let current=true;
  const ctl=api.createController({context:scope,current:()=>current,call:()=>read.promise});const loading=ctl.load(false);current=false;read.resolve(page([event()]));await loading;
  assert.equal(ctl.state().events.length,0,'A prior actor or budget reply cannot paint the new scope');
}
{
  let second=false;
  const ctl=api.createController({context:scope,current:()=>true,call:()=>Promise.resolve(second?{contract:'po-v1',success:false,error:'Budget access denied.'}:page([event()]))});await ctl.load(false);second=true;await ctl.load(false);
  assert.equal(ctl.state().events.length,0,'Denied reads immediately clear prior private activity');assert.equal(ctl.state().loaded,false);
}
{
  const calls=[];
  const ctl=api.createController({context:scope,current:()=>true,call:payload=>{calls.push(payload.action);return Promise.resolve(payload.action==='Activity'?page([event({event:'Approval Request Email',status:'Unknown',retryAction:'',canRetry:false})]):outcome([]));}});await ctl.load(false);await ctl.checkEvent(ctl.state().events[0]);
  assert.deepEqual(calls,['Activity'],'Pending request emails are never routed through terminal-outcome checks');
}
{
  const calls=[],id=event().objectId;
  const notice={contract:'po-outcome-email-v1',id,budgetId:scope.budgetId,state:'Not Started',emailSent:false,canRetryEmail:true,events:[],revision:'revision-1',outcome:'Approved',operationId:event().operationId};
  const ctl=api.createController({context:{...scope,id},current:()=>true,call:payload=>{calls.push(json(payload));return Promise.resolve(payload.action==='Activity'?{...page([]),outcomeNotification:notice}:outcome([event({status:'Sent',sentAt:'2026-11-10T10:00:00-06:00',canRetry:false})]));}});
  await ctl.load(false);assert.equal(ctl.canStartOutcome(),true);await ctl.startOutcome();
  assert.deepEqual(calls[1],{...scope,action:'RetryOutcomeEmail',id,activityId:'',expectedRevision:'revision-1'},'An explicitly confirmed unsent legacy outcome can start only by its current server revision');
  assert.equal(ctl.state().operation.status,'Sent');assert.equal(ctl.canStartOutcome(),false);
  ctl.dismissOperation();await ctl.startOutcome();assert.equal(calls.length,2,'A successful initial outcome cannot send again');
}
{
  const calls=[],id=event().objectId,planId='777777777777777770';
  const notice={contract:'po-outcome-email-v1',id,budgetId:scope.budgetId,state:'Unknown',emailSent:false,canRetryEmail:true,canResumeEmail:true,missingCount:1,planId,events:[],revision:'revision-1',outcome:'Approved',operationId:event().operationId};
  const ctl=api.createController({context:{...scope,id},current:()=>true,call:payload=>{calls.push(json(payload));return Promise.resolve(payload.action==='Activity'?{...page([event({status:'Unknown',canRetry:false})]),outcomeNotification:notice}:outcome([event({status:'Sent',sentAt:'2026-11-10T10:00:00-06:00',canRetry:false})]));}});
  await ctl.load(false);assert.equal(ctl.canResumeOutcome(),true);await ctl.resumeOutcome();
  assert.deepEqual(calls[1],{...scope,action:'RetryOutcomeEmail',id,activityId:planId,expectedRevision:'revision-1'},'Interrupted plans resume only from their exact native plan identity, not an unknown recipient attempt');
  assert.equal(ctl.state().operation.resume,true);assert.equal(ctl.state().operation.initial,true);
}
{
  const calls=[],id=event().objectId;
  const notice={contract:'po-outcome-email-v1',id,budgetId:scope.budgetId,state:'Not Started',emailSent:false,canRetryEmail:true,events:[],revision:'revision-1',outcome:'Approved',operationId:event().operationId};
  const ctl=api.createController({context:{...scope,id},current:()=>true,call:payload=>{calls.push(json(payload));return payload.action==='Activity'?Promise.resolve({...page([]),outcomeNotification:notice}):Promise.reject(new Error('Initial outcome reply lost'));}});
  await ctl.load(false);await ctl.startOutcome();ctl.dismissOperation();assert.equal(ctl.state().operation,null);assert.equal(ctl.canStartOutcome(),false,'Returning to history retains a lost initial-plan send guard');
  await ctl.load(false);await ctl.startOutcome();assert.equal(calls.filter(row=>row.action==='RetryOutcomeEmail').length,1,'A stale Not Started view cannot replay an unresolved initial send');
}
{
  const calls=[],ctl=api.createController({context:scope,current:()=>true,call:payload=>{calls.push(payload.action);return payload.action==='Activity'?Promise.resolve(page([event()])):Promise.reject(new Error('Lost retry reply'));}});
  await ctl.load(false);await ctl.retry(ctl.state().events[0]);
  const source=fs.readFileSync('widgets/budget-manager/src/app/po-activity.js','utf8'),start=source.indexOf('    function close(force)'),end=source.indexOf('    function date(',start);
  let removed=false,focused=false;const background={inert:true},retained=new Map();
  const closeContext=vm.createContext({controller:ctl,overlay:{remove(){removed=true;}},visualBusy:false,scopeTimer:null,settleTimer:null,clearInterval,clearTimeout,retained,context:{key:'same-actor-budget'},inert:[[background,false]],trigger:{isConnected:true,focus(){focused=true;}}});
  vm.runInContext(source.slice(start,end),closeContext);closeContext.close();
  assert.equal(removed,true);assert.equal(background.inert,false);assert.equal(focused,true);assert.equal(retained.get('same-actor-budget'),ctl);
  assert.equal(ctl.state().operation,null,'Actual Close clears only result presentation');assert.equal(ctl.state().unresolved.length,1,'The same retained controller preserves exact no-replay targets for reopening history');
  await ctl.load(false);assert.equal(ctl.state().operation,null);assert.equal(ctl.canRetryEvent(ctl.state().events[0]),false);assert.deepEqual(calls,['Activity','RetryOutcomeEmail','Activity'],'Reopening history reads without sending');
}
const src=fs.readFileSync('widgets/budget-manager/src/app/po-activity.js','utf8');
assert.match(src,/renderedEvents!==state\.events/,'Refresh status patches retain mounted authorized rows');
assert.match(src,/renderedOperation!==operation/,'Progress rows patch the same mounted dialog');
assert.match(src,/state\.writeBusy\|\|visualBusy/,'Pending requests and display pacing block duplicate controls');
assert.match(src,/doneButton\.textContent='Back To Activity'/,'All settled result screens offer a return to the history list');
assert.ok(src.includes("controller.dismissOperation();card.querySelector('[data-po-activity-close]').focus();controller.load(false)"),'Returning to history restores dialog focus before its read-only refresh');
assert.match(src,/controller\.dismissOperation\(true\)/,'Close resets only result presentation before retaining unresolved identities');
assert.match(src,/controller\.state\(\)\.unresolved\.length/,'Close/reopen retains unresolved targets without trapping the operation result');
assert.match(src,/role="dialog" aria-modal="true"/);assert.match(src,/inert=true/);assert.match(src,/event\.key==='Tab'/);
const widget=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
assert.ok(/data-budget-po-activity/.test(widget));assert.ok(/activity:function/.test(widget));assert.ok(/po-activity\.css/.test(widget));assert.ok(/po-activity\.js/.test(widget));
assert.ok(/data-po-activity/.test(fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8')));
console.log('PO Email Activity: exact IDs/scoped paging, retained refresh rows, denied/stale isolation, guarded retries, per-recipient attempts, unknown no-replay and read-only checks passed.');
