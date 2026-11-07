// Verify the single native eligibility change and preserve the prior quota contracts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {normalizeNative} from './verify-workflow-quota-native.mjs';
import {verifyFiveHourRecoveryNative} from './verify-five-hour-recovery-native.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const task='creator/timeout-check-reduction-2026-11-07';
const candidate=task+'/workflows/Workflow_Log_Timeout.ds';
const baseline='creator/quota-five-hour-recovery-2026-11-06/native-before/production-v9.160/Workflow_Log_Timeout.ds';
export function assertTimeoutEligibility(source,before){
  const expected=before.replace('form = Workflow_Run_Log','form = Workflow_Run_Log[Run_Status == "Running"]');
  if(expected===before||normalizeNative(source)!==normalizeNative(expected))throw Error('Only the native Running eligibility predicate may change; preserve all timeout/recovery actions.');
  return true;
}
export function verifyTimeoutNative({source,environment,snapshotName}){
  assertTimeoutEligibility(fs.readFileSync(path.join(root,candidate),'utf8'),fs.readFileSync(path.join(root,baseline),'utf8'));
  const result=verifyFiveHourRecoveryNative({source,environment,snapshotName,workflowOverrides:{Workflow_Log_Timeout:candidate}});
  const raw=JSON.parse(fs.readFileSync(path.join(root,result.destination,'manifest.json'),'utf8'));
  // Source-only component hashes, never private billing, records, or log payloads.
  const proof={environment,verified_at_utc:raw.verified_at_utc,source_sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),status:raw.status,matched:raw.matched,total:raw.total,checks:raw.checks.map(({name,kind,match,normalized_sha256,expected_normalized_sha256})=>({name,kind,match,normalized_sha256,expected_normalized_sha256}))};
  const output=path.join(root,task,'verification');fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,environment+'.json'),JSON.stringify(proof,null,2)+'\n');
  return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const[source,environment,snapshotName]=process.argv.slice(2);const result=verifyTimeoutNative({source,environment,snapshotName});console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}
  catch(error){console.error(error.message);process.exitCode=1;}
}
