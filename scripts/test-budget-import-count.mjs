import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const adapter=fs.readFileSync('widgets/budget-manager/src/app/creator-data.js','utf8');
const ledgerSource=fs.readFileSync('widgets/budget-manager/src/app/budget-import-ledger.js','utf8');
const workspaceSource=fs.readFileSync('widgets/budget-manager/src/app/budget-import-workspace.js','utf8');
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
  'importSubCode','importSubName','subdivisionNameForCode','normSubCode','cssEsc','importItemCode','importMajorCode','importMinorCode','importDataSource','importItemDesc','importItemCost',
  'importAssignedItem','importIsMissing','importNativeBudgetCode','importAssignedBudgetCode','importHasDifferentCode','budgetItemLabel','loadImportItems','loadAllBudgetItemsForAssign','openImportsTab','importFilteredSorted','importDistinct','populateImportFilter',
  'syncImportAssignmentFilters','renderImports','importAssignCellHtml','importAssignSelectHtml','budgetItemsForSubCode','budgetItemSubCode','loadItemsForSubCode','assignImportItem','budgetBadgeCount','syncBudgetImportBadge','updateImportsTabVisibility'];
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
    let rows=data[config.report_name];assert.ok(rows,'Only configured native report names may be requested');
    const selected=config.criteria&&config.criteria.match(/Subdivision_Code == "([^"]+)"/);
    if(selected)rows=rows.filter(row=>row.Subdivision_Code===selected[1]);
    if(kind==='count')return {code:3000,result:{records_count:String(rows.length+(imports&&gate.incomplete?1:0))}};
    const start=Number(config.record_cursor||0),end=Math.min(start+(imports?gate.pageSize:1000),rows.length);
    const page=plain(rows.slice(start,end));
    return {code:3000,data:page,...(end<rows.length?{record_cursor:String(end)}:{})};
  }
  const c=vm.createContext({
    S:{liveSDK:true,useMock:false,currentUser:runtime.user,startupReady:false,view:'vBudgets',navigationGeneration:1,budgets:[],projects:[],approvals:[],landingCategories:{},
      importItems:[],importItemsLoaded:false,allBudgetItems:[],allBudgetItemsLoaded:false,itemsBySubCode:{},itemsBySubCodeLoading:{},
      importUI:{subdivision:'',search:'',missingOnly:false,major:'',minor:'',source:'',sort:'code'},perms:{viewImports:view,editImports:edit,readOnly:!edit}},
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
  vm.runInContext(ledgerSource,c);vm.runInContext(workspaceSource,c);
  const workspace=c.BudgetImportWorkspace.create({state:c.S,config:c.CFG,node:()=>null,escape:c.esc,escapeAttr:c.escAttr,clean:c.cleanVal,canView:c.canViewImportItems,canEdit:c.canEditImportItems,
    read:c.sdkGetAllRecords,feature:c.budgetFeature,loadFeature:c.loadBudgetFeature,scope:c.budgetBadgeScope,
    assigned:c.importAssignedItem,source:c.importDataSource,major:c.importMajorCode,minor:c.importMinorCode,description:c.importItemDesc,code:c.importItemCode,subCode:c.importSubCode,subName:c.importSubName,itemSubCode:c.budgetItemSubCode,different:c.importHasDifferentCode,assignHtml:c.importAssignCellHtml,badge:c.syncBudgetImportBadge,onError(){}});
  c.importWorkspaceController=()=>workspace;c.importWorkspaceRows=()=>workspace.rows();c.findImportRecord=id=>workspace.rows().find(row=>String(row.ID)===String(id));
  c.renderImports=()=>{c.syncBudgetImportBadge();node('importMissingCt').textContent=workspace.rows().filter(c.importIsMissing).length;};
  function runTimers(){for(const [id,t]of [...timers])if(t.delay===0){timers.delete(id);t.callback();}}
  function imports(){return calls.filter(call=>call.config.report_name===reports.importItems&&call.kind!=='write');}
  return {c,workspace,calls,data,gate,nodes,node,events,messages,prefetches,runtime,runTimers,imports,renderCount:()=>renders};
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

// Startup stays lean; opening the tab reads every authorized subdivision and every native page.
{
  const h=harness({edit:true}),g=deferred();h.gate.records=g;h.gate.pageSize=80;
  h.data[reports.importItems]=Array.from({length:127},(_,index)=>fixture(String(BigInt(IID)+BigInt(index))));
  h.data[reports.importItems].push(fixture('4410926000009999801',{ID:ITEM}),fixture('4410926000009999802',OTHER),fixture('4410926000009999803',null,{Subdivision_Code:'OTHER'}));
  await h.c.boot();assert.equal(h.c.S.startupReady,true);assert.equal(h.renderCount(),1);assert.equal(h.imports().length,0);
  assert.ok(h.c.LMPerf.snapshot().events.some(event=>event.name==='budget:first-usable'));
  assert.equal(h.node('importCt').textContent,'—');h.runTimers();await settle();
  assert.equal(h.c.budgetFeature('imports').status,'idle');assert.equal(h.imports().length,0,'Background badge work cannot fetch imports');
  assert.equal(h.calls.filter(call=>call.config.report_name===reports.items).length,0,'background badge does not fetch the assignment roster');
  assert.deepEqual(h.prefetches,[],'background badge does not prefetch subdivision item choices');
  const open=h.c.openImportsTab();await settle();assert.equal(h.node('importCt').textContent,'—');
  g.resolve();await open;await settle();
  assert.equal(h.node('importCt').textContent,'128','Database-wide missing counts above 99 include the second subdivision');assert.equal(h.node('importCt').title,'All Subdivisions · Missing Items');
  assert.equal(h.workspace.rows().length,130);assert.equal(h.c.S.importItems.length,0,'Workspace imports never replace the separately loaded editor snapshot');
  assert.deepEqual(h.imports().map(call=>call.kind),['count','read','read']);
  for(const call of h.imports()){assert.equal(call.config.criteria,undefined,'Every global count and page omits subdivision criteria');if(call.kind==='read')assert.equal(call.config.field_config,'all');}
  assert.equal(h.imports()[2].config.record_cursor,'80');assert.equal(h.renderCount(),1,'background completion patches the tab badge without rebuilding the landing');
  assert.equal(h.workspace.rows().at(-1).Subdivision_Code,'OTHER','The last page contributes another subdivision');
  const before=h.imports().length;await h.c.openImportsTab();assert.equal(h.imports().length,before,'Reopening reuses the complete database snapshot');
  const itemReads=h.calls.filter(call=>call.config.report_name===reports.items);assert.ok(itemReads.length>0);assert.ok(itemReads.every(call=>call.config.criteria===undefined),'Global code review reads the complete authorized item roster');
}

// View-only/edit-only access supports the global tab; denied users perform no financial reads.
for(const permission of [{view:true,edit:false},{view:false,edit:true},{view:false,edit:false}]){
  const h=harness(permission);await h.c.boot();h.runTimers();await settle();
  const allowed=permission.view||permission.edit;
  assert.equal(h.node('importsTabLink').style.display,allowed?'':'none');assert.equal(h.imports().length,0);
  assert.equal(h.calls.filter(call=>call.config.report_name===reports.items).length,0);
  assert.equal(h.node('importCt').textContent,'—');await h.c.openImportsTab();
  if(allowed){assert.equal(h.node('importCt').textContent,'1');assert.equal(h.imports().length,2);}
  else {assert.equal(h.imports().length,0);assert.equal(h.c.S.view,'vBudgets');}
}

// Empty native reports and reports containing only assigned rows publish an explicit zero.
for(const rows of [[],[fixture(IID,{ID:ITEM})]]){
  const h=harness();h.data[reports.importItems]=rows;await h.c.boot();h.runTimers();await settle();await h.c.openImportsTab();
  assert.equal(h.node('importCt').textContent,'0');assert.equal(h.node('importCt').title,'All Subdivisions · Missing Items');
  assert.equal(h.imports().filter(call=>call.kind==='read').length,rows.length?1:0,'a confirmed empty native report requires no pages');
}

// Concurrent global-tab opens deduplicate the complete native counted request.
{
  const h=harness(),g=deferred();h.gate.count=g;await h.c.boot();h.runTimers();await settle();
  const open=h.c.openImportsTab(),duplicate=h.c.openImportsTab();await settle();assert.equal(h.imports().length,1);assert.equal(h.node('importCt').textContent,'—');
  g.resolve();await Promise.all([open,duplicate]);await settle();
  assert.deepEqual(h.imports().map(call=>call.kind),['count','read']);assert.equal(h.node('importCt').textContent,'1');
  assert.ok(h.calls.filter(call=>call.config.report_name===reports.items).every(call=>call.config.criteria===undefined));
}

// Permission and incomplete-page failures remain visibly unavailable and can retry through the actual tab.
for(const failure of ['denied','incomplete']){
  const h=harness();h.gate[failure]=true;await h.c.boot();h.runTimers();await settle();await h.c.openImportsTab();
  assert.equal(h.c.S.startupReady,true);assert.equal(h.node('importCt').textContent,'—');assert.equal(h.workspace.rows().length,0);assert.equal(h.renderCount(),1);
  h.gate[failure]=false;await h.c.openImportsTab();assert.equal(h.node('importCt').textContent,'1');assert.equal(h.workspace.rows().length,1);
}

// Native assignment acknowledgement updates the full missing count even with every view filter active.
{
  const h=harness({edit:true});h.data[reports.importItems]=[fixture(IID),fixture('4410926000009999902'),fixture('4410926000009999903',{ID:OTHER},{Subdivision_Code:'OTHER'})];
  await h.c.boot();h.runTimers();await settle();await h.c.openImportsTab();
  Object.assign(h.c.S.importUI,{search:'no matching description',major:'9999',minor:'999',source:'HeavyJob',missingOnly:true});h.c.renderImports();
  assert.equal(h.c.importFilteredSorted().length,0);assert.equal(h.node('importCt').textContent,'2','filters never reduce the tab count');
  const g=deferred();h.gate.write=g;const classes=new Set(),select={classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)}};
  h.c.assignImportItem(IID,ITEM,select);await settle();assert.equal(h.node('importCt').textContent,'2','pending assignment does not decrement the count');assert.ok(classes.has('saving'));
  g.resolve();await settle();assert.equal(h.node('importCt').textContent,'1');assert.equal(h.node('importCt').title,'All Subdivisions · Missing Items');
  assert.equal(h.c.importAssignedItem(h.workspace.rows()[0]).id,ITEM);assert.equal(h.node('importMissingCt').textContent,1);
  assert.deepEqual(h.messages.filter(Boolean),[],'A successful native assignment, rerender and focus restoration never report an error');
  const write=h.calls.find(call=>call.kind==='write');assert.equal(write.config.report_name,reports.importItems);assert.equal(write.config.id,IID);
  assert.deepEqual(write.config.payload,{data:{Budget_Item:ITEM}},'native assignment preserves exact string identity');
  h.gate.write=null;h.gate.writeDenied=true;h.c.assignImportItem('4410926000009999902',ITEM,select);await settle();
  assert.equal(h.node('importCt').textContent,'1');assert.equal(h.c.importIsMissing(h.workspace.rows()[1]),true);assert.equal(classes.has('saving'),false);
  assert.ok(h.messages.some(message=>/Could not assign Budget Item/.test(message)));
}

