import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = {};
vm.runInNewContext(fs.readFileSync('widgets/lot-sales-explorer/src/app/insights-access.js', 'utf8'), context);
const { load } = context.InsightsAccess;
const runtime = (environment, user = 'viewer@example.com') => ({ current: () => ({ environment, user }), apiName: name => environment === 'DEVELOPMENT' ? name + '_DEV' : environment === 'STAGE' ? name + '_STAGE' : name });
let request;
const creator = result => ({ DATA: { invokeCustomApi: async input => {
  request = input;
  assert(!Object.hasOwn(input, 'parameters'), 'v2 rejects the legacy GET parameters key');
  if (input.http_method === 'GET') {
    assert.equal(typeof input.query_params, 'string', 'the real SDK forwards query_params verbatim and needs an encoded query string');
    assert.deepEqual([...new URLSearchParams(input.query_params).keys()], ['user'], 'GET arguments travel only through query_params');
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
assert.equal(request.query_params, 'user=viewer');
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
assert.equal(request.query_params, 'user=viewer', 'normalization matches the existing username contract');
await load(creator({ code: 3000, result: JSON.stringify({ hasRow: true, lotSalesDashboard: true }) }), runtime('PRODUCTION', 'viewer+qa&scope=test@example.com'));
assert.equal(request.query_params, 'user=viewer%2Bqa%26scope%3Dtest', 'a username cannot introduce another query argument');
assert.equal(new URLSearchParams(request.query_params).get('user'), 'viewer+qa&scope=test');

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
let failedRequest;
await assert.rejects(load({ DATA: { invokeCustomApi: async input => { failedRequest = input; throw { code: 9350, message: 'No API named' }; } } }, runtime('PRODUCTION')), error => error.code === 9350);
assert.equal(failedRequest.query_params, 'user=viewer', 'a rejected real v2 call preserves its original error and request contract');
assert.equal(Object.hasOwn(failedRequest, 'parameters'), false);
console.log('Insights access: environment routing, deny-by-default flags, missing users, and API failures passed.');
