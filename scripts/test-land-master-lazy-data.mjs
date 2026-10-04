import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/land-master/src/app/widget.html','utf8');
const controller=fs.readFileSync('widgets/land-master/src/app/land-data.js','utf8');
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
async function settle(){for(let i=0;i<15;i++)await Promise.resolve();}
const L=(ID,display_value)=>({ID:String(ID),display_value});
const fixture={
  All_Property:[{ID:'101',Common_Name:'Belliveau',Property_ID:'P-1',County:'Bell',Company1:L('401','Land company'),Projects:[L('201','Belliveau Project')],Notes:'keep me'},{ID:'102',Common_Name:'Other',Property_ID:'P-2',County:'Harris',Company1:L('401','Land company'),Projects:[]}],
  All_Projects:[{ID:'201',Project_Name:'Belliveau Project',Properties:[L('101','Belliveau')]}],
  All_Subdivisions:[{ID:'301',Subdivision_Name:'Belliveau Phase',Subdivision_Code:'BP-1',Project:L('201','Belliveau Project'),Company1:L('402','Development company'),Land_Company:L('401','Land company'),Total_Lots:'12',Lots_Sold:'7'}],
  All_Companies:[{ID:'401',Company_Name:'Land company',Facility_ID:'000073'},{ID:'402',Company_Name:'Development company'}],
  All_Milestones:[{ID:'501',Subdivision1:L('301','Belliveau Phase'),Milestone_Name:'Future paving',Start_Date:'01/01/2099'}],
  All_Builders:[{ID:'601',Builder_Name:'Builder A'}],All_Pro_Formas:[{ID:'701',Name:'Example PF'}],
  All_Forecasts:[],All_Forecast_Years:[],All_Takedown_Schedules:[],All_Builder_Takedowns:[],All_Lots_All_Fields:[],All_Additional_Items:[],All_External_System_Mappings:[]
};
function harness({read,choices}={}){
  const reads=[],nodes=new Map(),statuses=[],metrics=[],renders=[],panels=[],errors=[];
  function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'',style:{},disabled:false,classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelector(){return null;},querySelectorAll(){return [];}});return nodes.get(id);}
  const c=vm.createContext({document:{getElementById:node,querySelector:()=>null,querySelectorAll:()=>[]},CFG:{version:'test',tablePageSize:100},OPTS:{},FILTER_DEFS:{},
    sdkGetAll(report,criteria,onProgress,options){reads.push({report,options});return Promise.resolve(read?read(report,options,reads.length):fixture[report]);},
    loadLocationChoices:choices||(async()=>{}),LMPerf:{start(){},end(name,meta){metrics.push({name,...meta});},mark(name,meta){metrics.push({name,...meta});}},diag(label,details){if(details?.error)errors.push(details.error);},beginLoadProgress(){},updateLoadProgress(){},finishLoadProgress(){},setLoadRendering(){},
    requestAnimationFrame(fn){fn();},setTimeout(fn){fn();},showAppConfirm(title,message,label,action){c.confirmedAction=action;},closeFilterPopup(){},closeBulkModal(){c.S.bulkOpen=false;},
    renderTable(){},renderCounts(){},renderFilterButtons(){}});
  c.window=c;vm.runInContext(controller,c);
  vm.runInContext(section('var S =','function $(id)'),c);c.S.liveSDK=true;
  vm.runInContext(section('function $(id)','var LOAD_WEIGHTS'),c);
  vm.runInContext(section('/* record descriptors */','function renderTable'),c);
  vm.runInContext(section('function withDiscardConfirm','function inputRaw'),c);
  vm.runInContext(section('function setCoreRefreshing','function tableInlineSave'),c);
  vm.runInContext(section('function closeProjectPopup','function updateProjectPopupCount'),c);
  vm.runInContext(section('function closeLookupPopup','function lookupChoiceRequired'),c);
  vm.runInContext(section('function ensureScopeData','$("scopeSeg")'),c);
  vm.runInContext(section('function loadData','var lotImport='),c);
  Object.assign(c,{setStatus:(kind,text)=>statuses.push({kind,text}),renderBanners(){},renderAll(){renders.push(c.S.scope);},renderPanel(){panels.push({type:c.S.editorType,id:c.S.editorId,builders:c.S.builders.length,proformas:c.S.proformas.length});}});
  return{c,reads,nodes,statuses,metrics,renders,panels,errors};
}

