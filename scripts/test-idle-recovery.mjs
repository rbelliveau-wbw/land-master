// Execute actual native bodies using the established native-shaped Deluge harness.
// UI Save/Execute remains the syntax/system Added_Time verification gate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const source = name => fs.readFileSync(`creator/functions/${name}.dg`, 'utf8').replaceAll('\r\n', '\n');
const core = fs.readFileSync('scripts/test-quota-core.mjs', 'utf8');
const compilerText = core.slice(core.indexOf('function compile(source)'), core.indexOf('\nconst POLICY='))
  .replace('Cycle_State|Claimed_At)', 'Cycle_State|Claimed_At|Wake_At|Added_Time)');
const compile = vm.runInNewContext(`(${compilerText.trim()})`);
let harnessText = core.slice(core.indexOf('function harness('), core.indexOf('\nfunction state('));
harnessText = harnessText
  .replace("['Wake_At','Resume_At','Started_At','Claimed_At']", "['Wake_At','Resume_At','Started_At','Claimed_At','Added_Time']")
  .replace("const id=request.url.split('/').at(-1),row=tables.Workflow_Run_Log.find(row=>row.ID===id);", "const id=request.url.split('/').at(-1),table=request.url.includes('All_Workflow_Export_Locks')?'Workflow_Export_Lock':'Workflow_Run_Log',row=tables[table].find(row=>row.ID===id);")
  .replace("const row=hydrate({ID:String(nextId++),...data});", "const row=hydrate({ID:String(nextId++),Added_Time:clock.getTime(),...data});")
  .replace("let body={code:result.every(row=>row.code===3000)?3000:3001,result};", "let body={code:result.every(row=>row.code===3000)?3000:3001,result};if(rows.length===1&&!payload.result&&table==='Workflow_Export_Lock'&&rows[0].Claim_Key?.startsWith('0|recovery-hold|'))body={code:result[0].code,data:result[0].data};");
const NOW = Date.parse('2026-11-06T12:29:50Z');
const harness = vm.runInNewContext(`(${harnessText.trim()})`, {vm, compile, read:source, NOW, ID:'4410926000005159046'});
function setup(options = {}) {
  const h = harness(options);
  h.context.hash = text => crypto.createHash('sha256').update(text).digest('hex');
  h.exec('zoho.encryption={sha256:hash};');
  h.exec(compile(source('workflowRecoveryHold'))+';thisapp.workflowRecoveryHold=workflowRecoveryHold;');
  return h;
}
const json = (h, code) => h.json(code);
function begin(h, kind='frame', target='0|starter|4410926000000769023|'+NOW) {
  return h.exec(`thisapp.workflowRecoveryHold('begin',${JSON.stringify(kind)},${JSON.stringify(target)})`);
}
function addFrame(h, holdId, {id='7001', added=NOW, children=0, notices=0, failedNotice=false}={}) {
  const hold = json(h, `tables.Workflow_Export_Lock.find(x=>x.ID===${JSON.stringify(holdId)})`);
  const state = JSON.parse(hold.Cycle_State);
  const routes = ['route0','route1','route2','route3','route4','route5'];
  h.exec(`tables.Workflow_Export_Lock.push(hydrate(${JSON.stringify({ID:id,Claim_Key:state.target,Claimed_At:NOW,Added_Time:added,Wake_At:NOW+120*60000,Cycle_State:JSON.stringify({version:1,kind:'starter-cycle',routes,startupHoldId:holdId})})}));`);
  for(let i=0;i<children+notices;i++) {
    const isNotice = i>=children;
    const row = {ID:String(8001+i),Run_Status:isNotice?(failedNotice?'Running':'Failed'):'Success',Export_State:JSON.stringify({version:1,callbackPolicy:'shared-recovery-30m',kind:isNotice?'starter-notice':undefined,starterFrameId:id,starterRouteIndex:i,workflow:routes[i]})};
    h.exec(`tables.Workflow_Run_Log.push(hydrate(${JSON.stringify(row)}));`);
  }
  return id;
}
const query = (h,id) => json(h,`tables.Workflow_Export_Lock.find(x=>x.ID===${JSON.stringify(id)})`);

