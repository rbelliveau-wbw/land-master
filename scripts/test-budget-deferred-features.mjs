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
function install(context,names){for(const name of names)vm.runInContext(block(name),context);}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const plain=value=>JSON.parse(JSON.stringify(value));
const fields=JSON.parse(source.match(/landingCategoryFields:\s*(\[[^\]]+\])/)[1]);
const reports=Object.fromEntries(['budgets','subdivisions','projects','categories','approvals','modifications','proformas','proformaDetails','proformaItems','proformaPhases','comments','attachments','importItems','items'].map(name=>[name,name]));
const common=['cleanVal','isObj','rawPath','firstRaw','lookupId','lookupName','lookupMatchesId','v','getReportCandidates','budgetSdkCode','budgetMissingReport','sdkGetAllRecords','budgetFeature','invalidateBudgetFeature','loadBudgetFeature','budgetModsReady','budgetDetailReady','requireBudgetRequestDetail','ensureBudgetModifications','ensureProjectProformaChoices','requireBudgetModsReady','budgetNavigationToken','budgetNavigationCurrent','budgetEditorHasDraft','invalidateBudgetReports','groupLandingCategories','validateLandingCategoryRows','modSignedAmount','modStatusOf','modsForBudget','modsForItem','modAgg','itemModAgg','findItemById'];
function harness(){
  const calls=[],nodes={},badges=[],data={modifications:[],proformas:[],proformaDetails:[],proformaItems:[],proformaPhases:[],comments:[],attachments:[],importItems:[],budgets:[],approvals:[],categories:[],items:[]};
  const context=vm.createContext({
    S:{liveSDK:true,useMock:false,view:'vBudgets',navigationGeneration:1,budgets:[],modifications:[],proformas:[],approvals:[],landingCategories:{},categories:{},items:{},detailLoads:{},detailGeneration:{},commentRowsByParent:{},attachmentsByBudget:{},saveTimers:{},startupReady:true},
    CFG:{reports,landingCategoryFields:fields,reportCandidates:{},attachmentBudgetField:'Budget'},Promise,Error,Date,setTimeout,clearTimeout,
    LMRuntime:{current:()=>({environment:'PRODUCTION',user:'authoritative-session',appLinkName:'land-master'})},
    ZOHO:{CREATOR:{DATA:{
      async getRecordCount(config){calls.push({method:'count',config:plain(config)});return {code:3000,result:{records_count:data[config.report_name].length}};},
      async getRecords(config){calls.push({method:'read',config:plain(config)});const rows=data[config.report_name];return {code:3000,data:config.field_config==='custom'?rows.map(row=>Object.fromEntries(config.fields.split(',').map(field=>[field,row[field]]))):plain(rows)};}
    }}},
    document:{querySelector:()=>null,querySelectorAll:selector=>selector.includes('comment-activity-btn')?badges:[],getElementById:id=>nodes[id]},
    $:id=>nodes[id]||(nodes[id]={innerHTML:'',textContent:'',style:{}}),auditLog:()=>{},toastShow:()=>{},shortErr:error=>error?.message||String(error),esc:value=>String(value??''),escAttr:value=>String(value??''),
    proformaName:row=>row?.Name||'',PFComments:{timestamp:value=>Date.parse(value)},canViewImportItems:()=>true,IMPORT_TAB_TROUBLESHOOT:false,
    importIsMissing:row=>!row.Budget_Item,hydrateBudgetSubdivisions:()=>{},buildProjects:()=>[],renderProjList:()=>{},renderApprQueue:()=>{},findProjectForBudget:()=>null
  });
  context.window=context;vm.runInContext(adapter,context);install(context,common);
  return {context,calls,nodes,badges,data};
}

