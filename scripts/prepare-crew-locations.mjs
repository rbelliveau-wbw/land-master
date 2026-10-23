// Materialize the NEW schema fragments and complete guarded workflow bodies.
// Does not alter an export, install Creator components, authorize connections or enable sync.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const exportPath=process.argv[2]||'creator/exports/Land_Master_2026-10-21-development.ds';
const source=fs.readFileSync(exportPath,'utf8').replace(/\r\n/g,'\n'),out='creator/crew-locations';fs.mkdirSync(out+'/workflows',{recursive:true});
const f=(name,type,extra={})=>({name,type,...extra}),text=(name,extra)=>f(name,'text',extra),lookup=(name,target,extra={})=>f(name,'lookup',{target,...extra}),date=name=>f(name,'date'),time=name=>f(name,'datetime'),bool=name=>f(name,'checkbox',{default:false}),unique=name=>text(name,{required:true,unique:true}),multi=name=>f(name,'multiline');
const forms=[
 {name:'Crew',report:'All_Crews',fields:[unique('Crew_Code'),text('Crew_Name'),text('Badge_Color',{pattern:'^#[A-Fa-f0-9]{6}$'}),bool('Active'),text('Source_System'),text('Source_Record_ID')]},
 {name:'Crew_Assignment',report:'Crew_Assignment_Report',fields:[lookup('Subdivision1','Subdivision',{required:true}),lookup('Crew','Crew',{required:true}),f('Assignment_Date','date',{required:true}),text('Source_System',{required:true}),text('Source_Record_ID',{required:true}),unique('Source_Key'),time('Source_Updated_At')]},
 {name:'Task_Schedule',report:'All_Task_Schedules',optional_source:true,fields:[lookup('Subdivision1','Subdivision',{required:true}),text('Stage_Key',{required:true,choices:['Entitlements','Engineering Design','Municipal Review','Pre-Construction','Rough Cut','Sewer','Water','Storm Drain','Road Prep','Dry Utilities','Punch List','Closeout']}),date('Start_Date'),date('End_Date'),text('Source_System',{required:true}),text('Source_Record_ID',{required:true}),unique('Source_Key'),text('Source_Task_ID'),text('Source_Milestone_ID'),time('Source_Modified_At'),time('Synced_At'),bool('Write_Enabled')]},
 {name:'Schedule_Change_Log',admin_only:true,fields:[unique('Operation_ID'),text('Operation_Type',{required:true}),text('Actor',{required:true}),time('Timestamp'),lookup('Subdivision1','Subdivision',{required:true}),text('Origin'),multi('Request_JSON'),multi('Result_JSON'),text('State'),multi('Error'),text('Duration_Operation_ID'),text('Reverses_Operation_ID'),text('Inflight_Record_Key'),bool('Execution_Finished')]},
 {name:'Crew_Schedule_Lock',admin_only:true,fields:[unique('Phase_Key'),lookup('Subdivision1','Subdivision',{required:true}),text('Operation_ID',{required:true}),text('Actor',{required:true}),time('Acquired_At')]},
 {name:'Crew_Test_Record',admin_only:true,fields:[unique('Record_Key'),lookup('Subdivision1','Subdivision',{required:true}),text('First_Operation_ID',{required:true}),time('Created_At')]}
];
const sectionLabels={Crew:'Crew Details',Crew_Assignment:'Crew Assignment Details',Task_Schedule:'Task Schedule Details',Schedule_Change_Log:'Schedule Change Details',Crew_Schedule_Lock:'Schedule Lock Details',Crew_Test_Record:'Test Record Details'};
for(const form of forms)form.section={name:form.name+'_Details',display_name:sectionLabels[form.name],row:1};
const permissions=['View_Crew_Locations','Edit_Crew_Milestones','Edit_Crew_Task_Dates','Manage_Crew_Assignments'].map(bool);
const schema={status:'PREPARED COMPONENT DEFINITIONS — see native-install-progress.json for current Development installation state',authority:{path:exportPath,sha256:crypto.createHash('sha256').update(fs.readFileSync(exportPath)).digest('hex')},page:{name:'Crew_Management',display_name:'Crew Management',widget:'crew-locations',preserve:'Milestone_Gantt_View'},forms,add_to_User_Access:permissions,custom_api:{name:'Crew_Locations_Widget_DEV',function:'crewLocationsWidget',argument:'payload',authentication:'OAuth2',method:'POST',content_type:'application/json',environment:'development'},connection:{name:'zoho_creator_connection',type:'logged-in user',scopes:['ZohoCreator.report.READ','ZohoCreator.report.UPDATE'],environment_header:'thisapp.environment.linkname'},testing_mode:false,creator_only:true,projects_push_enabled:false};
fs.writeFileSync(out+'/schema.json',JSON.stringify(schema,null,2)+'\n');
// Creator's row identifies a section, not the data field's vertical position.
// Unsectioned fields can compile but remain absent from the publish selector.
function dsSection(name,label,row){return name+'\n(\n type = section\n displayname = "'+label+'"\n row = '+row+'\n column = 0\n width = medium\n)';}
function dsField(field,sectionRow=1){const type={lookup:'picklist',multiline:'textarea',datetime:'datetime'}[field.type]||field.type;return (field.required?'must have ':'')+(field.unique?'unique ':'')+field.name+'\n(\n type = '+type+'\n'+(field.target?' values = '+field.target+'.ID\n displayformat = ['+(field.target==='Subdivision'?'Subdivision_Name':'Crew_Code')+']\n':'')+(field.default===false?' initial value = false\n':'')+' row = '+sectionRow+'\n column = 1\n width = medium\n)';}
for(const form of forms)fs.writeFileSync(out+'/'+form.name+'.ds.fragment','// NEW form definition fragment. Install in Development; not a complete application export.\nform '+form.name+'\n{\n'+dsSection(form.section.name,form.section.display_name,1)+'\n'+form.fields.map(field=>dsField(field)).join('\n')+'\nactions\n{\non add\n{\nsubmit\n(\n type = submit\n displayname = "Submit"\n)\n}\non edit\n{\nupdate\n(\n type = submit\n displayname = "Update"\n)\ncancel\n(\n type = cancel\n displayname = "Cancel"\n)\n}\n}\n}\n');
fs.writeFileSync(out+'/User_Access.ds.fragment','// NEW section and decision boxes, default false. Merge into current User_Access; preserve unrelated fields.\n// Row 8 matches the verified installation snapshot; choose an available section row if the current layout changed, and keep every new field on that same row.\n'+dsSection('Crew_Locations_Permissions','Crew Locations',8)+'\n'+permissions.map(field=>dsField(field,8)).join('\n')+'\n');
function workflowBody(name){const start=source.indexOf('\n\t\t\t'+name+' as ');if(start<0)throw new Error('Missing workflow '+name);const end=source.indexOf('\n\t\t\t}\n',start);if(end<0)throw new Error('Unterminated workflow '+name);const section=source.slice(start,end),begin=section.indexOf('\n\t\t\t\t\t(\n'),finish=section.lastIndexOf('\n\t\t\t\t\t)');if(begin<0||finish<begin)throw new Error('Unsupported workflow syntax '+name);return section.slice(begin+'\n\t\t\t\t\t(\n'.length,finish).split('\n').map(line=>line.replace(/^\t{6}/,'')).join('\n');}
function loopBounds(body,at){const brace=body.indexOf('{',at);let depth=0;for(let i=brace;i<body.length;i++){if(body[i]==='{')depth++;if(body[i]==='}'&&--depth===0)return {brace,end:i};}throw new Error('Unterminated workflow loop');}
const incoming=workflowBody('Milestone_Bi_Directional_1'),loopAt=incoming.indexOf('for each  rec in rows');
if(loopAt<0)throw new Error('Inbound loop changed; review latest export');
const incomingBounds=loopBounds(incoming,loopAt),originalImport=incoming.slice(incomingBounds.brace+1,incomingBounds.end);
const guardedImport=`
ms = Milestones[Milestone_ID == rec.get("m.Milestone ID")];
subdivId = Subdivision[Subdivision_Code == rec.get("p.Project Code")];
importPhase = "";
if(ms.count() == 1) { importPhase = ms.Subdivision1.toString(); }
else if(ms.count() == 0 && subdivId.count() == 1) { importPhase = subdivId.ID.toString(); }
if(importPhase != "")
{
 importOwned = false; importAuditId = null; importFailed = false; importToken = "analytics-" + jobId + "-" + importPhase;
 try
 {
  importLock = insert into Crew_Schedule_Lock
  [
   Phase_Key=importPhase
   Subdivision1=importPhase.toLong()
   Operation_ID=importToken
   Actor=zoho.loginuser
   Acquired_At=zoho.currenttime
   Added_User=zoho.loginuser
  ];
  importOwned = true;
  if(ms.count() == 1 && Crew_Test_Record[Record_Key == "M:" + ms.ID.toString()].count() > 0)
  {
   importBeforeStart = null; importBeforeEnd = null;
   if(ms.Start_Date != null) { importBeforeStart = ms.Start_Date.toString("yyyy-MM-dd"); }
   if(ms.End_Date != null) { importBeforeEnd = ms.End_Date.toString("yyyy-MM-dd"); }
   importFields = {"start":{"before":importBeforeStart,"after":rec.get("m.Start Date")},"end":{"before":importBeforeEnd,"after":rec.get("m.End Date")}};
   importChange = {"recordId":ms.ID.toString(),"type":"M","stage":ms.Milestone_Name,"expected":{"start":importBeforeStart,"end":importBeforeEnd},"fields":importFields};
   importRequest = {"subdivisionId":importPhase,"origin":"import","changes":{importChange},"sourceJobId":jobId};
   importRecordId = ms.ID;
   importAuditId = insert into Schedule_Change_Log
   [
    Operation_ID=importToken + "-" + ms.ID.toString()
    Operation_Type="controlled_analytics_import"
    Actor="system:Milestone_Bi_Directional_1"
    Timestamp=zoho.currenttime
    Subdivision1=importPhase.toLong()
    Origin="import"
    Request_JSON=importRequest.toString()
    State="importing"
    Execution_Finished=false
    Added_User=zoho.loginuser
   ];
  }
  ${originalImport}
  if(importAuditId != null)
  {
   importedRecord = Milestones[ID == importRecordId]; importAfterStart = null; importAfterEnd = null;
   if(importedRecord.Start_Date != null) { importAfterStart = importedRecord.Start_Date.toString("yyyy-MM-dd"); }
   if(importedRecord.End_Date != null) { importAfterEnd = importedRecord.End_Date.toString("yyyy-MM-dd"); }
   importFields.put("start",{"before":importBeforeStart,"after":importAfterStart}); importFields.put("end",{"before":importBeforeEnd,"after":importAfterEnd});
   importChange.put("fields",importFields); importRequest.put("changes",{importChange});
   importLog = Schedule_Change_Log[ID == importAuditId.toLong()]; importLog.Request_JSON=importRequest.toString(); importLog.State="imported"; importLog.Execution_Finished=true;
  }
 }
 catch(importError)
 {
  importFailed = importAuditId != null;
  if(importAuditId != null) { importLog = Schedule_Change_Log[ID == importAuditId.toLong()]; importLog.State="unknown"; importLog.Error=importError.toString(); importLog.Execution_Finished=true; }
  info "Milestone import deferred/failed for phase " + importPhase + ": " + importError.toString();
 }
 if(importOwned && !importFailed) { delete from Crew_Schedule_Lock[(Phase_Key == importPhase) && (Operation_ID == importToken)]; }
}
`;
fs.writeFileSync(out+'/workflows/Milestone_Bi_Directional_1.dg',incoming.slice(0,incomingBounds.brace+1)+guardedImport+incoming.slice(incomingBounds.end)+'\n');
for(const name of ['Sync_Milestones','Sync_Only_MS_End','Update_Projects_Milestone','Update_Projects_Milestone1']){
 const body=workflowBody(name);let changed;
 if(name.startsWith('Sync_')){const flag='if(input.Push_Update == TRUE)';if(!body.includes(flag))throw new Error('Outbound guard changed '+name);changed='crewPushToken = thisapp.crewLocationsBeginPush(input.ID.toString());\nif(crewPushToken != "")\n{\ntry\n{\n'+body+'\n}\ncatch(crewPushError) { info crewPushError; }\nthisapp.crewLocationsEndPush(input.ID.toString(),crewPushToken);\n}\n';}
 else{
   // The exported outbound schedules remain INACTIVE. Wrap each per-record
   // body, preserving its complete original business logic and flag handling.
   const matches=[...body.matchAll(/for each\s+(\w+)\s+in\s+Milestones\[/g)];if(matches.length!==1)throw new Error('Review outbound loop '+name);
   const match=matches[0],{brace,end}=loopBounds(body,match.index),record=match[1];
   changed=body.slice(0,brace+1)+'\ncrewPushToken = thisapp.crewLocationsBeginPush('+record+'.ID.toString());\nif(crewPushToken != "")\n{\ntry\n{\n'+body.slice(brace+1,end)+'\n}\ncatch(crewPushError) { info crewPushError; }\nthisapp.crewLocationsEndPush('+record+'.ID.toString(),crewPushToken);\n}\n'+body.slice(end);
 }
 fs.writeFileSync(out+'/workflows/'+name+'.dg',changed+'\n');
}
fs.writeFileSync(out+'/workflows/Milestones_on_validate_edit.dg','// NEW Milestones workflow: edited record → On Validate. Do not replace other validators.\nvalidationMessage = thisapp.crewLocationsDirectValidate("M",input.ID.toString(),input.Start_Date,input.End_Date,input.Push_Update);\nif(validationMessage != "")\n{\n alert validationMessage;\n cancel submit;\n}\n');
fs.writeFileSync(out+'/workflows/Task_Schedule_on_validate_edit.dg','// NEW Task_Schedule workflow: edited record → On Validate.\nvalidationMessage = thisapp.crewLocationsDirectValidate("T",input.ID.toString(),input.Start_Date,input.End_Date,false);\nif(validationMessage != "")\n{\n alert validationMessage;\n cancel submit;\n}\n');
fs.writeFileSync(out+'/workflows/Crew_on_validate.dg','// NEW Crew: created/edited → On Validate.\naccess = User_Access[User == zoho.loginuser];\nif(access.count() != 1 || access.Manage_Crew_Assignments != true || !ifnull(input.Badge_Color,"").matches("#[a-fA-F0-9]{6}"))\n{\n alert "Crew management permission and a #RRGGBB badge color are required.";\n cancel submit;\n}\n');
fs.writeFileSync(out+'/workflows/Crew_Assignment_on_validate.dg','// NEW Crew_Assignment: created/edited → On Validate.\naccess = User_Access[User == zoho.loginuser];\nif(access.count() != 1 || access.Manage_Crew_Assignments != true || input.Assignment_Date == null || input.Source_Record_ID == null || input.Source_System == null)\n{\n alert "Crew management permission and verified source identity/date are required.";\n cancel submit;\n}\nelse\n{\n input.Source_Key = input.Source_System + ":" + input.Source_Record_ID;\n}\n');
console.log('Prepared NEW schema fragments and complete guarded workflow bodies from '+exportPath+'. No Creator deployment occurred.');