// The actual loadData entry point commits four complete collections together, including choice readiness.
let choices=deferred(),h=harness({choices:()=>choices.promise});
const old=[{ID:'old',Common_Name:'Prior complete snapshot'}];h.c.S.properties=old;
let loading=h.c.loadData();await settle();assert.deepEqual(h.reads.map(r=>r.report),['All_Property','All_Projects','All_Subdivisions','All_Companies']);assert.equal(h.renders.length,0);assert.equal(h.c.S.properties,old);assert.equal(h.c.LandData.coreReady(),false);
choices.resolve();await loading;assert.deepEqual(h.renders,['props']);assert.equal(h.c.S.properties[0].Common_Name,'Belliveau');assert.equal(h.c.LandData.coreReady(),true);assert.equal(h.c.LandData.snapshot().lots.count,null);assert.equal(h.c.LandData.snapshot().lots.status,'idle');assert.equal(h.metrics.filter(m=>m.name==='first-usable-render').length,1);
assert.equal(h.c.knownLandCount(['forecasts'],()=>h.c.S.forecasts.length),null,'unloaded is distinct from a complete empty report');await h.c.ensureLandData(['forecasts']);assert.equal(h.c.knownLandCount(['forecasts'],()=>h.c.S.forecasts.length),0);

// Existing search, filters, sorting, usage and issue counts use the complete core inventory.
h.c.S.search='Belliveau';assert.deepEqual(Array.from(h.c.visibleList(),r=>r.ID),['101']);h.c.S.search='';h.c.S.sortKey='Property_ID';h.c.S.sortDir=-1;assert.deepEqual(Array.from(h.c.visibleList(),r=>r.ID),['102','101']);h.c.S.filters.county=['Bell'];assert.deepEqual(Array.from(h.c.visibleList(),r=>r.ID),['101']);assert.equal(h.c.issueCount(),1);assert.equal(h.c.propertiesForCompany('401').length,2);assert.equal(h.c.companyUsage()['402'].dev,1);assert.equal(h.c.S.companies[0].Facility_ID,'000073');

// A core permission/count failure retains the prior atomic snapshot and does not render a successful empty table.
for(const error of [{code:2898,message:'Denied'},new Error('All_Subdivisions: loaded 300 of 348 records. Refresh to retry a complete snapshot.')]){
 h=harness({read:report=>report==='All_Subdivisions'?Promise.reject(error):fixture[report]});h.c.S.properties=old;await assert.rejects(h.c.loadData(),e=>e===error);assert.equal(h.c.S.properties,old);assert.equal(h.c.LandData.coreReady(),false);assert.equal(h.renders.length,0);assert.equal(h.statuses.at(-1).text,'Creator data load failed');assert.equal(h.metrics.some(m=>m.name==='first-usable-render'),false);
}

// A deferred denied/incomplete report leaves the usable core untouched and can be retried explicitly.
let fail=true;h=harness({read:report=>report==='All_Pro_Formas'&&fail?Promise.reject({code:2899,message:'Denied'}):fixture[report]});await h.c.loadData();const core=h.c.S.properties;assert.equal(await h.c.startEditorRequest('property','101',false),false);assert.equal(h.c.S.properties,core);assert.equal(h.c.LandData.status('proformas'),'error');assert.equal(h.panels.length,0);assert.match(h.nodes.get('panel').innerHTML,/data-editor-retry/);fail=false;assert.equal(await h.c.startEditorRequest('property','101',false),true);assert.equal(h.panels.length,1);assert.equal(h.panels[0].builders,1);assert.equal(h.panels[0].proformas,1);
const before=h.reads.length;await h.c.startEditorRequest('property','101',false);assert.equal(h.reads.length,before,'ready dependencies are reused within one data generation');
h.c.renderPanel=()=>{throw new Error('Render failed');};assert.equal(await h.c.startEditorRequest('company','401',false),false);assert.match(h.nodes.get('panel').innerHTML,/data-editor-retry/);assert.equal(h.c.S.panelLoading,true,'a failed mount must remain visibly unavailable and retryable');