// A native counted read is deduplicated and cannot become zero on failure.
{
  const {context:c,data,calls}=harness(),gate=deferred();
  data.modifications=[{ID:'900000000000000001',Budget:{ID:'1'},Budget_Item:{ID:'2'},Status:'Approved',Modification_Type:'Increase',Amount:'50'},
    {ID:'900000000000000002',Budget:{ID:'1'},Budget_Item:{ID:'2'},Status:'Approved',Modification_Type:'Decrease',Amount:'25'},
    {ID:'900000000000000003',Budget:{ID:'1'},Budget_Item:{ID:'2'},Status:'Submitted',Modification_Type:'Increase',Amount:'100'}];
  const native=c.ZOHO.CREATOR.DATA.getRecords;c.ZOHO.CREATOR.DATA.getRecords=config=>gate.promise.then(()=>native(config));
  const a=c.ensureBudgetModifications(),b=c.ensureBudgetModifications();assert.equal(a,b);
  await turn();assert.equal(c.budgetFeature('modifications').status,'loading');assert.equal(c.requireBudgetModsReady(),false);
  assert.throws(()=>c.itemModAgg('2'),/not loaded/);assert.equal(c.S.modifications.length,0,'pending reads do not publish partial rows');
  gate.resolve();await a;assert.equal(calls.filter(call=>call.method==='read').length,1);
  assert.deepEqual(plain(c.itemModAgg('2')),{approved:25,pending:100,count:3});
  assert.equal(500+c.itemModAgg('2').approved,525,'pending100 never enters Revised Final');
  install(c,['requestAmountNumber','fmtRequestMoney','fmtRequestMod','renderRequestBalance']);c.S.modModal={requestFlow:true,requestAmount:'20'};c.$('requestBudgetGuard').classList={toggle(){}};
  c.renderRequestBalance({ID:'2',Budget_Ttl:'500',PROJ_Actual:'100'});
  assert.match(c.$('requestBalance').innerHTML,/Revised Final<\/span><span class='rv'>\$525\.00/,'the actual request balance renders 525');
  assert.match(c.$('requestBalance').innerHTML,/Remaining After Current Request<\/span><span class='rv '>\$405\.00/);
  c.S.modModal=null;
  c.invalidateBudgetFeature('modifications');
  c.ZOHO.CREATOR.DATA.getRecords=async()=>({code:2898,message:'No permission'});
  await assert.rejects(c.ensureBudgetModifications(),error=>error.permissionDenied===true&&error.raw.code==='2898');
  assert.equal(c.requireBudgetModsReady(),false);assert.equal(c.budgetFeature('modifications').status,'error');
  c.ZOHO.CREATOR.DATA.getRecords=native;await c.ensureBudgetModifications();assert.equal(c.budgetModsReady(),true,'failed optional reads can retry');
  c.ZOHO.CREATOR.DATA.getRecords=async()=>({code:3000,data:[plain(data.modifications[0])]});
  await assert.rejects(c.ensureBudgetModifications(true),/loaded 1 of 3|count|incomplete|fewer/i);
  assert.equal(c.requireBudgetModsReady(),false,'partial counted native results cannot enable actions');
}

// Older results cannot publish after a fresh generation starts.
{
  const {context:c}=harness(),old=deferred(),fresh=deferred();let reads=0;
  c.sdkGetAllRecords=()=>++reads===1?old.promise:fresh.promise;
  const first=c.ensureBudgetModifications(),rejected=assert.rejects(first,/superseded/);await turn();
  const second=c.ensureBudgetModifications(true);await turn();fresh.resolve([{ID:'fresh'}]);await second;
  old.resolve([{ID:'old'}]);await rejected;assert.equal(c.S.modifications[0].ID,'fresh');
}

// Choice projections cannot supply financial data when the full PF read fails.
{
  const {context:c,data,calls}=harness();data.proformas=[{ID:'900000000000000004',Name:'Existing PF',Budget_Total:'999'}];
  install(c,['compareLoadProforma']);await c.ensureProjectProformaChoices();
  const choice=calls.find(call=>call.method==='read'&&call.config.report_name==='proformas').config;
  assert.equal(choice.field_config,'custom');assert.equal(choice.fields,'ID,Name');
  assert.deepEqual(Object.keys(c.S.proformas[0]).sort(),['ID','Name']);
  c.ZOHO.CREATOR.DATA.getRecordCount=async config=>config.report_name==='proformaDetails'?{code:2898,message:'No permission'}:{code:3000,result:{records_count:1}};
  await assert.rejects(c.compareLoadProforma('900000000000000004'));
  assert.equal(c.S.proformas[0].Budget_Total,undefined);
  assert.doesNotMatch(block('compareLoadProforma'),/S\.proformas/);assert.doesNotMatch(block('openProjectComparison'),/S\.proformas/);
}

