import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const adapter=fs.readFileSync('widgets/budget-manager/src/app/creator-data.js','utf8');
function block(name){
  const start=source.indexOf(`function ${name}(`),line=source.indexOf('\n',start);
  const end=source.slice(start,line).trimEnd().endsWith('}')?line:source.indexOf('\n}',start)+2;
  assert.ok(start>=0&&end>start,name);return source.slice(start,end);
}
const plain=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const turn=()=>new Promise(resolve=>setImmediate(resolve));
async function settle(){for(let i=0;i<20;i++)await turn();}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const reports=vm.runInNewContext('('+source.match(/reports:\s*(\{[\s\S]*?\n  \}),\n  landingCategoryFields/)[1]+')');
const fields=JSON.parse(source.match(/landingCategoryFields:\s*(\[[^\]]+\])/)[1]);
const IID='4410926000009999901',ITEM='4410926000009999991',OTHER='4410926000009999992';
const names=['cleanVal','isObj','rawPath','firstRaw','lookupId','lookupName','v','getReportCandidates','budgetSdkCode','budgetMissingReport','sdkGetAllRecords',
  'budgetRequest','responseLooksBad','isUpdateSuccess','budgetMutationError','getUpdateReportCandidates','sdkUpdateRecord','invalidateBudgetTransport','invalidateBudgetReports',
  'budgetFeature','invalidateBudgetFeature','loadBudgetFeature','budgetFeatureStateHtml','budgetMeasured','budgetBadgeScope','resetBudgetBadgeSummaries','scheduleBudgetBadgeSummaries',
  'groupLandingCategories','validateLandingCategoryRows','loadAll','boot','perms','canViewImportItems','canEditImportItems','budgetNavigationToken','budgetNavigationCurrent',
  'importSubCode','importSubName','subdivisionNameForCode','normSubCode','importItemCode','importMajorCode','importMinorCode','importDataSource','importItemDesc','importItemCost',
  'importAssignedItem','importIsMissing','budgetItemLabel','loadImportItems','loadAllBudgetItemsForAssign','openImportsTab','importFilteredSorted','importDistinct','populateImportFilter',
  'syncImportAssignmentFilters','renderImports','importAssignCellHtml','importAssignSelectHtml','budgetItemsForSubCode','budgetItemSubCode','assignImportItem','budgetBadgeCount','syncBudgetImportBadge','updateImportsTabVisibility'];