// Global visibility never relaxes the native per-row subdivision assignment restriction.
{
  const h=harness({edit:true});
  h.data[reports.importItems]=[fixture(IID),fixture('4410926000009999902',null,{Subdivision_Code:'OTHER'})];
  h.data[reports.items].push({ID:OTHER,Budget_Code:'OTHER-010',Item_Name:'Other subdivision item',Subdivision_Code:'OTHER'});
  await h.c.openImportsTab();
  assert.deepEqual(plain(h.c.budgetItemsForSubCode('AV')).map(item=>item.ID),[ITEM]);
  assert.deepEqual(plain(h.c.budgetItemsForSubCode('OTHER')).map(item=>item.ID),[OTHER]);
  assert.deepEqual(plain(h.c.budgetItemsForSubCode('UNKNOWN')),[],'Unknown subdivisions cannot fall back to the global item roster');
  h.c.assignImportItem(IID,OTHER,null);await settle();
  assert.equal(h.calls.filter(call=>call.kind==='write').length,0,'A global list cannot map an import to another subdivision');
  h.c.assignImportItem('4410926000009999902',OTHER,null);await settle();
  assert.equal(h.c.importAssignedItem(h.workspace.rows()[1]).id,OTHER);
  assert.equal(h.node('importCt').textContent,'1','Assigning the second subdivision updates the global missing count');
}