// Startup registers just AFTER the old clock's empty-hold read. It must arm
// another future clock even though the old callback is allowed to park.
{
  const h=setup({locks:[{ID:'501',Claim_Key:'0|recovery|'+NOW,Wake_At:NOW}]});
  h.exec(`var beforeFetch=fetchRecords,raced=false;fetchRecords=function(table,predicate,start,end){var rows=beforeFetch(table,predicate,start,end);if(!raced&&table==='Workflow_Export_Lock'&&predicate.toString().includes('0|recovery-hold|')){raced=true;thisapp.workflowRecoveryHold('begin','audit','after-idle-read');}return rows;};`);
  assert.match(h.exec("thisapp.workflowExportRecover('501')"),/parked/);
  assert.equal(json(h,"tables.Workflow_Export_Lock.filter(x=>x.Claim_Key.startsWith('0|recovery|')&&x.ID!=='501').length"),1);
}

// Idle does not allocate another clock; explicit arming always allocates one.
{
  const h=setup({locks:[{ID:'501',Claim_Key:'0|recovery|'+NOW,Wake_At:NOW}]});
  assert.match(h.exec("thisapp.workflowExportRecover('501')"),/parked/);
  assert.equal(json(h,'requests').length,0);
  assert.match(h.exec("thisapp.workflowExportRecover('arm')"),/^\d+$/);
  assert.equal(json(h,'requests').length,1);
}
// A failed native idle query is uncertainty, not proof that work is absent.
{
  const h=setup({locks:[{ID:'501',Claim_Key:'0|recovery|'+NOW,Wake_At:NOW}]});
  h.exec(`var beforeFetch=fetchRecords,failed=false;fetchRecords=function(table,predicate,start,end){if(!failed&&table==='Workflow_Export_Lock'&&predicate.toString().includes('0|recovery-hold|')){failed=true;throw Error('Native idle query temporarily unavailable');}return beforeFetch(table,predicate,start,end);};`);
  assert.doesNotMatch(h.exec("thisapp.workflowExportRecover('501')"),/parked/);
  assert.equal(json(h,"tables.Workflow_Export_Lock.filter(x=>x.Claim_Key.startsWith('0|recovery|')&&x.ID!=='501').length"),1);
}
// The hold commits BEFORE the clock. When that clock fires on the boundary,
// the still-open hold protects a startup paused before its target POST.
{
  const h=setup(), hold=begin(h);
  const requests=json(h,'requests');
  assert.ok(requests[0].payload.data.Claim_Key.startsWith('0|recovery-hold|'));
  assert.equal(JSON.stringify(requests[0].payload.skip_workflow),'["schedules"]');
  assert.ok(requests[1].payload.data.Claim_Key.startsWith('0|recovery|'));
  const clock=json(h,"tables.Workflow_Export_Lock.find(x=>x.Claim_Key.startsWith('0|recovery|'))");
  h.exec(`clock=new Date(${NOW+10000});`);
  h.exec(`thisapp.workflowExportRecover('${clock.ID}')`);
  assert.equal(json(h,"tables.Workflow_Export_Lock.filter(x=>x.Claim_Key.startsWith('0|recovery|')).length"),2);
  assert.equal(JSON.parse(query(h,hold).Cycle_State).status,'open');
}
// A frame committed on time survives a hard stop before close, even when the
// recovery check arrives after expiry. A caller itself cannot use expired check.
{
  const h=setup(), hold=begin(h), frame=addFrame(h,hold);
  h.exec(`clock=new Date(${NOW+31*60000});`);
  assert.throws(()=>h.exec(`thisapp.workflowRecoveryHold('check','${hold}','')`),/expired/);
  assert.equal(h.exec(`thisapp.workflowRecoveryHold('resolve','${hold}','')`),'Closed');
  assert.equal(JSON.parse(query(h,hold).Cycle_State).status,'closed');
  assert.equal(h.exec(`thisapp.workflowRecoveryHold('target','${hold}','${frame}')`),hold);
  assert.ok(query(h,frame).Wake_At,'frame marker remains until all six route outcomes exist');
}
// Partial launch leaves the marker. Six exact child/terminal notice outcomes
// close it. A Running notice is not a terminal acknowledgement.
for(const [children,notices,running,expected] of [[5,0,false,'Open'],[5,1,true,'Open'],[5,1,false,'Closed'],[6,0,false,'Closed']]) {
  const h=setup(), hold=begin(h), frame=addFrame(h,hold,{children,notices,failedNotice:running});
  assert.equal(h.exec(`thisapp.workflowRecoveryHold('settle','${frame}','')`),expected);
  assert.equal(query(h,frame).Wake_At==null,expected==='Closed');
}
// Marker closure during the idle scan cannot hide newly Running children:
// handoff reads are upstream-to-downstream, and audits are queried last.
{
  const h=setup({locks:[{ID:'501',Claim_Key:'0|recovery|'+NOW,Wake_At:NOW}]}), hold=begin(h), frame=addFrame(h,hold,{children:6});
  h.exec(`thisapp.workflowRecoveryHold('close','${hold}','${frame}');tables.Workflow_Run_Log.forEach(x=>x.Run_Status='Running');var beforeFetch=fetchRecords,raced=false;fetchRecords=function(table,predicate,start,end){var rows=beforeFetch(table,predicate,start,end);if(!raced&&table==='Workflow_Export_Lock'&&predicate.toString().includes('0|recovery-hold|')){raced=true;thisapp.workflowRecoveryHold('settle','${frame}','');}return rows;};`);
  assert.doesNotMatch(h.exec("thisapp.workflowExportRecover('501')"),/parked/);
  assert.ok(json(h,"tables.Workflow_Export_Lock.some(x=>x.Claim_Key.startsWith('0|recovery|')&&x.ID!=='501')"));
}
// An interrupted frame marker cannot become an immortal idle blocker merely
// because callback delivery was delayed beyond the old three-hour scan window.
{
  const h=setup({locks:[{ID:'501',Claim_Key:'0|recovery|'+NOW,Wake_At:NOW}]}), hold=begin(h), frame=addFrame(h,hold,{children:6});
  h.exec(`thisapp.workflowRecoveryHold('close','${hold}','${frame}');clock=new Date(${NOW+4*3600000});`);
  h.exec("thisapp.workflowExportRecover('501')");
  assert.equal(query(h,frame).Wake_At,null);
  assert.equal(json(h,'starterCalls.length'),1);
}
// Native criteria use two AND-only selections because Creator's serializer
// removes nested OR grouping. They share one eight-frame execution bound.
for(const [newCount,legacyCount] of [[9,9],[3,9],[0,9]]) {
  const locks=[{ID:'501',Claim_Key:'0|recovery|'+NOW,Wake_At:NOW}];
  for(let i=0;i<newCount+legacyCount;i++) {
    const fresh=i<newCount;
    const epoch=NOW-60*60000-i*1000;
    locks.push({ID:String(6000+i),Claim_Key:'0|starter|4410926000000769023|'+epoch,Claimed_At:epoch,Wake_At:fresh?NOW+60*60000:null,Cycle_State:JSON.stringify({version:1,kind:'starter-cycle',...(fresh?{startupHoldId:'9001'}:{})})});
  }
  const h=setup({locks});
  h.exec("thisapp.workflowExportRecover('501')");
  const selected=json(h,'starterCalls');
  assert.equal(selected.length,8,'new and legacy selections share a global bound');
  assert.equal(new Set(selected).size,8,'a frame is never dispatched twice');
  assert.equal(selected.filter(id=>Number(id)<6000+newCount).length,Math.min(newCount,8),'new open frame intents retain priority');
}
// A late frame is permanently rejected, diagnosed once, and can release its
// marker without pretending that six imports ran. Repeated resolve never POSTs.
{
  const h=setup(), hold=begin(h), frame=addFrame(h,hold,{added:NOW+31*60000});
  h.exec(`clock=new Date(${NOW+32*60000});`);
  h.exec(`thisapp.workflowRecoveryHold('resolve','${hold}','')`);
  assert.equal(JSON.parse(query(h,hold).Cycle_State).status,'failed');
  assert.throws(()=>h.exec(`thisapp.workflowRecoveryHold('target','${hold}','${frame}')`),/failed/);
  const posts=json(h,"requests.filter(x=>x.type==='POST'&&x.url.endsWith('/Workflow_Run_Log')).length");
  assert.equal(posts,1);
  h.exec(`thisapp.workflowRecoveryHold('resolve','${hold}','')`);
  assert.equal(json(h,"requests.filter(x=>x.type==='POST'&&x.url.endsWith('/Workflow_Run_Log')).length"),posts);
  assert.equal(h.exec(`thisapp.workflowRecoveryHold('settle','${frame}','')`),'Closed');
  assert.equal(query(h,frame).Wake_At,null);
}
// Hard stop before any target: bounded orphan expiry, one diagnostic, no replay.
{
  const h=setup(), hold=begin(h,'audit','manual-attempt-1');
  h.exec(`clock=new Date(${NOW+31*60000});`);
  h.exec(`thisapp.workflowRecoveryHold('resolve','${hold}','')`);
  assert.equal(JSON.parse(query(h,hold).Cycle_State).status,'failed');
  assert.equal(query(h,hold).Wake_At,null);
  const count=json(h,'requests.length');
  assert.throws(()=>begin(h,'audit','manual-attempt-1'),/already exists/);
  assert.equal(json(h,'requests.length'),count,'an existing attempt never authorizes a new POST');
}
// Exact audit target correlation handles an accepted reply lost before closure.
{
  const h=setup(), hold=begin(h,'audit','manual-attempt-2');
  h.exec(`tables.Workflow_Run_Log.push(hydrate({ID:'8001',Added_Time:${NOW},Run_Status:'Running',Export_State:JSON.stringify({version:1,callbackPolicy:'shared-recovery-30m',startupHoldId:'${hold}',startupHoldTarget:'manual-attempt-2'})}));`);
  assert.equal(h.exec(`thisapp.workflowRecoveryHold('close','${hold}','8001')`),'Closed');
  assert.equal(JSON.parse(query(h,hold).Cycle_State).targetId,'8001');
}
// Recovery may reconcile the target while its original POST reply is delayed.
// The caller's post-ack close accepts that exact settled target without a PATCH.
{
  const h=setup(), hold=begin(h), frame=addFrame(h,hold);
  assert.equal(h.exec(`thisapp.workflowRecoveryHold('resolve','${hold}','')`),'Closed');
  const count=json(h,'requests.length');
  assert.equal(h.exec(`thisapp.workflowRecoveryHold('close','${hold}','${frame}')`),'Closed');
  assert.equal(json(h,'requests.length'),count);
}
// Lost creation acknowledgement never allows a caller to post its target.
{
  const h=setup();
  h.exec(`var originalHttp=fixtureHttp;fixtureHttp=function(request){var response=originalHttp(request);if(request.type==='POST'&&JSON.parse(request.parameters).data.Claim_Key?.startsWith('0|recovery-hold|'))throw Error('Lost hold reply after commit');return response;};`);
  assert.throws(()=>begin(h),/Lost hold reply/);
  assert.equal(json(h,"tables.Workflow_Export_Lock.filter(x=>x.Claim_Key.startsWith('0|recovery-hold|')).length"),1);
  assert.equal(json(h,"tables.Workflow_Export_Lock.filter(x=>x.Claim_Key.startsWith('0|recovery|')).length"),0);
}
// Coordination PATCH reply loss is reconciled read-only; it is not replayed.
{
  const h=setup(), hold=begin(h), frame=addFrame(h,hold);
  h.exec(`var originalHttp=fixtureHttp;fixtureHttp=function(request){var response=originalHttp(request);if(request.type==='PATCH')throw Error('Lost closure reply after commit');return response;};`);
  assert.equal(h.exec(`thisapp.workflowRecoveryHold('close','${hold}','${frame}')`),'Closed');
  assert.equal(json(h,"requests.filter(x=>x.type==='PATCH').length"),1);
}
// A bounded reconciliation scan may not be mistaken for an absent target.
{
  const h=setup(), hold=begin(h,'audit','bounded-attempt');
  for(let i=0;i<8;i++) h.exec(`tables.Workflow_Run_Log.push(hydrate({ID:'${8800+i}',Added_Time:${NOW},Run_Status:'Success',Export_State:JSON.stringify({startupHoldId:'${hold}0',startupHoldTarget:'other'})}));`);
  h.exec(`clock=new Date(${NOW+31*60000});`);
  assert.throws(()=>h.exec(`thisapp.workflowRecoveryHold('resolve','${hold}','')`),/bounded scan/);
  assert.equal(JSON.parse(query(h,hold).Cycle_State).status,'open');
}
console.log('Idle recovery native-body checks passed: idle parking, arm/park boundary, holds, exact targets, deadlines, partial/terminal frames, late commit refusal, and finite orphan diagnostics.');
