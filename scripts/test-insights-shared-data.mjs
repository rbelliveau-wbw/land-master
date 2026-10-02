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
console.log('PASS: Insights canonical reads preserve data/history/error contracts; diagnostics use the current runtime footer version.');
