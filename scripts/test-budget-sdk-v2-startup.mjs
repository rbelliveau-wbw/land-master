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
const landingCategoryFields = JSON.parse(source.match(/landingCategoryFields:\s*(\[[^\]]+\])/)[1]);
assert.deepEqual(landingCategoryFields,['ID','Budget','Deparment','Prelim_Budget_Total','Budget_Total']);
assert.match(source,/getUserAccess:\s*"Get_User_Access_Lean"/,'the selected permission API is the registered lean endpoint');
const hardcodedStart = source.indexOf('var HARDCODED_PERMS = {'), hardcodedEnd = source.indexOf('\n};',hardcodedStart) + 3;
assert.ok(hardcodedStart >= 0 && hardcodedEnd > hardcodedStart,'the existing portal override map exists');
const hardcodedSource = source.slice(hardcodedStart,hardcodedEnd);

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
  async uploadFile(config) { calls.push({method:'uploadFile', config:clone(config)}); return {code:3000,data:{filename:'test.pdf',filepath:'stored_test.pdf'}}; },
  async readFile(config) { calls.push({method:'readFile', config:clone(config)}); return 'file content'; }
};
const transport = install({
  S:{liveSDK:true, useMock:false},
  CFG:{forms:{item:'Budget_Item', budget:'Add_Budget', approval:'Budget_Approvals', project:'Project', importItem:'Budget_Import_Item', modification:'Budget_Modification'}, reports:{items:'All_Budget_Items', budgets:'All_Budgets', approvals:'All_Budget_Approvals', projects:'All_Projects', importItems:'All_Budget_Item_Imports', modifications:'All_Budget_Modifications'}, reportCandidates:{All_Budget_Items:['All_Budget_Items','Budget_Item_Report']}},
  ZOHO:{CREATOR:{DATA,FILE}},
  LMRuntime:{apiName:name => name + '_DEV'},
  LMData:{request:(_task, invoke) => Promise.resolve().then(() => {requestExecutions++;return invoke();}), invalidate:() => invalidations.push(true), readAll:async config => {calls.push({method:'readAll', config:clone(config)});return [{ID:'900000000000000001'}];}},
  auditLog:(level,message) => {if(level === 'success')savedLogs.push(message);}, cleanVal:value => String(value ?? '').trim(), shortErr:error => error?.message || String(error),
  Promise, setTimeout, Date, Error, URLSearchParams
}, ['responseLooksBad','isUpdateSuccess','budgetMutationError','getReportCandidates','budgetSdkCode','budgetMissingReport','budgetRequest','invalidateBudgetReports','invalidateBudgetTransport','sdkGetAllRecords','getUpdateReportCandidates','sdkUpdateRecord','sdkAddRecord','sdkGetRecordById','budgetUploadError','budgetUploadSuccess','budgetUploadReceipt','sdkUploadFile','sdkReadFile','sdkInvokeCustomApi']);
transport.window = transport;

await transport.sdkGetAllRecords('All_Budget_Items', '(Budget_Category == 1)');
assert.deepEqual(calls.pop(), {method:'readAll',config:{reportName:'All_Budget_Items',criteria:'(Budget_Category == 1)'}});
await transport.sdkGetAllRecords('All_Budget_Categories','',{fields:landingCategoryFields});
assert.deepEqual(calls.pop(),{method:'readAll',config:{reportName:'All_Budget_Categories',criteria:'',fields:landingCategoryFields}},'only explicitly projected reads request custom fields');
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
assert.deepEqual(calls.pop(),{method:'invokeCustomApi',config:{api_name:'Get_User_Access',http_method:'GET',content_type:'application/json'}},'Production access relies on the authenticated server session without a guessed identity');
for(const suffix of ['', '_STAGE'])for(const apiName of ['Get_User_Access','Get_User_Access_Lean']) {
  transport.LMRuntime.apiName = name => name + suffix;
  const accessParams = {user:' RBelliveau@wbdevelopment.com '};
  await transport.sdkInvokeCustomApi(apiName,{__method:'GET',__params:accessParams});
  assert.deepEqual(calls.pop(),{method:'invokeCustomApi',config:{api_name:apiName + suffix,http_method:'GET',content_type:'application/json'}},'Production and Stage access send neither query parameters nor a user payload');
  assert.equal(accessParams.user,' RBelliveau@wbdevelopment.com ','access transport does not mutate caller parameters');
  await transport.sdkInvokeCustomApi(apiName,{user:'RBelliveau@wbdevelopment.com'});
  assert.deepEqual(calls.pop(),{method:'invokeCustomApi',config:{api_name:apiName + suffix,http_method:'GET',content_type:'application/json'}},'Production and Stage current-session access never transmit an explicit identity');
}
transport.LMRuntime.apiName = name => name;
await transport.sdkInvokeCustomApi('Get_User_Access',{__method:'GET',__params:'user=RBelliveau%40wbdevelopment.com&label=two%20%26%20three'});
assert.deepEqual(calls.pop().config,{api_name:'Get_User_Access',http_method:'GET',content_type:'application/json'},'current-session access also omits encoded string identity parameters');
transport.LMRuntime.apiName = name => name + '_DEV';
await transport.sdkInvokeCustomApi('Get_User_Access',{__method:'GET',__params:{user:'RBelliveau@wbdevelopment.com'}});
assert.deepEqual(calls.pop().config,{api_name:'Get_User_Access_DEV',http_method:'POST',content_type:'application/json',payload:{user:'rbelliveau'}},'Development still sends the username to its existing server-side wbdevelopment alias');
await transport.sdkInvokeCustomApi('Get_User_Access_Lean',{__method:'GET',__params:'user=RBelliveau%40wbdevelopment.com'});
assert.deepEqual(calls.pop().config,{api_name:'Get_User_Access_Lean_DEV',http_method:'POST',content_type:'application/json',payload:{user:'rbelliveau'}},'Development retains its explicit identity contract for encoded parameters too');
for(const suffix of ['', '_DEV', '_STAGE']) {
  transport.LMRuntime.apiName = name => name + suffix;
  await transport.sdkInvokeCustomApi('Other_Read_API',{__method:'GET',__params:{user:'Reviewer+one@Example.test',label:'two & three'}});
  assert.deepEqual(calls.pop(),{method:'invokeCustomApi',config:{api_name:'Other_Read_API' + suffix,http_method:'GET',content_type:'application/json',query_params:'user=Reviewer%2Bone%40Example.test&label=two%20%26%20three'}},'unrelated APIs retain encoded email and method in every environment');
  await transport.sdkInvokeCustomApi('Other_Write_API',{user:'Reviewer@Example.test'});
  assert.deepEqual(calls.pop().config,{api_name:'Other_Write_API' + suffix,http_method:'POST',content_type:'application/json',payload:{user:'Reviewer@Example.test'}},'unrelated API body email contracts remain intact');
}
transport.LMRuntime.apiName = name => name + '_DEV';

assert.equal(savedLogs.length,2,'actual record response validation permits only confirmed add/update success');

