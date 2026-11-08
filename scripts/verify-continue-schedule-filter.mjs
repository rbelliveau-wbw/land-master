import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {normalizeNative} from './verify-workflow-quota-native.mjs';

export const continueTask = 'creator/continue-schedule-filter-2026-11-08';
export const continueBaseline = 'creator/quota-five-hour-recovery-2026-11-06/native-before/production-v9.160/Workflow_Export_Continue.ds';
export const continueCandidate = continueTask + '/workflows/Workflow_Export_Continue.ds';
export const continuePredicate = 'Run_Status == "Running" && !Export_State.contains("shared-recovery-30m")';

export function assertContinueEligibility(source, before = fs.readFileSync(continueBaseline, 'utf8')) {
  const expected = before.replace('form = Workflow_Run_Log', `form = Workflow_Run_Log[${continuePredicate}]`);
  if (expected === before || normalizeNative(source) !== normalizeNative(expected)) {
    throw Error('Only the reviewed Continue eligibility predicate may change; preserve its action, date, frequency and timezone.');
  }
  return true;
}

// Verify exact component copies from the native IDE. This is a focused source
// parity check, not a claim to have exported or reviewed the entire application.
export function verifyContinueComponents(directory, environment) {
  if (!['development', 'stage', 'production'].includes(environment)) throw Error('Unknown environment.');
  const functions = ['workflowRunLog','workflowExportEnqueue','workflowExportEnqueueCaptured','workflowExportPlan','workflowExportWake','workflowExportDispatch','workflowExportTick','workflowExportRecover','workflowRecoveryHold','workflowExportRun','budgetActualImportRun','budgetPlanImportRun'];
  const checks = functions.map(name => {
    const actual = normalizeNative(fs.readFileSync(path.join(directory, name+'.dg'), 'utf8'));
    const expected = normalizeNative(fs.readFileSync('creator/functions/'+name+'.dg', 'utf8'));
    return {name, match:actual===expected, normalized_sha256:crypto.createHash('sha256').update(actual).digest('hex')};
  });
  const workflow = fs.readFileSync(path.join(directory, 'Workflow_Export_Continue.ds'), 'utf8');
  assertContinueEligibility(workflow);
  checks.push({name:'Workflow_Export_Continue', match:true, normalized_sha256:crypto.createHash('sha256').update(normalizeNative(workflow)).digest('hex')});
  const proof = {environment, verified_at_utc:new Date().toISOString(), scope:'13 component copies from the native IDE; no business records or billing data', status:checks.every(x=>x.match)?'passed':'mismatch', checks};
  fs.mkdirSync(continueTask+'/verification', {recursive:true});
  fs.writeFileSync(continueTask+'/verification/'+environment+'.json', JSON.stringify(proof,null,2)+'\n');
  return proof;
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=verifyContinueComponents(process.argv[2], process.argv[3]);
  console.log(JSON.stringify({environment:result.environment,status:result.status,matched:result.checks.filter(x=>x.match).length,total:result.checks.length}));
  if(result.status!=='passed') process.exitCode=1;
}
