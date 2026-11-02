import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import {crewManagementFixture} from './fixtures/crew-locations.mjs';

function harness(read){
 const data=crewManagementFixture(),calls=[],reports={All_Crews:data.crews,Crew_Assignment_Report:data.assignments,All_Subdivisions:data.subdivisions};
 const scope=vm.createContext({Date,Intl,Map,Set,Number,String,Object,Math,LMData:{readAll:async options=>{calls.push(options);const rows=structuredClone(reports[options.reportName]);for(const row of rows)for(const field of options.fields)if(!Object.hasOwn(row,field))row[field]='';return read?read(options,{...reports,[options.reportName]:rows}):rows;}}});scope.window=scope;
 vm.runInContext(fs.readFileSync('widgets/crew-locations/src/app/crew-model.js','utf8'),scope);
 const source=fs.readFileSync('widgets/crew-locations/src/app/crew-manager.js','utf8');
 vm.runInContext(source.replaceAll('install,state:S,load,switchWorkspace,','install,state:S,load,switchWorkspace,readComplete,'),scope);
 return {read:scope.CrewManager.readComplete,calls,data};
}
const capabilities=assignments=>({permissions:{view:true,assignments},sources:{crews:true},management:{enabled:true,nativeWrites:true,protocol:'native-validated-v1'}});

test('roster reads the complete native SDK reports with no OAuth/API bridge or date-window filter',async()=>{
 const h=harness(),cancelled=()=>false,result=await h.read(capabilities(true),cancelled);
 assert.equal(result.crews.length,4);assert.equal(result.assignments.length,9);assert.equal(result.phases.length,6);
 assert.deepEqual(h.calls.map(call=>call.reportName).sort(),['All_Crews','All_Subdivisions','Crew_Assignment_Report']);
 for(const call of h.calls){assert.equal(call.fresh,true);assert.equal(call.isCancelled,cancelled);assert.equal(call.criteria,undefined);assert.ok(call.fields.includes('ID'));}
 assert.ok(result.assignments.some(row=>row.date==='2026-11-04'),'future work survives the schedule badge window');
 assert.equal(result.crews.find(row=>row.code==='U2').active,true);
 assert.equal(result.crews.find(row=>row.code==='RC').active,false);
 assert.ok(result.assignments.every(row=>typeof row.id==='string'&&typeof row.crewId==='string'&&typeof row.phaseId==='string'));
});

test('module denial and unavailable sources reject before reading private reports',async()=>{
 const h=harness();await assert.rejects(h.read({...capabilities(true),permissions:{view:false}}),/access has not been granted/);
 await assert.rejects(h.read({...capabilities(true),sources:{crews:false}}),/not configured/);assert.equal(h.calls.length,0);
});

test('native report denial and hidden required fields never return a partial roster',async()=>{
 const denied=harness(async options=>{if(options.reportName==='Crew_Assignment_Report')throw Error('Permission denied');return [];});
 await assert.rejects(denied.read(capabilities(true)),/Permission denied/);
 const missing=harness(async(options,reports)=>structuredClone(reports[options.reportName]).map(row=>{if(options.reportName==='Crew_Assignment_Report')delete row.Source_Key;return row;}));
 await assert.rejects(missing.read(capabilities(true)),/must expose native field Source_Key/);
});

test('native row scope, read-only rights, imported lineage and phase locks remain authoritative',async()=>{
 const h=harness(async(options,reports)=>structuredClone(reports[options.reportName]).filter(row=>row.ID!=='90071992547409933'&&row.ID!=='90071992547407011'));
 const result=await h.read(capabilities(false));assert.ok(!result.phases.some(row=>row.id==='90071992547409933'));assert.ok(!result.assignments.some(row=>row.id==='90071992547407011'));
 assert.ok(result.assignments.every(row=>row.editable===false));assert.ok(result.phases.every(row=>row.editable===false));
 const full=await harness().read(capabilities(true));assert.equal(full.assignments.find(row=>row.id==='90071992547407012').editable,false);assert.ok(full.phases.some(row=>row.editable===false&&row.reason==='This phase is locked.'));
});

test('unsafe record IDs and missing lookup identities cannot become editable assignments',async()=>{
 for(const corrupt of [row=>row.Crew={display_value:'Crew without native identity'},row=>row.ID=90071992547409930]){
  const h=harness(async(options,reports)=>{const rows=structuredClone(reports[options.reportName]);if(options.reportName==='Crew_Assignment_Report')corrupt(rows[0]);return rows;});
  await assert.rejects(h.read(capabilities(true)),/incomplete assignment|unsafe numeric/);
 }
});