function fixture(id,budgetItem=null,extra={}){return {ID:id,Code:'1000',Cost_Code_Description:'Native fixture',Subdivision_Code:'AV',Major_Code:'1000',Minor_Code:'010',Data_Source:'Great Plains',Budget_Item:budgetItem,...extra};}
function harness({view=true,edit=false}={}){
  const calls=[],events=[],timers=new Map(),nodes={},messages=[],prefetches=[];
  const data=Object.fromEntries(Object.values(reports).map(report=>[report,[]]));
  data[reports.importItems]=[fixture(IID)];
  data[reports.items]=[{ID:ITEM,Budget_Code:'AV-1000',Item_Name:'Budget item',Subdivision_Code:'AV'}];
  const gate={count:null,records:null,write:null,denied:false,incomplete:false,writeDenied:false,pageSize:1000};let timer=0,renders=0;
  const runtime={environment:'PRODUCTION',user:'native-session',appLinkName:'land-master'};
  function node(id){return nodes[id]||(nodes[id]={innerHTML:'',textContent:'',style:{},value:'',title:'',classList:{add(){},remove(){},toggle(){}},setAttribute(name,value){this[name]=value;}});}
  async function invoke(kind,config){
    calls.push({kind,config:plain(config)});const imports=config.report_name===reports.importItems;
    if(imports&&gate[kind==='count'?'count':'records'])await gate[kind==='count'?'count':'records'].promise;
    if(imports&&gate.denied)return {code:2898,message:'No permission to view imports'};
    const rows=data[config.report_name];assert.ok(rows,'Only configured native report names may be requested');
    if(kind==='count')return {code:3000,result:{records_count:String(rows.length+(imports&&gate.incomplete?1:0))}};
    const start=Number(config.record_cursor||0),end=Math.min(start+(imports?gate.pageSize:1000),rows.length);
    const page=plain(rows.slice(start,end));
    return {code:3000,data:page,...(end<rows.length?{record_cursor:String(end)}:{})};
  }
  const c=vm.createContext({
    S:{liveSDK:true,useMock:false,currentUser:runtime.user,startupReady:false,view:'vBudgets',navigationGeneration:1,budgets:[],projects:[],approvals:[],landingCategories:{},
      importItems:[],importItemsLoaded:false,allBudgetItems:[],allBudgetItemsLoaded:false,itemsBySubCode:{},itemsBySubCodeLoading:{},
      importUI:{search:'',missingOnly:false,major:'',minor:'',source:'',sort:'code'},perms:{viewImports:view,editImports:edit,readOnly:!edit}},
    CFG:{reports,reportCandidates:{},landingCategoryFields:fields,forms:{importItem:'Budget_Import_Item',item:'Budget_Item'},
      importItemConfig:{budgetItemLookupField:'Budget_Item',importSubCodeFields:['Subdivision_Code'],itemSubCodeFields:['Subdivision_Code']}},
    Promise,Error,Date,Number,console:{log(){},warn(){},error(){}},IMPORT_TAB_TROUBLESHOOT:false,
    setTimeout(callback,delay){const id=++timer;timers.set(id,{callback,delay});return id;},clearTimeout:id=>timers.delete(id),
    LMRuntime:{current:()=>runtime},ZOHO:{CREATOR:{DATA:{getRecordCount:config=>invoke('count',config),getRecords:config=>invoke('read',config),
      async updateRecordById(config){calls.push({kind:'write',config:plain(config)});if(gate.write)await gate.write.promise;
        if(gate.writeDenied)return {code:2898,message:'Assignment denied'};
        const row=data[reports.importItems].find(row=>row.ID===config.id);assert.ok(row);row.Budget_Item={ID:config.payload.data.Budget_Item};
        return {code:3000,data:{ID:config.id}};}
    }}},document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:node},$:node,
    fetchCurrentUser:async()=>runtime.user,loadUserAccess:async()=>{},hydrateBudgetSubdivisions(){},buildProjects:()=>[],
    renderProjList(){renders++;events.push('landing');},renderApprQueue(){},applyDeepLink(){},setLoad(){},setMsg(message){messages.push(message);},
    showView(view){c.S.view=view;return true;},setActiveTab(){},prefetchScopedItemsForMissing(){prefetches.push('scoped');},
    loadBudgetBadgeSummary:async kind=>{events.push(kind);return {};},auditLog(){},toastShow(){},shortErr:error=>error?.message||String(error),safeStringify:JSON.stringify,
    esc:value=>String(value??''),escAttr:value=>String(value??'')
  });
  c.window=c;vm.runInContext(adapter,c);for(const name of names)vm.runInContext(block(name),c);
  function runTimers(){for(const [id,t]of [...timers])if(t.delay===0){timers.delete(id);t.callback();}}
  function imports(){return calls.filter(call=>call.config.report_name===reports.importItems&&call.kind!=='write');}
  return {c,calls,data,gate,nodes,node,events,messages,prefetches,runTimers,imports,renderCount:()=>renders};
}

