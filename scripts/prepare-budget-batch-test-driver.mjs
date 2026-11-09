// Temporary Development-only driver. It is restored before publication.
// Native batch actions are copied from the reviewed source, not reimplemented.
import fs from 'node:fs';
const task='creator/budget-batch-optimization-2026-11-09';
const old=fs.readFileSync(task+'/native-before/budgetImportedActualElements.dg','utf8').replace(/\r\n/g,'\n');
const oldBody=old.slice(old.indexOf('{')+1,old.lastIndexOf('}')).replace('return {','legacyResult = {');
const action=fs.readFileSync('creator/workflows/budget-actual-elements/Budgets_Apply_Cost_to_Bud.action-1.dg','utf8').replace(/\binput\./g,'testItem.');
const source=`string workflowExportProbe(string request)
{
 if(ifnull(thisapp.environment.type,"").toString().toLowerCase() != "development") { throw "Budget batch tests are Development only."; }
 command = request.toMap(); action = command.get("action"); started = zoho.currenttime.toLong();
 if(action == "survey")
 {
  cohort = ifnull(command.get("cohort"),"linked");
  linked = Budget_Import_Item[Budget_Item != null && (Data_Source == "Great Plains" || Data_Source == "HeavyJob")].distinct(Budget_Item);
  if(cohort == "linked") { items = Budget_Item[Template_Item == false && ID in linked] sort by ID range from 0 to 99; }
  else if(cohort == "last") { items = Budget_Item[Template_Item == false] sort by ID desc range from 0 to 99; }
  else if(cohort == "first") { items = Budget_Item[Template_Item == false] sort by ID range from 0 to 99; }
  else { throw "Unknown test cohort."; }
  ids = List(); sourceRows = 0;
  for each testItem in items { ids.add(testItem.ID.toString()); sourceRows = sourceRows + Budget_Import_Item[Budget_Item == testItem.ID && (Data_Source == "Great Plains" || Data_Source == "HeavyJob")].count(); }
  settings = Settings[ID != 0]; recipientCount = 0; selfOnly = true;
  for each recipient in User_Access[ID in settings.Workflow_Log_Failure_Recipients]
  {
   recipientCount = recipientCount + 1;
   if(ifnull(recipient.Approver_Email,"").toString().toLowerCase() != zoho.loginuserid.toLowerCase()) { selfOnly = false; }
  }
  response = {"action":action,"cohort":cohort,"ids":ids,"count":ids.size(),"sourceRows":sourceRows,"eligibleTotal":Budget_Item[Template_Item == false].count(),"recipientCount":recipientCount,"recipientsOnlyCurrentUser":selfOnly,"elapsedMs":zoho.currenttime.toLong() - started};
  return response.toString();
 }
 if(action == "audit")
 {
  settings = Settings[ID != 0]; recipientCount = 0; selfOnly = true;
  for each recipient in User_Access[ID in settings.Workflow_Log_Failure_Recipients]
  {
   recipientCount = recipientCount + 1;
   if(ifnull(recipient.Approver_Email,"").toString().toLowerCase() != zoho.loginuserid.toLowerCase()) { selfOnly = false; }
  }
  if(!selfOnly || recipientCount > 1) { throw "The live audit test permits zero recipients or a single notification to the current user."; }
  audit = thisapp.workflowRunLog({"action":"start","terminal":true,"workflow":"Development Test - Budget Batch Atomic Logging","system":"Internal diagnostic","status":"Failed","stage":"Expected Failure Test; No Business Writes","reference":"budget-batch-20261109","message":"Expected Development logging test. Original item/source diagnostic preserved.","details":"One terminal POST; existing native finalization and notification. No business record changed. This is an intentional test, not a Production failure.","counts":{"failed":1}});
  id = audit.get("id"); run = Workflow_Run_Log[ID == id.toLong()];
  response = {"action":action,"id":id,"status":run.Run_Status,"stage":run.Stage,"message":run.Message,"finishedAt":ifnull(run.Finished_At,"").toString(),"notified":run.Failure_Notified,"notificationError":run.Notification_Error,"resumeAt":ifnull(run.Resume_At,"").toString(),"elapsedMs":zoho.currenttime.toLong() - started};
  return response.toString();
 }
 ids = command.get("ids"); if(ids == null || ids.size() == 0 || ids.size() > 100) { throw "Tests require one through one hundred captured IDs."; }
 selected = Budget_Item[Template_Item == false && ID in ids]; if(selected.count() != ids.size()) { throw "Test scope is incomplete or includes duplicate/ineligible IDs."; }
 if(action == "compare" || action == "diagnose")
 {
  if(ids.size() > 10) { throw "Legacy comparison is limited to ten items."; }
  compared = 0; sourceRows = 0; samples = List();
  for each testItem in selected
  {
   for each dataSource in {"Great Plains","HeavyJob"}
   {
    budgetItemId = testItem.ID;
${oldBody}
    current = thisapp.budgetImportedActualElements(testItem.ID,dataSource);
    if(action == "diagnose")
    {
     saved = {"PROJ_Actual":testItem.PROJ_Actual,"HCSS_Actuals":testItem.HCSS_Actuals,"GP_Labor_Actuals":testItem.GP_Labor_Actuals,"GP_Materials_Actuals":testItem.GP_Materials_Actuals,"GP_Equipment_Actuals":testItem.GP_Equipment_Actuals,"GP_Subcontractor_Actuals":testItem.GP_Subcontractor_Actuals,"GP_Other_Actuals":testItem.GP_Other_Actuals,"HCSS_Labor_Actuals":testItem.HCSS_Labor_Actuals,"HCSS_Materials_Actuals":testItem.HCSS_Materials_Actuals,"HCSS_Equipment_Actuals":testItem.HCSS_Equipment_Actuals,"HCSS_Subcontractor_Actuals":testItem.HCSS_Subcontractor_Actuals,"HCSS_Other_Actuals":testItem.HCSS_Other_Actuals,"Cost_to_Complete":testItem.Cost_to_Complete,"Percent_Complete":testItem.Percent_Complete};
     samples.add({"item":testItem.ID.toString(),"source":dataSource,"legacy":legacyResult,"current":current,"saved":saved});
    }
    else
    {
     for each key in {"complete","rows","legacyRows","total","costToComplete"} { if(legacyResult.get(key) != current.get(key)) { throw "Legacy comparison differs: item=" + testItem.ID + "; source=" + dataSource + "; key=" + key; } }
     for each key in {"Labor","Materials","Equipment","Subcontractor","Other"} { if(legacyResult.get("components").get(key) != current.get("components").get(key)) { throw "Legacy component differs: item=" + testItem.ID + "; source=" + dataSource + "; key=" + key; } }
    }
    compared = compared + 1; sourceRows = sourceRows + current.get("rows");
   }
  }
  response = {"action":action,"items":ids.size(),"comparisons":compared,"sourceRows":sourceRows,"elapsedMs":zoho.currenttime.toLong() - started,"writes":0};
  if(action == "diagnose") { response.put("samples",samples); }
  return response.toString();
 }
 if(action != "apply" || ids.size() != 100) { throw "Apply tests require exactly one hundred captured eligible IDs."; }
 processed = 0;
 for each testItem in selected
 {
${action}
  processed = processed + 1;
 }
 response = {"action":action,"processed":processed,"requested":ids.size(),"elapsedMs":zoho.currenttime.toLong() - started,"blockSize":100,"revision":"budget-batch-20261109"};
 return response.toString();
}
`;
if(!process.argv[2])throw Error('Supply a private output file');
fs.writeFileSync(process.argv[2],source);console.log('Prepared a Development-only driver; restore the original before promotion.');