// Actual workflow refresh keeps old approvals + old landing values until all fresh reads complete.
{
  const {context:c,data}=harness();
  install(c,['budgetDetailPublishAllowed','loadBudgetDetail','showView','projectProformaValue','projectProformaId','compareLoadFiltered','compareLoadProforma','budgetComparisonDependenciesReady','openProjectComparison']);
  c.CFG.projectProformaField='Proforma';c.setLoad=()=>{};c.compareCategoryRecords=()=>0;c.compareItemRecords=()=>0;
  c.setActiveTab=()=>{};c.updateEditorActionVisibility=()=>{};c.scrollTo=()=>{};c.budgetPerUnitNavigationAllowed=()=>true;c.setMsg=()=>{};
  const budget={ID:'1'},oldItem={ID:'2',Budget_Ttl:'100'},project={key:'project:1',name:'Existing project',projectRecord:{Proforma:{ID:'11'}},phases:[budget]};
  c.findProjectByKey=()=>project;c.S.budgets=[budget];c.S.items['1']=[oldItem];c.S.categories['1']=[{ID:'3',Budget:{ID:'1'}}];c.S.pendingDetailRefresh={'1':true};c.S.pendingItemSaves={'2|Description':1};
  data.categories=[{ID:'3',Budget:{ID:'1'}}];data.items=[{ID:'2',Budget_Category:{ID:'3'},Budget_Ttl:'200'}];data.proformaDetails=[{ID:'11',Name:'Existing full PF',Budget_Total:'250',ROI:'15'}];
  let financialRenders=0;c.renderProjectComparison=()=>financialRenders++;
  await c.openProjectComparison('project:1');assert.equal(financialRenders,0);assert.equal(c.budgetDetailReady('1'),false);assert.equal(c.findItemById('2'),oldItem);
  assert.match(c.S.compare.error,/Wait for budget edits/);assert.match(c.$('compareBody').innerHTML,/Retry/);
  install(c,['renderProjectComparison']);c.renderProjectComparison();assert.match(c.$('compareBody').innerHTML,/Complete comparison unavailable/,'delegated rerenders cannot calculate from staged/unpublished detail');
  c.S.pendingItemSaves={};c.renderProjectComparison=()=>financialRenders++;
  await c.openProjectComparison('project:1');assert.equal(financialRenders,1);assert.equal(c.budgetComparisonDependenciesReady(project),true);assert.equal(c.S.items['1'][0].Budget_Ttl,'200');assert.equal(c.S.compare.proforma.ROI,'15');
}

// Actual workflow refresh keeps old approvals + old landing values until all fresh reads complete.
{
  const {context:c}=harness(),cats=deferred(),calls=[],renders=[];
  install(c,['budgetApprovalStatus','trackIsApproved','catDept','landingCategoryTotal','budgetTotal','refreshBudgetWorkflowState']);
  const old={ID:'1',Const_Budget_Approval_Status:'Pending',Development_Budget_Approval_Status:'Pending'},fresh={...old,Const_Budget_Approval_Status:'Approved'};
  c.S.budgets=[old];c.S.landingCategories={'1':[{ID:'2',Budget:{ID:'1'},Deparment:'Construction',Prelim_Budget_Total:'10',Budget_Total:'100'}]};c.S.approvals=[{ID:'old'}];
  c.sdkGetAllRecords=(report,criteria,options)=>{calls.push({report,criteria,options});return report==='categories'?cats.promise:Promise.resolve(report==='budgets'?[fresh]:report==='approvals'?[{ID:'new'}]:[]);};
  c.renderProjList=()=>renders.push(c.budgetTotal(c.S.budgets[0]));
  const refresh=c.refreshBudgetWorkflowState('1',{requireModifications:true});await turn();
  assert.equal(c.budgetTotal(c.S.budgets[0]),10);assert.equal(c.S.approvals[0].ID,'old');assert.equal(renders.length,0);
  cats.resolve([{ID:'2',Budget:{ID:'1'},Deparment:'Construction',Prelim_Budget_Total:'20',Budget_Total:'200'}]);await refresh;
  assert.deepEqual(renders,[200]);assert.equal(c.S.approvals[0].ID,'new');assert.equal(c.budgetModsReady(),true);
  assert.deepEqual(plain(calls.find(call=>call.report==='categories').options),{fields,fresh:true});
}

