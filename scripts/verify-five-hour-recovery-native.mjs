// Verify only this task's reviewed quota candidates against a fresh Creator DS.
// Historical native-before snapshots and earlier task outputs are never written.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {extractComponent,normalizeNative} from './verify-workflow-quota-native.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const task='creator/quota-five-hour-recovery-2026-11-06';
const prod=task+'/native-before/production-v9.160';
const development=task+'/native-before/development-prechange';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const relative=value=>path.relative(root,value).replaceAll('\\','/');
const esc=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const functionPattern=name=>new RegExp('^\\s*(?:string|map|list|bool|boolean)\\s+'+esc(name)+'\\s*\\(.*\\)\\s*$');
const workflowPattern=name=>new RegExp('^\\s*'+esc(name)+'\\s+as\\s+"[^\\"]+"\\s*$');
const formPattern=name=>new RegExp('^\\t\\tform\\s+'+esc(name)+'\\s*$');
const group=['Next_Workflow_Run_Next_Ba','Update_Budgets_w_Projects1','Sync_Final_Acceptance_Due','Budgets_Check_HCSS_Budget1','Budgets_HCSS_Actuals_Batc','Budgets_GP_Construction_A','Budgets_GP_Development_Ac','Set_Close_Date_Lots1','Update_Sold_Contracted_Fo1','Update_Actual_Lots_Foreca1','Check_for_Stuck_Budget_Ap','Recalc_Budget_Modificatio'];
const disabled=new Set(['Sync_Final_Acceptance_Due','Budgets_Check_HCSS_Budget1','Budgets_HCSS_Actuals_Batc','Budgets_GP_Construction_A','Budgets_GP_Development_Ac']);
function closing(text,start){let depth=0,quote=null,line=false,block=false;for(let i=start;i<text.length;i++){const char=text[i],pair=text.slice(i,i+2);if(line){if(char==='\n')line=false;continue;}if(block){if(pair==='*/'){block=false;i++;}continue;}if(quote){if(char==='\\')i++;else if(char===quote)quote=null;continue;}if(pair==='//'){line=true;i++;continue;}if(pair==='/*'){block=true;i++;continue;}if(char==='"'||char==="'"){quote=char;continue;}if(char==='(')depth++;else if(char===')'&&--depth===0)return i;}throw Error('Unclosed schedule action.');}
function actionRange(body){const matches=[...body.matchAll(/\bon load\s*\(/g)];if(matches.length!==1)throw Error('Expected exactly one schedule action.');const start=body.indexOf('(',matches[0].index)+1,end=closing(body,start-1);return {start,end,body:body.slice(start,end)};}
function compare(actual,expected){const a=normalizeNative(actual),b=normalizeNative(expected);let first=0;while(first<Math.min(a.length,b.length)&&a[first]===b[first])first++;return {match:a===b,normalized_sha256:sha(a),expected_sha256:sha(expected),expected_normalized_sha256:sha(b),...(a===b?{}:{first_normalized_difference:first,actual_normalized_length:a.length,expected_normalized_length:b.length})};}
export function verifyFiveHourRecoveryNative({source,environment,snapshotName,workflowOverrides={}}){
  if(!source||!['development','stage','production'].includes(environment))throw Error('Provide source.ds development|stage|production snapshot-name.');
  if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(snapshotName??'')||snapshotName==='.'||snapshotName==='..')throw Error('Snapshot name must be one safe directory name.');
  const output=path.resolve(root,task,'native-after',snapshotName),allowed=path.resolve(root,task,'native-after');
  if(path.dirname(output)!==allowed)throw Error('Output must remain one directory inside this task native-after.');
  const baseline=JSON.parse(fs.readFileSync(path.join(root,prod,'manifest.json'),'utf8'));
  const functions=baseline.components.filter(x=>x.kind==='function').map(x=>x.name),workflows=baseline.components.filter(x=>x.kind==='workflow').map(x=>x.name),forms=baseline.components.filter(x=>x.kind==='form').map(x=>x.name);
  if(functions.length!==18||workflows.length!==16||forms.length!==3)throw Error('Prechange manifest must contain18 functions,16 workflows and3 forms.');
  functions.push('workflowRecoveryHold');
  const bytes=fs.readFileSync(path.resolve(source)),lines=bytes.toString('utf8').replace(/^\uFEFF/,'').split(/\r?\n/),checks=[];
  fs.mkdirSync(output,{recursive:true});
  function check(name,kind,operation){try{checks.push({name,kind,...operation()});}catch(error){checks.push({name,kind,match:false,error:error.message});}}
  function capture(name,pattern,suffix){const extracted=extractComponent(lines,name,pattern),file=path.join(output,name+suffix);fs.writeFileSync(file,extracted.body);return {...extracted,file:relative(file),sha256:sha(extracted.body)};}
  for(const name of functions)check(name,'function',()=>{const actual=capture(name,functionPattern(name),'.dg'),expectedFile='creator/functions/'+name+'.dg',expected=fs.readFileSync(path.join(root,expectedFile),'utf8');if(!functionPattern(name).test(expected.split(/\r?\n/)[0]))throw Error('Candidate function declaration differs.');return {...actual,expected_file:expectedFile,...compare(actual.body,expected)};});
  for(const name of workflows)check(name,'workflow',()=>{
    const actual=capture(name,workflowPattern(name),'.ds'),baselineFile=prod+'/'+name+'.ds',before=fs.readFileSync(path.join(root,baselineFile),'utf8');
    let expected=before,actionFile=null;
    if(name==='Next_Workflow_Run_Next_Ba'){
      const candidate=task+'/workflows/Next_Workflow_Run_Next_Ba.action-1.dg';
      if(fs.existsSync(path.join(root,candidate))){const range=actionRange(before),action=fs.readFileSync(path.join(root,candidate),'utf8');expected=before.slice(0,range.start)+action+before.slice(range.end);actionFile=candidate;}
    }
    if(workflowOverrides[name])expected=fs.readFileSync(path.resolve(root,workflowOverrides[name]),'utf8');
    const active=!/^[ \t]*status\s*=\s*inactive\s*$/m.test(actual.body),expectedActive=group.includes(name)?!disabled.has(name):!/^[ \t]*status\s*=\s*inactive\s*$/m.test(before),comparison=compare(actual.body,expected);
    return {...actual,baseline_file:baselineFile,expected_action_file:actionFile,active,expected_active:expectedActive,state_match:active===expectedActive,...comparison,match:comparison.match&&active===expectedActive};
  });
  for(const name of forms)check(name,'form',()=>{const baselineDir=name==='Settings'&&environment==='development'?development:prod,expectedFile=baselineDir+'/'+name+'.form.ds',actual=capture(name,formPattern(name),'.form.ds'),expected=fs.readFileSync(path.join(root,expectedFile),'utf8');return {...actual,baseline_file:expectedFile,...compare(actual.body,expected)};});
  check('Settings shared schedule group','schedule_group',()=>{const selected=checks.filter(x=>x.kind==='workflow'&&group.includes(x.name)),active=selected.filter(x=>x.active).length,inactive=selected.filter(x=>x.active===false).length;return {actual_definitions:selected.length,expected_definitions:12,actual_active:active,expected_active:7,actual_inactive:inactive,expected_inactive:5,match:selected.length===12&&active===7&&inactive===5&&selected.every(x=>x.state_match&&x.match)};});
  for(const name of ['workflowStarterProbe','workflowQuotaChunkProbe'])check(name,'probe_absent',()=>{const hits=lines.flatMap((line,i)=>functionPattern(name).test(line)?[i+1]:[]);return {occurrences:hits.length,line_numbers:hits,match:hits.length===0};});
  const matched=checks.filter(x=>x.match).length,manifest={environment,snapshot_name:snapshotName,verified_at_utc:new Date().toISOString(),source_file:path.basename(source),source_sha256:sha(bytes),baseline_production_version:'9.160',baseline_reference:prod,settings_baseline_reference:environment==='development'?development:prod,normalization:'Remove comments and whitespace outside quoted values; quoted values and escapes remain exact.',expected_counts:{functions:19,workflows:16,forms:3,group_checks:1,probe_absences:2},status:matched===checks.length?'passed':'mismatch',matched,total:checks.length,checks};
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return {ok:matched===checks.length,environment,snapshotName,matched,total:checks.length,destination:relative(output),mismatches:checks.filter(x=>!x.match).map(({name,kind,error})=>({name,kind,...(error?{error}:{})}))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const[source,environment,snapshotName]=process.argv.slice(2),result=verifyFiveHourRecoveryNative({source,environment,snapshotName});console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=1;}}