// Subdivision navigation awaits milestones before exposing searchable/sortable Next milestone values.
let milestone=deferred();h=harness({read:report=>report==='All_Milestones'?milestone.promise:fixture[report]});await h.c.loadData();h.c.requestScope('subs');await settle();assert.equal(h.c.S.scope,'props');assert.equal(h.c.S.scopeLoading,'subs');assert.deepEqual(h.renders,['props']);milestone.resolve(fixture.All_Milestones);await settle();assert.equal(h.c.S.scope,'subs');assert.deepEqual(h.renders,['props','subs']);h.c.S.search='Future paving';assert.deepEqual(Array.from(h.c.visibleList(),r=>r.ID),['301']);h.c.S.search='';h.c.S.sortKey='_next';assert.match(h.c.colValue(h.c.visibleList()[0],'_next'),/Future paving/);assert.equal(h.c.S.subdivisions[0].Lots_Sold,'7');assert.equal(h.c.LandData.status('lots'),'idle');

// Navigation tokens prevent a pending scope or editor completion from replacing the newer user action.
milestone=deferred();h=harness({read:report=>report==='All_Milestones'?milestone.promise:fixture[report]});await h.c.loadData();h.c.requestScope('subs');await settle();h.c.requestScope('cos');await settle();milestone.resolve(fixture.All_Milestones);await settle();assert.equal(h.c.S.scope,'cos');assert.deepEqual(h.renders,['props','cos']);
let proformas=deferred();h=harness({read:report=>report==='All_Pro_Formas'?proformas.promise:fixture[report]});await h.c.loadData();let opening=h.c.startEditorRequest('property','101',false);await settle();assert.equal(h.panels.length,0);assert.equal(h.c.S.panelLoading,true);h.c.closeRecordModal(true);proformas.resolve(fixture.All_Pro_Formas);assert.equal(await opening,false);assert.equal(h.c.S.modalOpen,false);assert.equal(h.panels.length,0,'closed panel must not be reopened by the late read');
proformas=deferred();h=harness({read:report=>report==='All_Pro_Formas'?proformas.promise:fixture[report]});await h.c.loadData();opening=h.c.startEditorRequest('property','101',false);await settle();await h.c.startEditorRequest('company','401',false);proformas.resolve(fixture.All_Pro_Formas);assert.equal(await opening,false);assert.deepEqual(h.panels.map(p=>p.type),['company']);assert.equal(h.c.S.editorType,'company');

// Two consumers share an in-flight read; a stale generation cannot commit data into the new snapshot.
let held=deferred();h=harness({read:report=>report==='All_Builders'?held.promise:fixture[report]});await h.c.loadData();const one=h.c.ensureLandData(['builders']),two=h.c.ensureLandData(['builders']);await settle();assert.equal(h.reads.filter(r=>r.report==='All_Builders').length,1);held.resolve(fixture.All_Builders);await Promise.all([one,two]);
held=deferred();let propertyCalls=0;h=harness({read:report=>report==='All_Property'&&++propertyCalls===1?held.promise:fixture[report]});const first=h.c.loadData();const firstOutcome=first.catch(e=>e);await settle();const oldRead=h.reads.find(r=>r.report==='All_Property');await h.c.loadData();assert.equal(oldRead.options.isCancelled(),true);held.resolve([{ID:'stale'}]);assert.equal((await firstOutcome).cancelled,true);assert.equal(h.c.S.properties[0].ID,'101');assert.equal(h.renders.length,1);
held=deferred();let builderCalls=0;h=harness({read:report=>report==='All_Builders'&&++builderCalls===1?held.promise:fixture[report]});await h.c.loadData();const pending=h.c.ensureLandData(['builders']).catch(e=>e);await settle();await h.c.loadData();held.resolve([{ID:'stale-builder'}]);assert.equal((await pending).cancelled,true);assert.equal(h.c.LandData.status('builders'),'idle');assert.equal(h.c.LandData.snapshot().builders.count,null);

