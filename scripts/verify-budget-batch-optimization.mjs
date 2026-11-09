import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {normalizeNative} from './verify-workflow-quota-native.mjs';
const task='creator/budget-batch-optimization-2026-11-09';
const specs=[
 ['budgetImportedActualElements.dg','creator/functions/budgetImportedActualElements.dg'],
 ['workflowRunLog.dg','creator/functions/workflowRunLog.dg'],
 ['Budgets_Apply_Cost_to_Bud.action-1.dg','creator/workflows/budget-actual-elements/Budgets_Apply_Cost_to_Bud.action-1.dg'],
 ['Budgets_Apply_Cost_to_Bud.failure.dg','creator/workflows/budget-actual-elements/Budgets_Apply_Cost_to_Bud.failure.dg']
];
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
export function verifyBatch(directory,environment,{functionsOnly=false}={}){
 if(!['development','stage','production'].includes(environment))throw Error('Unknown environment');
 const entries=(functionsOnly?specs.slice(0,2):specs).map(([name,expected])=>{
  const actual=normalizeNative(fs.readFileSync(directory+'/'+name,'utf8')),candidate=normalizeNative(fs.readFileSync(expected,'utf8'));
  return {name,expected,normalized_sha256:sha(actual),expected_normalized_sha256:sha(candidate),match:actual===candidate};
 });
 if(!entries.every(e=>e.match))throw Error('Native source mismatch: '+entries.filter(e=>!e.match).map(e=>e.name).join(', '));
 const result={environment,method:'Fresh native Creator source copied from visible IDE/action editors',components:entries,match:true};
 fs.mkdirSync(task+'/verification',{recursive:true});fs.writeFileSync(task+'/verification/'+environment+'.json',JSON.stringify(result,null,2)+'\n');
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=verifyBatch(process.argv[2],process.argv[3],{functionsOnly:process.argv.includes('--functions-only')});
 console.log('PASS: '+r.environment+' '+r.components.length+' native sources match reviewed candidates.');
}