// Lazy native candidates retain exact subdivision criteria and never leak across actor changes.
{
  const h=harness({edit:true}),old=deferred(),fresh=deferred(),reads=[];
  h.c.sdkGetAllRecords=(report,criteria,options)=>{reads.push({report,criteria,options});return reads.length===1?old.promise:fresh.promise;};
  const pending=h.c.loadItemsForSubCode('AV'),rejected=assert.rejects(pending,/superseded/);
  assert.equal(reads[0].criteria,'(Budget.Subdivision_Code == "AV")');
  h.runtime.user='new-native-session';assert.equal(reads[0].options.isCancelled(),true);
  const next=h.c.loadItemsForSubCode('AV');assert.equal(reads.length,2,'A new actor cannot reuse the previous candidate request');
  const current=[{ID:OTHER,Subdivision_Code:'AV',Budget_Code:'AV-010'}];fresh.resolve(current);await next;
  old.resolve([{ID:ITEM,Subdivision_Code:'AV'}]);await rejected;
  assert.equal(h.c.S.itemsBySubCode.av,current,'An older actor cannot overwrite the current candidate cache');
  assert.equal(reads[1].options.isCancelled(),false);h.c.S.perms.editImports=false;assert.equal(reads[1].options.isCancelled(),true,'Lost edit permission cancels candidate reads');
}
for(const failure of ['denied','wrong-subdivision']){
  const h=harness({edit:true});
  h.c.S.allBudgetItems=[{ID:OTHER,Subdivision_Code:'OTHER'}];
  h.c.sdkGetAllRecords=async()=>{if(failure==='denied')throw {permissionDenied:true,message:'Native item access denied'};return [{ID:OTHER,Subdivision_Code:'OTHER'}];};
  await assert.rejects(h.c.loadItemsForSubCode('AV'),error=>failure==='denied'?error.permissionDenied===true:/selected subdivision/.test(error.message));
  assert.equal(h.c.S.itemsBySubCode.av,undefined,'Denied or wrong-scope results cannot seed assignment choices');
}

console.log('Budget Import counts: on-demand database-wide native pagination, exact zero/large counts, permissions, retries/dedup, scoped choices and confirmed global assignment updates passed.');
