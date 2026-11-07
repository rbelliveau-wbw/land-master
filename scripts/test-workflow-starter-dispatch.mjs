// Execute the real frame/start/dispatch bodies with the real claim, logger and
// captured enqueue core. Native compilation and combined capacity remain separate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {starterHarness,starterFrame,compileStarter,FRAME_ID,SETTINGS_ID,NOW,STARTER_ROUTES} from './test-quota-starters.mjs';

const read=name=>fs.readFileSync('creator/functions/'+name+'.dg','utf8').replace(/\r\n/g,'\n');
const nativeText=epoch=>{const d=new Date(epoch),pad=n=>String(n).padStart(2,'0'),h=d.getUTCHours();return pad(d.getUTCMonth()+1)+'/'+pad(d.getUTCDate())+'/'+d.getUTCFullYear()+' '+pad(h%12||12)+':'+pad(d.getUTCMinutes())+':'+pad(d.getUTCSeconds())+' '+(h>=12?'PM':'AM');};
function compileOwned(source){
  return compileStarter(source
    .replace(/Workflow_Run_Log\[Export_State\.contains\("starterFrameId"\) && Export_State\.contains\(frameId\)\] range from 0 to 31/g,'fixtureLinkedRuns(frameId)')
    .replace(/Workflow_Export_Lock\[Claim_Key\.contains\(framePrefix\) && Cycle_State != null && Claimed_At >= recentAfter\] range from 0 to 7/g,'fixtureStarterFrames(framePrefix,recentAfter)'));
}
function harness(options={}){
  const h=starterHarness(options);
  h.exec(`
    function fixtureLinkedRuns(id){return tables.Workflow_Run_Log.filter(run=>run.Export_State?.includes('starterFrameId')&&run.Export_State.includes(id)).slice(0,32);}
    function fixtureStarterFrames(prefix,after){return tables.Workflow_Export_Lock.filter(row=>row.Claim_Key.includes(prefix)&&row.Cycle_State!=null&&row.Claimed_At>=after).slice(0,8);}
    Date.prototype.addHour=function(hours){return this.addMinutes(hours*60);};
  `);
  for(const name of ['workflowStarterFrame','workflowStarterDispatch','workflowStarterStart'])h.exec(compileOwned(read(name))+';thisapp.'+name+'='+name+';');
  return {...h,dispatch:(id=FRAME_ID)=>JSON.parse(h.exec('workflowStarterDispatch('+JSON.stringify(id)+')')),start:()=>JSON.parse(h.exec('workflowStarterStart('+JSON.stringify(SETTINGS_ID)+')'))};
}