for(const suffix of ['', '_STAGE', '_DEV'])for(const apiName of ['Get_User_Access','Get_User_Access_Lean']) {
  // Deliberately different: the email localpart cannot identify the server's Creator user.
  const nativeCalls = [], roster = [{id:'900000000000000001',label:'Creator Session User',email:'creator_session_username'}];
  const access = install({
    S:{liveSDK:true,currentUser:'rbelliveau@wbdevelopment.com'},
    CFG:{customApis:{getUserAccess:apiName}},
    LMRuntime:{apiName:name => name + suffix},
    LMData:{request:(_task,invoke) => Promise.resolve().then(invoke)},
    ZOHO:{CREATOR:{DATA:{invokeCustomApi:async config => {
      nativeCalls.push(clone(config));
      const expected = suffix === '_DEV'
        ? {api_name:apiName + suffix,http_method:'POST',content_type:'application/json',payload:{user:'rbelliveau'}}
        : {api_name:apiName + suffix,http_method:'GET',content_type:'application/json'};
      assert.deepEqual(clone(config),expected,'actual current-session caller uses server identity outside Development');
      const found = suffix === '_DEV' ? config.payload.user === 'rbelliveau' : !('query_params' in config) && !('payload' in config);
      return {code:3000,result:JSON.stringify({found,hasRow:found,editAll:found,editOwned:false,apprAll:false,apprOwned:false,send:false,editOwners:false,viewImports:false,editImports:false,modAdmin:false,budgetDeleteArchive:false,myId:found ? roster[0].id : '',users:roster})};
    }}}},
    $:() => null,auditLog:() => {},
    sdkGetAllRecords:() => {throw new Error('Successful native access must not fall back to a report');},
    cleanVal:value => String(value ?? '').trim(),shortErr:error => error?.message || String(error),
    Promise,URLSearchParams,Error
  },['responseLooksBad','budgetSdkCode','budgetRequest','sdkInvokeCustomApi','sdkRunBudgetFunction','accessTruthy','hardcodedPermsForCurrentUser','applyHardcodedPerms','parseAccessFnResponse','parseLeanBudgetAccessResponse','applyPermsFromFlags','validLeanBudgetAccess','denyBudgetAccess','loadUserAccess']);
  access.window = access;
  vm.runInContext(hardcodedSource,access);
  await access.loadUserAccess();
  assert.equal(nativeCalls.length,1,'actual startup permission caller uses one native access request');
  assert.equal(access.S.perms.hasRow,true,'server session resolves access even when its Creator username differs from the SDK email localpart');
  assert.equal(access.S.perms.editAll,true);
  assert.equal(access.S.myAccessId,roster[0].id,'ownership identity remains a string record ID');
  assert.deepEqual(clone(access.S.accessUsers),roster,'owner roster labels and identities are preserved');
  assert.equal(access.S.currentUser,'rbelliveau@wbdevelopment.com','server identity resolution does not rewrite the SDK login context');
  if(apiName === 'Get_User_Access_Lean') {
    const denied = {found:false,hasRow:false,editAll:false,editOwned:false,apprAll:false,apprOwned:false,send:false,editOwners:false,viewImports:false,editImports:false,modAdmin:false,budgetDeleteArchive:false,myId:'',users:roster};
    const failures = [
      new Error('Environment lean API unavailable'),
      {code:2898,message:'No permission'},
      {code:3000,result:'{}'},
      {code:3000,result:JSON.stringify({...denied,found:true,hasRow:true,editAll:true,myId:'unknown-owner'})},
      {code:3000,result:JSON.stringify({...denied,found:true,hasRow:true,editAll:true,myId:roster[0].id,users:[{...roster[0],id:123}]})}
    ];
    const readableGrants={...denied,found:true,hasRow:true,editAll:true,myId:roster[0].id};
    for(const failure of [{error:'Native access failure'},{success:false},...['error','failed','failure'].map(status => ({status}))]){
      failures.push({code:3000,...failure,result:JSON.stringify(readableGrants)});
      failures.push({code:3000,result:{code:3000,...failure,...readableGrants}});
    }
    failures.push(
      {code:3000,result:readableGrants,details:[{code:2898,error:'Denied'}]},
      {code:3000,result:JSON.stringify(readableGrants),response:'[{"status":"failure"}]'},
      {code:3000,result:readableGrants,details:{output:{...readableGrants,editAll:false}}},
      {code:3000,result:readableGrants,details:{output:JSON.stringify({...readableGrants,users:[{...roster[0],label:'Conflicting roster'}]})}}
    );
    for(const result of failures) {
      access.S.perms={editAll:true,send:true,readOnly:false};access.S.myAccessId=roster[0].id;
      access.ZOHO.CREATOR.DATA.invokeCustomApi = async () => {if(result instanceof Error)throw result;return result;};
      await access.loadUserAccess();
      assert.equal(access.S.perms.readOnly,true,'unavailable or malformed lean access preserves a readable, read-only landing');
      assert.equal(access.S.myAccessId,'','failed access cannot retain a prior owner identity');
      assert.equal(Object.entries(access.S.perms).filter(([key]) => key !== 'readOnly').every(([,value]) => value === false),true,'every action permission is denied after lean failure');
    }
    access.ZOHO.CREATOR.DATA.invokeCustomApi = async () => ({code:3000,result:JSON.stringify({...denied,found:true,hasRow:true,myId:roster[0].id})});
    await access.loadUserAccess();
    assert.equal(access.S.perms.hasRow,true,'a reduced profile can retain its authoritative access row');
    assert.equal(access.S.perms.readOnly,true,'an authoritative row with all capabilities disabled remains read-only');
    assert.equal(access.S.myAccessId,roster[0].id,'reduced access retains the real ownership identity without granting actions');
    access.ZOHO.CREATOR.DATA.invokeCustomApi = async () => ({code:3000,result:JSON.stringify(denied)});
    await access.loadUserAccess();
    assert.equal(access.S.perms.readOnly,true,'a valid no-row response remains denied');
    assert.deepEqual(clone(access.S.accessUsers),roster,'an authoritative no-row response retains its read-only display roster');
    const duplicated={code:3000,result:readableGrants,details:{output:JSON.stringify({...readableGrants,users:roster.map(row => ({...row,error:'business roster field'}))})}};
    duplicated.result={...readableGrants,users:roster.map(row => ({...row,error:'business roster field'}))};
    access.ZOHO.CREATOR.DATA.invokeCustomApi=async () => duplicated;
    await access.loadUserAccess();assert.equal(access.S.perms.editAll,true,'identical leaf duplicates and business roster failure-named fields remain valid');
    const nestedFailure={code:3000,result:readableGrants,details:{output:{code:2898,error:'Denied'}}};
    assert.throws(() => access.parseLeanBudgetAccessResponse(nestedFailure),error => error.code === '2898' && error.raw === nestedFailure && error.response === nestedFailure,'known-wrapper native error code and raw response are retained');
  }
}

const deniedPortalFlags = {found:false,hasRow:false,editAll:false,editOwned:false,apprAll:false,apprOwned:false,send:false,editOwners:false,viewImports:false,editImports:false,modAdmin:false,budgetDeleteArchive:false,myId:'',users:[]};
const portalGrantKeys = ['editAll','editOwned','apprAll','apprOwned','send','editOwners','viewImports','editImports'];
for(const suffix of ['', '_STAGE', '_DEV'])for(const user of ['aarmbrust','aarmburst','AArmbrust@example.test','AArmburst@example.test','ordinary_no_row@example.test']) {
  const nativeCalls = [];
  let nativeResponse = {code:3000,result:JSON.stringify(deniedPortalFlags)};
  const portal = install({
    S:{liveSDK:true,currentUser:user},CFG:{customApis:{getUserAccess:'Get_User_Access_Lean'}},
    LMRuntime:{apiName:name => name + suffix},LMData:{request:(_task,invoke) => Promise.resolve().then(invoke)},
    ZOHO:{CREATOR:{DATA:{invokeCustomApi:async config => {
      nativeCalls.push(clone(config));
      if(nativeResponse instanceof Error)throw nativeResponse;
      return nativeResponse;
    }}}},
    $:() => null,auditLog:() => {},sdkGetAllRecords:() => {throw new Error('Lean access cannot grant through a report fallback');},
    cleanVal:value => String(value ?? '').trim(),shortErr:error => error?.message || String(error),Promise,Error,URLSearchParams
  },['responseLooksBad','budgetSdkCode','budgetRequest','sdkInvokeCustomApi','sdkRunBudgetFunction','accessTruthy','hardcodedPermsForCurrentUser','applyHardcodedPerms','parseAccessFnResponse','parseLeanBudgetAccessResponse','applyPermsFromFlags','validLeanBudgetAccess','denyBudgetAccess','loadUserAccess']);
  portal.window = portal;vm.runInContext(hardcodedSource,portal);
  assert.deepEqual(Object.keys(portal.HARDCODED_PERMS).sort(),['aarmbrust','aarmburst'],'no new portal aliases are introduced');
  await portal.loadUserAccess();
  const expectedNative = suffix === '_DEV'
    ? {api_name:'Get_User_Access_Lean_DEV',http_method:'POST',content_type:'application/json',payload:{user:user.toLowerCase().split('@')[0]}}
    : {api_name:'Get_User_Access_Lean' + suffix,http_method:'GET',content_type:'application/json'};
  assert.deepEqual(nativeCalls[0],expectedNative,'real portal permission callers preserve authoritative native transport');
  const knownPortal = !user.startsWith('ordinary');
  for(const key of portalGrantKeys)assert.equal(portal.S.perms[key],knownPortal,'valid no-row responses retain exactly the existing portal grants');
  assert.equal(portal.S.perms.readOnly,!knownPortal);
  assert.equal(portal.S.perms.hasRow,knownPortal,'the established portal capability marker remains unchanged');
  assert.equal(portal.S.perms.modAdmin,false);assert.equal(portal.S.perms.deleteArchive,false);
  assert.equal(portal.S.myAccessId,'','portal exceptions do not invent a User_Access record ID');
  for(const failure of [new Error('Lean API unavailable'),{code:2898,message:'No permission'},{code:3000,result:'{}'},{code:3000,result:JSON.stringify({...deniedPortalFlags,hasRow:true})}]) {
    nativeResponse = failure;
    await portal.loadUserAccess();
    assert.equal(portal.S.perms.readOnly,true,'API errors and malformed responses remain denied for portal identities too');
    assert.equal(Object.entries(portal.S.perms).filter(([key]) => key !== 'readOnly').every(([,value]) => value === false),true);
    assert.equal(portal.S.myAccessId,'');
  }
}

