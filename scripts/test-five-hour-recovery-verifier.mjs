import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {verifyFiveHourRecoveryNative} from './verify-five-hour-recovery-native.mjs';
import {normalizeNative} from './verify-workflow-quota-native.mjs';
const task='creator/quota-five-hour-recovery-2026-11-06',prod=task+'/native-before/production-v9.160',dev=task+'/native-before/development-prechange';
const beforePath=prod+'/manifest.json',before=fs.readFileSync(beforePath),baseline=JSON.parse(before),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'five-hour-native-verifier-'));
const anchorPath=task+'/workflows/Next_Workflow_Run_Next_Ba.action-1.dg';
const anchorBefore=fs.readFileSync(prod+'/Next_Workflow_Run_Next_Ba.ds','utf8');
const anchorStart=anchorBefore.indexOf('(',anchorBefore.indexOf('on load'))+1,anchorEnd=anchorBefore.lastIndexOf(')');
assert.ok(anchorStart>0&&anchorEnd>anchorStart);
const oldAction=normalizeNative(anchorBefore.slice(anchorStart,anchorEnd)),newAction=normalizeNative(fs.readFileSync(anchorPath,'utf8'));
assert.equal(newAction,oldAction.replace('Next_Workflow_Run=cycleDate.addHour(3)','Next_Workflow_Run=cycleDate.addHour(5)'),'five-hour candidate changes only the approved interval outside comments/formatting');
assert.notEqual(newAction,oldAction,'the requested five-hour cadence is actually present');
function candidate(environment){const parts=[];for(const item of baseline.components){let text;if(item.kind==='function')text=fs.readFileSync('creator/functions/'+item.name+'.dg','utf8');else text=fs.readFileSync((item.name==='Settings'&&environment==='development'?dev:prod)+'/'+item.file,'utf8');if(item.name==='Next_Workflow_Run_Next_Ba'&&fs.existsSync(task+'/workflows/Next_Workflow_Run_Next_Ba.action-1.dg')){const candidate=fs.readFileSync(task+'/workflows/Next_Workflow_Run_Next_Ba.action-1.dg','utf8'),start=text.indexOf('on load'),open=text.indexOf('(',start),close=text.lastIndexOf(')');assert.ok(open>=0&&close>open);text=text.slice(0,open+1)+candidate+text.slice(close);}if(item.kind==='form')text='\t\t'+text.trimStart();parts.push(text);}parts.push(fs.readFileSync('creator/functions/workflowRecoveryHold.dg','utf8'));return parts.join('\n\n');}
for(const environment of ['development','stage','production']){const file=path.join(tmp,environment+'.ds');fs.writeFileSync(file,candidate(environment));const result=verifyFiveHourRecoveryNative({source:file,environment,snapshotName:'verifier-fixture-'+environment});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.matched,41);}
const altered=path.join(tmp,'altered.ds');fs.writeFileSync(altered,candidate('production').replace('Unknown Creator environment for export recovery.','Changed quoted failure text.'));const negative=verifyFiveHourRecoveryNative({source:altered,environment:'production',snapshotName:'verifier-fixture-negative'});assert.equal(negative.ok,false);assert.ok(negative.mismatches.some(x=>x.name==='workflowExportRecover'));
const wrongInterval=path.join(tmp,'old-three-hour.ds'),fiveHourSource=candidate('production');
assert.equal(fiveHourSource.split('Next_Workflow_Run=cycleDate.addHour(5)').length,2,'one native anchor owns the shared clock');
fs.writeFileSync(wrongInterval,fiveHourSource.replace('Next_Workflow_Run=cycleDate.addHour(5)','Next_Workflow_Run=cycleDate.addHour(3)'));
const oldClock=verifyFiveHourRecoveryNative({source:wrongInterval,environment:'production',snapshotName:'verifier-fixture-old-three-hour'});
assert.equal(oldClock.ok,false);assert.ok(oldClock.mismatches.some(x=>x.name==='Next_Workflow_Run_Next_Ba'));
const wrongBatch=path.join(tmp,'wrong-batch.ds');fs.writeFileSync(wrongBatch,fiveHourSource.replace('Current_Batch=nextBatch','Current_Batch=0'));
const batchFailure=verifyFiveHourRecoveryNative({source:wrongBatch,environment:'production',snapshotName:'verifier-fixture-wrong-batch'});
assert.equal(batchFailure.ok,false);assert.ok(batchFailure.mismatches.some(x=>x.name==='Next_Workflow_Run_Next_Ba'));
assert.throws(()=>verifyFiveHourRecoveryNative({source:altered,environment:'production',snapshotName:'../../native-before'}),/safe directory name/);assert.deepEqual(fs.readFileSync(beforePath),before,'verifier never changes immutable baseline');
console.log('PASS: five-hour synthetic native-format verifier41/41 inall3environments; reject old3h cadence, changed batch update, and quoted value changes; preserve every other anchor token, snapshotpathguard, immutablebaseline. Syntheticfixtureisnotnativeinstallationproof.');
