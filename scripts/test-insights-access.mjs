import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = {};
vm.runInNewContext(fs.readFileSync('widgets/lot-sales-explorer/src/app/insights-access.js', 'utf8'), context);
const { load } = context.InsightsAccess;
const runtime = (environment, user = 'viewer@example.com') => ({ current: () => ({ environment, user }), apiName: name => environment === 'DEVELOPMENT' ? name + '_DEV' : name });
let request;
const creator = result => ({ DATA: { invokeCustomApi: async input => { request = input; return result; } } });

let access = await load(creator({ code: 3000, details: { output: JSON.stringify({ found: true, lotSalesDashboard: true, viewTotalLotRevenue: false }) } }), runtime('PRODUCTION'));
assert.equal(access.lotSalesDashboard, true);
assert.equal(access.viewTotalLotRevenue, false);
assert.equal(request.api_name, 'Get_User_Access');
assert.equal(request.http_method, 'GET');
assert.equal(request.parameters.user, 'viewer');

access = await load(creator({ code: 3000, result: JSON.stringify({ hasRow: true, lotSalesDashboard: true, viewTotalLotRevenue: true }) }), runtime('DEVELOPMENT'));
assert.equal(access.viewTotalLotRevenue, true);
assert.equal(request.api_name, 'Get_User_Access_DEV');
assert.equal(request.http_method, 'POST');
assert.equal(request.payload.user, 'viewer');

access = await load(creator({ code: 3000, result: JSON.stringify({ found: false, lotSalesDashboard: true, viewTotalLotRevenue: true }) }), runtime('PRODUCTION'));
assert.equal(access.lotSalesDashboard, false);
assert.equal(access.viewTotalLotRevenue, false);
access = await load(creator({ code: 3000, result: JSON.stringify({ found: true }) }), runtime('PRODUCTION'));
assert.equal(access.lotSalesDashboard, false);
await assert.rejects(load(creator({ code: 9350 }), runtime('PRODUCTION')), /rejected/);
await assert.rejects(load(creator({ code: 3000, result: 'not JSON' }), runtime('PRODUCTION')), /no readable permissions/);
await assert.rejects(load(creator({ code: 3000 }), runtime('PRODUCTION', '')), /could not be identified/);
console.log('Insights access: environment routing, deny-by-default flags, missing users, and API failures passed.');
