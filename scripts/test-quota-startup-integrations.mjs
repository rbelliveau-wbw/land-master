// Execute the canonical Budget successor handoff independently of the business
// action that has already committed. Real hold/clock bodies have separate tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {starterHarness,compileStarter,NOW} from './test-quota-starters.mjs';
const source=fs.readFileSync('creator/functions/workflowExportRun.dg','utf8').replace(/\r\n/g,'\n');
const begin=source.indexOf('\t\tif(budgetAction < 3)'),end=source.indexOf('\n\t}\n\telse if(runKey == "Sync_Final_Acceptance_Due")',begin);
assert.ok(begin>=0&&end>begin,'extract only the unchanged successor boundary after the completed Budget action');
const block=source.slice(begin,end);
const PARENT='4410926000005828380';
function harness(mode='',policy='shared-recovery-30m'){
  const h=starterHarness({frame:null,mode});
  h.exec('var queuedAuditId='+JSON.stringify(PARENT)+',runKey="Update_Budgets_w_Projects1",state={callbackPolicy:'+JSON.stringify(policy)+'};tables.Workflow_Run_Log.push(hydrate({ID:queuedAuditId,Workflow_Name:"Completed Budget business action",Run_Status:"Success",Rows_Updated:102,Export_State:JSON.stringify(state),Started_At:new Date(clock.getTime()-60000)}));');
  h.exec(compileStarter('string successorStartupFixture(int budgetAction)\n{\n'+block+'\nreturn "No successor";\n}'));
  return h;
}
for(const action of [1,2]){
  const h=harness();assert.equal(h.exec('successorStartupFixture('+action+')'),'Queued Budget action '+(action+1));
  const rows=h.json('tables.Workflow_Run_Log'),child=rows[1],seed=JSON.parse(h.json('requests.find(r=>r.type==="POST"&&r.url.includes("/form/Workflow_Run_Log")).payload.data.Export_State'));
  const state=JSON.parse(child.Export_State),hold=h.json('holds[0]');
  assert.equal(rows[0].Run_Status,'Success');assert.equal(rows[0].Rows_Updated,102,'startup does not repeat or invalidate prior financial work');
  assert.equal(seed.budgetAction,action+1);assert.equal(seed.predecessor,PARENT);assert.equal(seed.startupHoldId,hold.id);assert.equal(seed.startupHoldTarget,PARENT+'|budget-successor|'+(action+1));
  assert.equal(state.phase,'waiting');assert.equal(state.startupHoldId,hold.id);assert.equal(hold.targetId,child.ID);assert.equal(hold.status,'closed');
  assert.equal(h.exec('tables.Workflow_Run_Log[1].Resume_At.toLong()'),NOW+60000);assert.equal(h.json('wakes.length'),1);
  const trace=h.json('startupTimeline'),at=(type,action)=>trace.findIndex(e=>e.type===type&&(!action||e.action===action)),create=trace.findIndex(e=>e.type==='http'&&e.method==='POST'&&e.url.includes('/form/Workflow_Run_Log'));
  assert.ok(at('hold','begin')<at('recover')&&at('recover')<at('hold','check')&&at('hold','check')<create&&create<at('hold','close'),'independent startup protection precedes successor audit and its exact acknowledgement closes it');
}
for(const mode of ['hold-begin-lost','hold-check-before','hold-close-lost','hold-close-expired','start-lost','arming-lost','wake-lost','waiting-lost']){
  const h=harness(mode);assert.equal(h.exec('successorStartupFixture(1)'),'Completed action; successor queue requires review');
  assert.equal(h.json('tables.Workflow_Run_Log[0].Rows_Updated'),102,'unknown successor never replays the predecessor business action');
  const posted=h.json('requests.filter(r=>r.type==="POST"&&r.url.includes("/form/Workflow_Run_Log")).length');
  assert.equal(posted,['hold-begin-lost','hold-check-before'].includes(mode)?0:1,'ambiguous successor is never created twice');
  if(mode.startsWith('hold-'))assert.equal(h.json('wakes.length'),0,'failed startup protection cannot enqueue a Budget continuation');
  assert.ok(h.json('wakes.length')<=1,'a lost wake reply cannot be replayed');
}
{
  const h=harness('','legacy');assert.equal(h.exec('successorStartupFixture(1)'),'Queued Budget action 2');assert.equal(h.json('holds.length'),0,'in-flight legacy policy preserves its existing handoff');assert.equal(h.json('wakes.length'),1);
}
{
  const h=harness();assert.equal(h.exec('successorStartupFixture(3)'),'No successor');assert.equal(h.json('holds.length'),0);assert.equal(h.json('requests.length'),0,'the final Budget action never creates an extra successor or recovery intent');
}
console.log('PASS: canonical Budget successor2/3 durablehold/clock/auditordering, exactimmutabletargetmetadata,1minhandoff, unchangedcompletedpredecessor, startup/audit/wakeunknownnoreplay, legacyandfinalactionbehavior.');