// A denied optional Mods report preserves coherent ordinary refresh, while mod-specific refresh rejects.
{
  const {context:c}=harness(),renders=[];
  install(c,['budgetApprovalStatus','trackIsApproved','catDept','landingCategoryTotal','budgetTotal','refreshBudgetWorkflowState']);
  c.budgetFeature('modifications').status='loaded';c.S.modifications=[{ID:'old'}];
  c.sdkGetAllRecords=async report=>{
    if(report==='modifications')throw {permissionDenied:true,code:'2898',message:'No permission'};
    if(report==='budgets')return [{ID:'1',Const_Budget_Approval_Status:'Approved',Development_Budget_Approval_Status:'Pending'}];
    if(report==='categories')return [{ID:'2',Budget:{ID:'1'},Deparment:'Construction',Prelim_Budget_Total:'20',Budget_Total:'200'}];
    return [{ID:'fresh-approval'}];
  };
  c.renderProjList=()=>renders.push(c.budgetTotal(c.S.budgets[0]));
  await c.refreshBudgetWorkflowState('1');assert.deepEqual(renders,[200]);assert.equal(c.S.approvals[0].ID,'fresh-approval');
  assert.equal(c.S.pendingDetailRefresh['1'],true,'workflow actions outside the editor mark only the affected cached detail stale for the next open');
  assert.equal(c.budgetFeature('modifications').status,'error');assert.equal(c.requireBudgetModsReady(),false);
  await assert.rejects(c.refreshBudgetWorkflowState('1',{requireModifications:true}),error=>error.code==='2898');
  assert.equal(c.budgetTotal(c.S.budgets[0]),200);assert.equal(c.requireBudgetModsReady(),false);
}

// Active drafts keep their item/model bindings; settling them consumes the deferred refresh.
{
  const {context:c}=harness(),renders=[],reloads=[];
  install(c,['refreshBudgetWorkflowState','flushBudgetDeferredEditorRefresh']);
  const old={ID:'1',Description:'draft-bound'},fresh={ID:'1',Description:'persisted'};
  c.S.view='vEditor';c.S.edBudget=old;c.S.budgets=[old];c.S.items['1']=[{ID:'item-old'}];c.S.modModal={amt:'73.10',reason:'Keep typed text'};
  c.sdkGetAllRecords=async report=>report==='budgets'?[fresh]:[];
  c.reloadBudgetItems=async id=>{reloads.push(id);};
  for(const fn of ['renderEditorTopInfo','renderSummaryMatrices','renderProjectRatesLite','refreshModSurfaces'])c[fn]=()=>renders.push(fn);
  await c.refreshBudgetWorkflowState('1');assert.equal(c.S.edBudget,old);assert.equal(reloads.length,0);assert.equal(renders.length,0);
  assert.equal(c.S.modModal.reason,'Keep typed text');assert.equal(c.S.deferredEditorRefresh,true);
  c.S.modModal=null;await c.flushBudgetDeferredEditorRefresh();assert.equal(c.S.edBudget.Description,'persisted');assert.equal(c.S.deferredEditorRefresh,false);assert.deepEqual(reloads,['1']);assert.ok(renders.length>0);
}

