import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {salesFixture} from './fixtures/lot-sales-data.mjs';

const app = 'widgets/lot-sales-explorer/src/app/';
const tick = () => new Promise(resolve => setImmediate(resolve));
const plain = value => JSON.parse(JSON.stringify(value));
function runtime(includeShared = true) {
  const context = vm.createContext({LMRuntime: {current: () => ({environment: 'DEVELOPMENT', user: 'fixture_viewer', appLinkName: 'land-master'})}});
  for (const file of [...(includeShared ? ['creator-data.js'] : []), 'sales-model.js', 'creator-adapter.js', 'budget-adapter.js']) vm.runInContext(fs.readFileSync(app + file, 'utf8'), context, {filename: file});
  return {adapter: context.LotSalesCreator, budgetAdapter: context.InsightsBudgetCreator, data: context.LMData, model: context.LotSalesModel, perf: context.LMPerf};
}
const html = fs.readFileSync(app + 'widget.html', 'utf8');
assert.ok(html.indexOf('creator-data.js?') < html.indexOf('creator-adapter.js?'), 'The canonical reader must load before the report adapter.');
const now = new Date(2026, 9, 2);
const sourceData = salesFixture(now);
sourceData.lots = [
  {...sourceData.lots[0], ID: '4410926000009999901', Close_Date: '2026-10-01', Purchase_Date: '2026-09-20'},
  {...sourceData.lots[0], ID: '4410926000009999902', Close_Date: '2024-12-31', Purchase_Date: '2025-01-01'},
  {...sourceData.lots[0], ID: '4410926000009999903', Close_Date: '', Purchase_Date: '', Status: 'Open'},
  {...sourceData.lots[0], ID: '4410926000009999904', Close_Date: '2027-01-01', Purchase_Date: ''}
];
const {adapter, model, perf} = runtime();
const source = Object.fromEntries(Object.entries(adapter.reports).map(([key, report]) => [report, sourceData[key]]));
const snapshot = JSON.stringify(sourceData), calls = [];
let active = 0, peak = 0;
const filtered = config => config.criteria ? source[config.report_name].filter(row => [model.date(row.Close_Date), model.date(row.Purchase_Date)].some(date => date && date >= '2025-01-01' && date < '2027-01-01')) : source[config.report_name];
async function simulate(config, isCount) {
  active++; peak = Math.max(peak, active);
  calls.push({kind: isCount ? 'count' : 'records', ...config});
  await tick(); active--;
  const rows = filtered(config);
  return isCount ? {code: 3000, result: {records_count: String(rows.length)}} : {code: 3000, data: rows};
}
const api = {getRecordCount: config => simulate(config, true), getRecords: config => simulate(config, false)};
const recent = await adapter.loadRecent(api, null, {now});
assert.equal(peak, 3, 'The four parallel report loads share the canonical three-request limit.');
assert.deepEqual(plain(recent.lots).map(row => row.ID), ['4410926000009999901', '4410926000009999902'], 'Recent criteria must cover either date basis while excluding undated and future lots.');
assert.deepEqual(plain(recent.subdivisions), sourceData.subdivisions);
assert.deepEqual(plain(recent.projects), sourceData.projects);
assert.deepEqual(plain(recent.builders), sourceData.builders);
assert.ok(calls.filter(call => call.report_name === adapter.reports.lots).every(call => call.criteria === recent.window.criteria), 'Lot count and pages must use the same both-date criteria.');
assert.ok(calls.filter(call => call.kind === 'records').every(call => call.field_config === 'custom'));
assert.ok(calls.find(call => call.kind === 'records' && call.report_name === adapter.reports.subdivisions).fields.split(',').includes('Projects_Status'));
assert.ok(['Interest1', 'Escalator', 'Notes'].every(field => calls.find(call => call.kind === 'records' && call.report_name === adapter.reports.lots).fields.split(',').includes(field)));
const history = await adapter.loadHistory(api);
assert.equal(history.length, sourceData.lots.length);
assert.equal(calls.filter(call => call.report_name === adapter.reports.lots && !call.criteria).length, 2);
assert.deepEqual(plain(model.normalize({...recent, lots: history})), plain(model.normalize(sourceData)), 'Swapping recent for complete history preserves normalized report data and financial definitions.');
assert.equal(JSON.stringify(sourceData), snapshot, 'The adapter must not mutate fixture records.');
await tick();
assert.equal(perf.snapshot().requestCount, calls.length, 'Every Insights read must be instrumented by the shared reader.');
assert.equal(JSON.stringify(perf.snapshot()).includes('4410926000009999901'), false);