for(const mode of ['', 'claim-lost']){
  const h=harness({frame:null,mode});const cycleAt=nativeText(NOW-60000);
  const id=h.exec('workflowStarterFrame('+JSON.stringify(SETTINGS_ID)+','+JSON.stringify(cycleAt)+',2)');assert.equal(typeof id,'string');
  const rows=h.json('tables.Workflow_Export_Lock');assert.equal(rows.length,1);const frozen=JSON.parse(rows[0].Cycle_State);assert.equal(frozen.batch,2);assert.equal(frozen.cycleEpoch,NOW-60000);assert.equal(frozen.expiresAt,NOW+119*60000);assert.deepEqual(frozen.routes,STARTER_ROUTES);assert.equal(h.exec('tables.Workflow_Export_Lock[0].Wake_At.toLong()'),NOW+119*60000,'new frame retains an unresolved marker while schedule triggers are suppressed');assert.equal(h.json('calls[0].type'),'hold');assert.equal(h.json('calls[0].action'),'begin');assert.equal(h.json('calls[1].type'),'recover');assert.equal(frozen.startupHoldId,h.json('holds[0].id'));assert.equal(h.json('holds[0].status'),'closed');assert.deepEqual(h.json('requests[0].payload.skip_workflow'),['schedules']);
  const count=h.json('requests.length');assert.equal(h.exec('workflowStarterFrame('+JSON.stringify(SETTINGS_ID)+','+JSON.stringify(cycleAt)+',3)'),id);assert.equal(h.json('requests.length'),count,'a later Settings batch cannot rewrite the first immutable frame');
}
// Simulate an execution stopping after the independent frame commit but
// before its target acknowledgement/hold close. The persisted metadata must
// still protect recovery without accepting any child or source work.
{
  const h=harness({frame:null}),source=read('workflowStarterFrame'),boundary=source.indexOf('\n\tif(frame.count() != 1 || frame.Cycle_State == null');
  assert.ok(boundary>0,'hard-stop fixture uses the exact post-commit boundary');
  const interrupted=source.slice(0,boundary)+'\nreturn frame.ID.toString();\n}';
  h.exec(compileOwned(interrupted));const cycleAt=nativeText(NOW-60000);const id=h.exec('workflowStarterFrame('+JSON.stringify(SETTINGS_ID)+','+JSON.stringify(cycleAt)+',2)');
  assert.equal(h.json('holds.length'),1);assert.equal(h.json('holds[0].status'),'open');assert.equal(h.json('tables.Workflow_Run_Log.length'),0);assert.equal(h.json('wakes.length'),0);
  const frame=h.json('tables.Workflow_Export_Lock[0]');assert.equal(JSON.parse(frame.Cycle_State).startupHoldId,h.json('holds[0].id'));assert.ok(frame.Wake_At);
  // The full original function may reconcile that same timely native frame.
  h.exec(compileOwned(source)+';thisapp.workflowStarterFrame=workflowStarterFrame;');
  assert.equal(h.exec('workflowStarterFrame('+JSON.stringify(SETTINGS_ID)+','+JSON.stringify(cycleAt)+',3)'),id,'post-hard-stop read-only reconciliation retains the winner and batch');
  assert.equal(h.json('requests.length'),1,'reconciling a committed frame never repeats its POST');
}
for(const batch of [-1,5]){
  const h=harness({frame:null});assert.throws(()=>h.exec('workflowStarterFrame('+JSON.stringify(SETTINGS_ID)+','+JSON.stringify(nativeText(NOW))+','+batch+')'));assert.equal(h.json('requests.length'),0);
}
for(const settings of [[],[{ID:SETTINGS_ID,Current_Batch:2},{ID:'4410926000000000022',Current_Batch:3}]]){
  const h=harness({frame:null,settings});assert.throws(()=>h.exec('workflowStarterFrame('+JSON.stringify(SETTINGS_ID)+','+JSON.stringify(nativeText(NOW))+',2)'),/exactly one Settings/);assert.equal(h.json('requests.length'),0,'framed calls retain the existing single-Settings invariant');
}
{
  const h=harness({frame:null,recoveryFailure:true});assert.throws(()=>h.exec('workflowStarterFrame('+JSON.stringify(SETTINGS_ID)+','+JSON.stringify(nativeText(NOW))+',2)'),/recovery successor/);assert.equal(h.json('tables.Workflow_Export_Lock.length'),0,'no frame is committed without a recovery clock');
}
{
  const h=harness();const first=h.dispatch();assert.equal(first.ok,true);assert.equal(first.newlyQueued,6);assert.equal(first.acknowledged,6);assert.equal(h.json('tables.Workflow_Run_Log.length'),6);assert.equal(h.json('wakes.length'),6);assert.equal(h.json('calls.filter(call=>call.type==="plan").length'),6);
  const count=h.json('requests.length'),calls=h.json('calls.length');const repeat=h.dispatch();assert.equal(repeat.ok,true);assert.equal(repeat.newlyQueued,0);assert.equal(repeat.notices.length,0);assert.equal(h.json('requests.length'),count);assert.equal(h.json('calls.length'),calls,'completed handoffs require only native reads, not more API requests');
}
{
  const h=harness({frame:null,settings:[{ID:SETTINGS_ID,Current_Batch:2}]});h.exec('tables.Settings[0].Next_Workflow_Run=new Date(clock.getTime()-60000);');
  const first=h.start();assert.equal(first.batch,2);assert.equal(first.newlyQueued,6);const count=h.json('requests.length');
  h.exec('tables.Settings[0].Current_Batch=3;tables.Settings[0].Next_Workflow_Run=new Date(clock.getTime()+179*60000);');
  const second=h.start();assert.equal(second.frameId,first.frameId);assert.equal(second.batch,2);assert.equal(second.newlyQueued,0);assert.equal(h.json('requests.length'),count,'anchor-first and starter-first orderings use the same frame');
}
for(const future of [true,false]){
  const h=harness({settings:[{ID:SETTINGS_ID,Current_Batch:3}]});h.exec('tables.Settings[0].Next_Workflow_Run=new Date('+ (future?NOW+120*60000:NOW-60*60000)+');');const result=h.start();assert.equal(result.batch,2,'old due/new cursor and new due/new cursor both use the persisted pre-anchor batch');assert.ok(h.json('calls.filter(call=>call.type==="plan"&&["Budgets_Check_HCSS_Budget1","Budgets_Import_Load_HCSS_","Budgets_Import_Load_GP_Co","Budgets_Import_Great_Plai1"].includes(call.workflow)).every(call=>call.batch===2)'));
}
{
  const h=harness({frame:null});h.exec('tables.Settings[0].Next_Workflow_Run=new Date(clock.getTime()+60000);');assert.throws(h.start,/no acknowledged due starter frame/);assert.equal(h.json('requests.length'),0,'future Settings without a frame cannot infer or reverse a batch');
}
{
  const h=harness();h.attempt(3);const result=h.dispatch();assert.equal(result.newlyQueued,5);assert.equal(result.acknowledged,6);assert.equal(h.json('tables.Workflow_Run_Log.length'),6,'already queued routes retain their original audit IDs');
}
{
  const h=harness();h.exec('workflowExportClaim('+JSON.stringify(FRAME_ID+'|starter|2')+')');let result=h.dispatch();assert.equal(result.newlyQueued,5);assert.equal(result.ownedWithoutAcknowledgement,1);assert.equal(result.notices.length,0,'a fresh claim can still be publishing its first audit');
  h.exec('clock=clock.addMinutes(31);');result=h.dispatch();assert.equal(result.newlyQueued,0);assert.equal(result.notices.length,1);const notices=h.json('tables.Workflow_Run_Log.filter(run=>JSON.parse(run.Export_State).kind==="starter-notice")');assert.equal(notices.length,1);assert.equal(notices[0].Run_Status,'Failed');const count=h.json('requests.length');h.dispatch();assert.equal(h.json('requests.length'),count,'an owned unknown route is never enqueued and its visible notice is not duplicated');assert.equal(h.json('calls.filter(call=>call.type==="plan").length'),5);
}
for(const mode of ['plan-error','start-lost','arming-lost','wake-lost','waiting-lost']){
  const h=harness({mode});const result=h.dispatch();assert.equal(result.ownedWithoutAcknowledgement,6);assert.equal(h.json('tables.Workflow_Run_Log.length'),6,'ordinary route errors cannot prevent later independent audit attempts');const count=h.json('requests.length'),wakes=h.json('wakes.length');h.dispatch();assert.equal(h.json('requests.length'),count);assert.equal(h.json('wakes.length'),wakes,'unknown or failed handoffs are only reconciled, never replayed');
}
{
  const h=harness({mode:'claim-lost'});h.dispatch();assert.equal(h.json('tables.Workflow_Run_Log.length'),0);assert.equal(h.json('wakes.length'),0);assert.equal(h.json('calls.filter(call=>call.type==="plan").length'),0);const count=h.json('requests.length');h.dispatch();assert.equal(h.json('requests.length'),count,'lost committed route claims cannot authorize an enqueue on repeat');
}
{
  const h=harness({frame:starterFrame({cycleAt:NOW-121*60000})});const result=h.dispatch();assert.equal(result.expiredUnclaimed,6);assert.equal(result.newlyQueued,0);assert.equal(h.json('calls.filter(call=>call.type==="plan").length'),0);const notices=h.json('tables.Workflow_Run_Log');assert.equal(notices.length,6);assert.ok(notices.every(run=>run.Run_Status==='Timed Out'));assert.ok(notices.every(run=>JSON.parse(run.Export_State).kind==='starter-notice'));const count=h.json('requests.length');h.dispatch();assert.equal(h.json('requests.length'),count,'expired missing routes get bounded durable notices without starting business work');
}
for(const extra of [{routes:[...STARTER_ROUTES].reverse()},{version:2},{expiresAt:NOW+12345},{batch:2.5}]){
  const h=harness({frame:starterFrame(extra)});assert.throws(h.dispatch);assert.equal(h.json('requests.length'),0);assert.equal(h.json('calls.length'),0);
}
for(const name of ['workflowStarterFrame','workflowStarterDispatch','workflowStarterStart']){
  const text=read(name);assert.doesNotMatch(text,/while\s*\(|insert into|delete from/);assert.doesNotMatch(text,/\.Current_Batch\s*=(?!=)|\.Next_Workflow_Run\s*=(?!=)/,'helpers do not change the shared clock or cursor');assert.match(text,/\breturn [^;]+;\s*}\s*$/,'outer fallback return stays compile-safe');
}
const anchorCases=[
  {hours:3,file:'creator/quota-starter-consolidation-2026-11-06/workflows/Next_Workflow_Run_Next_Ba.action-1.dg'},
  {hours:5,file:'creator/quota-five-hour-recovery-2026-11-06/workflows/Next_Workflow_Run_Next_Ba.action-1.dg'}
].map(item=>({...item,body:fs.readFileSync(item.file,'utf8')}));
function runAnchor(h,{body:anchorBody,hours}){
  h.exec('function fixtureUpdateClock(values){Object.assign(tables.Settings[0],values);return true;}');
  const update=new RegExp('update settings\\s*\\[\\s*Current_Batch=nextBatch\\s*Next_Workflow_Run=cycleDate\\.addHour\\('+hours+'\\)\\s*\\];');
  const translated=anchorBody.replace(update,'fixtureUpdateClock({Current_Batch:nextBatch,Next_Workflow_Run:cycleDate.addHour('+hours+')});');
  assert.notEqual(translated,anchorBody,'translate only the exact existing atomic Settings update');
  h.exec(compileOwned('string starterAnchorProbe()\n{\n'+translated+'\nreturn "Done";\n}'));
  return h.exec('starterAnchorProbe()');
}
for(const anchor of anchorCases)for(const cursor of [null,-1,0,1,2,3,4,5])for(const failure of ['none','arm','create']){
  const h=harness({frame:null,settings:[{ID:SETTINGS_ID,Current_Batch:cursor}],recoveryFailure:failure==='arm'});h.exec('tables.Settings[0].Next_Workflow_Run=new Date('+NOW+');');
  if(failure==='create')h.exec('fixtureHttp=function(request){requests.push(request);return {responseCode:500,responseText:"{}"};};');
  assert.equal(runAnchor(h,anchor),'Done');assert.equal(h.json('tables.Settings[0].Current_Batch'),cursor!=null&&cursor>=0&&cursor<4?cursor+1:0);assert.equal(h.exec('tables.Settings[0].Next_Workflow_Run.toLong()'),NOW+anchor.hours*3600000,'even failed frame arming/creation cannot stop or double the captured clock');
  if(failure!=='none'){assert.equal(h.json('tables.Workflow_Export_Lock.length'),0);assert.equal(h.json('messages.length'),1);}
  else{const frame=h.json('tables.Workflow_Export_Lock.find(row=>row.Cycle_State&&JSON.parse(row.Cycle_State).kind==="starter-cycle")');assert.equal(JSON.parse(frame.Cycle_State).batch,cursor!=null&&cursor>=0&&cursor<=4?cursor:0,'freeze the pre-advance batch once');}
  assert.equal(h.json('wakes.length'),0,'anchor freezes metadata but never queues or executes child import work');
  assert.equal(h.json('calls.filter(call=>call.type==="plan").length'),0);
}
for(const anchor of anchorCases){
  const h=harness({frame:null,settings:[{ID:SETTINGS_ID,Current_Batch:2}]});h.exec('tables.Settings[0].Next_Workflow_Run=new Date('+NOW+');thisapp.workflowStarterFrame=function(){tables.Settings[0].Current_Batch=3;tables.Settings[0].Next_Workflow_Run=tables.Settings[0].Next_Workflow_Run.addHour('+anchor.hours+');return "another-anchor-frame";};');
  runAnchor(h,anchor);assert.equal(h.json('tables.Settings[0].Current_Batch'),3);assert.equal(h.exec('tables.Settings[0].Next_Workflow_Run.toLong()'),NOW+anchor.hours*3600000,'a concurrent advance while the API call runs cannot double the captured interval');
}
{
  const anchor=anchorCases.find(item=>item.hours===5),h=harness({frame:null,settings:[{ID:SETTINGS_ID,Current_Batch:0}]});
  h.exec('tables.Settings[0].Next_Workflow_Run=new Date('+NOW+');');
  for(let step=0;step<5;step++){h.exec('clock=new Date(tables.Settings[0].Next_Workflow_Run.toLong());');runAnchor(h,anchor);}
  const batches=h.json('tables.Workflow_Export_Lock.filter(row=>row.Cycle_State&&JSON.parse(row.Cycle_State).kind==="starter-cycle").map(row=>JSON.parse(row.Cycle_State).batch)');
  assert.equal(JSON.stringify(batches),'[0,1,2,3,4]','five-hour cycles preserve all five batches without skips');
  assert.equal(h.json('tables.Settings[0].Current_Batch'),0,'the five-batch sweep wraps once');
  assert.equal(h.exec('tables.Settings[0].Next_Workflow_Run.toLong()'),NOW+25*3600000,'a full five-batch sweep now covers exactly25 nominal hours');
  assert.equal(h.json('wakes.length'),0);
}
console.log('PASS: immutable frame capture, six independent canonical enqueues and failure/no-replay recovery; historical3h/current5h anchor matrices, all0–4 batch captures, no business work in anchor, concurrent-clock isolation, and exact25h five-batch sweep. Native compilation/capacity remain separate gates.');