// Unknown/loading/error badges patch only their mounted count/label; confirmed empty becomes zero.
{
  const {context:c,data}=harness(),gate=deferred(),renders=[];
  install(c,['budgetDetailPublishAllowed','loadBudgetDetail','reloadBudgetItems','findItemById','flushBudgetDeferredEditorRefresh']);
  c.setLoad=()=>{};c.compareCategoryRecords=()=>0;c.compareItemRecords=()=>0;
  const oldBudget={ID:'1'},oldItem={ID:'2',Description:'old visible binding'},oldCategory={ID:'3',Budget:{ID:'1'}};
  c.S.view='vEditor';c.S.edBudget=oldBudget;c.S.budgets=[oldBudget];c.S.items['1']=[oldItem];c.S.categories['1']=[oldCategory];c.budgetFeature('modifications').status='loaded';
  data.categories=[{ID:'3',Budget:{ID:'1'},Description:'fresh category'}];data.items=[{ID:'2',Budget_Category:{ID:'3'},Description:'server before save'}];
  const native=c.ZOHO.CREATOR.DATA.getRecords;c.ZOHO.CREATOR.DATA.getRecords=config=>config.report_name==='items'?gate.promise.then(()=>native(config)):native(config);
  const refresh=c.reloadBudgetItems('1');await turn();
  assert.equal(c.findItemById('2'),oldItem,'existing visible rows remain findable while the native reload is pending');assert.equal(c.S.categories['1'][0],oldCategory,'categories are staged until items complete');
  c.S.pendingItemSaves={'2|Description':1};oldItem.Description='typed during refresh';gate.resolve();await refresh;
  assert.equal(c.findItemById('2'),oldItem);assert.equal(oldItem.Description,'typed during refresh','a newly started draft cannot be overwritten by late server rows');
  assert.equal(c.budgetDetailReady('1'),false);assert.equal(c.S.deferredEditorRefresh,true);assert.equal(c.S.pendingDetailRefresh['1'],true);
  data.items[0].Description='typed during refresh';c.S.pendingItemSaves={};c.ZOHO.CREATOR.DATA.getRecords=native;
  for(const fn of ['renderEditorTopInfo','renderSummaryMatrices','renderProjectRatesLite','refreshModSurfaces'])c[fn]=()=>renders.push(fn);
  await c.flushBudgetDeferredEditorRefresh();assert.equal(c.findItemById('2').Description,'typed during refresh');assert.equal(c.budgetDetailReady('1'),true);assert.equal(c.S.deferredEditorRefresh,false);assert.ok(renders.length>0);
  // The representative phase is 1, while sibling phase4 is also mounted and edited.
  const sibling={ID:'5',Description:'sibling draft binding'};c.S.edPhaseIdx='all';c.S.items['4']=[sibling];c.S.categories['4']=[{ID:'6',Budget:{ID:'4'}}];
  data.categories=[{ID:'6',Budget:{ID:'4'}}];data.items=[{ID:'5',Budget_Category:{ID:'6'},Description:'old sibling server value'}];
  const siblingGate=deferred();c.ZOHO.CREATOR.DATA.getRecords=config=>config.report_name==='items'?siblingGate.promise.then(()=>native(config)):native(config);
  const siblingRefresh=c.reloadBudgetItems('4');await turn();c.S.pendingItemSaves={'5|Description':1};sibling.Description='typed sibling value';siblingGate.resolve();await siblingRefresh;
  assert.equal(c.findItemById('5'),sibling);assert.equal(c.findItemById('5').Description,'typed sibling value');assert.equal(c.S.pendingDetailRefresh['4'],true,'all mounted sibling phases use the same safe publication guard');
  // Navigating away cannot let a pending persisted edit be replaced by a stale native reply.
  c.S.pendingItemSaves={};const afterNav=deferred();c.ZOHO.CREATOR.DATA.getRecords=config=>config.report_name==='items'?afterNav.promise.then(()=>native(config)):native(config);
  const navRefresh=c.reloadBudgetItems('4');await turn();c.S.pendingItemSaves={'5|Description':2};sibling.Description='saving after navigation';c.S.view='vBudgets';afterNav.resolve();await navRefresh;
  assert.equal(c.findItemById('5'),sibling);assert.equal(c.findItemById('5').Description,'saving after navigation');assert.equal(c.budgetDetailReady('4'),false,'pending writes across navigation keep the next open authoritative');
  await c.loadBudgetDetail('4');assert.equal(c.findItemById('5'),sibling);assert.equal(c.budgetDetailReady('4'),false,'the default direct/reopen reader also preserves tracked pending writes');
}