// Exercise the real CrewApp save/recovery controller with the shared SDK data
// bridge. Connection-dependent Custom API preparation deliberately fails here.
function nativeSaveHarness(options={}){
 const calls=[],timers=new Map(),ctx={user:'cfo@example.test',environment:'PRODUCTION',appLinkName:'land-master'},nodes=new Map();let timerId=0,sequence=0;
 const employees=options.employees||[1,2,3].map(n=>({ID:'90071992547409930'+n,IsActive:n===2?'true':true,Territory:'North',Labor_Type:n===1?'Foreman':'Skilled',Crew:n===1?{}:n===2?{ID:null,zc_display_value:''}:[]}));
 const crews=options.crews||[{ID:'90071992547408801',Crew_Code:'U1',Crew_Name:'Utility One',Badge_Color:'#49688c',Active:'true',Source_System:'MANUAL_QA',Source_Record_ID:'original-source'}, {ID:'90071992547408802',Crew_Code:'OLD',Crew_Name:'Inactive',Badge_Color:'#8054c7',Active:false,Source_System:'MANUAL_QA',Source_Record_ID:'older-source'}];
 const records={All_Crews:crews,All_Employees:employees};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,dataset:{},setAttribute(){},querySelectorAll:()=>[]});return nodes.get(id);};
 const scoped=config=>{
   let rows=records[config.report_name]||[];
   if(options.hidden?.includes(config.report_name))rows=[];
   const criteria=config.criteria||'',id=/^\(ID == (\d+)\)$/.exec(criteria),source=/Source_Record_ID == "([^"]+)"/.exec(criteria),code=/Crew_Code == "([^"]+)"/.exec(criteria);
   if(id)rows=rows.filter(row=>row.ID===id[1]);
   else if(source||code)rows=rows.filter(row=>(source&&row.Source_System==='MANUAL_WIDGET'&&row.Source_Record_ID===source[1])||(code&&row.Crew_Code.toLowerCase()===code[1].toLowerCase()));
   return rows;
 };
 const capabilities=()=>({ok:true,action:'capabilities',creatorOnly:true,projectsPushEnabled:false,environment:'production',permissions:{view:true,assignments:options.readonly!==true},management:{enabled:true,nativeWrites:true,protocol:'native-validated-v1'},sources:{crews:true,employees:true}});
 const sdk={
   async invokeCustomApi(config){const body=JSON.parse(config.payload.payload);calls.push({action:'custom-api',body});if(body.action==='capabilities'){if(options.capabilitiesWait)return options.capabilitiesWait;return capabilities();}throw Error('9750: The connection is not authorized.');},
   async getRecordCount(config){calls.push({action:'count',config:structuredClone(config)});if(options.denied===config.report_name)return {code:2898,message:'Native report access denied.'};return {code:3000,result:{records_count:scoped(config).length}};},
   async getRecords(config){calls.push({action:'records',config:structuredClone(config)});if(options.denied===config.report_name)return {code:2898,message:'Native report access denied.'};const rows=structuredClone(scoped(config));for(const row of rows)if(options.missingField)delete row[options.missingField];return {code:3000,data:rows};},
   async addRecords(config){calls.push({action:'add',config:structuredClone(config)});if(options.nativeDenied)return {code:2897,message:'Native CFO profile denied creation.'};const data=config.payload.data;if(crews.some(row=>row.Crew_Code.toLowerCase()===data.Crew_Code.toLowerCase()))return {code:3001,message:'Duplicate native Crew Code.'};const id='90071992547409939'+(++sequence);crews.push({ID:id,...structuredClone(data)});if(options.lost)throw Error('Native reply lost.');if(options.writeWait)return options.writeWait;return {code:3000,data:{ID:id}};},
   async updateRecordById(config){calls.push({action:'update',config:structuredClone(config)});if(options.nativeDenied)return {code:2897,message:'Native CFO profile denied editing.'};const row=(records[config.report_name]||[]).find(row=>row.ID===config.id);if(!row)return {code:2897,message:'Native row edit denied.'};Object.assign(row,structuredClone(config.payload.data));if(options.actorChange)ctx.user='different@example.test';if(options.lost)throw Error('Native reply lost.');if(options.writeWait)return options.writeWait;return {code:3000,result:[{code:3000,data:{ID:row.ID}}]};}
 };
 const scope=vm.createContext({document:{body:null,head:null,getElementById:node,querySelectorAll:()=>[]},Date,Intl,Map,Set,Number,String,Object,Math,Promise,LMRuntime:{current:()=>ctx,apiName:()=> 'Crew_Locations_Widget'},ZOHO:{CREATOR:{DATA:sdk}},setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)});scope.window=scope;
 vm.runInContext(fs.readFileSync('shared/creator-data.js','utf8'),scope);vm.runInContext(fs.readFileSync('widgets/crew-locations/src/app/crew-model.js','utf8'),scope);vm.runInContext(fs.readFileSync('widgets/crew-locations/src/app/crew-app.js','utf8'),scope);
 const nativeBridge=scope.LMData;let queuedWrite;
 if(options.queueWrite)scope.LMData={...nativeBridge,request:(task,fn,requestOptions)=>requestOptions?.readOnly===false?new Promise((resolve,reject)=>{queuedWrite=()=>Promise.resolve().then(fn).then(resolve,reject);}):nativeBridge.request(task,fn,requestOptions)};
 Object.assign(scope.CrewApp.state,{ready:true,permissions:{view:true,assignments:true}});
 const requestId='12345678-1234-1234-1234-123456789abc';
 const crew=(extra={})=>({action:'save-crew',requestId,crew:{code:'RC1',name:'Rough Cut One',color:'#49688c',active:true,...extra}});
 const employee=(id=employees[0].ID,extra={})=>({action:'save-employee',requestId,employee:{id,territory:'North',laborType:'Foreman',crewId:crews[0].ID,...extra}});
 return {calls,employees,crews,ctx,scope,app:scope.CrewApp,crew,employee,options,fire(ms){const match=[...timers.values()].find(t=>t.ms===ms);assert.ok(match,'missing timer '+ms);match.fn();},dispatchQueued(){return queuedWrite?.();}};
}
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate);};
const writes=h=>h.calls.filter(c=>c.action==='add'||c.action==='update');
const customActions=h=>h.calls.filter(c=>c.action==='custom-api').map(c=>c.body.action);