// Refresh and section changes preserve a dirty or saving editor until the user discards it.
h=harness();await h.c.loadData();await h.c.startEditorRequest('property','101',false);h.c.S.panelDirty=true;h.c.S.mappingDraft={rows:[{code:'draft'}]};const generation=h.c.LandData.generation();await assert.rejects(h.c.loadData(),/Finish or discard/);assert.equal(h.c.LandData.generation(),generation);assert.equal(h.c.S.mappingDraft.rows[0].code,'draft');assert.equal(h.c.requestScope('cos'),false);assert.equal(h.c.S.scope,'props');assert.equal(h.c.S.modalOpen,true);h.c.confirmedAction();await settle();assert.equal(h.c.S.scope,'cos');assert.equal(h.c.S.modalOpen,false);
h.c.S.panelSaving=true;assert.equal(await h.c.startEditorRequest('company','401',false),false);assert.equal(h.c.closeRecordModal(true),false);
const originalRender=section('function renderPanel','function showAppConfirm');vm.runInContext(originalRender,h.c);h.c.currentEditor=()=>{throw new Error('A saving panel must not rerender');};h.c.renderPanel();assert.equal(h.c.S.panelSaving,true);

// Bulk Seller choices wait for builders, and late choices cannot replace a closed bulk window.
held=deferred();h=harness({read:report=>report==='All_Builders'?held.promise:fixture[report]});await h.c.loadData();
vm.runInContext(section('function optionsHTML','function recordTitle'),h.c);vm.runInContext(section('function bulkFieldDefs','function bulkInput'),h.c);
h.c.S.checked={'101':true};h.c.openBulkModal();h.nodes.get('bulkField').value='Seller';h.c.renderBulkValue();await settle();assert.equal(h.nodes.get('bulkApplyBtn').disabled,true);assert.match(h.nodes.get('bulkValueWrap').innerHTML,/Loading choices/);h.c.closeBulkModal();held.resolve(fixture.All_Builders);await settle();assert.equal(h.c.S.bulkOpen,false);assert.equal(h.nodes.get('bulkApplyBtn').disabled,true);assert.match(h.nodes.get('bulkValueWrap').innerHTML,/Loading choices/);
h.c.openBulkModal();h.nodes.get('bulkField').value='Seller';h.c.renderBulkValue();await settle();assert.equal(h.nodes.get('bulkApplyBtn').disabled,false,h.errors.at(-1)?.message);assert.match(h.nodes.get('bulkValueWrap').innerHTML,/Builder A/);