// Native lookup forms and record IDs keep the existing assignment contract.
{
  const {c}=harness();
  for(const value of [null,'','  ',{},[],{ID:'',display_value:''}])assert.equal(c.importIsMissing(fixture(IID,value)),true,JSON.stringify(value));
  for(const value of [{ID:ITEM,display_value:'Assigned'}, {id:ITEM,zc_display_value:'Assigned'}, {value:ITEM},ITEM,' '+ITEM+' ']){
    const assigned=c.importAssignedItem(fixture(IID,value));assert.equal(assigned.id,ITEM);assert.equal(c.importIsMissing(fixture(IID,value)),false);
  }
  assert.equal(c.importAssignedItem({Budget_Item:null,Budget_Item1:{ID:OTHER}}).id,OTHER);
  assert.notEqual(c.importAssignedItem(fixture(IID,{ID:ITEM})).id,c.importAssignedItem(fixture(IID,{ID:OTHER})).id);
}

// The actual boot becomes usable before imports; the background reuses a complete paginated native read.
{
  const h=harness({edit:true}),g=deferred();h.gate.records=g;h.gate.pageSize=80;
  h.data[reports.importItems]=Array.from({length:127},(_,index)=>fixture(String(BigInt(IID)+BigInt(index))));
  h.data[reports.importItems].push(fixture('4410926000009999801',{ID:ITEM}),fixture('4410926000009999802',OTHER));
  await h.c.boot();assert.equal(h.c.S.startupReady,true);assert.equal(h.renderCount(),1);assert.equal(h.imports().length,0);
  assert.ok(h.c.LMPerf.snapshot().events.some(event=>event.name==='budget:first-usable'));
  assert.equal(h.node('importCt').textContent,'…');h.runTimers();await settle();
  assert.equal(h.c.budgetFeature('imports').status,'loading');assert.equal(h.node('importCt').textContent,'…');assert.match(h.node('importCt').title,/Loading/);
  assert.equal(h.calls.filter(call=>call.config.report_name===reports.items).length,0,'background badge does not fetch the assignment roster');
  assert.deepEqual(h.prefetches,[],'background badge does not prefetch subdivision item choices');
  g.resolve();await settle();
  assert.equal(h.node('importCt').textContent,'127','missing import counts above 99 must remain exact');assert.equal(h.node('importCt').title,'127 missing items');
  assert.equal(h.c.S.importItems.length,129);assert.equal(h.c.S.importItemsLoaded,true);assert.equal(h.c.budgetFeature('imports').status,'loaded');
  assert.deepEqual(h.imports().map(call=>call.kind),['count','read','read']);
  for(const call of h.imports()){assert.equal(call.config.criteria,undefined,'count is independent of import view filters');if(call.kind==='read')assert.equal(call.config.field_config,'all');}
  assert.equal(h.imports()[2].config.record_cursor,'80');assert.equal(h.renderCount(),1,'background completion patches the tab badge without rebuilding the landing');
  assert.equal(h.c.budgetFeature('import-assignment-items').status,'idle');
  const before=h.imports().length;await h.c.openImportsTab();assert.equal(h.imports().length,before,'opening the tab reuses the fully counted background snapshot');
  assert.equal(h.calls.filter(call=>call.config.report_name===reports.items&&call.kind==='read').length,1,'assignment choices load only when the editing workspace opens');
}

// Both view-only and edit-only users see the count; unauthorized users perform no import read.
for(const permission of [{view:true,edit:false},{view:false,edit:true},{view:false,edit:false}]){
  const h=harness(permission);await h.c.boot();h.runTimers();await settle();
  const allowed=permission.view||permission.edit;
  assert.equal(h.node('importsTabLink').style.display,allowed?'':'none');assert.equal(h.imports().length,allowed?2:0);
  assert.equal(h.calls.filter(call=>call.config.report_name===reports.items).length,0);
  if(allowed)assert.equal(h.node('importCt').textContent,'1');
  else {await h.c.openImportsTab();assert.equal(h.imports().length,0);assert.equal(h.c.S.view,'vBudgets');}
}

