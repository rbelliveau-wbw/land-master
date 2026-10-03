import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const context = {};
vm.runInNewContext(fs.readFileSync('widgets/lot-sales-explorer/src/app/insights-access.js', 'utf8'), context);
const { load } = context.InsightsAccess;
const runtime = (environment, user = 'viewer@example.com') => ({ current: () => ({ environment, user }), apiName: name => environment === 'DEVELOPMENT' ? name + '_DEV' : environment === 'STAGE' ? name + '_STAGE' : name });
let request;
const creator = result => ({ DATA: { invokeCustomApi: async input => {
  request = input;
  assert(!Object.hasOwn(input, 'parameters'), 'v2 rejects the legacy GET parameters key');
  if (input.http_method === 'GET') {
    assert.equal(Object.hasOwn(input, 'query_params'), false, 'Production/Stage access must use the authenticated Deluge actor, without deriving a username from the native email');
    assert.equal(Object.hasOwn(input, 'payload'), false, 'GET has no JSON body');
  } else {
    assert.equal(input.http_method, 'POST');
    assert.equal(Object.keys(input.payload).join(','), 'user', 'Development POST uses the existing function argument');
    assert.equal(Object.hasOwn(input, 'query_params'), false, 'POST has no GET argument container');
  }
  return result;
} } });

let access = await load(creator({ code: 3000, details: { output: JSON.stringify({ found: true, lotSalesDashboard: true, viewTotalLotRevenue: false }) } }), runtime('PRODUCTION'));
assert.equal(access.lotSalesDashboard, true);
assert.equal(access.viewTotalLotRevenue, false);
assert.equal(request.api_name, 'Get_User_Access');
assert.equal(request.http_method, 'GET');
assert.equal(Object.hasOwn(request, 'query_params'), false);
assert.equal(request.content_type, 'application/json');

access = await load(creator({ code: 3000, result: JSON.stringify({ hasRow: true, lotSalesDashboard: true, viewTotalLotRevenue: true }) }), runtime('DEVELOPMENT'));
assert.equal(access.viewTotalLotRevenue, true);
assert.equal(request.api_name, 'Get_User_Access_DEV');
assert.equal(request.http_method, 'POST');
assert.equal(request.payload.user, 'viewer');

access = await load(creator({ code: 3000, result: { details: { output: JSON.stringify({ hasRow: true, lotSalesDashboard: true, viewTotalLotRevenue: false }) } } }), runtime('STAGE', ' VIEWER@EXAMPLE.COM '));
assert.equal(access.lotSalesDashboard, true);
assert.equal(request.api_name, 'Get_User_Access_STAGE', 'Stage remains isolated rather than selecting a Production API');
assert.equal(request.http_method, 'GET');
assert.equal(Object.hasOwn(request, 'query_params'), false, 'Stage also preserves the backend current-session fallback');
await load(creator({ code: 3000, result: JSON.stringify({ hasRow: true, lotSalesDashboard: true }) }), runtime('PRODUCTION', 'viewer+qa&scope=test@example.com'));
assert.equal(Object.hasOwn(request, 'query_params'), false, 'An email alias cannot override the backend session actor');

access = await load(creator({ code: 3000, result: JSON.stringify({ hasRow: true, lotSalesDashboard: true, viewTotalLotRevenue: true }) }), runtime('PRODUCTION'));
assert.equal(access.viewTotalLotRevenue, true, 'the standard JSON string result envelope remains supported');
assert.equal(Object.isFrozen(access), true);