// The actual bulk functions lock field/value controls and retain the submitted string after a partial failure.
h=harness();await h.c.loadData();h.c.S.scope='cos';h.c.S.checked={'401':true,'402':true};
vm.runInContext(section('function optionsHTML','function recordTitle'),h.c);vm.runInContext(section('function inputRaw','function performExternalMappingOperation'),h.c);vm.runInContext(section('function bulkFieldDefs','/* root rendering */'),h.c);
h.c.openBulkModal();h.nodes.get('bulkField').value='Facility_ID';h.c.renderBulkValue();await settle();
const valueControl={value:'000073',disabled:false,getAttribute:name=>name==='data-ftype'?'text':''};
const valueWrap=h.nodes.get('bulkValueWrap');valueWrap.querySelector=()=>valueControl;valueWrap.querySelectorAll=()=>[valueControl];const valueMarkup=valueWrap.innerHTML;
let save=deferred(),writes=[],closedPicker=0;h.c.LMPickers={close(){closedPicker++;}};h.c.renderBulk=()=>{};
h.c.updateRecord=(id,data,report)=>{writes.push({id,data,report});return writes.length===1?save.promise:Promise.reject({code:2899,message:'Denied'});};
h.c.applyBulk();assert.equal(h.c.S.bulkSaving,true);assert.equal(h.nodes.get('bulkField').disabled,true);assert.equal(valueControl.disabled,true);assert.equal(closedPicker,1);
const choiceToken=h.c.S.bulkChoiceToken;h.nodes.get('bulkField').value='Account_Number';h.c.renderBulkValue();h.c.applyBulk();await settle();
assert.equal(h.c.S.bulkField,'Facility_ID');assert.equal(h.nodes.get('bulkField').value,'Facility_ID');assert.equal(h.c.S.bulkChoiceToken,choiceToken);assert.equal(valueWrap.innerHTML,valueMarkup);assert.equal(valueControl.value,'000073');assert.equal(writes.length,1,'a repeated Apply during saving cannot replay requests');
save.resolve({code:3000,data:{ID:'401'}});await settle();assert.equal(h.c.S.bulkSaving,false);assert.equal(h.c.S.bulkOpen,true);assert.equal(h.nodes.get('bulkField').disabled,false);assert.equal(valueControl.disabled,false);assert.equal(h.nodes.get('bulkApplyBtn').disabled,false);assert.equal(valueWrap.innerHTML,valueMarkup);assert.equal(valueControl.value,'000073');assert.equal(h.nodes.get('bulkMsgModal').textContent,'Saved 1 · 1 failed');assert.equal(writes[0].data.Facility_ID,'000073');assert.equal(writes[1].data.Facility_ID,'000073');
h.c.updateRecord=(id,data,report)=>{writes.push({id,data,report});return Promise.resolve({code:3000,data:{ID:id}});};h.c.applyBulk();await settle();assert.equal(writes.length,4);assert.ok(writes.every(write=>write.report==='All_Companies'&&write.data.Facility_ID==='000073'),'explicit retry keeps the original field and exact leading-zero value');assert.equal(h.c.S.bulkOpen,false);assert.equal(h.c.S.bulkSaving,false);

function inlineFixture(h){
 vm.runInContext(section('function inputRaw','function performExternalMappingOperation'),h.c);
 vm.runInContext(section('function tableInlineSave','var NEW_TYPES='),h.c);
 vm.runInContext(section('function bulkFieldDefs','/* root rendering */'),h.c);
 h.c.markInlineState=()=>{};
 function control({field='Notes',value='new draft',original='keep me',ftype='text',id='101'}={}){
  const attrs={'data-field':field,'data-ftype':ftype,'data-original':original};
  return{value,disabled:false,classList:{add(){},remove(){},toggle(){}},closest:()=>({getAttribute:()=>id}),getAttribute:key=>attrs[key]||'',setAttribute:(key,value)=>{attrs[key]=value;},querySelector:()=>null};
 }
 return control;
}

// A refresh freezes the mounted table immediately; callable write/popup/bulk paths reject mid-read actions.
let refreshing=false,choiceGate=deferred();writes=[];
h=harness({read:report=>structuredClone(fixture[report]),choices:()=>refreshing?choiceGate.promise:Promise.resolve()});await h.c.loadData();let control=inlineFixture(h),notes=control();
h.c.updateRecord=(...args)=>{writes.push(args);return Promise.resolve();};h.c.S.checked={'101':true};refreshing=true;loading=h.c.loadData();await settle();
assert.equal(h.c.S.coreRefreshing,true);assert.equal(h.nodes.get('tableScroll').inert,true);assert.equal(h.nodes.get('bulkbar').inert,true);
assert.equal(h.c.tableInlineSave(notes),false);assert.equal(h.c.openProjectPopup(notes),false);h.c.S.projectPopupId='101';h.c.S.projectPopupButton=notes;assert.equal(h.c.saveProjectPopup(),false);h.c.S.projectPopupId=null;h.c.S.projectPopupButton=null;
assert.equal(h.c.openLookupPopup(notes),false);assert.equal(h.c.saveLookupChoice('402'),false);assert.equal(h.c.openBulkModal(),false);assert.equal(h.c.applyBulk(),false);assert.equal(h.c.S.bulkOpen,false);assert.equal(writes.length,0);
choiceGate.resolve();await loading;assert.equal(h.c.S.coreRefreshing,false);assert.equal(h.nodes.get('tableScroll').inert,false);assert.equal(h.c.S.properties[0].Notes,'keep me');