test('CFO New Crew and employee staffing work with unauthorized legacy preparation and retain native write scope',async()=>{
 const h=nativeSaveHarness(),created=await h.app.management.api(h.crew()),assigned=await h.app.management.api(h.employee());
 assert.equal(created.state,'saved');assert.equal(typeof created.recordId,'string');assert.equal(assigned.recordId,h.employees[0].ID);
 assert.deepEqual(customActions(h),['capabilities','capabilities']);
 assert.deepEqual(writes(h).map(c=>c.action),['add','update']);
 assert.deepEqual(Object.keys(writes(h)[1].config.payload.data).sort(),['Crew','Labor_Type','Territory']);
 assert.equal(writes(h)[0].config.form_name,'Crew');assert.equal(writes(h)[0].config.payload.data.Source_Record_ID,h.crew().requestId);
 assert.equal(writes(h)[1].config.report_name,'All_Employees');assert.equal(writes(h)[1].config.id,h.employees[0].ID);
 assert.ok(h.calls.some(c=>c.action==='records'&&c.config.report_name==='All_Employees'&&c.config.criteria==='(ID == '+h.employees[0].ID+')'));
});

test('crew edits and active toggles read the exact caller record and never rewrite source or crew code',async()=>{
 const h=nativeSaveHarness(),row=h.crews[0];await h.app.management.api(h.crew({id:row.ID,code:row.Crew_Code,name:'Renamed',active:false}));
 assert.equal(row.Active,false);assert.equal(row.Source_Record_ID,'original-source');
 assert.deepEqual(Object.keys(writes(h)[0].config.payload.data).sort(),['Active','Badge_Color','Crew_Name']);
 assert.deepEqual(customActions(h),['capabilities']);
 await assert.rejects(h.app.management.api(h.crew({id:row.ID,code:'CHANGED'})),/immutable/);assert.equal(writes(h).length,1);
});

test('foreman batch adapter can save every captured employee through the native route with fresh capability checks',async()=>{
 const h=nativeSaveHarness();for(const row of h.employees)await h.app.management.api(h.employee(row.ID,{laborType:row.Labor_Type}));
 assert.equal(writes(h).length,3);assert.deepEqual(writes(h).map(c=>c.config.id),h.employees.map(r=>r.ID));assert.deepEqual(customActions(h),['capabilities','capabilities','capabilities']);
});

test('exposed native empty Crew lookup shapes permit first staffing assignment and read-only empty recovery',async()=>{
 for(const lookup of [null,'',{},[],{ID:''},{ID:null},{id:''},{id:null},{ID:'',display_value:''},{ID:null,zc_display_value:null},{display_value:''}]){
   const h=nativeSaveHarness();h.employees[0].Crew=structuredClone(lookup);
   const result=await h.app.management.api(h.employee());assert.equal(result.state,'saved');assert.equal(writes(h).length,1);
   h.employees[0].Crew=structuredClone(lookup);const body=h.employee(undefined,{crewId:''});
   const status=await h.app.management.api({...body,action:'employee-status'});assert.equal(status.state,'saved');assert.equal(writes(h).length,1,'Recovery is read-only.');
 }
});