const successfulResponses = [
  {code:3000,data:{ID:'900000000000000001'},message:'success'},
  {code:'3000',data:{ID:'900000000000000001'},message:'Data Updated Successfully!'},
  {code:3000,result:[{code:3000,data:{ID:'900000000000000001'},message:'Data Added Successfully!'}]}
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
for(const method of ['update','add'])mutationFailures.push([method,{code:3000,result:[{code:3000,data:{ID:'1'},result:[{code:2899,message:'Nested denied confirmation'}]}]},'2899']);
for(const method of ['update','add'])for(const response of [null,undefined,{},'success',{code:3000},{code:3000,data:{}},{code:3000,data:{ID:123}},{code:3000,result:[]},{code:3000,result:{}},{code:3000,result:[{code:3000,data:{}}]},{code:3000,result:[null]}])mutationFailures.push([method,response,'MALFORMED_MUTATION_RESPONSE']);
for(const method of ['update','add'])for(const response of [
  {code:3000,data:{ID:'not-a-Creator-ID'}},
  {code:3000,result:[{code:3000,data:{ID:'1'}},{code:3000,data:{ID:'2'}}]},
  {code:3000,result:[{code:3000,data:{ID:'1'}},{code:3000,data:{ID:'1'}}]},
  {code:3000,data:{ID:'2'},result:[{code:3000,data:{ID:'1'}}]},
  {code:3000,success:false,data:{ID:'1'}},
  {code:3000,result:[{code:3000,success:false,data:{ID:'1'}}]},
  {code:3000,data:{ID:'1',success:false}},
  ...['error','failed','failure'].flatMap(status => [
    {code:3000,status,data:{ID:'1'}},
    {code:3000,result:[{code:3000,status,data:{ID:'1'}}]},
    {code:3000,data:{ID:'1',status}}
  ])
])mutationFailures.push([method,response,'MALFORMED_MUTATION_RESPONSE']);
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

for(const response of [{code:3000,data:{ID:'2'}},{code:3000,result:[{code:3000,data:{ID:'2'}}]}]) {
  let writes=0;DATA.updateRecordById=async () => {writes++;return response;};
  const before=invalidations.length, logs=savedLogs.length;
  await assert.rejects(transport.sdkUpdateRecord('Budget_Item','1',{Notes:'Latest'}),error => error.noReplay && error.code === 'MALFORMED_MUTATION_RESPONSE' && error.raw === response);
  assert.equal(writes,1);assert.equal(invalidations.length,before);assert.equal(savedLogs.length,logs);
  assert.equal(transport.isUpdateSuccess(response,'1'),false,'wrong acknowledgement ID cannot confirm the intended update');
}
for(const response of [{code:3000,data:{ID:'1'}},{code:3000,result:[{code:3000,data:{ID:'1'}}]}]) {
  DATA.updateRecordById=async () => response;
  assert.equal(await transport.sdkUpdateRecord('Budget_Item','1',{Notes:'Latest'}),response,'one exact native string ID confirms the update');
}

const fileAck={code:3000,data:{filename:'test.pdf',filepath:'stored_test.pdf'}};
const rootFileAck={code:3000,filename:'test.pdf',filepath:'stored_test.pdf',message:'File uploaded successfully !'};
transport.CFG.reportCandidates.All_Contract_Versions=['All_Contract_Versions','Contract_Version_Report'];
for(const response of [fileAck,rootFileAck,{...rootFileAck,data:{}},{...rootFileAck,details:{message:'Completed',limits:{remaining:10}}}]){
  let uploads=0;FILE.uploadFile=async()=>{uploads++;return response;};const original=JSON.stringify(response);
  assert.equal(transport.budgetUploadSuccess(response),true);
  const out=await transport.sdkUploadFile('All_Contract_Versions','1','File_field1',{name:'test.pdf'});
  assert.equal(out.data.filename,'test.pdf');assert.equal(out.data.filepath,'stored_test.pdf');assert.equal(uploads,1,'each documented metadata shape sends exactly one native upload');
  assert.equal(JSON.stringify(response),original,'normalization never modifies the native acknowledgement');
  if(response===fileAck)assert.equal(out,response,'existing SDK data envelope identity remains unchanged');
}
for(const response of [{code:3000},{code:3000,data:{ID:'1'}},{code:3000,data:{filename:'',filepath:'stored_test.pdf'}},{code:3000,data:{filename:'test.pdf',filepath:123}},
  {...rootFileAck,filepath:''},{...rootFileAck,filename:42},{...rootFileAck,data:{...fileAck.data}},
  {...rootFileAck,data:{filename:'different.pdf',filepath:'different_path'}},{...rootFileAck,data:{filename:'test.pdf'}},{...rootFileAck,data:[fileAck.data]},{...rootFileAck,result:[]}]){
  let uploads=0;FILE.uploadFile=async()=>{uploads++;return response;};const original=JSON.stringify(response);
  assert.equal(transport.budgetUploadSuccess(response),true);
  await transport.sdkUploadFile('All_Contract_Versions','1','File_field1',{name:'test.pdf'});
  assert.equal(uploads,1);assert.equal(JSON.stringify(response),original,'metadata is optional and the native receipt is immutable');
}
const fileFailures=[null,{},
  {code:3000,result:[{code:2894,message:'No report named All_Contract_Versions'}]},
  {code:3000,result:[fileAck,{code:2899,message:'Denied'}]},
  {...fileAck,success:false}, {...fileAck,data:{...fileAck.data,success:false}},
  {...rootFileAck,success:false},
  {...rootFileAck,details:{code:2898,message:'Denied'}},{...rootFileAck,details:{output:JSON.stringify({code:2899})}},
  {...rootFileAck,details:[{code:3000,data:{status:'failure'}}]},
  {...fileAck,details:{success:false}},
  {...rootFileAck,code:2894,message:'No report named All_Contract_Versions'},
  ...['error','failed','failure'].flatMap(status => [{...fileAck,status},{...fileAck,data:{...fileAck.data,status}}])];
for(const response of fileFailures) {
  let uploads=0;FILE.uploadFile=async () => {uploads++;return response;};
  const before=invalidations.length;
  await assert.rejects(transport.sdkUploadFile('All_Contract_Versions','1','File_field1',{name:'test.pdf'}),error => error.noReplay && error.raw === response && error.response === response);
  assert.equal(uploads,1,'unknown/mixed/malformed file responses never replay through aliases');
  assert.equal(invalidations.length,before,'unconfirmed file responses do not invalidate as success');
}
let fileAttempts=0;const lostFile=new Error('Upload response lost');
FILE.uploadFile=async () => {fileAttempts++;throw lostFile;};
await assert.rejects(transport.sdkUploadFile('All_Contract_Versions','1','File_field1',{name:'test.pdf'}),error => error.raw === lostFile && error.noReplay);
assert.equal(fileAttempts,1);
fileAttempts=0;FILE.uploadFile=async config => {fileAttempts++;return config.report_name === 'All_Contract_Versions' ? {code:2894,message:'No report named All_Contract_Versions'} : fileAck;};
assert.equal(await transport.sdkUploadFile('All_Contract_Versions','1','File_field1',{name:'test.pdf'}),fileAck);
assert.equal(fileAttempts,2,'only a definite missing report rejection may select the documented alias');
FILE.readFile=async () => new Uint8Array([1,2,3]);
assert.deepEqual([...await transport.sdkReadFile('All_Contract_Versions','1','File_field1','stored_test.pdf')],[1,2,3],'readFile retains its independent raw binary contract');

const attachmentId='900000000000000003', parentId='900000000000000004';
const selectedFile={name:'test.pdf',size:10,type:'application/pdf'};
function attachmentHarness(options={}) {
  const counts={create:0,upload:0,read:0,delete:0,refresh:0,invalidate:0,toasts:0};
  let row={ID:attachmentId,Budget:{ID:parentId},File_field1:''};
  const context=install({
    S:{liveSDK:true,useMock:false,edBudget:{ID:parentId},attachmentBusy:false,attachmentUploadReview:null},
    CFG:{forms:{},reports:{attachments:'All_Contract_Versions'},reportCandidates:{All_Contract_Versions:['All_Contract_Versions','Contract_Version_Report']},attachmentFileField:'File_field1',attachmentBudgetField:'Budget',customApis:{createBudgetAttachmentRecord:'Create_Budget_Attachment_Record',deleteBudgetAttachment:'Delete_Budget_Attachment'}},
    ZOHO:{CREATOR:{DATA:{
      invokeCustomApi:async config => {
        if(config.api_name === 'Create_Budget_Attachment_Record') {
          counts.create++;assert.deepEqual(clone(config.payload),{budgetId:parentId});
          if(options.createError)throw options.createError;
          return options.createResponse ?? {code:3000,result:JSON.stringify({ok:true,attachmentId})};
        }
        assert.equal(config.api_name,'Delete_Budget_Attachment');counts.delete++;
        assert.equal(config.payload.attachmentId,attachmentId);row=null;
        return {code:3000,result:'Attachment deleted.'};
      },
      getRecordById:async config => {
        counts.read++;assert.equal(config.id,attachmentId);assert.equal(config.field_config,'all');
        if(options.readError)throw options.readError;
        return {code:3000,data:options.readRow ? options.readRow(row) : clone(row)};
      }
    },FILE:{uploadFile:async config => {
      counts.upload++;assert.equal(config.id,attachmentId);assert.equal(config.file,selectedFile);
      if(options.persist !== false)row.File_field1={filename:'test.pdf',filepath:'stored_test.pdf'};
      if(options.uploadPromise)return options.uploadPromise;
      if(options.uploadError)throw options.uploadError;
      return options.uploadResponse ?? fileAck;
    }}}},
    LMRuntime:{apiName:name => name},LMData:{request:(_task,invoke) => Promise.resolve().then(invoke),invalidate:() => counts.invalidate++},
    renderAttachmentPane:() => {},canAddBudgetAttachment:() => true,setMsg:() => {},auditLog:() => {},
    refreshBudgetAttachmentRecord:async () => {counts.refresh++;return row ? [clone(row)] : [];},
    toastShow:() => counts.toasts++,cleanVal:value => String(value ?? '').trim(),shortErr:error => error?.message || String(error),
    Promise,Error,URLSearchParams,setTimeout:() => 0
  },['responseLooksBad','getReportCandidates','budgetSdkCode','budgetMissingReport','budgetRequest','invalidateBudgetReports','invalidateBudgetTransport','sdkGetRecordById','budgetUploadError','budgetUploadSuccess','budgetUploadReceipt','sdkUploadFile','sdkInvokeCustomApi','sdkRunBudgetFunction','rawPath','firstRaw','lookupId','safeDecodeURIComponent','prettifyAttachmentName','attachmentQueryValue','normalizeAttachmentEntry','collectAttachmentEntries','attachmentRecordBudgetId','parseAttachmentCreateResponse','budgetCreateScope','inspectBudgetAttachment','budgetAttachmentMatches','cleanupEmptyAttachmentRecord','recheckBudgetAttachmentUpload','uploadBudgetAttachments']);
  context.window=context;context.isObj=value => value && typeof value === 'object' && !Array.isArray(value);
  return {context,counts,get row(){return row;}};
}
{
  const {context:c,counts}=attachmentHarness();
  await c.uploadBudgetAttachments([selectedFile]);
  assert.equal(counts.create,1);assert.equal(counts.upload,1);assert.equal(counts.read,1);
  assert.equal(counts.delete,0);assert.equal(counts.toasts,1);assert.equal(c.S.attachmentUploadReview,null);
  assert.match(c.S.attachmentStatus,/1 attachment added/,'success follows exact persisted file/parent verification');
}
for(const uploadResponse of [rootFileAck,{...rootFileAck,data:{}},{...rootFileAck,details:{message:'Completed'}}]){
  const {context:c,counts}=attachmentHarness({uploadResponse});await c.uploadBudgetAttachments([selectedFile]);
  assert.equal(counts.create,1);assert.equal(counts.upload,1);assert.equal(counts.read,1,'root metadata still requires fresh persisted exact parent/path verification');
  assert.equal(counts.delete,0);assert.equal(counts.toasts,1);assert.equal(c.S.attachmentUploadReview,null);assert.match(c.S.attachmentStatus,/1 attachment added/);
}
{
  const options={uploadResponse:rootFileAck,readError:{code:2898,message:'Report temporarily unavailable'}},{context:c,counts}=attachmentHarness(options);
  await c.uploadBudgetAttachments([selectedFile]);assert.ok(c.S.attachmentUploadReview);assert.equal(c.S.attachmentUploadReview.filepath,'stored_test.pdf','root receipt preserves the exact acknowledged path for read-only recovery');
  assert.equal(c.S.attachmentUploadReview.serverFilename,'test.pdf');assert.equal(counts.toasts,0);assert.equal(counts.create,1);assert.equal(counts.upload,1);assert.equal(counts.delete,0);
  delete options.readError;assert.equal(await c.recheckBudgetAttachmentUpload(),true);assert.equal(counts.create,1);assert.equal(counts.upload,1);assert.equal(counts.delete,0,'recovering a root receipt never deletes or replays the write');
}
for(const uploadResponse of [{...rootFileAck,filepath:'another_path'},{...rootFileAck,filename:'another.pdf'}]){
  const {context:c,counts}=attachmentHarness({uploadResponse});await c.uploadBudgetAttachments([selectedFile]);
  assert.equal(c.S.attachmentUploadReview,null,'native upload success is not overturned by filename/path comparisons');assert.equal(counts.toasts,1);assert.equal(counts.create,1);assert.equal(counts.upload,1);assert.equal(counts.delete,0);
}
for(const options of [
  {uploadError:new Error('Upload applied but response lost')},
  {uploadResponse:{code:3000}},
  {uploadResponse:{code:3000,result:[fileAck,{code:2894,message:'No report named'}]}},
  {uploadResponse:{...fileAck,status:'failed'}},
  {uploadResponse:{...fileAck,data:{...fileAck.data,success:false}}}
]) {
  options.readError={code:2898,message:'Readback temporarily unavailable'};
  const {context:c,counts}=attachmentHarness(options);
  await c.uploadBudgetAttachments([selectedFile,{name:'second.pdf',size:10}]);
  assert.equal(counts.create,1,'uncertain outcome prevents the next child insert');
  assert.equal(counts.upload,1);assert.equal(counts.delete,0,'a potentially persisted file is never cleaned up after unknown/mixed response');
  assert.equal(counts.toasts,0);assert.equal(c.S.attachmentUploadReview.attachmentId,attachmentId);
  assert.equal(c.S.attachmentBusy,false);assert.match(c.S.attachmentStatus,/unverified/);
  await c.uploadBudgetAttachments([selectedFile]);
  assert.equal(counts.create,1,'attempting another upload while uncertain does not insert again');
  delete options.readError;
  assert.equal(await c.recheckBudgetAttachmentUpload(),true,'read-only exact stored-file recheck resolves an applied/lost response');
  assert.equal(counts.create,1);assert.equal(counts.upload,1);assert.equal(counts.delete,0);
  assert.equal(c.S.attachmentUploadReview,null);assert.match(c.S.attachmentStatus,/verified/);
}
for(const options of [
  {uploadResponse:{code:3000}},
  {uploadResponse:{code:3000,data:{message:'File saved'}}},
  {uploadResponse:{...rootFileAck,data:{...rootFileAck}}},
  {uploadError:new Error('Applied reply lost')}
]){
  const {context:c,counts}=attachmentHarness(options);
  await c.uploadBudgetAttachments([selectedFile]);
  assert.equal(counts.create,1);assert.equal(counts.upload,1);assert.equal(counts.delete,0);
  assert.equal(counts.toasts,1);assert.equal(c.S.attachmentUploadReview,null);
  assert.match(c.S.attachmentStatus,/1 attachment added/,'fresh exact child/parent/path/name resolves a saved upload automatically');
}

for(const options of [
  {uploadError:new Error('Unknown upload'),persist:false},
  {uploadError:new Error('Unknown upload'),readError:{code:2898,message:'Denied'}},
  {readRow:row => ({...row,Budget:{ID:'99'}})},
  {readRow:row => ({...row,ID:'99'})}
]) {
  const {context:c,counts}=attachmentHarness(options);
  await c.uploadBudgetAttachments([selectedFile]);
  assert.ok(c.S.attachmentUploadReview,'denied/mismatched/unreadable persisted state keeps review pending');
  assert.equal(await c.recheckBudgetAttachmentUpload(),false);assert.ok(c.S.attachmentUploadReview);
  assert.equal(counts.create,1);assert.equal(counts.upload,1);assert.equal(counts.delete,0);assert.equal(counts.toasts,0);
}
for(const readRow of [row=>({...row,File_field1:{filename:'different.pdf',filepath:'wrong_path'}}),row=>{const next={...row};delete next.File_field1;return next;}]){
  const {context:c,counts}=attachmentHarness({uploadResponse:{code:3000},readRow});await c.uploadBudgetAttachments([selectedFile]);
  assert.equal(counts.create,1);assert.equal(counts.upload,1);assert.equal(counts.delete,0);assert.equal(counts.toasts,1);assert.equal(c.S.attachmentUploadReview,null,'native success tolerates formatted or omitted file metadata');
}
{
  const {context:c,counts}=attachmentHarness({persist:false,uploadResponse:{code:2899,message:'No permission'}});
  await c.uploadBudgetAttachments([selectedFile]);
  assert.equal(counts.read,1);assert.equal(counts.delete,1,'only definite rejection plus fresh exact empty child permits cleanup');
  assert.equal(c.S.attachmentUploadReview,null);assert.equal(counts.toasts,0);assert.match(c.S.attachmentStatus,/Upload failed/);
}
for(const options of [{uploadResponse:{code:2899,message:'No permission'}},{persist:false,uploadResponse:{code:2899},readError:{code:2898}}]) {
  const {context:c,counts}=attachmentHarness(options);
  await c.uploadBudgetAttachments([selectedFile]);
  assert.equal(counts.delete,0,'fresh nonempty/denied file state cannot permit cleanup even after a rejected upload');
  assert.ok(c.S.attachmentUploadReview);
}
for(const options of [{createError:new Error('Child created but response lost')},{createResponse:{code:3000,result:JSON.stringify({ok:true,attachmentId:123})}}]) {
  const {context:c,counts}=attachmentHarness(options);
  await c.uploadBudgetAttachments([selectedFile]);
  assert.equal(counts.create,1);assert.equal(counts.upload,0);assert.equal(counts.delete,0);assert.ok(c.S.attachmentUploadReview);
  assert.equal(await c.recheckBudgetAttachmentUpload(),false,'unknown child identity cannot be guessed from an attachment list');
  assert.equal(counts.create,1);assert.equal(counts.upload,0);assert.equal(counts.delete,0);
}
{
  const waiting=deferred(),{context:c,counts}=attachmentHarness({uploadPromise:waiting.promise,readError:{code:2898,message:'Readback temporarily unavailable'}});
  const existing={recordId:'900000000000000005',name:'existing.pdf'};
  c.budgetAttachments=() => [existing];c.removeLocalBudgetAttachment=() => {throw new Error('Blocked deletion must not patch local rows');};
  let confirmations=0;const buttons={attachmentPreviewDelete:{disabled:false},attachmentDeleteGo:{disabled:false},attachmentDeleteOverlay:{classList:{add:() => confirmations++}}};
  c.$=id => buttons[id] || {};c.S.globalMode='attachments';c.updateEditorSideVisibility=() => {};
  for(const name of ['renderAttachmentPane','deleteBudgetAttachment','runDeleteBudgetAttachment'])vm.runInContext(block(name),c);
  c.renderAttachmentPage=() => {};
  const first=c.uploadBudgetAttachments([selectedFile]);await turn();
  assert.equal(counts.create,1);assert.equal(counts.upload,1);assert.equal(c.S.attachmentBusy,true);
  assert.equal(buttons.attachmentPreviewDelete.disabled,true);assert.equal(buttons.attachmentDeleteGo.disabled,true);
  assert.equal(c.deleteBudgetAttachment(0),false,'callable confirmation entrypoint cannot open while FILE is pending');
  assert.equal(await c.runDeleteBudgetAttachment(0),false,'callable committing entrypoint cannot clear another operation\'s lock');
  assert.equal(confirmations,0);assert.equal(counts.delete,0);assert.equal(c.S.attachmentBusy,true);
  assert.equal(await c.uploadBudgetAttachments([selectedFile]),false);
  assert.equal(counts.create,1);assert.equal(counts.upload,1,'delete followed by a second upload cannot issue another FILE request');
  waiting.reject(new Error('Upload response lost'));await first;
  assert.ok(c.S.attachmentUploadReview);assert.equal(c.S.attachmentBusy,false);
  assert.equal(buttons.attachmentPreviewDelete.disabled,true);assert.equal(buttons.attachmentDeleteGo.disabled,true);
  assert.equal(c.deleteBudgetAttachment(0),false);assert.equal(await c.runDeleteBudgetAttachment(0),false);assert.equal(counts.delete,0);
}
{
  const c=attachmentHarness({uploadError:new Error('Lost'),readError:{code:2898,message:'Readback unavailable'}}).context;
  await c.uploadBudgetAttachments([selectedFile]);
  const pane={innerHTML:''};c.$=() => pane;c.S.edPhaseIdx=0;
  Object.assign(c,{budgetFeature:() => ({status:'loaded'}),budgetNavigationToken:() => 1,budgetAttachments:() => [{name:'existing.pdf',recordId:'900000000000000005'}],phaseName:() => 'Phase',attachmentIconSvg:() => '',attachmentExt:() => 'pdf',esc:value => String(value),escAttr:value => String(value)});
  vm.runInContext(block('renderAttachmentPage'),c);c.renderAttachmentPage(c.S.edBudget);
  assert.match(pane.innerHTML,/data-add-budget-attachment type='button' disabled/);
  assert.match(pane.innerHTML,/data-recheck-budget-upload/,'uncertain outcome exposes a read-only Recheck action');
  assert.match(pane.innerHTML,/data-delete-budget-attachment='0'[^>]* disabled/,'mounted row Delete stays disabled during review');
  c.S.attachmentUploadReview=null;c.S.attachmentBusy=true;c.renderAttachmentPage(c.S.edBudget);
  assert.match(pane.innerHTML,/data-delete-budget-attachment='0'[^>]* disabled/,'mounted row Delete stays disabled while a file request is pending');
  c.S.attachmentUploadReview={attachmentId};c.S.attachmentBusy=false;
  let handler,chooser=0,rechecks=0;c.document={addEventListener:(_event,callback) => {handler=callback;}};
  c.$=() => ({click:() => chooser++});c.recheckBudgetAttachmentUpload=() => rechecks++;
  const start=source.indexOf('document.addEventListener("click", function(e){',source.indexOf('/* Budget attachment controls */'));
  vm.runInContext(source.slice(start,source.indexOf('\n});',start)+4),c);
  handler({preventDefault:() => {},target:{closest:selector => selector === '[data-add-budget-attachment]' ? {} : null}});
  assert.equal(chooser,0,'the actual delegated Add action cannot open another chooser while uncertain');
  handler({preventDefault:() => {},target:{closest:selector => selector === '[data-recheck-budget-upload]' ? {} : null}});
  assert.equal(rechecks,1,'the actual delegated Recheck action invokes only the safe recheck path');
}


function createFlowHarness(responses) {
  const writes=[],reads=[],toasts=[],messages=[],runtime={environment:'DEVELOPMENT',user:'create-fixture',appLinkName:'land-master'};
  const queue=responses.slice(),persisted=[];
  const c=install({
    S:{liveSDK:true,useMock:false,currentUser:runtime.user,externalMappings:[],accessUsers:[],budgets:[{ID:parentId}]},
    CFG:{forms:{externalMapping:'External_System_Mapping',comment:'Comment_Log'},reports:{externalMappings:'All_External_System_Mappings',comments:'Comment_Log_Report'}},
    ZOHO:{CREATOR:{DATA:{addRecords:async config => {
      writes.push(clone(config));const next=queue.shift();
      if(next instanceof Error)throw next;
      if(next?.code === 3000)persisted.push(clone(config.payload.data));
      return typeof next === 'function' ? next(config) : next;
    }}}},
    LMRuntime:{current:() => runtime,apiName:name => name},LMData:{request:(_task,invoke) => Promise.resolve().then(invoke),invalidate:() => {}},
    auditLog:() => {},setMsg:text => messages.push(text),toastShow:text => toasts.push(text),renderExternalMappingModal:() => {},closeExternalMappingModal:() => {},renderHeroMappings:() => {},
    perms:() => ({editAll:true}),budgetSubdivisionId:() => '900000000000000006',externalMappingsForSub:() => [],loadExternalMappings:async () => {reads.push('mapping');},
    cleanVal:value => String(value ?? '').trim(),shortErr:error => error?.message || String(error),Promise,Error,Object,JSON,Date,setTimeout:(fn) => setImmediate(fn)
  },['responseLooksBad','isUpdateSuccess','budgetMutationError','getReportCandidates','budgetSdkCode','budgetRequest','invalidateBudgetReports','invalidateBudgetTransport','sdkAddRecord','addedRecordId','budgetCreateScope','budgetCreateRejected','saveExternalMappings','openExternalMappingEditor','budgetCommentCreateReview','syncBudgetCommentCreateReview','addBudgetComment','openBudgetComments']);
  c.window=c;c.$=() => null;
  return {c,writes,reads,toasts,messages,persisted,queue,runtime};
}
function mappingDraft(c,codes=['first']) {
  return c.S.extMapDraft={subdivisionId:'900000000000000006',budgetId:parentId,saving:false,rows:codes.map(code => ({id:'',system:'GP',code,origSystem:'',origCode:'',isNew:true}))};
}
for(const response of [{code:3000},new Error('Mapping insert response lost'),{code:3000,result:[{code:3000,data:{ID:attachmentId}},{code:2899}]}]) {
  const {c,writes,persisted,reads}=createFlowHarness([response]),draft=mappingDraft(c);
  await c.saveExternalMappings();assert.equal(writes.length,1);assert.ok(draft.rows[0].createReview);assert.equal(draft.rows[0].code,'first');
  assert.equal(await c.saveExternalMappings(),false);assert.equal(writes.length,1,'unknown/mixed create cannot be repeated by another Save click');
  c.S.extMapDraft=null;await c.openExternalMappingEditor(parentId);
  assert.equal(c.S.extMapDraft,draft,'closing/reopening retains the exact affected draft');assert.equal(reads.length,0);
  await c.saveExternalMappings();assert.equal(writes.length,1,'reopening cannot bypass an uncertain create lock');
  if(!(response instanceof Error))assert.equal(persisted.length,1,'an applied but unconfirmed create still represents one persisted destination');
}
{
  const firstAck={code:3000,data:{ID:attachmentId}},secondAck={code:3000,data:{ID:'900000000000000007'}};
  const {c,writes,queue,persisted}=createFlowHarness([firstAck,{code:2899,message:'Denied'}]),draft=mappingDraft(c,['first ','second']);
  await c.saveExternalMappings();assert.equal(writes.length,2);assert.equal(draft.rows[0].id,attachmentId);assert.equal(draft.rows[0].isNew,false);
  assert.equal(draft.rows[0].origCode,'first');assert.equal(draft.rows[1].isNew,true);assert.equal(draft.rows[1].createReview,undefined);
  assert.equal(draft.rows[0].code,'first','unchanged acknowledged values normalize to the actual sent code and cannot schedule a duplicate update');
  c.S.extMapDraft=null;await c.openExternalMappingEditor(parentId);assert.equal(c.S.extMapDraft,draft,'known partial acknowledgements survive reopening too');
  queue.push(secondAck);await c.saveExternalMappings();
  assert.equal(writes.length,3);assert.equal(writes[2].payload.data.External_Code,'second','retry sends only the definitely rejected row');
  assert.equal(persisted.length,2);assert.equal(c.S.externalMappings.length,2);assert.equal(c.S.extMapDraft,null);
  assert.equal(Object.keys(c.S.extMapRetainedDrafts).length,0,'completed retained draft key is released');
}
{
  const {c,writes}=createFlowHarness([{code:3000,data:{ID:attachmentId}},{code:3000}]),draft=mappingDraft(c,['first','unknown']);
  await c.saveExternalMappings();assert.equal(draft.rows[0].isNew,false);assert.equal(draft.rows[0].id,attachmentId);assert.ok(draft.rows[1].createReview);
  await c.saveExternalMappings();assert.equal(writes.length,2,'neither acknowledged nor uncertain rows replay after partial unknown failure');
}
{
  const {c,writes,queue,runtime}=createFlowHarness([{code:3000},{code:3000,data:{ID:attachmentId}}]);
  c.budgetCommentThreadField='Budget';c.budgetCommentThreadParent=parentId;
  const data={Comment:'Retained draft',Budget:parentId};
  await assert.rejects(c.addBudgetComment(data),error => error.noReplay && error.code === 'MALFORMED_MUTATION_RESPONSE');
  data.Comment='Changed draft';await assert.rejects(c.addBudgetComment(data));assert.equal(writes.length,1);
  assert.equal(Object.values(c.S.commentCreateReviews)[0].data.Comment,'Retained draft','unknown attempt retains its immutable original comment');
  runtime.user='another-actor';await c.addBudgetComment(data);assert.equal(writes.length,2,'unrelated actor scope does not inherit a prior create lock');
  runtime.user='create-fixture';runtime.environment='PRODUCTION';queue.push({code:3000,data:{ID:attachmentId}});await c.addBudgetComment(data);
  assert.equal(writes.length,3,'separate environment scope does not inherit the Development create lock');
}
function commentNodes() {
  const listeners={},nodes={};
  for(const key of ['.pc-input','[data-pc="send"]','.pc-status','.pc-compose-name','.pc-preview','.pc-messages','.pc-emoji'])nodes[key]={value:'',textContent:'',innerHTML:'',readOnly:false,disabled:false,hidden:false,classList:{toggle:() => {}},focus:() => {},matches:() => false};
  const thread={innerHTML:'',querySelector:selector => nodes[selector] || null,addEventListener:(event,handler) => {listeners[event]=handler;},classList:{contains:() => true}};
  return {thread,nodes,listeners};
}
for(const first of [{code:3000},new Error('Comment applied response lost'),{code:3000,result:[{code:3000,data:{ID:attachmentId}},{code:2899}]}]) {
  const {c,writes}=createFlowHarness([first]),{thread,nodes,listeners}=commentNodes();
  const dom={budgetCommentThread:thread,budgetCommentTitle:{},budgetCommentModal:{classList:{add:() => {}},hidden:true},budgetCommentClose:{focus:() => {}}};
  Object.assign(c,{budgetCommentThread:null,budgetCommentThreadField:'',budgetCommentThreadParent:'',budgetCommentConfirm:null,
    $:id => dom[id],document:{activeElement:{}},TextEncoder,Intl,setInterval:() => 1,clearInterval:() => {},
    loadBudgetComments:async () => [],rememberBudgetComments:() => {},MutationObserver:function(callback){this.observe=() => {};c.reviewObserver=callback;}});
  vm.runInContext(fs.readFileSync('widgets/proforma-manager/src/app/comments.js','utf8'),c);
  await c.openBudgetComments('Budget',parentId,'Fixture');
  const input=nodes['.pc-input'];input.value='Keep original comment draft';listeners.input({target:input});
  const send={dataset:{pc:'send'},closest:() => send};listeners.click({target:send});await turn();await turn();
  assert.equal(writes.length,1);assert.equal(input.value,'Keep original comment draft');assert.equal(input.readOnly,true);assert.equal(nodes['[data-pc="send"]'].disabled,true);
  listeners.keydown({target:input,ctrlKey:true,key:'Enter',preventDefault:() => {}});await turn();await turn();
  assert.equal(writes.length,1,'actual component keyboard path cannot repeat an uncertain native insert');
  await c.openBudgetComments('Budget',parentId,'Fixture reopened');
  assert.equal(input.value,'Keep original comment draft');assert.equal(input.readOnly,true);assert.equal(nodes['[data-pc="send"]'].disabled,true);
  nodes['[data-pc="send"]'].disabled=false;c.reviewObserver();assert.equal(nodes['[data-pc="send"]'].disabled,true,'component rerender cannot reenable Post while review is pending');
  listeners.click({target:send});await turn();assert.equal(writes.length,1,'close/reopen and another explicit Post never send twice');
  assert.equal(nodes['.pc-compose-name'].textContent,'create-fixture','review state does not rewrite the authenticated actor');
}
{
  const {c,writes,queue}=createFlowHarness([{code:2899,message:'Denied'}]);c.budgetCommentThreadField='Project';c.budgetCommentThreadParent=parentId;
  await assert.rejects(c.addBudgetComment({Comment:'Retry only rejected',Project:parentId}),error => String(error.code)==='2899');
  assert.equal(Object.keys(c.S.commentCreateReviews).length,0,'a definitely rejected create does not retain an uncertain lock');
  queue.push({code:3000,data:{ID:attachmentId}});await c.addBudgetComment({Comment:'Retry only rejected',Project:parentId});assert.equal(writes.length,2);
  assert.equal(Object.keys(c.S.commentCreateReviews).length,0,'confirmed comment completion releases its create token');
}

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

const query = install({ZOHO:{CREATOR:{UTIL:{getQueryParams:async () => ({budgetId:'900000000000000001'}),getInitParams:async () => ({budgetId:'wrong'})}}},Promise,setTimeout,clearTimeout},['budgetInitParams','readDeepLinkParam']);
query.window = {...query,location:{href:'https://example.test/widget.html?budgetId=url'}};
assert.equal(await query.readDeepLinkParam('budgetId',[]),'900000000000000001','SDK v2 query parameters are awaited');
query.ZOHO.CREATOR.UTIL.getQueryParams = async () => {throw new Error('Query unavailable');};
assert.equal(await query.readDeepLinkParam('budgetId',[]),'wrong','failed query task can still use initialization parameters');
query.window.LMFrontendContext = {params:{budgetId:'routed-budget'}};
assert.equal(await query.readDeepLinkParam('budgetId',[]),'routed-budget','loader parameters are retained for page routing');

let initRequests = 0;
const frontendParams = {loginUser:'cached-user',envUrlFragment:'/environment/development'};
const init = install({
  S:{liveSDK:true,currentUser:''},Promise,setTimeout,clearTimeout,
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

const initBranchStart=source.indexOf('if (window.ZOHO && window.ZOHO.CREATOR && ZOHO.CREATOR.DATA && typeof ZOHO.CREATOR.DATA.getRecords === "function") {');
const initBranchEnd=source.indexOf('\n})();',initBranchStart);
assert.ok(initBranchStart>=0 && initBranchEnd>initBranchStart,'the actual Creator bootstrap branch exists');
const stalledContext=deferred(), handshakeTimers=new Map();let timerId=0, businessReads=0, appliedContexts=0, handshakeCalls=0;
const stalledDom={projList:{innerHTML:''},aqGroups:{innerHTML:''}};
const stalled=install({
  S:{liveSDK:false,useMock:false,startupReady:false,budgets:[],projects:[],approvals:[],currentUser:''},Promise,Error,
  ZOHO:{CREATOR:{DATA:{getRecords:() => {businessReads++;return Promise.resolve({code:3000,data:[]});}},UTIL:{getInitParams:() => {handshakeCalls++;return stalledContext.promise;}}}},
  LMRuntime:{apply:params => {appliedContexts++;return {user:params.loginUser};},current:() => ({user:'(unknown)'}),apiName:value => value},
  document:{referrer:'https://creatorapp.zoho.com/wbdevelopment/land-master/environment/development/'},
  setTimeout:(callback,delay) => {const id=++timerId;handshakeTimers.set(id,{callback,delay});return id;},clearTimeout:id => handshakeTimers.delete(id),
  fetchCurrentUser:async () => 'reviewer',loadAll:async () => {businessReads++;},loadUserAccess:async () => {businessReads++;},
  auditLog:() => {},showView:() => {},setMsg:() => {},setLoad:() => {},$:id => stalledDom[id],shortErr:error => error?.message || String(error),safeStringify:JSON.stringify
},['budgetInitParams','budgetMeasured','boot']);
stalled.window=stalled;
vm.runInContext(source.slice(initBranchStart,initBranchEnd),stalled);
await turn();
assert.equal(handshakeCalls,1);
assert.equal(handshakeTimers.size,1);
const deadline=[...handshakeTimers.values()][0];assert.equal(deadline.delay,5000,'native post-injection handshake has a bounded five-second deadline');
deadline.callback();await turn();
assert.equal(handshakeTimers.size,0);
assert.equal(stalled.S.sdkInitFailed,true);
assert.equal(stalled.S.liveSDK,false);
assert.equal(stalled.S.useMock,false,'a timed-out Creator session cannot substitute mock business data');
assert.equal(businessReads,0,'the actual startup branch begins no live business or access reads after handshake timeout');
assert.match(stalledDom.projList.innerHTML,/Creator is unavailable/);
stalledContext.resolve({loginUser:'late-user'});await turn();
assert.equal(appliedContexts,0,'late SDK response cannot apply authenticated context after the deadline');
assert.equal(stalled.S.currentUser,'');assert.equal(stalled.S.liveSDK,false);assert.equal(businessReads,0);
stalled.ZOHO.CREATOR.UTIL.getInitParams=async () => {handshakeCalls++;return {loginUser:'retry-user'};};
assert.equal((await stalled.budgetInitParams()).loginUser,'retry-user','a new native handshake remains available after timeout');
assert.equal(handshakeCalls,2);assert.equal(handshakeTimers.size,0,'successful retry clears its deadline');

async function actorStartup(params,globalActor) {
  let businessStarts=0,nativeCalls=0;
  const dom={projList:{innerHTML:''},aqGroups:{innerHTML:''}};
  const context=install({S:{liveSDK:false,useMock:false,currentUser:'',budgets:[],projects:[],approvals:[]},Promise,Error,setTimeout,clearTimeout,
    location:{href:'https://example.test/prod/budget-manager/'},document:{referrer:'https://creatorapp.zoho.com/fixture/land-master/'},
    ZOHO:{CREATOR:{DATA:{getRecords(){assert.fail('bootstrap must defer report reads to the verified business entrypoint');}},UTIL:{getInitParams:async()=>{nativeCalls++;return params;}}}},
    boot(){businessStarts++;},auditLog(){},showView(){},setMsg(){},$:id=>dom[id],shortErr:error=>error?.message||String(error)},['budgetInitParams']);
  context.window=context;
  if(globalActor!==undefined)context.ZOHO.CREATOR.loginUser=globalActor;
  vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/runtime-context.js','utf8'),context);
  vm.runInContext(source.slice(initBranchStart,initBranchEnd),context);await turn();
  return{context,dom,businessStarts,nativeCalls};
}
for(const params of [{},[],null,{envUrlFragment:''},{envUrlFragment:'',loginUser:{}},{envUrlFragment:'',loginUser:[]},{envUrlFragment:'',loginUser:0},{envUrlFragment:'',loginUser:false}]){
  const h=await actorStartup(params);assert.equal(h.nativeCalls,1);assert.equal(h.businessStarts,0,'actual Budget bootstrap cannot start access/report work with missing or malformed actor');assert.equal(h.context.S.liveSDK,false);assert.equal(h.context.S.useMock,false);assert.equal(h.context.S.sdkInitFailed,true);assert.match(h.dom.projList.innerHTML,/Creator is unavailable/);
}
for(const actor of [{},[],7,false]){const h=await actorStartup({envUrlFragment:''},actor);assert.equal(h.businessStarts,0);assert.equal(h.context.S.liveSDK,false);}
for(const [params,globalActor,expected] of [[{envUrlFragment:'',loginUser:'native-actor'},undefined,'native-actor'],[{envUrlFragment:''},'genuine-global-actor','genuine-global-actor']]){
  const h=await actorStartup(params,globalActor);assert.equal(h.businessStarts,1);assert.equal(h.context.S.liveSDK,true);assert.equal(h.context.S.currentUser,expected);
}

function startupHarness() {
  const reports = Object.fromEntries(['budgets','subdivisions','projects','categories','approvals','proformas','modifications'].map(name => [name,name]));
  const gates = Object.fromEntries(Object.values(reports).map(name => [name,deferred()]));
  const access = deferred(), renders = [], requested = [], readConfigs = [];
  const dom = {projList:{innerHTML:''},aqGroups:{innerHTML:''}};
  const context = install({
    S:{liveSDK:true,useMock:false,budgets:[],projects:[],approvals:[],startupReady:false},CFG:{reports,landingCategoryFields},Promise,
    fetchCurrentUser:async () => 'reviewer',loadUserAccess:() => access.promise,
    sdkGetAllRecords:(name,criteria,options) => {requested.push(name);readConfigs.push({name,criteria,options});return gates[name].promise;},
    lookupId:value => value?.ID,firstRaw:(row,keys) => keys.map(key => row[key]).find(value => value != null),cleanVal:value => String(value ?? ''),
    proformaName:row => row.Name || '',hydrateBudgetSubdivisions:() => {},buildProjects:rows => [{key:'project:1',name:'Project',phases:rows}],
    auditLog:() => {},setLoad:() => {},setMsg:() => {},showView:() => {},perms:() => ({readOnly:true}),updateImportsTabVisibility:() => {},
    renderProjList:() => renders.push({categories:clone(context.S.landingCategories),ready:context.S.startupReady}),renderApprQueue:() => {},
    resetBudgetBadgeSummaries:() => {},scheduleBudgetBadgeSummaries:() => {},applyDeepLink:() => {},
    $:id => dom[id],safeStringify:JSON.stringify,shortErr:error => error?.message || String(error)
  },['budgetMeasured','validateLandingCategoryRows','groupLandingCategories','loadAll','boot']);
  context.window = context;
  return {context,gates,access,renders,requested,readConfigs,dom};
}
const startup = startupHarness();
const started = startup.context.boot();
await turn();
assert.equal(startup.requested.length,5,'only the critical first-screen reports are dispatched through the bounded adapter');
assert.deepEqual(startup.requested.slice().sort(),['approvals','budgets','categories','projects','subdivisions']);
assert.deepEqual(clone(startup.readConfigs.find(read => read.name === 'categories')),{name:'categories',criteria:'',options:{fields:landingCategoryFields}},'startup alone projects the five complete landing fields');
assert.equal(startup.readConfigs.filter(read => read.options?.fields).length,1,'other critical/editor datasets keep full fields');
startup.gates.budgets.resolve([{ID:'1',Name:'Phase'}]);
startup.gates.subdivisions.resolve([{ID:'2'}]);startup.gates.projects.resolve([{ID:'3'}]);
startup.gates.approvals.resolve([{ID:'4',Status:'Pending'}]); // Optional report promises remain stalled throughout first usability.
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

const incomplete = startupHarness(), incompleteStart = incomplete.context.boot();await turn();
incomplete.gates.categories.resolve([{ID:'6',Budget:{ID:'1'},Deparment:'Construction',Prelim_Budget_Total:10}]);
for(const name of ['budgets','subdivisions','projects','approvals','proformas','modifications'])incomplete.gates[name].resolve([]);
incomplete.access.resolve();await incompleteStart;
assert.equal(incomplete.renders.length,0,'an omitted projected amount cannot render partial numeric totals');
assert.equal(incomplete.context.S.budgets.length,0,'a malformed category projection never publishes a startup snapshot');
assert.equal(incomplete.context.S.startupReady,false);

const detailGate = deferred(), detailCalls = [];
const detail = install({
  S:{categories:{},items:{},detailLoads:{},detailGeneration:{}},CFG:{reports:{categories:'categories',items:'items'}},Promise,
  sdkGetAllRecords:(report,criteria) => {detailCalls.push({report,criteria});return report === 'categories' ? detailGate.promise : Promise.resolve([{ID:'3',Budget_Category:{ID:'2'}}]);},
  setLoad:() => {},auditLog:() => {},compareCategoryRecords:() => 0,compareItemRecords:() => 0
},['budgetDetailPublishAllowed','budgetDetailReady','loadBudgetDetail']);
const first = detail.loadBudgetDetail('1'), second = detail.loadBudgetDetail(1);
assert.equal(first,second,'concurrent requests for a string/numeric equivalent ID share one promise');
detailGate.resolve([{ID:'2'}]);await first;
assert.equal(detailCalls.length,2,'only one category and one item request run');
assert.equal(detail.S.detailLoads['1'],undefined);
await detail.loadBudgetDetail('1');assert.equal(detailCalls.length,2,'complete detail is cached');

const staleGate = deferred(), freshGate = deferred();let categoryReads = 0;
detail.S.categories = {};detail.S.items = {};
detail.sdkGetAllRecords = report => report === 'categories' ? (++categoryReads === 1 ? staleGate.promise : freshGate.promise) : Promise.resolve([{ID:'latest-item'}]);
detail.invalidateBudgetReports = () => {};
vm.runInContext(block('budgetDetailPublishAllowed'),detail);
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

await import('./test-budget-landing-projection.mjs');
await import('./test-budget-deferred-features.mjs');
await import('./test-budget-background-badges.mjs');
await import('./test-budget-attachment-presentation.mjs');
console.log('Budget exact native acknowledgements, FILE Recheck/delete locks, scoped mapping/comment uncertain-create and partial-completion guards, lean wrapper conflicts/degradation, startup and detail deduplication passed.');

// The real native chain rejects object-shaped negative results before targeted validation.
function nativeApprovalCheck(response, options={}) {
  const calls=[],p={kind:options.kind||'reject',budgetId:'100',approvalId:'200',modificationId:'300',track:'Construction',note:'recorded note'};
  const c={S:{liveSDK:true,currentUser:'check-fixture@example.test'},approvalProgress:p,Promise,URLSearchParams,Error,setTimeout,clearTimeout,
    cleanVal:value=>String(value??'').trim(),auditLog:()=>{},ZOHO:{CREATOR:{DATA:{invokeCustomApi:async config=>{calls.push(clone(config));return options.reply?options.reply(response):response;}}}}};
  c.window=c;vm.createContext(c);
  for(const file of ['runtime-context.js','creator-data.js'])vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/'+file,'utf8'),c);
  c.LMRuntime.apply({envUrlFragment:'',loginUser:'check-fixture@example.test'});
  vm.runInContext(source.match(/var CFG = \{[\s\S]*?\n\};/)[0],c);
  for(const name of ['responseLooksBad','budgetRequest','sdkInvokeCustomApi','sdkRunBudgetFunction','approvalProgressPayload','approvalProgressMissingCheck','approvalProgressApi'])vm.runInContext(block(name),c);
  return {c,p,calls};
}
for(const kind of ['reject','start','modreject','modification'])for(const encoded of [true,false]) {
  const body={success:false,status:'Rejected',message:'Approval is not Pending.'},raw={code:3000,result:encoded?JSON.stringify(body):body};
  const h=nativeApprovalCheck(raw,{kind});let error;try{await h.c.approvalProgressApi(h.p,'Check');}catch(problem){error=problem;}
  assert.ok(error,'negative Check continues rejecting');assert.equal(h.p.reconciliationUnavailable,true,'native JSON and object replies both identify missing targeted verification');assert.match(error.message,/targeted approval status/);assert.equal(h.calls.length,1,'Check classification cannot replay an API call');
  if(!encoded){assert.equal(error.raw,raw);assert.equal(error.response,raw);assert.equal(error.cause,raw,'native failure provenance is retained');}
  const payload=h.calls[0].payload;assert.equal(payload.budgetId,'100');
  if(kind==='modreject'||kind==='modification')assert.equal(payload.modificationId,'300');else assert.equal(payload.approvalId,'200');
}
for(const [action,raw] of [['Repair',{code:3000,result:{success:false}}],['Rejected',{code:3000,result:{success:false}}],['Check',{code:2898,message:'Denied'}],['Check',{code:3000,result:{code:2898,message:'Denied'}}],['Check',{code:3000,result:{ok:false,success:false}}]]) {
  const h=nativeApprovalCheck(raw);let error;try{await h.c.approvalProgressApi(h.p,action);}catch(problem){error=problem;}
  assert.equal(error,raw,'existing failure remains the original rejection');assert.equal(h.p.reconciliationUnavailable,undefined,'mutations, Repair and authoritative/native denials are not mislabeled unavailable');assert.equal(h.calls.length,1);
}
{
  const raw={code:3000,result:{success:false,message:'Check unavailable'}},original=Object.assign(new Error('Unknown outcome'),{raw,response:raw,noReplay:true,uncertain:true,code:'3000'}),h=nativeApprovalCheck(raw,{reply:()=>Promise.reject(original)});
  let error;try{await h.c.approvalProgressApi(h.p,'Check');}catch(problem){error=problem;}
  assert.equal(h.p.reconciliationUnavailable,true);assert.equal(error.raw,raw);assert.equal(error.response,raw);assert.equal(error.cause,original);assert.equal(error.noReplay,true);assert.equal(error.uncertain,true);assert.equal(error.code,'3000');assert.equal(h.calls.length,1);
}
for(const change of ['progress','target','actor','environment']) {
  const gate=deferred(),raw={code:3000,result:{success:false,message:'Old check'}},h=nativeApprovalCheck(raw,{reply:()=>gate.promise});
  const pending=h.c.approvalProgressApi(h.p,'Check');await turn();
  if(change==='progress')h.c.approvalProgress={kind:'reject',budgetId:'999'};
  if(change==='target')h.p.approvalId='999';
  if(change==='actor'||change==='environment')h.c.LMRuntime.apply({envUrlFragment:change==='environment'?'/environment/development':'',loginUser:change==='actor'?'another-actor':'check-fixture@example.test'});
  gate.resolve(raw);await assert.rejects(pending,error=>error===raw);assert.equal(h.p.reconciliationUnavailable,undefined,'late failed Check cannot modify a different progress, target or native context');assert.equal(h.calls.length,1);
}
console.log('Budget actual native approval Check object/JSON failures preserve targeted-unavailable classification, original failure/no replay and current-context guards.');
