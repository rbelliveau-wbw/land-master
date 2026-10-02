import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('widgets/budget-manager/src/app/widget.html', 'utf8').replace(/\r\n/g, '\n');
function block(name) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf('\n}', start) + 2;
  assert.ok(start >= 0 && end > start, `${name} exists`);
  return source.slice(start, end);
}
function install(context, names) {
  vm.createContext(context);
  for (const name of names) vm.runInContext(block(name), context);
  return context;
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
const turn = () => new Promise(resolve => setImmediate(resolve));
const clone = value => JSON.parse(JSON.stringify(value));

assert.match(source, /creator\/widgets\/version\/2\.0\/widgetsdk-min\.js/);
assert.doesNotMatch(source, /ZOHO\.CREATOR\.API\.(getAllRecords|updateRecord|addRecord|getRecordById|uploadFile|readFile|invokeCustomApi)\(/);
assert.doesNotMatch(source, /ZOHO\.CREATOR\.init\(/);

const calls = [], invalidations = [], savedLogs = [];
let requestExecutions = 0;
const methods = ['updateRecordById', 'addRecords', 'getRecordById', 'invokeCustomApi'];
const DATA = Object.fromEntries(methods.map(method => [method, async config => {
  calls.push({ method, config:clone(config) });
  return { code:3000, data:{ ID:'900000000000000001', Name:'Record' } };
}]));
const FILE = {
  async uploadFile(config) { calls.push({method:'uploadFile', config:clone(config)}); return {code:3000}; },
  async readFile(config) { calls.push({method:'readFile', config:clone(config)}); return 'file content'; }
};
const transport = install({
  S:{liveSDK:true, useMock:false},
  CFG:{forms:{item:'Budget_Item', budget:'Add_Budget', approval:'Budget_Approvals', project:'Project', importItem:'Budget_Import_Item', modification:'Budget_Modification'}, reports:{items:'All_Budget_Items', budgets:'All_Budgets', approvals:'All_Budget_Approvals', projects:'All_Projects', importItems:'All_Budget_Item_Imports', modifications:'All_Budget_Modifications'}, reportCandidates:{All_Budget_Items:['All_Budget_Items','Budget_Item_Report']}},
  ZOHO:{CREATOR:{DATA,FILE}},
  LMRuntime:{apiName:name => name + '_DEV'},
  LMData:{request:(_task, invoke) => Promise.resolve().then(() => {requestExecutions++;return invoke();}), invalidate:() => invalidations.push(true), readAll:async config => {calls.push({method:'readAll', config:clone(config)});return [{ID:'900000000000000001'}];}},
  auditLog:(level,message) => {if(level === 'success')savedLogs.push(message);}, cleanVal:value => String(value ?? '').trim(), shortErr:error => error?.message || String(error),
  Promise, setTimeout, Date, Error
}, ['responseLooksBad','isUpdateSuccess','budgetMutationError','getReportCandidates','budgetSdkCode','budgetMissingReport','budgetRequest','invalidateBudgetTransport','sdkGetAllRecords','getUpdateReportCandidates','sdkUpdateRecord','sdkAddRecord','sdkGetRecordById','sdkUploadFile','sdkReadFile','sdkInvokeCustomApi']);
transport.window = transport;

await transport.sdkGetAllRecords('All_Budget_Items', '(Budget_Category == 1)');
assert.deepEqual(calls.pop(), {method:'readAll',config:{reportName:'All_Budget_Items',criteria:'(Budget_Category == 1)'}});
await transport.sdkUpdateRecord('Budget_Item', '900000000000000001', {Prelim_Budget_Ttl:12.34});
assert.deepEqual(calls.pop(), {method:'updateRecordById',config:{report_name:'All_Budget_Items',id:'900000000000000001',payload:{data:{Prelim_Budget_Ttl:12.34}}}});
await transport.sdkAddRecord('Comment_Log', {Comment:'Saved'});
assert.deepEqual(calls.pop(), {method:'addRecords',config:{form_name:'Comment_Log',payload:{data:{Comment:'Saved'}}}});
const record = await transport.sdkGetRecordById('All_Budgets','900000000000000001');
assert.equal(record.ID,'900000000000000001');
assert.equal(calls.pop().config.field_config,'all');
await transport.sdkUploadFile('All_Contract_Versions','900000000000000001','File_field1',{name:'test.pdf'});
assert.deepEqual(calls.pop().config,{report_name:'All_Contract_Versions',id:'900000000000000001',field_name:'File_field1',file:{name:'test.pdf'}});
assert.equal(await transport.sdkReadFile('All_Contract_Versions','900000000000000001','File_field1','test.pdf'),'file content');
assert.deepEqual(calls.pop().config,{report_name:'All_Contract_Versions',id:'900000000000000001',field_name:'File_field1',file_path:'test.pdf'});
await transport.sdkInvokeCustomApi('Get_User_Access',{__method:'GET',__params:{user:'reviewer'}});
assert.deepEqual(calls.pop().config,{api_name:'Get_User_Access_DEV',http_method:'POST',content_type:'application/json',payload:{user:'reviewer'}});
await transport.sdkInvokeCustomApi('Handle_Approval_Action',{budgetId:'1',approvalAction:'Check'});
assert.deepEqual(calls.pop().config,{api_name:'Handle_Approval_Action_DEV',http_method:'POST',content_type:'application/json',payload:{budgetId:'1',approvalAction:'Check'}});
assert.equal(invalidations.length,3,'successful add/update/upload invalidate transport data');
assert.equal(requestExecutions,7,'the bounded request stub executes each real native SDK callback');
await transport.sdkInvokeCustomApi('Get_User_Access',{__method:'GET',__params:{user:'Reviewer@zohocreator.com'}});
assert.deepEqual(calls.pop(),{method:'invokeCustomApi',config:{api_name:'Get_User_Access_DEV',http_method:'POST',content_type:'application/json',payload:{user:'reviewer'}}},'runtime-resolved Development access uses POST and its verified username binding');
await transport.sdkInvokeCustomApi('Get_User_Access_Lean',{__method:'GET',__params:{user:'Reviewer@zohocreator.com'}});
assert.deepEqual(calls.pop(),{method:'invokeCustomApi',config:{api_name:'Get_User_Access_Lean_DEV',http_method:'POST',content_type:'application/json',payload:{user:'reviewer'}}},'the registered lean Development endpoint uses the same POST binding without switching the selected access API');
transport.LMRuntime.apiName = name => name;
await transport.sdkInvokeCustomApi('Get_User_Access',{__method:'GET',__params:{user:'reviewer+one@example.test',label:'two & three'}});
assert.deepEqual(calls.pop(),{method:'invokeCustomApi',config:{api_name:'Get_User_Access',http_method:'GET',content_type:'application/json',query_params:'user=reviewer%2Bone%40example.test&label=two%20%26%20three'}},'Production uses an encoded query string, never an object coerced by the native SDK');
transport.LMRuntime.apiName = name => name + '_DEV';
await transport.sdkInvokeCustomApi('Other_Read_API',{__method:'GET',__params:{user:'reviewer'}});
assert.deepEqual(calls.pop(),{method:'invokeCustomApi',config:{api_name:'Other_Read_API_DEV',http_method:'GET',content_type:'application/json',query_params:'user=reviewer'}},'other Development APIs retain their existing method');

assert.equal(savedLogs.length,2,'actual record response validation permits only confirmed add/update success');

const successfulResponses = [
  {code:3000,data:{ID:'900000000000000001'},message:'success'},
  {code:'3000',data:{ID:'900000000000000001'},message:'Data Updated Successfully!'},
  {code:3000,result:[{code:3000,data:{ID:'900000000000000001'},message:'Data Added Successfully!'}]},
  {code:3000,result:[{code:3000,data:{ID:'1'}},{code:3000,data:{ID:'2'}}]}
];
for(const response of successfulResponses)assert.equal(transport.isUpdateSuccess(response),true,'documented SDK2 direct and per-record successes are accepted');
const mutationFailures = [
  ['update',{code:2945,message:'Invalid input'},'2945'],
  ['update',{code:3000,result:[{code:2899,message:'No permission'}]},'2899'],
  ['add',{code:3000,result:[{code:2945,message:'Invalid input'}]},'2945'],
  ['update',{code:3000,result:[{code:3000,data:{ID:'1'}},{code:2899,message:'No permission'}]},'2899'],
  ['add',{code:3000,result:[{code:3000,data:{ID:'1'}},{code:2945,message:'Invalid input'}]},'2945'],
  ['update',{code:3000,result:[{code:3000,data:{ID:'1'}},{code:2894,message:'No report named Budget_Item'}]},'2894']
];
for(const method of ['update','add'])for(const response of [null,undefined,{},'success',{code:3000},{code:3000,data:{}},{code:3000,data:{ID:123}},{code:3000,result:[]},{code:3000,result:{}},{code:3000,result:[{code:3000,data:{}}]},{code:3000,result:[null]}])mutationFailures.push([method,response,'MALFORMED_MUTATION_RESPONSE']);
for(const [method,response,code] of mutationFailures) {
  const priorInvalidations=invalidations.length, priorLogs=savedLogs.length;
  let writes=0;
  const native=async () => {writes++;return response;};
  if(method === 'update')DATA.updateRecordById=native;else DATA.addRecords=native;
  const mutation=method === 'update' ? transport.sdkUpdateRecord('Budget_Item','1',{Description:'Latest'}) : transport.sdkAddRecord('Comment_Log',{Comment:'Latest'});
  await assert.rejects(mutation,error => error.code === code && error.raw === response && error.response === response,'failed SDK2 mutation preserves the failing code and raw response');
  assert.equal(writes,1,'failed, mixed and malformed mutations are not replayed');
  assert.equal(invalidations.length,priorInvalidations,'failed mutations cannot invalidate as confirmed success');
  assert.equal(savedLogs.length,priorLogs,'failed mutations cannot report Saved');
  assert.equal(transport.isUpdateSuccess(response),false,'real success validator rejects failure/malformed fixtures');
}
assert.equal(transport.responseLooksBad({code:3000,result:[{code:2899,message:'No permission'}]}),true,'generic response checks also inspect per-record failures');
assert.equal(transport.budgetSdkCode({code:3000,result:[{code:2899,message:'No permission'}]}),'2899','nested failing codes take precedence over the request-level 3000');


let attempts = 0;
DATA.updateRecordById = async () => { attempts++; throw new Error('Response lost after write'); };
await assert.rejects(transport.sdkUpdateRecord('Budget_Item','1',{Description:'Latest'}), /Response lost/);
assert.equal(attempts,1,'ambiguous writes are never replayed on another candidate');
transport.LMData.readAll = async () => {attempts++;throw {permissionDenied:true,code:'2898'};};
attempts = 0;
await assert.rejects(transport.sdkGetAllRecords('All_Budget_Items'),error => error.permissionDenied === true);
assert.equal(attempts,1,'permission denials do not walk aliases');
transport.LMData.readAll = async () => {attempts++;throw new Error('Loaded 999 of 1000 records');};
attempts = 0;
await assert.rejects(transport.sdkGetAllRecords('All_Budget_Items'),/999 of 1000/);
assert.equal(attempts,1,'incomplete reads fail visibly rather than selecting another report');
transport.LMData.readAll = async config => {attempts++;if(config.reportName === 'All_Budget_Items')throw {code:'2894'};return [];};
attempts = 0;
assert.equal((await transport.sdkGetAllRecords('All_Budget_Items')).length,0);
assert.equal(attempts,2,'explicit missing report can use an existing candidate');

const query = install({ZOHO:{CREATOR:{UTIL:{getQueryParams:async () => ({budgetId:'900000000000000001'}),getInitParams:async () => ({budgetId:'wrong'})}}},Promise},['budgetInitParams','readDeepLinkParam']);
query.window = {...query,location:{href:'https://example.test/widget.html?budgetId=url'}};
assert.equal(await query.readDeepLinkParam('budgetId',[]),'900000000000000001','SDK v2 query parameters are awaited');
query.ZOHO.CREATOR.UTIL.getQueryParams = async () => {throw new Error('Query unavailable');};
assert.equal(await query.readDeepLinkParam('budgetId',[]),'wrong','failed query task can still use initialization parameters');
query.window.LMFrontendContext = {params:{budgetId:'routed-budget'}};
assert.equal(await query.readDeepLinkParam('budgetId',[]),'routed-budget','loader parameters are retained for page routing');

let initRequests = 0;
const frontendParams = {loginUser:'cached-user',envUrlFragment:'/environment/development'};
const init = install({
  S:{liveSDK:true,currentUser:''},Promise,
  LMFrontendContext:{params:frontendParams,environment:'dev'},
  ZOHO:{CREATOR:{UTIL:{getInitParams:async () => {initRequests++;return {loginUser:'direct-user'};}}}},
  creatorRuntimeEnvironment:() => {}
},['budgetInitParams','fetchCurrentUser']);
init.window = init;
const verifiedParams = await init.budgetInitParams();
assert.equal(verifiedParams.loginUser,'direct-user','authentication context comes from the freshly attached SDK, not cached loader params');
init.S.creatorInitParams = verifiedParams;init.S.currentUser = verifiedParams.loginUser;
assert.equal(await init.fetchCurrentUser(),'direct-user');
assert.equal(initRequests,1,'the user resolver reuses the one verified native handshake');
delete init.LMFrontendContext;delete init.S.creatorInitParams;init.S.currentUser = '';
assert.equal(await init.fetchCurrentUser(),'direct-user','standalone widget still resolves direct SDK context');
assert.equal(initRequests,2);
init.LMFrontendContext = {params:frontendParams};
init.ZOHO.CREATOR.UTIL.getInitParams = async () => {throw new Error('SDK bridge not attached');};
await assert.rejects(init.budgetInitParams(),/bridge not attached/,'cached loader identity cannot bypass a failed native bridge');

function startupHarness() {
  const reports = Object.fromEntries(['budgets','subdivisions','projects','categories','approvals','proformas','modifications'].map(name => [name,name]));
  const gates = Object.fromEntries(Object.values(reports).map(name => [name,deferred()]));
  const access = deferred(), renders = [], requested = [];
  const dom = {projList:{innerHTML:''},aqGroups:{innerHTML:''}};
  const context = install({
    S:{liveSDK:true,useMock:false,budgets:[],projects:[],approvals:[],startupReady:false},CFG:{reports},Promise,
    fetchCurrentUser:async () => 'reviewer',loadUserAccess:() => access.promise,
    sdkGetAllRecords:name => {requested.push(name);return gates[name].promise;},
    lookupId:value => value?.ID,firstRaw:(row,keys) => keys.map(key => row[key]).find(value => value != null),cleanVal:value => String(value ?? ''),
    proformaName:row => row.Name || '',hydrateBudgetSubdivisions:() => {},buildProjects:rows => [{key:'project:1',name:'Project',phases:rows}],
    auditLog:() => {},setLoad:() => {},setMsg:() => {},showView:() => {},perms:() => ({readOnly:true}),updateImportsTabVisibility:() => {},
    renderProjList:() => renders.push({categories:clone(context.S.landingCategories),ready:context.S.startupReady}),renderApprQueue:() => {},
    loadBudgetCommentSummaries:() => {},loadBudgetAttachmentSummaries:() => {},applyDeepLink:() => {},
    $:id => dom[id],safeStringify:JSON.stringify,shortErr:error => error?.message || String(error)
  },['budgetMeasured','loadAll','boot']);
  context.window = context;
  return {context,gates,access,renders,requested,dom};
}
const startup = startupHarness();
const started = startup.context.boot();
await turn();
assert.equal(startup.requested.length,7,'independent startup reads are dispatched together through the shared bounded adapter');
startup.gates.budgets.resolve([{ID:'1',Name:'Phase'}]);
startup.gates.subdivisions.resolve([{ID:'2'}]);startup.gates.projects.resolve([{ID:'3'}]);
startup.gates.approvals.resolve([{ID:'4',Status:'Pending'}]);startup.gates.proformas.resolve([{ID:'5',Name:'PF'}]);startup.gates.modifications.resolve([]);
await turn();
assert.equal(startup.renders.length,0,'late categories cannot cause partial-total rendering');
assert.equal(startup.context.S.budgets.length,0,'the startup snapshot remains unpublished while a critical report is pending');
startup.gates.categories.resolve([{ID:'6',Budget:{ID:'1'},Deparment:'Construction',Prelim_Budget_Total:10,Budget_Total:20}]);
await turn();
assert.equal(startup.renders.length,0,'permissions must resolve before any usable landing');
startup.access.resolve();await started;
assert.equal(startup.renders.length,1);
assert.equal(startup.renders[0].ready,true);
assert.equal(startup.renders[0].categories['1'][0].Budget_Total,20);

const failed = startupHarness();const failedStart = failed.context.boot();await turn();
failed.gates.categories.reject(new Error('Category count mismatch'));
for(const name of ['budgets','subdivisions','projects','approvals','proformas','modifications'])failed.gates[name].resolve([]);
failed.access.resolve();await failedStart;
assert.equal(failed.renders.length,0,'a failed critical dataset never renders a numeric landing');
assert.equal(failed.context.S.startupReady,false);
assert.match(failed.dom.projList.innerHTML,/could not be loaded completely/);

const detailGate = deferred(), detailCalls = [];
const detail = install({
  S:{categories:{},items:{},detailLoads:{},detailGeneration:{}},CFG:{reports:{categories:'categories',items:'items'}},Promise,
  sdkGetAllRecords:(report,criteria) => {detailCalls.push({report,criteria});return report === 'categories' ? detailGate.promise : Promise.resolve([{ID:'3',Budget_Category:{ID:'2'}}]);},
  setLoad:() => {},auditLog:() => {},compareCategoryRecords:() => 0,compareItemRecords:() => 0
},['loadBudgetDetail']);
const first = detail.loadBudgetDetail('1'), second = detail.loadBudgetDetail(1);
assert.equal(first,second,'concurrent requests for a string/numeric equivalent ID share one promise');
detailGate.resolve([{ID:'2'}]);await first;
assert.equal(detailCalls.length,2,'only one category and one item request run');
assert.equal(detail.S.detailLoads['1'],undefined);
await detail.loadBudgetDetail('1');assert.equal(detailCalls.length,2,'complete detail is cached');

const staleGate = deferred(), freshGate = deferred();let categoryReads = 0;
detail.S.categories = {};detail.S.items = {};
detail.sdkGetAllRecords = report => report === 'categories' ? (++categoryReads === 1 ? staleGate.promise : freshGate.promise) : Promise.resolve([{ID:'latest-item'}]);
detail.invalidateBudgetTransport = () => {};
vm.runInContext(block('reloadBudgetItems'),detail);
const stale = detail.loadBudgetDetail('1');
const staleRejected = assert.rejects(stale,/superseded/);
const refreshed = detail.reloadBudgetItems('1');
freshGate.resolve([{ID:'latest-category'}]);await refreshed;
staleGate.resolve([{ID:'stale-category'}]);await staleRejected;
assert.equal(detail.S.categories['1'][0].ID,'latest-category','late data from an invalidated detail load cannot overwrite a fresh snapshot');
assert.equal(detail.S.items['1'][0].ID,'latest-item');

const preReadyDom = {projList:{innerHTML:''},apprCt:{textContent:''},aqGroups:{innerHTML:''}};
const preReady = install({S:{startupReady:false,startupError:''},$:id => preReadyDom[id]},['renderProjList','renderApprQueue']);
preReady.renderProjList();preReady.renderApprQueue();
assert.match(preReadyDom.projList.innerHTML,/Loading budgets/);
assert.equal(preReadyDom.apprCt.textContent,'…','unloaded approval state does not claim zero pending approvals');

console.log('Budget SDK v2 envelopes, native mutation success/failure validation, safe retries, complete parallel startup and detail deduplication passed.');