access = await load(creator({ code: 3000, result: JSON.stringify({ found: false, lotSalesDashboard: true, viewTotalLotRevenue: true }) }), runtime('PRODUCTION'));
assert.equal(access.lotSalesDashboard, false);
assert.equal(access.viewTotalLotRevenue, false);
access = await load(creator({ code: 3000, result: JSON.stringify({ found: true }) }), runtime('PRODUCTION'));
assert.equal(access.lotSalesDashboard, false);
await assert.rejects(load(creator({ code: 9350 }), runtime('PRODUCTION')), /rejected/);
await assert.rejects(load(creator({ code: 3000, result: 'not JSON' }), runtime('PRODUCTION')), /no readable permissions/);
await assert.rejects(load(creator({ code: 3000 }), runtime('PRODUCTION', '')), /could not be identified/);
const permissionFlags={found:true,hasRow:true,lotSalesDashboard:true,viewTotalLotRevenue:true};
for(const failure of [{status:'failed'},{status:' ERROR '},{status:'failure'},{success:false},{error:'No permission'},{code:2898}]){
  await assert.rejects(load(creator({code:3000,result:permissionFlags,...failure}),runtime('PRODUCTION')),/rejected/);
  await assert.rejects(load(creator({code:3000,result:{...permissionFlags,...failure}}),runtime('PRODUCTION')),/no readable permissions/);
  await assert.rejects(load(creator({code:3000,result:permissionFlags,details:{output:JSON.stringify(failure)}}),runtime('PRODUCTION')),/no readable permissions/,'A valid permission leaf cannot hide a failed sibling wrapper.');
}
await assert.rejects(load(creator(permissionFlags),runtime('PRODUCTION')),/rejected/,'Missing native success code cannot authorize graphs');
for(const response of [
  {code:3000,result:permissionFlags,details:[{code:2898,error:'Denied'}]},
  {code:3000,result:permissionFlags,response:JSON.stringify([{code:3000,status:' FAILURE '}])},
  {code:3000,result:permissionFlags,data:{hasRow:false,lotSalesDashboard:false,viewTotalLotRevenue:false}},
  {code:3000,result:{...permissionFlags,hasRow:false}},
  {code:3000,result:permissionFlags,data:{...permissionFlags,viewTotalLotRevenue:false}}
])await assert.rejects(load(creator(response),runtime('PRODUCTION')),error=>error.response===response&&error.raw===response&&/no readable permissions/.test(error.message));
const rejectedResponse={code:2898,error:'Denied'};
await assert.rejects(load(creator(rejectedResponse),runtime('PRODUCTION')),error=>error.code==='2898'&&error.response===rejectedResponse&&error.raw===rejectedResponse,'Returned native failures preserve the primary code and raw response.');
const nestedRejectedResponse={code:3000,result:permissionFlags,details:[{code:2898,error:'Denied'}]};
await assert.rejects(load(creator(nestedRejectedResponse),runtime('PRODUCTION')),error=>error.code==='2898'&&error.response===nestedRejectedResponse);
access=await load(creator({code:3000,result:permissionFlags,data:{...permissionFlags}}),runtime('PRODUCTION'));assert.equal(access.lotSalesDashboard,true,'Identical duplicate permission envelopes remain consistent.');
for(const identity of [{environment:'UNKNOWN',user:'viewer'},{environment:'PRODUCTION',user:{}},{environment:'PRODUCTION',user:[]}]){
  let calls=0;await assert.rejects(load({DATA:{invokeCustomApi:async()=>{calls++;return{code:3000,result:permissionFlags};}}},{current:()=>identity}));assert.equal(calls,0);
}
{
  let identity={environment:'PRODUCTION',user:'before',appLinkName:'land-master'};
  await assert.rejects(load({DATA:{invokeCustomApi:async()=>{identity={...identity,user:'after'};return{code:3000,result:permissionFlags};}}},{current:()=>identity,apiName:name=>name}),/session changed/);
}
let failedRequest;
await assert.rejects(load({ DATA: { invokeCustomApi: async input => { failedRequest = input; throw { code: 9350, message: 'No API named' }; } } }, runtime('PRODUCTION')), error => error.code === 9350);
assert.equal(Object.hasOwn(failedRequest, 'query_params'), false, 'A rejected access request preserves the current-session contract');
assert.equal(Object.hasOwn(failedRequest, 'parameters'), false);

// Execute the saved full function: the session username deliberately differs from
// both the native email and its local part, matching the live regression trigger.
const fullFunction = translate(fs.readFileSync('creator/functions/getUserAccess.dg', 'utf8')).js;
function fullAccess(user) {
  const backend = vm.createContext({user});
  vm.runInContext(`
    const rows = [{ID:'900000000000000001',User:'fixture_session_actor',Lot_Sales_Dashboard:true,View_Total_Lot_Revenue:true}];
    function choose(condition, yes, no) { return condition ? yes : no; }
    function List() { return []; }
    function Map() { return {put(key, value) { this[key] = value; }, toString() { return JSON.stringify(this); }}; }
    Array.prototype.add = function(value) { this.push(value); };
    function query(form, predicate) { return (form === 'User_Access' ? rows : []).map(row => new Proxy(row, {get(object, key) { return object[key] ?? null; }})).filter(predicate); }
    const zoho = {loginuser:'fixture_session_actor'};
    ${fullFunction}
    var response = getUserAccess(user);
  `, backend);
  return {code:3000,result:backend.response};
}
assert.equal(JSON.parse(fullAccess('unrelated_mailbox').result).hasRow, false, 'Inferring the email local part would miss the actual access row.');
for (const environment of ['PRODUCTION', 'STAGE']) {
  const actor = runtime(environment, 'unrelated_mailbox@example.test');
  const native = {DATA:{invokeCustomApi: async input => {
    assert.equal(input.api_name, environment === 'STAGE' ? 'Get_User_Access_STAGE' : 'Get_User_Access');
    assert.equal(input.http_method, 'GET');
    for (const key of ['query_params','parameters','payload']) assert.equal(Object.hasOwn(input,key),false);
    return fullAccess(undefined);
  }}};
  const verified = await load(native, actor);
  assert.equal(verified.hasRow, true);
  assert.equal(verified.lotSalesDashboard, true);
  assert.equal(verified.viewTotalLotRevenue, true);
  assert.equal(actor.current().user, 'unrelated_mailbox@example.test', 'Backend session fallback must not rewrite the runtime/cache identity.');
}
await load(creator({code:3000,result:JSON.stringify({hasRow:true,lotSalesDashboard:true})}),runtime('DEVELOPMENT',' VIEWER+QA@EXAMPLE.COM '));
assert.equal(request.payload.user,'viewer+qa','Development keeps its existing normalized POST/View-as alias contract.');
await assert.rejects(load(creator({code:3000}),runtime('PRODUCTION','(unknown)')),/could not be identified/);
console.log('Insights access: authenticated session fallback, actual Deluge username parity, isolated DEV POST/Stage GET, deny-by-default flags, missing users, and API failures passed.');
