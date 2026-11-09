import assert from 'node:assert/strict';
import {read,action,removeAuditStart,routes,changed,added,task} from './prepare-resumable-daily-exports.mjs';
import {normalizeNative as n} from './verify-workflow-quota-native.mjs';
import {starterHarness,compileStarter} from './test-quota-starters.mjs';
import {harness,run,NOW,ID,compile} from './test-quota-core.mjs';
const fn=name=>read('creator/functions/'+name+'.dg'),before=name=>read(task+'/native-before/'+name+'.dg');
const daily=fn('workflowExportDailyRun');
for(const route of routes){
  const old=read(task+'/native-before/'+route+'.ds'),current=read(task+'/workflows/'+route+'.ds');
  assert.equal(n(current.replace(action(current),action(old))),n(old),'Only the native action changes: '+route);
  assert.equal(n(action(current)),n('thisapp.workflowExportEnqueue("'+route+'");'));
  if(route!==routes[0]){
    const body=removeAuditStart(action(old)).replaceAll('thisapp.analyticsExportRows(','thisapp.workflowPreparedExportRows(');
    assert.ok(n(daily).includes(n(body)),'Preserve every business token, write, guard, count and failure handler: '+route);
  }
  const h=starterHarness({frame:null});
  h.exec(compileStarter(fn('workflowExportPlan'))+';thisapp.workflowExportPlan=workflowExportPlan;');
  const id=h.exec('workflowExportEnqueue('+JSON.stringify(route)+')');
  assert.match(id,/^[0-9]+$/);assert.equal(h.json('tables.Workflow_Run_Log.length'),1);
  const record=h.json('tables.Workflow_Run_Log[0]'),state=JSON.parse(record.Export_State);
  assert.equal(state.workflow,route);assert.equal(state.callbackPolicy,'shared-recovery-30m');
  assert.equal(state.phase,'waiting');assert.equal(state.requests.length,1);assert.equal(state.batch,0);
  assert.equal(state.requests[0].allowEmpty,route==='Milestone_Bi_Directional_1');
  assert.ok(h.json('wakes.length')>0,'A primary wake is actually created');
}
let employee=fn('crewSyncEmployeesRun').replace('map crewSyncEmployeesRun(bool dryRun, string preparedAuditId)','map crewSyncEmployees(bool dryRun)')
  .replace('auditId = ifnull(preparedAuditId,""); prepared = auditId != "";','auditId = "";')
  .replace('if(!dryRun && !prepared)','if(!dryRun)')
  .replace(/\s*if\(prepared && dryRun\)[\s\S]*?(?=\s*stage = "Reading employee directory";)/,'')
  .replace(/if\(prepared\) \{ rows = thisapp.workflowPreparedExportRows\(([^;]+)\); }\s*else \{ rows = thisapp.analyticsExportRows\(\1\); }/,'rows = thisapp.analyticsExportRows($1);');
assert.equal(n(employee),n(before('crewSyncEmployees')),'Manual/dry-run employee business rules are unchanged');
assert.match(fn('crewSyncEmployeesRun'),/queuedState.get\("workflow"\) != "Daily_Crew_Employees"/);
assert.match(fn('crewSyncEmployees'),/return thisapp.crewSyncEmployeesRun\(dryRun,""\);/);
for(const route of routes)for(const code of ['1001','1002']){
  const extra={workflow:route,actualPhase:null,actualDeadline:null,phase:'waiting',checkpointAt:NOW,pollNumber:2,requests:[{view:'source',job:'job-1',code,config:{}}],deadline:NOW+15*60000,deadlineAt:'11/05/2026 12:15:00 PM'};
  const h=harness({runs:[run(extra,{Resume_At:NOW})],jobStatus:code});h.exec('workflowExportTick("'+ID+'")');
  const saved=JSON.parse(h.json('tables.Workflow_Run_Log[0].Export_State'));
  assert.equal(saved.requests[0].job,'job-1');assert.equal(saved.deadline,extra.deadline);
  assert.deepEqual(h.json('businessCalls'),[],'Pending beyond the old twelve-check window never starts writes');
  assert.equal(h.json('tables.Workflow_Run_Log[0].Resume_At.toLong()'),NOW+4*60000);
}
for(const name of [...changed,...added]){
  const source=fn(name);assert.doesNotMatch(source,/containsKey|\bwhile\s*\(/);
  assert.match(source,/return [^;]+;\s*}\s*$/,'Unconditional outer return: '+name);
}
console.log('PASS: all four canonical enqueues, actual captured request configurations, native schedule timing/state preservation, complete business-token preservation, unchanged employee manual/dry-run behavior, pending 1001/1002 no-write backoff and fixed deadlines.');