{
  const {adapter} = runtime(), progress = [];
  const api = {getRecordCount: async () => ({code: 3000, result: {records_count: 2}}), getRecords: async config => config.record_cursor ? {code: 3000, data: [{ID: '2'}]} : {code: 3000, data: [{ID: '1'}], record_cursor: 'next'}};
  await adapter.readAll(api, 'Progress_Report', (...args) => progress.push(args), ['ID']);
  assert.deepEqual(progress, [['Progress_Report', 1, 2], ['Progress_Report', 2, 2]], 'The compatibility wrapper preserves the old callback arguments and avoids a duplicate final notification.');
}
{
  const {adapter} = runtime(); let pages = 0, cancelled = false;
  const api = {getRecordCount: async () => ({code: 3000, result: {records_count: 2}}), getRecords: async () => {pages++; return {code: 3000, data: [{ID: 'first'}], record_cursor: 'next'};}};
  await assert.rejects(adapter.readAll(api, 'Cancelled_Report', () => {cancelled = true;}, ['ID'], {isCancelled: () => cancelled}), error => error.cancelled === true);
  assert.equal(pages, 1, 'Cancellation passed through the wrapper stops before a later cursor page.');
}
{
  const {adapter} = runtime(); let records = 0;
  const api = {getRecordCount: async () => ({code: 3000, result: {records_count: sourceData.lots.length}}), getRecords: async () => {records++; return {code: 3000, data: records === 1 ? sourceData.lots.slice(0, 1) : sourceData.lots};}};
  await assert.rejects(adapter.loadHistory(api), /loaded 1 of 4/);
  assert.equal((await adapter.loadHistory(api)).length, 4, 'A retry obtains a new complete snapshot after a rejected historical read.');
}
{
  const {adapter} = runtime(), denied = {code: 2898, message: 'No fixture permission'};
  await assert.rejects(adapter.loadHistory({getRecordCount: async () => denied, getRecords: async () => assert.fail('Denied history cannot page.')}), error => error.code === '2898' && error.permissionDenied === true && error.response === denied);
}
{
  const {adapter} = runtime();
  const incompleteFields = sourceData.lots.map(({Lot_Size, ...row}) => row);
  await assert.rejects(adapter.loadHistory({getRecordCount: async () => ({code: 3000, result: {records_count: incompleteFields.length}}), getRecords: async () => ({code: 3000, data: incompleteFields})}), /Lot_Size/, 'Report-field validation survives the migration.');
}
{
  const {adapter} = runtime(false);
  await assert.rejects(adapter.readAll(api, 'Missing_Reader', null, ['ID']), /shared Creator data adapter is unavailable/);
}
{
  const source = fs.readFileSync(app + 'sales-app.js', 'utf8');
  const registration = source.split('\n').find(line => line.trim().startsWith("$('audit').addEventListener('click'"));
  assert.ok(registration, 'Execute the actual diagnostic action rather than reproducing its version logic.');
  const footerVersion = html.match(/class="version">([^<]+)<\/span>/)?.[1];
  assert.ok(footerVersion, 'Current widget must expose its release version in the footer.');
  for (const version of [footerVersion, '  v99.88.77  ', '', null]) {
    const elements = {auditText: {}, diagnostics: {showModal() { this.shown = true; }}, audit: {addEventListener(event, handler) { assert.equal(event, 'click'); this.handler = handler; }}};
    const runtimeContext = {environment: 'DEVELOPMENT', appLinkName: 'fixture-app'};
    vm.runInNewContext(registration, {
      document: {querySelector(selector) { assert.equal(selector, '.page-foot .version'); return version === null ? null : {textContent: version}; }},
      $: id => elements[id], LMRuntime: {current: () => runtimeContext}, state: {log: ['fixture diagnostic']}
    });
    elements.audit.handler();
    assert.equal(elements.auditText.textContent.split('\n')[0], 'Land Master Insights ' + (version?.trim() || 'version unavailable'));
    assert.ok(elements.auditText.textContent.includes('fixture-app'));
    assert.ok(elements.auditText.textContent.endsWith('fixture diagnostic'));
    assert.equal(elements.diagnostics.shown, true);
  }
}
{
  const source = fs.readFileSync(app + 'sales-app.js', 'utf8');
  const startup = source.slice(source.indexOf('  let starting = false;'), source.lastIndexOf('  start();'));
  assert.ok(startup.includes('async function start()'), 'Execute the actual post-injection startup.');
  const inline = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline?.includes('function initializeSalesCreator()'));
  const refresh = source.split('\n').find(line => line.trim().startsWith("$('refresh').addEventListener('click'"));
  const pending = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise, resolve, reject}; };
  const flush = async () => { for (let i = 0; i < 24; i++) await Promise.resolve(); };
  function setup(getInitParams, actualAccess = false) {
    const timers = new Map(), events = {native: 0, permissions: 0, nativeAccess:0, connected: 0, reporter: 0, messages: []};
    const elements = {connection: {}, summary: {}, refresh: {addEventListener(event, callback) { assert.equal(event, 'click'); this.callback = callback; }}};
    let nextTimer = 0, isConnected = false;
    const context = vm.createContext({
      Promise, Error, Array,
      location: {hostname: 'creator.zoho.com', href: 'https://example.test/prod/lot-sales-explorer/'}, document: {referrer: ''},
      setTimeout(callback, ms) { const id = ++nextTimer; timers.set(id, {callback, ms}); return id; },
      clearTimeout(id) { timers.delete(id); },
      $: id => elements[id]||(actualAccess?elements[id]={innerHTML:'',open:false}:undefined), log: message => events.messages.push(message), notice: message => events.messages.push(message),
      InsightsShell: {connected: () => isConnected, markConnected() { isConnected = true; events.connected++; }, setAccess(value, message) { if(!actualAccess)assert.equal(value, null); events.messages.push(message); }},
      LMCriticalErrors: {configure() { events.reporter++; }, markReady() {},breadcrumb(){}},
      authorizeAndLoad: async () => { events.permissions++; },
      ZOHO: {CREATOR: {
        init() { assert.fail('SDK1 initialization cannot be used by the SDK2 startup.'); },
        DATA: {getRecords() { assert.fail('Failed initialization cannot read or invent report rows.'); }, getRecordCount() { assert.fail('Failed initialization cannot obtain business counts.'); },invokeCustomApi:async()=>{events.nativeAccess++;return{code:3000,result:{found:true,lotSalesDashboard:true}};}},
        UTIL: {getInitParams() { events.native++; return getInitParams(); }}
      }}
    });
    context.window = context; context.parent = {};
    vm.runInContext(fs.readFileSync(app + 'runtime-context.js', 'utf8'), context);
    if(actualAccess){
      context.state={generation:0};context.hideSubdivisionCard=()=>{};context.enforceRevenueAccess=()=>{};context.load=async()=>{events.permissions++;};
      vm.runInContext(fs.readFileSync(app+'insights-access.js','utf8'),context);
      vm.runInContext(source.slice(source.indexOf('  async function authorizeAndLoad()'),source.indexOf('  let starting = false;')),context);
    }
    vm.runInContext(inline, context);
    vm.runInContext(startup, context);
    vm.runInContext(refresh, context);
    return {context, timers, events, elements, timeout() {
      assert.equal(timers.size, 1);
      const [id, timer] = [...timers][0]; assert.equal(timer.ms, 5000);
      timers.delete(id); timer.callback();
    }};
  }
  const params = {envUrlFragment: 'environment/development', loginUser: 'fixture_viewer', appLinkName: 'fixture-app'};
  for (const failedResponse of [
    {code:3000,status:'failure',result:{found:true,lotSalesDashboard:true}},
    {code:3000,result:{code:3000,success:false,found:true,lotSalesDashboard:true}},
    {code:3000,result:{output:JSON.stringify({found:true,lotSalesDashboard:true}),response:{code:2898,error:'Denied'}}},
    {code:3000,result:{found:true,lotSalesDashboard:true},details:[{code:2898,error:'Denied'}]},
    {code:3000,result:{found:true,lotSalesDashboard:true},response:JSON.stringify([{code:3000,status:' FAILURE '}])},
    {code:3000,result:{found:true,lotSalesDashboard:true},data:{hasRow:false,lotSalesDashboard:false}},
    {result:{found:true,lotSalesDashboard:true}}
  ]) {
    const r=setup(()=>Promise.resolve(params),true);let response=failedResponse;
    r.context.ZOHO.CREATOR.DATA.invokeCustomApi=async()=>{r.events.nativeAccess++;return response;};
    await r.context.start();
    assert.equal(r.events.nativeAccess,1);assert.equal(r.events.permissions,0,'A grant-looking failed native envelope cannot start either report model.');
    assert.equal(r.context.state.permissions,null);assert.equal(r.context.state.loaded,false);
    assert.equal(r.elements.connection.textContent,'Access unavailable');assert.equal(r.elements.refresh.disabled,false);
    response={code:3000,result:{found:true,lotSalesDashboard:true}};
    r.elements.refresh.callback();await flush();
    assert.equal(r.events.nativeAccess,2,'Refresh must verify permissions again.');assert.equal(r.events.native,1,'A successful actor handshake remains reusable.');
    assert.equal(r.events.permissions,1,'Only a newly confirmed authorization can load the model.');assert.equal(r.context.state.permissions.lotSalesDashboard,true);
  }
  {
    const r = setup(() => Promise.resolve(params)); await r.context.start();
    assert.equal(r.events.native, 1); assert.equal(r.events.permissions, 1); assert.equal(r.events.connected, 1); assert.equal(r.events.reporter, 1);
    assert.equal(r.context.LMRuntime.current().environment, 'DEVELOPMENT');
    assert.equal(r.context.LMRuntime.current().user, 'fixture_viewer');
    assert.equal(r.elements.refresh.disabled, false); assert.equal(r.timers.size, 0);
    await r.context.initializeSalesCreator(); assert.equal(r.events.native, 1, 'Settled successful native context is reusable.');
  }
  {
    const late = pending(); let getter = () => late.promise;
    const r = setup(() => getter()), starting = r.context.start(); await flush();
    await r.context.start(); assert.equal(r.events.native, 1, 'Concurrent startup must not duplicate its handshake or business initialization.');
    r.timeout(); await starting;
    assert.equal(r.events.permissions, 0); assert.equal(r.events.connected, 0); assert.equal(r.events.reporter, 0);
    assert.equal(r.elements.connection.textContent, 'Not connected'); assert.equal(r.elements.refresh.disabled, false);
    assert(r.events.messages.some(message => /timed out/.test(message)));
    assert.equal(r.context.LMRuntime.current().environment, 'UNKNOWN');
    getter = () => Promise.resolve(params); r.elements.refresh.callback(); await flush();
    assert.equal(r.events.native, 2, 'Refresh begins a fresh native handshake after failure.');
    assert.equal(r.events.permissions, 1); assert.equal(r.events.connected, 1); assert.equal(r.timers.size, 0);
    late.resolve({envUrlFragment: '', loginUser: 'late_production_actor', appLinkName: 'stale-app'}); await flush();
    assert.equal(r.context.LMRuntime.current().environment, 'DEVELOPMENT', 'Late native context cannot overwrite the successful retry.');
    assert.equal(r.context.LMRuntime.current().user, 'fixture_viewer');
    assert.equal(r.events.permissions, 1, 'Late initialization must not restart business reads.');
  }
  for (const failed of [() => Promise.reject(new Error('native offline')), () => { throw new Error('native thrown'); }, () => Promise.resolve(null), () => Promise.resolve({envUrlFragment: 'unknown'})]) {
    let getter = failed; const r = setup(() => getter()); await r.context.start();
    assert.equal(r.events.permissions, 0); assert.equal(r.events.connected, 0); assert.equal(r.timers.size, 0);
    assert.equal(r.elements.refresh.disabled, false); assert.equal(r.context.LMRuntime.current().environment, 'UNKNOWN');
    getter = () => Promise.resolve(params); r.elements.refresh.callback(); await flush();
    assert.equal(r.events.native, 2); assert.equal(r.events.permissions, 1); assert.equal(r.events.connected, 1);
  }
  for(const invalid of [{},[],{envUrlFragment:''},{envUrlFragment:'',loginUser:{}},{envUrlFragment:'',loginUser:[]},{envUrlFragment:'',loginUser:0},{envUrlFragment:'',loginUser:false}]) {
    let getter=()=>Promise.resolve(invalid);const r=setup(()=>getter(),true);await r.context.start();
    assert.equal(r.events.nativeAccess,0,'actual Insights access guard must block native API calls for missing or malformed actor');assert.equal(r.events.permissions,0,'actual Insights authorization cannot start reports for missing or malformed actor');assert.equal(r.elements.refresh.disabled,false);
    getter=()=>Promise.resolve(params);r.elements.refresh.callback();await flush();assert.equal(r.events.native,2);assert.equal(r.events.permissions,1);assert.equal(r.events.connected,1);
  }
  for(const actor of [{},[],7,false]) {const r=setup(()=>Promise.resolve({envUrlFragment:''}),true);r.context.ZOHO.CREATOR.loginUser=actor;await r.context.start();assert.equal(r.events.nativeAccess,0);assert.equal(r.events.permissions,0);assert.equal(r.events.connected,0);}
  const inherited=setup(()=>Promise.resolve({envUrlFragment:''}),true);inherited.context.ZOHO.CREATOR.loginUser='genuine-global-actor';await inherited.context.start();assert.equal(inherited.events.nativeAccess,1);assert.equal(inherited.events.permissions,1);assert.equal(inherited.events.connected,1);assert.equal(inherited.context.LMRuntime.current().user,'genuine-global-actor');
}
console.log('PASS: Insights canonical data/history/error contracts, dynamic diagnostics, and bounded native startup with fail-closed late-context guards and fresh retry.');