// Empty native reports and reports containing only assigned rows publish an explicit zero.
for(const rows of [[],[fixture(IID,{ID:ITEM})]]){
  const h=harness();h.data[reports.importItems]=rows;await h.c.boot();h.runTimers();await settle();
  assert.equal(h.node('importCt').textContent,'0');assert.equal(h.node('importCt').title,'0 missing items');
  assert.equal(h.imports().filter(call=>call.kind==='read').length,rows.length?1:0,'a confirmed empty native report requires no pages');
}

// A tab opened while the delayed background import is pending shares that native request.
{
  const h=harness(),g=deferred();h.gate.count=g;await h.c.boot();h.runTimers();await settle();
  const open=h.c.openImportsTab();await settle();assert.equal(h.imports().length,1);assert.equal(h.c.budgetFeature('imports').status,'loading');
  assert.match(h.node('importsTableWrap').innerHTML,/Loading import items/);g.resolve();await open;await settle();
  assert.deepEqual(h.imports().map(call=>call.kind),['count','read']);assert.equal(h.node('importCt').textContent,'1');
  assert.equal(h.calls.filter(call=>call.config.report_name===reports.items).length,0,'view-only tab needs no assignment roster');
}

// Permission and incomplete-page failures remain visibly unavailable and can retry through the actual tab.
for(const failure of ['denied','incomplete']){
  const h=harness();h.gate[failure]=true;await h.c.boot();h.runTimers();await settle();
  assert.equal(h.c.S.startupReady,true);assert.equal(h.node('importCt').textContent,'!');assert.match(h.node('importCt').title,/unavailable/);
  assert.equal(h.c.S.importItemsLoaded,false);assert.equal(h.c.budgetFeature('imports').status,'error');assert.equal(h.renderCount(),1);
  h.gate[failure]=false;await h.c.openImportsTab();assert.equal(h.node('importCt').textContent,'1');assert.equal(h.c.S.importItemsLoaded,true);
}

// Native assignment acknowledgement updates the full missing count even with every view filter active.
{
  const h=harness({edit:true});h.data[reports.importItems]=[fixture(IID),fixture('4410926000009999902'),fixture('4410926000009999903',{ID:OTHER})];
  await h.c.boot();h.runTimers();await settle();await h.c.openImportsTab();
  Object.assign(h.c.S.importUI,{search:'no matching description',major:'9999',minor:'999',source:'HeavyJob',missingOnly:true});h.c.renderImports();
  assert.equal(h.c.importFilteredSorted().length,0);assert.equal(h.node('importCt').textContent,'2','filters never reduce the tab count');
  const g=deferred();h.gate.write=g;const classes=new Set(),select={classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)}};
  h.c.assignImportItem(IID,ITEM,select);await settle();assert.equal(h.node('importCt').textContent,'2','pending assignment does not decrement the count');assert.ok(classes.has('saving'));
  g.resolve();await settle();assert.equal(h.node('importCt').textContent,'1');assert.equal(h.node('importCt').title,'1 missing items');
  assert.equal(h.c.importAssignedItem(h.c.S.importItems[0]).id,ITEM);assert.equal(h.node('importMissingCt').textContent,1);
  const write=h.calls.find(call=>call.kind==='write');assert.equal(write.config.report_name,reports.importItems);assert.equal(write.config.id,IID);
  assert.deepEqual(write.config.payload,{data:{Budget_Item:ITEM}},'native assignment preserves exact string identity');
  h.gate.write=null;h.gate.writeDenied=true;h.c.assignImportItem('4410926000009999902',ITEM,select);await settle();
  assert.equal(h.node('importCt').textContent,'1');assert.equal(h.c.importIsMissing(h.c.S.importItems[1]),true);assert.equal(classes.has('saving'),false);
  assert.ok(h.messages.some(message=>/Could not assign Budget Item/.test(message)));
}

console.log('Budget import count: deferred native startup, permissions, counted pagination, exact zero/large counts, lookup shapes, retries/dedup and confirmed assignment updates passed.');