// Known item writes invalidate dependent financial reports while unrelated PF choices remain cached.
{
  const {context:c,data,calls}=harness();install(c,['invalidateBudgetTransport']);c.CFG.forms={item:'Budget_Item'};
  data.items=[{ID:'1'}];data.categories=[{ID:'2'}];data.proformas=[{ID:'3',Name:'Choice'}];
  for(const reportName of ['items','categories','proformas'])await c.LMData.readAll({reportName,ttlMs:10000});
  const before=calls.length;c.invalidateBudgetTransport('Budget_Item');
  for(const reportName of ['items','categories','proformas'])await c.LMData.readAll({reportName,ttlMs:10000});
  assert.deepEqual(calls.slice(before).filter(call=>call.method==='read').map(call=>call.config.report_name).sort(),['categories','items']);
}

// Unknown/loading/error badges patch only their mounted count/label; confirmed empty becomes zero.
{
  const {context:c,data,badges,nodes}=harness(),gate=deferred();
  install(c,['budgetCommentKey','budgetCommentParentId','budgetCommentDeleted','budgetCommentBadge','budgetBadgeCount','budgetBadgeLabel','budgetAttachmentBadge','rememberBudgetComments','loadBudgetComments','syncBudgetCommentButtons','syncBudgetAttachmentButtons','loadImportItems','syncBudgetImportBadge','updateImportsTabVisibility']);
  let fullRenders=0;c.renderProjList=()=>fullRenders++;
  const count={textContent:'original'},button={dataset:{commentField:'Budget',commentId:'1',commentLabel:'Phase'},classList:{toggle(){}},querySelector:()=>count,setAttribute(){}};badges.push(button);
  assert.equal(c.budgetBadgeCount(c.budgetCommentBadge('Budget','1')),'…');
  const read=c.ZOHO.CREATOR.DATA.getRecordCount;c.ZOHO.CREATOR.DATA.getRecordCount=config=>gate.promise.then(()=>read(config));
  const pending=c.loadBudgetComments('Budget','1',false);await turn();assert.equal(count.textContent,'…');assert.match(button.title,/loading/);
  gate.resolve();await pending;assert.equal(count.textContent,'0');assert.match(button.title,/0 comments/);assert.equal(fullRenders,0);
  c.ZOHO.CREATOR.DATA.getRecordCount=async()=>({code:2898,message:'No permission'});
  await assert.rejects(c.loadBudgetComments('Budget','1',true));assert.equal(count.textContent,'!');assert.match(button.title,/unavailable/);assert.equal(fullRenders,0);
  nodes.importCt={textContent:'old'};nodes.importsTabLink={style:{}};c.updateImportsTabVisibility();assert.equal(nodes.importCt.textContent,'…');
  await assert.rejects(c.loadImportItems(false));assert.equal(nodes.importCt.textContent,'!');assert.equal(c.S.importItemsLoaded,false);
  assert.equal(data.comments.length,0);
}

// Complete native data may cache after navigation; an obsolete editor callback cannot repaint.
{
  const {context:c,calls,badges}=harness();
  install(c,['budgetAttachmentBadge','budgetBadgeCount','budgetBadgeLabel','syncBudgetAttachmentButtons','loadBudgetAttachments','budgetFeatureStateHtml','renderAttachmentPage']);
  // Use the existing normalizer contract without needing a preview/file write.
  c.attachmentRecordBudgetId=row=>row.Budget.ID;c.normalizeBudgetAttachmentRecord=row=>({recordId:row.ID,budgetId:row.Budget.ID,name:'Existing.pdf',addedTime:'2026-10-01'});
  const count={textContent:'old'},button={dataset:{budgetAttachments:'1',attachmentLabel:'Phase'},querySelector:()=>count,setAttribute(){}};badges.push(button);
  assert.equal(c.budgetBadgeCount(c.budgetAttachmentBadge('1')),'…');assert.equal(calls.length,0,'drawing an unknown badge performs no attachment read');
  await c.loadBudgetAttachments('1',false);assert.equal(count.textContent,'0','only a confirmed complete parent read reports zero');
  c.ZOHO.CREATOR.DATA.getRecordCount=async()=>({code:2898,message:'No permission'});
  await assert.rejects(c.loadBudgetAttachments('1',true));assert.equal(count.textContent,'!');assert.equal(c.budgetFeature('attachments:1').status,'error');
  c.S.view='vEditor';c.S.edBudget={ID:'1'};c.S.globalMode='attachments';c.renderAttachmentPage(c.S.edBudget);
  assert.match(c.$('attachmentPhasePanel').innerHTML,/unavailable.*Retry/);assert.doesNotMatch(c.$('attachmentPhasePanel').innerHTML,/No attachments/,'a denied read cannot be presented as an empty feature');
}