// In the opposite ordering a pending native inline write prevents collection replacement until its model patch settles.
h=harness({read:report=>structuredClone(fixture[report])});await h.c.loadData();control=inlineFixture(h);notes=control();held=deferred();writes=[];
h.c.updateRecord=(...args)=>{writes.push(args);return held.promise;};const record=h.c.S.properties[0],beforeWriteReads=h.reads.length,beforeWriteGeneration=h.c.LandData.generation();const saving=h.c.tableInlineSave(notes);
assert.equal(h.c.S.tableWrites,1);assert.equal(writes.length,1);assert.equal(h.c.tableInlineSave(notes),false,'a duplicate call cannot replay an active write');
await assert.rejects(h.c.loadData(),/Finish or discard/);assert.equal(h.reads.length,beforeWriteReads);assert.equal(h.c.LandData.generation(),beforeWriteGeneration);assert.equal(h.c.S.properties[0],record);
h.c.S.scope='cos';held.resolve({code:3000,data:{ID:'101'}});await saving;assert.equal(h.c.S.tableWrites,0);assert.equal(record.Notes,'new draft');assert.equal(h.c.S.properties[0].Notes,'new draft');assert.equal(h.statuses.at(-1).text,'Saved');
h=harness({read:report=>structuredClone(fixture[report])});await h.c.loadData();control=inlineFixture(h);notes=control();writes=[];const deniedWrite={code:2899,message:'Denied'};h.c.updateRecord=(...args)=>{writes.push(args);return Promise.reject(deniedWrite);};await h.c.tableInlineSave(notes);assert.equal(h.c.S.tableWrites,0);assert.equal(writes.length,1);assert.equal(h.errors.at(-1),deniedWrite);assert.equal(h.statuses.at(-1).text,'Inline save failed');assert.equal(h.c.S.properties[0].Notes,'keep me');

// Project and searchable lookup writes use the same refresh exclusion through their actual save callbacks.
for(const kind of ['project','lookup']){
 h=harness({read:report=>structuredClone(fixture[report])});await h.c.loadData();control=inlineFixture(h);held=deferred();writes=[];h.c.updateRecord=(...args)=>{writes.push(args);return held.promise;};
 const button=control({field:kind==='project'?'Projects':'Company1',original:kind==='project'?'201':'401'});
 let writing;if(kind==='project'){h.c.S.projectPopupId='101';h.c.S.projectPopupButton=button;h.c.document.querySelectorAll=selector=>selector.startsWith('#projectPopupList')?[{value:'201'},{value:'202'}]:[];writing=h.c.saveProjectPopup();}else{h.c.S.lookupPopupId='101';h.c.S.lookupPopupField='Company1';h.c.S.lookupPopupKind='company';h.c.S.lookupPopupMode='table';h.c.S.lookupPopupButton=button;writing=h.c.saveLookupChoice('402');}
 assert.equal(h.c.S.tableWrites,1);assert.equal(writes.length,1);const count=h.reads.length;await assert.rejects(h.c.loadData(),/Finish or discard/);assert.equal(h.reads.length,count);
 held.resolve({code:3000,data:{ID:'101'}});await writing;assert.equal(h.c.S.tableWrites,0);if(kind==='project')assert.deepEqual(Array.from(h.c.S.properties[0].Projects,x=>x.ID),['201','202']);else assert.equal(h.c.S.properties[0].Company1.ID,'402');
}

