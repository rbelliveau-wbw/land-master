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
  function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'',style:{},disabled:false,classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelector(){return null;}});return nodes.get(id);}
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

// Creating a subdivision needs only builder choices; existing related tab counts require their complete reports.
h=harness();await h.c.loadData();await h.c.startEditorRequest('subdivision',null,true);assert.deepEqual(h.reads.slice(4).map(r=>r.report),['All_Builders']);assert.equal(h.c.S.panelDirty,true);h.c.closeRecordModal(true);await h.c.startEditorRequest('subdivision','301',false);const tabs=h.c.descriptor('subdivision',h.c.S.subdivisions[0]).tabs;assert.equal(tabs.find(t=>t.id==='milestones').count,1);assert.equal(tabs.find(t=>t.id==='forecasts').count,0);assert.equal(h.c.LandData.status('lots'),'idle');
assert.deepEqual(Array.from(h.c.LMLandData.editorDependencies('builderTakedown',false)).sort(),['properties','projects','subdivisions','companies','builderTakedowns','builders','lots','additionalItems'].sort());

console.log('Land Master lazy data: actual four-core startup, atomic failure, complete search/sort/counts, deferred retries, truthful unknown counts, editor and scope dependencies, shared reads, stale refresh cancellation, closed-panel guards, and draft protection passed.');
