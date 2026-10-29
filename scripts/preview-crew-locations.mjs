// Local-only integration harness. It replaces the SDK ONLY in served previews.
// No fixture file is copied to widgets/, releases/, dist/ or Creator.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {crewFixture,crewDesktopFixture,crewManagementFixture} from './fixtures/crew-locations.mjs';
const root=path.resolve('widgets/crew-locations/src/app'),port=Number(process.argv[2]||4317);
function fixtureSDK(data){
 // Simulate a host consuming bubbling change events at document level. Editors
 // must save at their own element/container before reaching that host listener.
 document.addEventListener('change',event=>{if(event.target.matches('.stage-input,.boundary-input'))event.stopImmediatePropagation();});
 // Every document gets its own actor/preferences, including nested and parallel
 // sizing checks. Only this document's temporary key is removed on exit.
 const fixtureUser='isolated-fixture-'+crypto.randomUUID()+'@local.test',fixturePreferenceKey='crew-locations:view:DEVELOPMENT:'+fixtureUser;
 window.addEventListener('pagehide',()=>localStorage.removeItem(fixturePreferenceKey));
 const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-10-21T17:00:00Z']));}static now(){return NativeDate.now();}};
 const fixture={requests:[],mode:new URLSearchParams(location.search).get('fixtureMode')||'normal',operations:[],managementWrites:[],nativeAttempts:[],managementPrepared:new Map(),nativeReads:[],prepared:new Map(),data};
 function expose(){const node=document.getElementById('fixture-audit');if(node)node.textContent=JSON.stringify({requests:fixture.requests,operations:fixture.operations,managementWrites:fixture.managementWrites,nativeAttempts:fixture.nativeAttempts,nativeReads:fixture.nativeReads,mode:fixture.mode});}
 const employeePreview=new URLSearchParams(location.search).has('employees');
 data.employees=employeePreview?[
 {ID:'90071992547408801',BU_Employee_ID:'FOREMAN-A',EmployeeName:'John Doe',Employee_Code:'1696',IsActive:true,Territory:'North Austin',Labor_Type:'Foreman',Crew:{ID:data.crews[0].ID},Synced_At:'10/21/2026 08:00:00'},
 {ID:'90071992547408802',BU_Employee_ID:'EMPLOYEE-B',EmployeeName:'Alex Employee',Employee_Code:'1697',IsActive:true,Territory:'N/A',Labor_Type:'Skilled',Crew:'',Synced_At:'10/21/2026 08:00:00'},
 {ID:'90071992547408803',BU_Employee_ID:'FOREMAN-C',EmployeeName:'Former Foreman',Employee_Code:'1698',IsActive:false,Territory:'Waco',Labor_Type:'Foreman',Crew:{ID:data.crews[1].ID},Synced_At:'10/21/2026 08:00:00'}]:[];
 data.timecards=employeePreview?[{ID:'90071992547407701',Timecard_ID:'CARD-A',Work_Date:'10/21/2026',Foreman_ID:'FOREMAN-A',Subdivision1:{ID:data.subdivisions[0].ID},IsDeleted:false,Foreman_Name:'John Doe',Job_Code:'C_CAM01',Synced_At:'10/21/2026 08:00:00'},{ID:'90071992547407702',Timecard_ID:'CARD-B',Work_Date:'10/20/2026',Foreman_ID:'FOREMAN-C',Subdivision1:{ID:data.subdivisions[0].ID},IsDeleted:false,Foreman_Name:'Former Foreman',Job_Code:'C_CAM01',Synced_At:'10/21/2026 08:00:00'}]:[];
 const tables={All_Employees:data.employees,All_Crew_Timecards:data.timecards,All_Subdivisions:data.subdivisions,All_Milestones:data.milestones,All_Crews:data.crews,Crew_Assignment_Report:data.assignments,All_Task_Schedules:data.tasks};
 if(fixture.mode==='paged')for(let i=0;i<201;i++)data.crews.push({...data.crews[0],ID:String(810000+i),Crew_Code:'PAGE-'+i});
 function nativeRows(config){const rows=tables[config.report_name];return fixture.mode!=='scope-denied'?rows:rows.filter(row=>!(config.report_name==='All_Subdivisions'&&row.ID==='90071992547409933')&&!(config.report_name==='Crew_Assignment_Report'&&row.ID==='90071992547407011'));}
 function nativeDenied(config){return fixture.mode==='report-denied'&&config.report_name==='Crew_Assignment_Report';}
 const iso=s=>!s?null:/^\d{4}-/.test(s)?s:s.slice(6)+'-'+s.slice(0,2)+'-'+s.slice(3,5),us=s=>!s?'':s.slice(5,7)+'/'+s.slice(8)+'/'+s.slice(0,4);
 const meta=body=>({ok:true,action:body.action,testingMode:false,creatorOnly:true,projectsPushEnabled:false,environment:'development'});
 const active=value=>value===true||value==='true';
 const sourceEditable=row=>['MANUAL_WIDGET','MANUAL_QA'].includes(row.Source_System)&&row.Source_Key===row.Source_System+':'+row.Source_Record_ID;
 const phaseEditable=row=>![row.Projects_Status,row.Status].some(value=>/^(completed|sold out(?: \(prev wfy\))?)$/i.test(String(value||'').trim()));
 const managementError=(body,message,unknown=false)=>({...meta(body),ok:false,message,unknown});
 function managementRows(body){
  fixture.nativeReads.push({action:body.action,reports:['All_Crews','Crew_Assignment_Report','All_Subdivisions'],caller:fixtureUser});expose();
  if(fixture.mode==='denied')return managementError(body,'Crew management access was revoked.');
  if(fixture.mode==='report-denied')return managementError(body,'Permission denied for Crew_Assignment_Report.');
  if(fixture.mode==='missing-field')return managementError(body,'Crew_Assignment_Report must expose Source_Key to this user.');
  const readOnly=fixture.mode==='readonly';
  const phases=data.subdivisions.filter(row=>fixture.mode!=='scope-denied'||row.ID!=='90071992547409933').map(row=>({id:row.ID,name:row.Subdivision_Name,code:row.Subdivision_Code,phase:row.Phase,subphase:row.Subphase||'',territory:row.Territory,status:row.Projects_Status||row.Status,creatorStatus:row.Status||'',projectsStatus:row.Projects_Status||'',editable:phaseEditable(row)&&!readOnly,reason:phaseEditable(row)?'':'Sold-out phases are read-only.'}));
  const result={...meta(body),complete:true,permissions:{view:true,assignments:!readOnly},management:{enabled:true,nativeWrites:true,protocol:'native-validated-v1',reason:readOnly?'Crew management permission is required.':''},crews:data.crews.map(row=>({id:row.ID,code:row.Crew_Code,name:row.Crew_Name||'',color:row.Badge_Color,active:active(row.Active)})),assignments:data.assignments.filter(row=>fixture.mode!=='scope-denied'||row.ID!=='90071992547407011').map(row=>({id:row.ID,crewId:row.Crew.ID,phaseId:row.Subdivision1.ID,date:iso(row.Assignment_Date),sourceSystem:row.Source_System||'',sourceRecordId:row.Source_Record_ID||'',sourceKey:row.Source_Key||'',editable:sourceEditable(row)&&!readOnly,reason:!sourceEditable(row)?'Imported assignment is read-only.':''})),phases};
  if(fixture.mode==='paged'){
   const next={};for(const key of ['crews','assignments','phases']){const offset=Number(body.cursor?.[key]||0),remaining=!body.cursor||body.cursor[key]!=='';if(!remaining){result[key]=[];next[key]='';continue;}const rows=result[key];result[key]=rows.slice(offset,offset+2);next[key]=rows.length>offset+2?String(offset+2):'';}
   result.nextCursor=next;result.complete=Object.values(next).every(value=>value==='');
  }
  return result;
 }
 async function managementWrite(body){
  if(fixture.mode==='readonly'||fixture.mode==='denied')return managementError(body,'Crew management permission is required.');
  if(fixture.mode==='report-denied')return managementError(body,'Creator denied this record operation.');
  if(body.action==='save-employee'){
   const e=body.employee,row=data.employees.find(r=>r.ID===e?.id);
   if(!row||!active(row.IsActive))return managementError(body,'Inactive or unavailable employee.');
   const crew=data.crews.find(c=>c.ID===e.crewId);if(e.crewId&&(!crew||!active(crew.Active)))return managementError(body,'Choose an active crew.');
   const write={kind:'employee',formName:'Employees',reportName:'All_Employees',recordId:e.id,data:{Territory:e.territory,Labor_Type:e.laborType,Crew:e.crewId}};
   fixture.managementPrepared.set(body.requestId,{body:structuredClone(body),write});expose();return {...meta(body),state:'ready',requestId:body.requestId,write};
  }
  const crewWrite=body.action==='save-crew',kind=crewWrite?'crew':'assignment',entry=body[kind];
  if(!entry||!body.requestId)return managementError(body,'An exact record and request identity are required.');
  const prior=fixture.managementWrites.find(write=>write.requestId===body.requestId);if(prior)return {...meta(body),state:'saved',kind,requestId:body.requestId,recordId:prior.recordId};
  let row;
  if(crewWrite){
   row=entry.id?data.crews.find(row=>row.ID===entry.id):null;
   if(entry.id&&!row)return managementError(body,'This crew is outside your report scope.');
   if(!String(entry.code||'').trim()||String(entry.code).length>64||String(entry.name||'').length>255||!/^#[a-fA-F0-9]{6}$/.test(entry.color))return managementError(body,'Enter a crew code and #RRGGBB badge color.');
   if(row&&row.Crew_Code!==entry.code)return managementError(body,'Crew codes cannot be changed.');
   if(data.crews.some(other=>other.ID!==entry.id&&other.Crew_Code.toLowerCase()===entry.code.toLowerCase()))return managementError(body,'That crew code already exists.');
  }else{
   row=entry.id?data.assignments.find(row=>row.ID===entry.id):null;
   const crew=data.crews.find(crew=>crew.ID===entry.crewId),phase=data.subdivisions.find(phase=>phase.ID===entry.phaseId),parsed=/^\d{4}-\d{2}-\d{2}$/.test(entry.date)&&new NativeDate(entry.date+'T12:00:00Z');
   if(entry.id&&(!row||(fixture.mode==='scope-denied'&&row.ID==='90071992547407011')))return managementError(body,'This assignment is outside your report scope.');
   if(!crew||(!active(crew.Active)&&(!row||row.Crew.ID!==entry.crewId))||!phase||!phaseEditable(phase)||!parsed||isNaN(parsed)||parsed.toISOString().slice(0,10)!==entry.date)return managementError(body,'Choose an active crew, available phase and valid date.');
   if(row&&(!sourceEditable(row)||!phaseEditable(data.subdivisions.find(phase=>phase.ID===row.Subdivision1.ID))))return managementError(body,'Imported and sold-out assignments are read-only.');
  }
  const native=crewWrite?{...(entry.id?{}:{Crew_Code:entry.code}),Crew_Name:entry.name,Badge_Color:entry.color,Active:entry.active}:{Subdivision1:entry.phaseId,Crew:entry.crewId,Assignment_Date:us(entry.date)};
  if(!entry.id){Object.assign(native,{Source_System:'MANUAL_WIDGET',Source_Record_ID:body.requestId});if(!crewWrite)native.Source_Key='MANUAL_WIDGET:'+body.requestId;}
  const write={kind,formName:crewWrite?'Crew':'Crew_Assignment',reportName:crewWrite?'All_Crews':'Crew_Assignment_Report',recordId:entry.id||'',data:native};
  fixture.managementPrepared.set(body.requestId,{body:structuredClone(body),write});expose();
  return {...meta(body),unknown:false,state:'ready',requestId:body.requestId,write};
 }
 async function nativeManagementWrite(config,update){
  fixture.nativeAttempts.push({method:update?'PATCH':'POST',config:structuredClone(config)});expose();
  const prepared=[...fixture.managementPrepared.values()].reverse().find(item=>item.write.reportName===(update?config.report_name:item.write.reportName)&&item.write.formName===(update?item.write.formName:config.form_name)&&String(item.write.recordId||'')===String(update?config.id:'')&&JSON.stringify(item.write.data)===JSON.stringify(config.payload?.data));
  if(!prepared)return {code:3001,message:'No exact prepared native request matches this write.'};
  if(fixture.mode==='reject'){fixture.mode='normal';expose();return {code:3001,message:'Fixture native validation rejected this draft.'};}
  if(fixture.mode==='native-denied'){fixture.mode='normal';expose();return {code:2897,message:'Fixture native profile denied this operation.'};}
  if(fixture.mode==='native-thrown-denied'){fixture.mode='normal';expose();throw {code:2897,message:'Fixture native SDK rejected with profile denial.'};}
  if(fixture.mode==='create-scope-denied'||fixture.mode==='report-denied')return {code:2945,message:'Creator permission denied.'};
  await new Promise(resolve=>setTimeout(resolve,90));
  const {body,write}=prepared,entry=body[write.kind],id=write.recordId||'900719925474'+String(81000+fixture.managementWrites.length),rows=write.kind==='employee'?data.employees:write.kind==='crew'?data.crews:data.assignments;
  let row=rows.find(item=>item.ID===id);if(!row){row={ID:id};rows.push(row);}Object.assign(row,structuredClone(write.data));
  if(write.kind==='assignment')Object.assign(row,{Crew:{ID:entry.crewId,display_value:data.crews.find(crew=>crew.ID===entry.crewId).Crew_Code},Subdivision1:{ID:entry.phaseId,display_value:data.subdivisions.find(phase=>phase.ID===entry.phaseId).Subdivision_Name}});
  fixture.managementWrites.push({requestId:body.requestId,recordId:id,kind:write.kind,payload:structuredClone(entry),method:update?'PATCH':'POST',caller:fixtureUser});expose();
  if(fixture.mode==='lost'){fixture.mode='normal';expose();throw new Error('Fixture response lost after native record save.');}
  if(fixture.mode==='ambiguous'){fixture.mode='normal';expose();return {code:3000,data:{},message:'Native save returned no destination identity.'};}
  if(fixture.mode==='native-numeric-id'){fixture.mode='normal';expose();return {code:3000,data:{ID:Number(id)}};}
  if(fixture.mode==='native-competing-id'){fixture.mode='normal';expose();return {code:3000,data:{ID:id},details:{ID:'90071992547409999'}};}
  if(fixture.mode==='native-nested-error'){fixture.mode='normal';expose();return {code:3000,data:{ID:id},details:{code:2897,message:'Native nested rejection contradicts the identity.'}};}
  if(fixture.mode==='native-denied-mixed'){fixture.mode='normal';expose();return {code:2897,data:{ID:id},message:'Native denial includes a saved identity.'};}
  if(fixture.mode==='native-single-result'){fixture.mode='normal';expose();return {code:3000,result:[{code:3000,data:{ID:id},message:'Native single-record result.'}]};}
  return {code:3000,data:{ID:id}};
 }
 function managementStatus(body){
  const saved=fixture.managementWrites.find(write=>write.requestId===body.requestId&&write.kind===body.statusFor);
  fixture.nativeReads.push({action:body.action,requestId:body.requestId,caller:fixtureUser});expose();
  if(fixture.mode==='report-denied')return managementError(body,'Creator denied the status report read.',true);
  if(!saved||JSON.stringify(saved.payload)!==JSON.stringify(body[body.statusFor]))return {...meta(body),state:'unknown',unknown:true,kind:body.statusFor,requestId:body.requestId,message:'No matching native save is confirmed. No write was replayed.'};
  return {...meta(body),state:'saved',kind:saved.kind,recordId:saved.recordId,requestId:body.requestId};
 }
 window.ZOHO={CREATOR:{UTIL:{getInitParams:async()=>({loginUser:fixtureUser,appLinkName:'land-master',envUrlFragment:'environment/development'})},DATA:{
  addRecords:config=>nativeManagementWrite(config,false),
  updateRecordById:config=>nativeManagementWrite(config,true),
  getRecordCount:async config=>{fixture.nativeReads.push({action:'sdk-count',config:structuredClone(config),caller:fixtureUser});expose();return fixture.mode==='native-denied'&&config.report_name==='Crew_Assignment_Report'?{code:2898}:nativeDenied(config)?{code:2945,message:'Permission denied for Crew_Assignment_Report.'}:{code:3000,result:{records_count:nativeRows(config).length}};},
  // SDK pages contain at least 200 rows when more remain. Match that contract;
  // tiny synthetic pages can otherwise hit LMData's bounded-completion guard.
  getRecords:async config=>{fixture.nativeReads.push({action:'sdk-records',config:structuredClone(config),caller:fixtureUser});expose();if(nativeDenied(config))return {code:2945,message:'Permission denied for Crew_Assignment_Report.'};const rows=nativeRows(config),offset=Number(config.record_cursor||0),pageSize=200,batch=rows.slice(offset,offset+pageSize).map(row=>Object.fromEntries(String(config.fields||Object.keys(row).join(',')).split(',').filter(field=>!(fixture.mode==='missing-field'&&config.report_name==='Crew_Assignment_Report'&&field==='Source_Key')).map(field=>[field,row[field]??''])));return {code:3000,data:batch,...(rows.length>offset+pageSize?{record_cursor:String(offset+pageSize)}:{})};},
  invokeCustomApi:async config=>{
   const body=JSON.parse(config.payload.payload);fixture.requests.push(body);expose();const base=meta(body);
   if(config.api_name!=='Crew_Locations_Widget_DEV')throw new Error('Unexpected fixture API name');
   if(body.action==='capabilities'){if(fixture.mode==='denied')return {...base,ok:false,message:'Fixture access revoked'};return {...base,...(fixture.mode==='legacy-management'?{}:{management:{enabled:true,nativeWrites:true,protocol:'native-validated-v1'}}),permissions:{view:true,milestones:true,tasks:true,assignments:fixture.mode!=='readonly'},sources:{employees:employeePreview,foremanTimecards:employeePreview,crews:fixture.mode!=='unconfigured',tasks:fixture.mode!=='unconfigured'&&!new URLSearchParams(location.search).has('desktop')},dependencies:['Isolated browser fixture. No live Creator or Projects records are connected.']};}
   if(body.action==='management-list'){if(fixture.mode==='invalid-connection')throw new Error('Error at line: 121, Invalid Connection');return managementRows(body);}
   if(body.action==='save-crew'||body.action==='save-assignment'||body.action==='save-employee')return managementWrite(body);
   if(body.action==='management-status')return managementStatus(body);
   if(body.action==='employee-status'){const saved=fixture.managementWrites.find(w=>w.requestId===body.requestId&&w.kind==='employee');return {...base,state:saved?'saved':'unconfirmed',kind:'employee',requestId:body.requestId,recordId:saved?.recordId||'',unknown:!saved};}
   if(body.action==='history')return {...base,operations:fixture.operations.filter(o=>o.subdivisionId===body.subdivisionId).map(o=>({...o,origin:o.origin,state:o.result.state,actor:'Fixture user',timestamp:'10/21/2026 12:00:00'}))};
   if(body.action==='status'){const op=fixture.operations.find(o=>o.operationId===body.operationId);if(op?.recoveryResult)op.result=op.recoveryResult;expose();return {...op?.result,...base,state:op?'saved':'unknown',unknown:!op,operationId:body.operationId};}
   if(body.action==='prepare'){
    if(fixture.mode==='reject'){fixture.mode='normal';return {...base,ok:false,unknown:false,message:'Fixture save denied before writing',operationId:body.operationId,confirmed:[]};}
    fixture.prepared.set(body.operationId,JSON.stringify({...body,action:'apply'}));
    if(fixture.mode==='prepare-lost'){fixture.mode='normal';throw new Error('Fixture preparation response lost before any date write');}
    return {...base,operationId:body.operationId,state:'prepared'};
   }
   if(body.action==='apply'){
    if(fixture.prepared.get(body.operationId)!==JSON.stringify(body))return {...base,ok:false,unknown:false,message:'Prepare this exact operation before saving'};
    if(fixture.mode==='reject'){fixture.mode='normal';return {...base,ok:false,unknown:false,message:'Fixture save denied before writing',operationId:body.operationId,confirmed:[]};}
    const existing=fixture.operations.find(o=>o.operationId===body.operationId);if(existing)return {...base,...existing.result};
    const confirmed=[],records=[];
    for(const change of body.changes){const rows=change.type==='M'?data.milestones:data.tasks,r=rows.find(r=>r.ID===change.recordId);if(!r)throw new Error('Missing fixture record');if(body.origin==='drag'&&change.type==='T')return {...base,ok:false,unknown:false,message:'Task dragging prohibited'};if(iso(r.Start_Date)!==change.expected.start||iso(r.End_Date)!==change.expected.end)return {...base,ok:false,unknown:false,message:'Fixture revision conflict'};for(const [field,entry] of Object.entries(change.fields))r[field==='start'?'Start_Date':'End_Date']=us(entry.after);r.Push_Update=false;confirmed.push({type:change.type,recordId:change.recordId});records.push({type:change.type,id:change.recordId,start:iso(r.Start_Date),end:iso(r.End_Date)});}
    const result={...base,operationId:body.operationId,state:'saved',confirmed,...(fixture.mode==='identity-only'?{}:{records})};
    if(fixture.mode==='identity-only')fixture.mode='normal';
    if(fixture.mode==='ambiguous'){fixture.mode='normal';const unknown={...base,ok:false,unknown:true,operationId:body.operationId,state:'unknown',message:'Fixture native acknowledgement is ambiguous',confirmed:[],records:[]};fixture.operations.push({...body,result:unknown,recoveryResult:result});expose();return unknown;}
    fixture.operations.push({...body,result});expose();
    if(fixture.mode==='lost'){fixture.mode='normal';throw new Error('Fixture response lost after local write');}
    return result;
   }
   throw new Error('Unknown fixture action');
  }
 }}};
 window.addEventListener('DOMContentLoaded',()=>{
  document.title='Isolated preview — Crew Locations';const warning=document.createElement('aside');warning.id='fixture-warning';warning.setAttribute('role','note');warning.textContent='ISOLATED PREVIEW — sample records only; no Creator or Projects connection.';warning.style.cssText='background:#17355a;color:#fff;padding:8px 14px;border-radius:7px;font:13px Segoe UI,sans-serif;margin-bottom:16px';document.body.prepend(warning);
  const panel=document.createElement('details');panel.id='fixture-tools';panel.innerHTML='<summary>Isolated preview controls</summary><p>No live records are connected. These controls are not in the widget package.</p>'+['normal','reject','lost','prepare-lost','ambiguous','identity-only','triple','denied','unconfigured','readonly','report-denied','create-scope-denied','missing-field','scope-denied','paged','native-denied','native-thrown-denied','native-single-result','native-numeric-id','native-competing-id','native-nested-error','native-denied-mixed'].map(mode=>'<button data-fixture-mode="'+mode+'">'+mode+'</button>').join(' ')+'<pre id="fixture-audit" hidden></pre><ol id="browser-checks" aria-label="Browser test results"></ol>';document.body.appendChild(panel);panel.addEventListener('click',e=>{if(e.target.dataset.fixtureMode){fixture.mode=e.target.dataset.fixtureMode;if(fixture.mode==='triple')for(const rows of [data.milestones,data.tasks])rows.filter(r=>r.Subdivision1.ID===data.subdivisions[1].ID&&(r.Stage_Key||r.Milestone_Name)==='Rough Cut').forEach(r=>r.End_Date='02/10/2027');expose();}});expose();
 });
}
const sdk='('+fixtureSDK.toString()+')('+JSON.stringify(crewFixture())+');';
const desktopSdk='('+fixtureSDK.toString()+')('+JSON.stringify(crewDesktopFixture())+');';
const managementSdk='('+fixtureSDK.toString()+')('+JSON.stringify(crewManagementFixture())+');';
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),name=url.pathname==='/'?'/widget.html':url.pathname;
 if(name==='/desktop.html'&&url.searchParams.get('workspace')==='crews'){res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Crew Management desktop sizing checks</title><style>body{margin:14px;font:14px Segoe UI,Arial,sans-serif;color:#172b46;background:#e5ecf3}button{font:inherit;border:1px solid #bac9de;border-radius:6px;padding:7px 10px;margin-right:6px;background:#fff;cursor:pointer}iframe{display:block;border:1px solid #abbdd4;background:white;max-width:none}pre{white-space:pre-wrap;font:13px/1.4 Consolas,monospace;max-width:1250px}</style><h1 style="font-size:20px;margin:0 0 10px">Isolated Crew Management desktop checks</h1><div>${[[1250,600],[1366,768],[1440,900],[1920,1080]].map(([w,h])=>'<button data-size="'+w+'x'+h+'">'+w+' × '+h+'</button>').join('')}</div><p id="size"></p><iframe id="desktopFrame" title="Crew Management desktop preview"></iframe><pre id="results" aria-live="polite">Loading…</pre><script>const frame=document.getElementById('desktopFrame');function resize(size){const [w,h]=size.split('x').map(Number);frame.width=w;frame.height=h;document.getElementById('size').textContent='Crew Management viewport: '+w+' × '+h;document.getElementById('results').textContent='Running…';frame.src='/widget.html?managementDesktop=1&case='+encodeURIComponent(size);}document.querySelectorAll('[data-size]').forEach(button=>button.onclick=()=>resize(button.dataset.size));window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.crewDesktopQA)document.getElementById('results').textContent=JSON.stringify(event.data.crewDesktopQA,null,2);});resize(new URLSearchParams(location.search).get('size')||'1250x600');</script></html>`);return;}
 if(name==='/desktop.html'){res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Crew desktop sizing checks</title><style>body{margin:14px;font:14px Segoe UI,Arial,sans-serif;color:#172b46;background:#e5ecf3}button{font:inherit;border:1px solid #bac9de;border-radius:6px;padding:7px 10px;margin-right:6px;background:#fff;cursor:pointer}iframe{display:block;border:1px solid #abbdd4;background:white;max-width:none}pre{white-space:pre-wrap;font:13px/1.4 Consolas,monospace;max-width:1250px}p{margin:9px 0}</style><h1 style="font-size:20px;margin:0 0 10px">Isolated crew desktop checks</h1><div>${[[1250,600],[1366,768],[1440,900],[1920,1080]].map(([w,h])=>'<button data-size="'+w+'x'+h+'">'+w+' × '+h+'</button>').join('')}</div><p id="size"></p><iframe id="desktopFrame" title="Crew Management desktop preview"></iframe><pre id="results" aria-live="polite">Loading…</pre><script>const frame=document.getElementById('desktopFrame');function resize(size){const [w,h]=size.split('x').map(Number);frame.width=w;frame.height=h;document.getElementById('size').textContent='Widget viewport: '+w+' × '+h+' · 38 synthetic phases · Tasks unavailable';document.getElementById('results').textContent='Running…';frame.src='/widget.html?desktop=1&checks=1&case='+encodeURIComponent(size);}document.querySelectorAll('[data-size]').forEach(button=>button.onclick=()=>resize(button.dataset.size));window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.crewDesktopQA)document.getElementById('results').textContent=JSON.stringify(event.data.crewDesktopQA,null,2);});resize(new URLSearchParams(location.search).get('size')||'1250x600');</script></html>`);return;}
 if(name==='/__crew-fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(url.searchParams.has('desktop')?desktopSdk:url.searchParams.has('management')?managementSdk:sdk);return;}
 if(name==='/__crew-browser-checks.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync('scripts/fixtures/crew-browser-checks.js'));return;}
 if(name==='/__crew-desktop-checks.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync('scripts/fixtures/crew-desktop-checks.js'));return;}
 if(name==='/__crew-management-checks.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync('scripts/fixtures/crew-management-browser-checks.js'));return;}
 if(name==='/__crew-management-desktop-checks.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync('scripts/fixtures/crew-management-desktop-checks.js'));return;}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');let content=fs.readFileSync(file);
 if(file.endsWith('widget.html')){content=content.toString().replace('https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js','/__crew-fixture.js'+(url.searchParams.has('desktop')?'?desktop=1':url.searchParams.has('managementChecks')||url.searchParams.has('management')||url.searchParams.has('managementDesktop')?'?management=1':''));if(url.searchParams.has('managementDesktop')||url.searchParams.has('managementChecks')||url.searchParams.has('checks'))content=content.replace('</body>','<script src="/'+(url.searchParams.has('managementDesktop')?'__crew-management-desktop-checks.js':url.searchParams.has('managementChecks')?'__crew-management-checks.js':url.searchParams.has('desktop')?'__crew-desktop-checks.js':'__crew-browser-checks.js')+'"></script></body>');}
 res.end(content);
});
server.listen(port,'127.0.0.1',()=>console.log('Isolated Crew Locations preview: http://127.0.0.1:'+port+'/widget.html (add ?checks=1 for browser integration checks). No live writes.'));