// Opening and submitting a financial composer are blocked until both complete dependencies exist.
{
  const {context:c}=harness();install(c,['openModModal','openCheckWireRequest','openModDetail','openModEdit','submitModification']);
  c.S.edBudget={ID:'1'};let mounts=0,writes=0;c.renderModModal=()=>mounts++;c.sdkRunBudgetFunction=()=>{writes++;return Promise.resolve();};
  c.openModModal();c.openCheckWireRequest('Check');c.openModDetail('3');c.openModEdit('3');c.submitModification();
  assert.equal(mounts,0);assert.equal(writes,0);assert.equal(c.S.modModal,undefined);
  c.budgetFeature('modifications').status='loaded';c.openCheckWireRequest('Check');assert.equal(mounts,0,'a loaded global modification snapshot cannot bypass missing phase line items');
}

// Complete native data may cache after navigation; an obsolete editor callback cannot repaint.
{
  const {context:c,nodes}=harness(),gate=deferred(),renders=[];
  install(c,['showView','openPhaseEditor','editorModeLabel']);c.S.budgets=[{ID:'1'},{ID:'2'}];
  c.window.scrollTo=()=>{};c.budgetPerUnitNavigationAllowed=()=>true;c.updateEditorActionVisibility=()=>{};
  c.projectName=()=> 'Project';c.phaseName=b=>b.ID;
  for(const fn of ['updateModeSwitch','setEdAutosave','renderEditorTopInfo','applyModeView','renderCatFilterBar','matrixLoadingRow'])c[fn]=()=>{};
  for(const fn of ['renderPhaseMatrix','renderSummaryMatrices','renderProjectRatesLite','renderApprovalPaneLite','renderAttachmentPane','renderApprPhasePanel'])c[fn]=b=>renders.push({fn,bid:b.ID});
  c.loadBudgetDetail=()=>gate.promise;c.ensureBudgetModifications=()=>gate.promise;
  for(const id of ['edCrumbs','modeSwitch','editorBodyGrid','apprPhasePanel','modPhasePanel'])nodes[id]={style:{},classList:{remove(){}},innerHTML:''};
  const pending=c.openPhaseEditor('1');c.showView('vBudgets');c.S.edBudget={ID:'2'};gate.resolve();await pending;
  assert.deepEqual(renders,[],'late old detail never paints a different view/budget');
}

// A modification-only deep link waits for the authoritative row and respects later navigation.
{
  const {context:c}=harness(),gate=deferred(),opens=[];
  install(c,['modificationBudgetId','applyDeepLink']);c.S.budgets=[{ID:'1'}];c.approvalBudgetLookup=()=>null;
  c.readDeepLinkBudgetId=async()=>'';c.readDeepLinkPage=async()=>'';c.readDeepLinkModificationId=async()=> '3';c.setMsg=()=>{};
  c.sdkGetAllRecords=()=>gate.promise;c.openPhaseEditor=(id,mode)=>opens.push({id,mode});
  const pending=c.applyDeepLink();await turn();assert.deepEqual(opens,[]);
  gate.resolve([{ID:'3',Budget:{ID:'1'}}]);await pending;assert.deepEqual(opens,[{id:'1',mode:'modifications'}]);
  c.invalidateBudgetFeature('modifications');const late=deferred();c.sdkGetAllRecords=()=>late.promise;
  const stale=c.applyDeepLink();await turn();c.S.navigationGeneration++;late.resolve([{ID:'3',Budget:{ID:'1'}}]);await stale;
  assert.equal(opens.length,1,'late deep link does not override deliberate navigation');
}

console.log('Budget deferred native reads, retries/dedup, exact Revised math, PF projection isolation, coherent workflow, draft/nav guards and badge patches passed.');