test('native lookup identity aliases retain exact strings and malformed populated Crew values never dispatch',async()=>{
 for(const lookup of [{id:'90071992547408802'},{ID:'90071992547408802',id:'90071992547408802'},{ID:null,id:'90071992547408802'}]){
   const h=nativeSaveHarness();h.employees[0].Crew=lookup;await h.app.management.api(h.employee(undefined,{crewId:h.crews[1].ID}));assert.equal(writes(h).length,1,'An unchanged inactive crew remains assignable with a native identity alias.');
 }
 for(const lookup of [{display_value:'Hidden Crew'},{ID:'',zc_display_value:'Hidden Crew'},{ID:null,display_value:'Hidden Crew'},{ID:'invalid'},{id:'invalid'},{ID:90071992547408802},{id:12},{ID:'90071992547408801',id:'90071992547408802'},{ID:'90071992547408801',id:12},['90071992547408801'],[{}],{unexpected:''},false]){
   const h=nativeSaveHarness();h.employees[0].Crew=lookup;await assert.rejects(h.app.management.api(h.employee()),/invalid native crew identity/);assert.equal(writes(h).length,0);assert.equal(h.app.state.managementUnknown,false);
   await assert.rejects(h.app.management.api({...h.employee(undefined,{crewId:''}),action:'employee-status'}),/invalid native crew identity/);assert.equal(writes(h).length,0);
 }
 const hidden=nativeSaveHarness({missingField:'Crew'});await assert.rejects(hidden.app.management.api(hidden.employee()),/must expose native field Crew/);assert.equal(writes(hidden).length,0);
});

test('module denial, caller read denial, hidden employee and missing native fields fail before any staffing write',async()=>{
 for(const options of [{readonly:true},{denied:'All_Employees'},{hidden:['All_Employees']},{missingField:'IsActive'}]){
   const h=nativeSaveHarness(options);await assert.rejects(h.app.management.api(h.employee()));assert.equal(writes(h).length,0);assert.equal(h.app.state.managementUnknown,false);
 }
});

test('inactive employees, unavailable or inactive target crews and unsafe identities cannot dispatch writes',async()=>{
 const h=nativeSaveHarness();h.employees[0].IsActive=false;await assert.rejects(h.app.management.api(h.employee()),/Inactive/);h.employees[0].IsActive=true;
 await assert.rejects(h.app.management.api(h.employee(undefined,{crewId:h.crews[1].ID})),/active crew/);
 await assert.rejects(h.app.management.api(h.employee(undefined,{crewId:'999999999999999999'})),/unavailable/);
 await assert.rejects(h.app.management.api(h.employee(Number(h.employees[0].ID))),/ID string/);
 await assert.rejects(h.app.management.api({...h.employee(),requestId:'bad-request'}),/stable request/);
 await assert.rejects(h.app.management.api(h.employee(undefined,{laborType:'Unknown'})),/valid labor/);assert.equal(writes(h).length,0);
 h.employees[0].Crew={ID:h.crews[1].ID};await h.app.management.api(h.employee(undefined,{crewId:h.crews[1].ID}));assert.equal(writes(h).length,1,'Retained inactive crew may remain unchanged.');
});

test('native profile rejection stays a known failure and never falls back to another save path',async()=>{
 for(const kind of ['crew','employee']){const h=nativeSaveHarness({nativeDenied:true});await assert.rejects(h.app.management.api(h[kind]()),e=>e.unknown===false&&/Native CFO profile denied/.test(e.message));assert.equal(writes(h).length,1);assert.equal(h.app.state.managementUnknown,false);assert.deepEqual(customActions(h),['capabilities']);}
});

test('lost staffing or crew replies block all new writes and recover only through caller SDK reads',async()=>{
 for(const kind of ['crew','employee']){
   const h=nativeSaveHarness({lost:true}),body=h[kind]();await assert.rejects(h.app.management.api(body),e=>e.unknown===true);assert.equal(h.app.state.managementUnknown,true);
   await assert.rejects(h.app.management.api(body),/current save or review/);assert.equal(writes(h).length,1);
   const status=kind==='employee'?{...body,action:'employee-status'}:{...body,action:'management-status',statusFor:'crew'};
   const recovered=await h.app.management.api(status);assert.equal(recovered.state,'saved');assert.equal(recovered.requestId,body.requestId);assert.equal(writes(h).length,1);assert.deepEqual(customActions(h),['capabilities','capabilities']);
   assert.equal(h.app.state.managementUnknown,true,'Only the owning editor releases its pending lock after matching the recovered identity.');
 }
});