// Unblurred inline and project drafts prevent refresh before any read or DOM replacement starts.
for(const kind of ['inline','project']){
 h=harness();await h.c.loadData();control=inlineFixture(h);notes=control();if(kind==='inline')h.c.document.querySelectorAll=selector=>selector.startsWith('#tableScroll')?[notes]:[];else{h.c.S.projectPopupId='101';h.c.S.projectPopupButton=control({original:'201'});h.c.document.querySelectorAll=selector=>selector.startsWith('#projectPopupList')?[{value:'202'}]:[];}
 const generation=h.c.LandData.generation(),reads=h.reads.length;await assert.rejects(h.c.loadData(),/Finish or discard/);assert.equal(h.c.LandData.generation(),generation);assert.equal(h.reads.length,reads);assert.equal(notes.value,'new draft');assert.equal(h.c.S.coreRefreshing,false);
}

// A failed refresh releases its edit lock; a superseded read cannot release the newer generation's lock.
let failCore=false;h=harness({read:report=>failCore&&report==='All_Property'?Promise.reject(new Error('Denied')):fixture[report]});await h.c.loadData();failCore=true;await assert.rejects(h.c.loadData(),/Denied/);assert.equal(h.c.S.coreRefreshing,false);assert.equal(h.nodes.get('tableScroll').inert,true);assert.equal(h.c.allowTableEdit(),false,'An incomplete refresh retains the old snapshot for viewing but blocks edits');failCore=false;await h.c.loadData();assert.equal(h.nodes.get('tableScroll').inert,false);assert.equal(h.c.allowTableEdit(),true,'A complete fresh snapshot restores editing');
let choiceCalls=0,firstChoice=deferred(),secondChoice=deferred();h=harness({choices:()=>++choiceCalls===1?firstChoice.promise:secondChoice.promise});const stale=h.c.loadData().catch(error=>error);await settle();const newer=h.c.loadData();await settle();firstChoice.resolve();assert.equal((await stale).cancelled,true);assert.equal(h.c.S.coreRefreshing,true);assert.equal(h.nodes.get('tableScroll').inert,true);secondChoice.resolve();await newer;assert.equal(h.c.S.coreRefreshing,false);

// Defensive generation verification refuses a Saved claim when a native response belongs to a replaced model.
h=harness();await h.c.loadData();control=inlineFixture(h);notes=control();held=deferred();h.c.updateRecord=()=>held.promise;const uncertain=h.c.tableInlineSave(notes);h.c.LandData.beginRefresh();held.resolve({code:3000,data:{ID:'101'}});await uncertain;assert.equal(h.c.S.tableWrites,0);assert.equal(h.statuses.at(-1).text,'Inline save failed');assert.equal(h.c.S.properties[0].Notes,'keep me');

// Creating a subdivision needs only builder choices; existing related tab counts require their complete reports.
h=harness();await h.c.loadData();await h.c.startEditorRequest('subdivision',null,true);assert.deepEqual(h.reads.slice(4).map(r=>r.report),['All_Builders']);assert.equal(h.c.S.panelDirty,true);h.c.closeRecordModal(true);await h.c.startEditorRequest('subdivision','301',false);const tabs=h.c.descriptor('subdivision',h.c.S.subdivisions[0]).tabs;assert.equal(tabs.find(t=>t.id==='milestones').count,1);assert.equal(tabs.find(t=>t.id==='forecasts').count,0);assert.equal(h.c.LandData.status('lots'),'idle');
assert.deepEqual(Array.from(h.c.LMLandData.editorDependencies('builderTakedown',false)).sort(),['properties','projects','subdivisions','companies','builderTakedowns','builders','lots','additionalItems'].sort());

console.log('Land Master lazy data: actual four-core startup, atomic failure, complete search/sort/counts, deferred retries, truthful unknown counts, editor and scope dependencies, shared reads, stale refresh cancellation, closed-panel guards, bulk retry preservation, and pending refresh/write/draft exclusion passed.');
