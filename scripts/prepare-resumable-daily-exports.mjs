// Capture first with the read-only native IDE. Never overwrite this task's baseline.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export const task='creator/resumable-daily-exports-2026-11-09';
export const routes=['Daily_Crew_Employees','Budgets_Import_Great_Plai','Equipment_Sync_Create_Equ','Milestone_Bi_Directional_1'];
export const changed=['workflowExportPlan','workflowExportEnqueueCaptured','workflowExportTick','workflowExportRun','crewSyncEmployees'];
export const added=['crewSyncEmployeesRun','workflowExportDailyRun'];
export const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
export function action(source){
  const match=source.match(/on load\s*\(\s*([\s\S]*?)\s*\)\s*}\s*}\s*}\s*$/);
  assert.ok(match,'Exactly one native on-load action');
  return match[1];
}
export function removeAuditStart(body){
  assert.match(body,/^auditRun = thisapp\.workflowRunLog\([^\n]+\);\s*auditId = auditRun.get\("id"\);/);
  return body.replace(/^auditRun = thisapp\.workflowRunLog\([^\n]+\);\s*auditId = auditRun.get\("id"\);\s*/,'');
}
export function buildCandidates(){
  const before=task+'/native-before/';
  const fn=n=>read(before+n+'.dg');
  const workflow=n=>read(before+n+'.ds');
  fs.mkdirSync(task+'/workflows',{recursive:true});
  const names=Object.fromEntries(routes.map(n=>[n,workflow(n).match(/^\w+ as "([^"]+)"/)[1]]));
  for(const route of routes){
    const src=workflow(route),old=action(src);
    fs.writeFileSync(task+'/workflows/'+route+'.ds',src.replace(old,'thisapp.workflowExportEnqueue("'+route+'");'));
    fs.writeFileSync(task+'/workflows/'+route+'.deluge','thisapp.workflowExportEnqueue("'+route+'");\n');
  }
  let employee=fn('crewSyncEmployees').replace('map crewSyncEmployees(bool dryRun)','map crewSyncEmployeesRun(bool dryRun, string preparedAuditId)')
    .replace('auditId = "";','auditId = ifnull(preparedAuditId,""); prepared = auditId != "";')
    .replace('if(!dryRun)','if(!dryRun && !prepared)');
  const gate=`\t\tif(prepared && dryRun) { throw "A dry run cannot claim a queued audit."; }
\t\tif(prepared)
\t\t{
\t\t\tif(!auditId.matches("[0-9]+")) { throw "Employee export requires a run ID."; }
\t\t\tqueuedRun = Workflow_Run_Log[ID == auditId.toLong()];
\t\t\tif(queuedRun.count() != 1 || queuedRun.Run_Status != "Running") { throw "Employee export run is no longer active."; }
\t\t\tqueuedState = queuedRun.Export_State.toMap();
\t\t\tif(queuedState.get("version") != 1 || queuedState.get("phase") != "processing" || queuedState.get("workflow") != "Daily_Crew_Employees") { throw "Employee export has no matching processing claim."; }
\t\t}
`;
  const marker='\t\tstage = "Reading employee directory";';
  assert.equal(employee.split(marker).length,2);
  employee=employee.replace(marker,gate+marker).replace(/rows = thisapp\.analyticsExportRows\(([^;]+)\);/,'if(prepared) { rows = thisapp.workflowPreparedExportRows($1); }\n\t\telse { rows = thisapp.analyticsExportRows($1); }');
  fs.writeFileSync('creator/functions/crewSyncEmployeesRun.dg',employee);
  fs.writeFileSync('creator/functions/crewSyncEmployees.dg','map crewSyncEmployees(bool dryRun)\n{\n\treturn thisapp.crewSyncEmployeesRun(dryRun,"");\n}\n');
  let daily=`string workflowExportDailyRun(string auditId)
{
\tif(!auditId.matches("[0-9]+")) { throw "Daily export continuation requires a run ID."; }
\tqueuedRun = Workflow_Run_Log[ID == auditId.toLong()];
\tif(queuedRun.count() != 1 || queuedRun.Run_Status != "Running") { throw "Daily export run is no longer active."; }
\tstate = queuedRun.Export_State.toMap();
\tif(state.get("version") != 1 || state.get("phase") != "processing") { throw "Daily export has no processing claim."; }
\trunKey = state.get("workflow");
\tif(runKey == "Daily_Crew_Employees")
\t{
\t\temployeeResult = thisapp.crewSyncEmployeesRun(false,auditId);
\t\treturn employeeResult.toString();
\t}
`;
  for(const route of routes.slice(1))daily+='\telse if(runKey == "'+route+'")\n\t{\n'+removeAuditStart(action(workflow(route))).replaceAll('thisapp.analyticsExportRows(','thisapp.workflowPreparedExportRows(')+'\n\t}\n';
  daily+='\telse { throw "Unknown daily export workflow: " + runKey; }\n\treturn "Completed";\n}\n';
  fs.writeFileSync('creator/functions/workflowExportDailyRun.dg',daily);
  let plan=fn('workflowExportPlan');let branches='';
  for(const route of routes){
    const src=route===routes[0]?fn('crewSyncEmployees'):action(workflow(route));
    const config=src.match(/config = Map\(\);([\s\S]*?)config.put\("selectedColumns",[^;]+;/)[0];
    const call=src.match(/rows = thisapp.analyticsExportRows\(([^;]+)\);/)[1];
    const view=route===routes[0]?call.match(/^"([^"]+)"/)[1]:src.match(/viewId = "([^"]+)";/)[1];
    const empty=call.endsWith(',true')?'true':'false';
    branches+='\tif(workflow == "'+route+'")\n\t{\n'+config+'\n\t\trequests.add({"view":"'+view+'","config":config,"allowEmpty":'+empty+'});\n\t}\n\telse ';
  }
  plan=plan.replace('\tif(workflow == "Daily_Crew_Timecards")',branches+'if(workflow == "Daily_Crew_Timecards")');
  fs.writeFileSync('creator/functions/workflowExportPlan.dg',plan);
  let enqueue=fn('workflowExportEnqueueCaptured');
  enqueue=enqueue.replace('workflowNames = {','workflowNames = {'+routes.map(r=>'"'+r+'":"'+names[r]+'",').join(''))
    .replace('offsets = {','offsets = {'+routes.map(r=>'"'+r+'":1,').join(''))
    .replace('startEvent = {','systemName = "Zoho Analytics";\n\tif(workflow == "Daily_Crew_Employees") { systemName = "Zoho Analytics / HeavyJob"; }\n\tstartEvent = {')
    .replace('"system":"Zoho Analytics","callbackPolicy"','"system":systemName,"callbackPolicy"');
  fs.writeFileSync('creator/functions/workflowExportEnqueueCaptured.dg',enqueue);
  fs.writeFileSync('creator/functions/workflowExportTick.dg',fn('workflowExportTick').replace('allowed = {','allowed = {'+routes.map(r=>'"'+r+'",').join('')));
  fs.writeFileSync('creator/functions/workflowExportRun.dg',fn('workflowExportRun').replace('\tif(runKey == "Daily_Crew_Timecards"','\tif('+routes.map(r=>'runKey == "'+r+'"').join(' || ')+')\n\t{\n\t\treturn thisapp.workflowExportDailyRun(auditId);\n\t}\n\telse if(runKey == "Daily_Crew_Timecards"'));
  for(const name of [...changed,...added]){const p='creator/functions/'+name+'.dg';fs.writeFileSync(p,read(p).replace(/[\t ]+$/gm,''));}
}
if(process.argv[1]===path.resolve(import.meta.filename)){
  const capture=process.argv[2];
  if(capture){
    fs.mkdirSync(task+'/native-before',{recursive:true});
    for(const name of changed){const dest=task+'/native-before/'+name+'.dg';assert.ok(!fs.existsSync(dest),'Never overwrite baseline');fs.copyFileSync(capture+'/production-functions/'+name+'.dg',dest);}
    for(const name of routes)fs.copyFileSync(capture+'/production-workflows/'+name+'.ds',task+'/native-before/'+name+'.ds');
    const inventory=JSON.parse(read(capture+'/production-schedule-inventory.json'));
    for(const entry of inventory)entry.migration=routes.includes(entry.name)?'Resumable daily export':entry.inactive?'Preserve inactive':entry.enqueue||entry.name==='Daily_Crew_Timecards'?'Already resumable':'No legacy export wait';
    fs.writeFileSync(task+'/schedule-inventory.json',JSON.stringify({captured_from:'Live Production IDE, November 9, 2026',schedules:inventory},null,2)+'\n');
  }
  buildCandidates();
  console.log('Prepared four daily schedules and seven functions from fresh native baselines.');
}