test('create recovery binds exact source UUID and never accepts an unrelated crew or replays the insert',async()=>{
 const h=nativeSaveHarness({lost:true}),body=h.crew();await assert.rejects(h.app.management.api(body));h.crews.at(-1).Source_Record_ID='87654321-1234-1234-1234-123456789abc';
 const status=await h.app.management.api({...body,action:'management-status',statusFor:'crew'});assert.equal(status.state,'unconfirmed');assert.equal(status.unknown,true);assert.equal(status.safeToRetry,undefined);assert.equal(writes(h).length,1);
});

test('explicit recovery uses fresh rights and native rows even if an unrelated schedule report is unready',async()=>{
 const h=nativeSaveHarness({lost:true}),body=h.employee();await assert.rejects(h.app.management.api(body));h.app.state.ready=false;h.app.state.permissions={};
 const result=await h.app.management.api({...body,action:'employee-status'});assert.equal(result.state,'saved');assert.equal(writes(h).length,1);
});

test('duplicate crew code is blocked and an already-created source UUID requires explicit status recovery',async()=>{
 const h=nativeSaveHarness();await assert.rejects(h.app.management.api(h.crew({code:h.crews[0].Crew_Code})),/already in use/);assert.equal(writes(h).length,0);
 h.crews.push({ID:'900719925474099399',Crew_Code:'RC1',Crew_Name:'Rough Cut One',Badge_Color:'#49688c',Active:true,Source_System:'MANUAL_WIDGET',Source_Record_ID:h.crew().requestId});
 await assert.rejects(h.app.management.api(h.crew()),e=>e.unknown===true&&/already has a native record/.test(e.message));assert.equal(writes(h).length,0);
 const result=await h.app.management.api({...h.crew(),action:'management-status',statusFor:'crew'});assert.equal(result.recordId,'900719925474099399');assert.equal(result.state,'saved');
});

test('preflight timeout cancels late work before native dispatch',async()=>{
 let release;const pending=new Promise(resolve=>release=resolve),h=nativeSaveHarness({capabilitiesWait:pending}),save=h.app.management.api(h.employee());save.catch(()=>{});await flush();h.fire(90000);await assert.rejects(save,e=>e.unknown===false&&/before it was sent/.test(e.message));release({ok:true,action:'capabilities',creatorOnly:true,projectsPushEnabled:false,environment:'production',permissions:{view:true,assignments:true},management:{enabled:true,nativeWrites:true,protocol:'native-validated-v1'},sources:{crews:true,employees:true}});await flush();assert.equal(writes(h).length,0);
});

test('queued save timeout prevents its late queue callback from sending a write',async()=>{
 const h=nativeSaveHarness({queueWrite:true}),save=h.app.management.api(h.employee());save.catch(()=>{});await flush();h.fire(90000);await assert.rejects(save,e=>e.unknown===false);await h.dispatchQueued();await flush();assert.equal(writes(h).length,0);
});

test('post-dispatch timeout and session changes retain an uncertain result without replay',async()=>{
 const h=nativeSaveHarness({writeWait:new Promise(()=>{})}),save=h.app.management.api(h.employee());save.catch(()=>{});await flush();assert.equal(writes(h).length,1);h.fire(90000);await assert.rejects(save,e=>e.unknown===true);assert.equal(h.app.state.managementUnknown,true);await assert.rejects(h.app.management.api(h.employee()));assert.equal(writes(h).length,1);
 const changed=nativeSaveHarness({actorChange:true});await assert.rejects(changed.app.management.api(changed.employee()),e=>e.unknown===true&&/session changed/.test(e.message));assert.equal(writes(changed).length,1);
});

test('dated assignment preparation and recovery retain the existing Custom API path',async()=>{
 const h=nativeSaveHarness();await assert.rejects(h.app.management.api({action:'save-assignment',requestId:h.crew().requestId,assignment:{crewId:h.crews[0].ID,phaseId:'90071992547407777',date:'2026-11-03'}}),/connection is not authorized/);assert.deepEqual(customActions(h),['save-assignment']);assert.equal(writes(h).length,0);
 await assert.rejects(h.app.management.api({action:'management-status',statusFor:'assignment',requestId:h.crew().requestId,assignment:{id:'90071992547407778'}}),/connection is not authorized/);assert.deepEqual(customActions(h),['save-assignment','management-status']);
});
