import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../shared/creator-data.js', import.meta.url), 'utf8');
const widgets = ['budget-manager', 'land-master', 'lot-sales-explorer'];
for (const widget of widgets) assert.equal(fs.readFileSync(new URL(`../widgets/${widget}/src/app/creator-data.js`, import.meta.url), 'utf8'), source, `${widget} must use the exact shared adapter.`);
const count = value => ({code: 3000, result: {records_count: value}});
const page = (data, cursor) => ({code: 3000, data, ...(cursor ? {record_cursor: cursor} : {})});
const row = (ID, extra = {}) => ({ID, ...extra});
const tick = () => new Promise(resolve => setImmediate(resolve));
function gate() { let resolve, reject; const promise = new Promise((yes, no) => {resolve = yes; reject = no;}); return {promise, resolve, reject}; }
async function until(predicate, message) { for (let i = 0; i < 100; i++) {if (predicate()) return; await tick();} assert.fail(message); }
function harness(identity = {environment: 'DEVELOPMENT', user: 'fixture_user', appLinkName: 'land-master'}) {
  const state = {identity};
  const context = vm.createContext({LMRuntime: {current: () => state.identity}});
  vm.runInContext(source, context);
  return {data: context.LMData, perf: context.LMPerf, state};
}
function scripted(expected, responses) {
  const calls = [], api = {
    async getRecordCount(config) {calls.push({kind: 'count', config}); return count(expected);},
    async getRecords(config) {
      calls.push({kind: 'records', config});
      const response = responses.shift();
      if (response instanceof Error) throw response;
      assert.notEqual(response, undefined, 'Unexpected additional records request.');
      return response;
    }
  };
  return {api, calls};
}
function options(api, extra = {}) {return {api, reportName: 'Fixture_Report', ...extra};}
function plain(value) {return JSON.parse(JSON.stringify(value));}

{
  const {data, perf} = harness(), first = '4410926000009999901', second = '4410926000009999902';
  const api = scripted('2', [page([row(first)], 'next-page'), {code: 3000, data: [row(second)], headers: {record_cursor: ''}}]);
  const progress = [];
  const result = await data.readAll(options(api.api, {fields: ['ID', 'Name'], criteria: '(Budget == 4410926000004465004)', onProgress: value => progress.push(plain(value))}));
  assert.deepEqual(plain(result).map(value => value.ID), [first, second], 'IDs above JS safe integer range must remain distinct exact strings.');
  assert.equal(typeof result[0].ID, 'string');
  assert.equal(api.calls[0].config.criteria, '(Budget == 4410926000004465004)');
  assert.equal(api.calls[1].config.field_config, 'custom');
  assert.equal(api.calls[1].config.fields, 'ID,Name');
  assert.equal(api.calls[1].config.max_records, 1000);
  assert.equal(api.calls[2].config.record_cursor, 'next-page');
  assert.deepEqual(progress.map(value => [value.count, value.expected, value.done]), [[1, 2, false], [2, 2, false], [2, 2, true]]);
  await tick();
  assert.equal(perf.snapshot().requestCount, 3);
  assert.ok(perf.snapshot().responseBytes > 0);
  assert.equal(JSON.stringify(perf.snapshot()).includes(first), false, 'Telemetry must not publish record data or private IDs.');
}
for (const responses of [
  [page([row('1')])],
  [page([row('1'), row('2'), row('3')])]
]) {
  const {data} = harness(), api = scripted(2, responses);
  await assert.rejects(data.readAll(options(api.api)), /loaded .* of 2 records/);
}
{
  const {data} = harness(), api = scripted(2, [page([row('1')], 'same'), page([row('2')], 'same')]);
  await assert.rejects(data.readAll(options(api.api)), /repeated pagination cursor/);
}
{
  const {data} = harness(), api = scripted(2, [page([row('4410926000009999901')], 'next'), page([row('4410926000009999901')])]);
  await assert.rejects(data.readAll(options(api.api)), /duplicate record ID/);
}
for (const invalid of [null, {}, row(''), row('   '), row(Number.MAX_SAFE_INTEGER + 1)]) {
  const {data} = harness(), api = scripted(1, [page([invalid])]);
  await assert.rejects(data.readAll(options(api.api)), /missing, unsafe, or duplicate record ID/);
}
{
  const {data} = harness(), api = scripted('0', []);
  assert.deepEqual(plain(await data.readAll(options(api.api))), []);
  assert.deepEqual(api.calls.map(call => call.kind), ['count'], 'Confirmed zero records must not issue a pagination read.');
}
for (const invalid of [null, '', ' ', false, true, undefined, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, 'not-a-count']) {
  const {data} = harness();
  let records = 0;
  await assert.rejects(data.readAll(options({getRecordCount: async () => count(invalid), getRecords: async () => {records++; return page([]);}})), /readable response/);
  assert.equal(records, 0, 'Malformed count cannot become a successful empty snapshot.');
}
for (const phase of ['count', 'records']) {
  const {data} = harness();
  const denied = {code: 2898, message: 'Permission denied', permissionDenied: true};
  const api = {getRecordCount: async () => phase === 'count' ? denied : count(1), getRecords: async () => denied};
  await assert.rejects(data.readAll(options(api)), error => error.code === '2898' && error.permissionDenied === true && error.response === denied);
}
{
  const {data} = harness(), raw = Object.assign(new Error('Read refused'), {code: 'fixture-code', permissionDenied: true});
  await assert.rejects(data.readAll(options({getRecordCount: async () => count(1), getRecords: async () => {throw raw;}})), error => error.code === 'fixture-code' && error.permissionDenied === true && error.cause === raw);
}
for (const terminal of ['3100', '9280']) for (const thrown of [false, true]) {
  const {data} = harness();
  const raw = Object.assign(new Error('No more records'), {code: terminal});
  const api = {getRecordCount: async () => count(1), getRecords: async () => {if (thrown) throw raw; return raw;}};
  await assert.rejects(data.readAll(options(api)), error => error.code === terminal && /loaded 0 of 1/.test(error.message), 'No-data code with positive count is incomplete, never an empty success.');
}

{
  const {data, perf} = harness();
  let active = 0, peak = 0;
  const started = [], releases = [];
  const api = {
    async getRecordCount() {return count(1);},
    async getRecords(config) {
      active++; peak = Math.max(peak, active); started.push(config.report_name);
      const release = gate(); releases.push(release);
      await release.promise; active--;
      return page([row(config.report_name)]);
    }
  };
  const pending = Array.from({length: 8}, (_, i) => data.readAll(options(api, {reportName: `Bounded_${i}`})));
  await until(() => started.length === 3, 'The first three reads did not start.');
  await tick(); assert.equal(started.length, 3, 'The fourth SDK read must wait for capacity.');
  for (let offset = 0; offset < 8; offset += 3) {
    releases.slice(offset, offset + 3).forEach(release => release.resolve());
    await until(() => started.length === Math.min(offset + 6, 8), 'Queued reads did not resume after earlier reads completed.');
  }
  await Promise.all(pending); await tick();
  assert.equal(peak, 3); assert.equal(perf.snapshot().active, 0); assert.equal(perf.snapshot().queued, 0);
}
{
  const {data} = harness(), release = gate(); let counts = 0, records = 0;
  const api = {getRecordCount: async () => {counts++; await release.promise; return count(1);}, getRecords: async () => {records++; return page([row('same')]);}};
  const first = data.readAll(options(api)), second = data.readAll(options(api));
  assert.equal(first, second, 'Concurrent identical uncancelled reads share the exact in-flight promise.');
  release.resolve(); await Promise.all([first, second]);
  assert.equal(counts, 1); assert.equal(records, 1);
}
{
  const {data, state} = harness(); let counts = 0;
  const api = {getRecordCount: async () => {counts++; return count(1);}, getRecords: async () => page([row(`${state.identity.environment}:${state.identity.user}`)])};
  const config = options(api, {ttlMs: 60000});
  await data.readAll(config); await data.readAll(config); assert.equal(counts, 1);
  state.identity = {...state.identity, user: 'fixture_second'};
  assert.equal((await data.readAll(config))[0].ID, 'DEVELOPMENT:fixture_second'); assert.equal(counts, 2);
  state.identity = {...state.identity, environment: 'PRODUCTION'};
  assert.equal((await data.readAll(config))[0].ID, 'PRODUCTION:fixture_second'); assert.equal(counts, 3);
  state.identity = {...state.identity, appLinkName: 'other-app'};
  await data.readAll(config); assert.equal(counts, 4);
  await data.readAll({...config, fresh: true}); assert.equal(counts, 5, 'Fresh reads bypass cached results.');
  await data.readAll({...config, fields: ['ID']}); assert.equal(counts, 6, 'Different field projections must not share cached rows.');
  await data.readAll({...config, criteria: '(Status == "Active")'}); assert.equal(counts, 7, 'Different criteria must not share cached rows.');
}
{
  const {data} = harness(), firstPage = gate(); let counts = 0, records = 0, saved = 'before-write';
  const api = {getRecordCount: async () => {counts++; return count(1);}, getRecords: async () => {records++; const captured = saved; if (records === 1) {await firstPage.promise;} return page([row(captured)]);}};
  const config = options(api, {ttlMs: 60000});
  const oldRead = data.readAll(config);
  await until(() => records === 1, 'Initial read did not reach pagination.');
  data.invalidate(); // The caller invalidates before its mutation starts.
  saved = 'after-write';
  const freshRead = data.readAll(config);
  assert.notEqual(oldRead, freshRead, 'Invalidation must detach old in-flight reads.');
  assert.equal((await freshRead)[0].ID, 'after-write');
  firstPage.resolve(); await oldRead;
  assert.equal((await data.readAll(config))[0].ID, 'after-write', 'An older completion cannot seed or replace the post-mutation cache.');
  assert.equal(counts, 2);
}
{
  const {data} = harness(); let counts = 0;
  const api = {getRecordCount: async () => {counts++; return count(1);}, getRecords: async config => page([row(config.report_name)])};
  await data.readAll(options(api, {reportName: 'Keep', ttlMs: 60000}));
  await data.readAll(options(api, {reportName: 'Drop', ttlMs: 60000}));
  data.invalidate(config => config.reportName === 'Drop');
  await data.readAll(options(api, {reportName: 'Keep', ttlMs: 60000}));
  await data.readAll(options(api, {reportName: 'Drop', ttlMs: 60000}));
  assert.equal(counts, 3, 'Targeted invalidation preserves unrelated cached reports.');
}
{
  const {data} = harness(), release = gate(); let cancelled = false, counts = 0;
  const blockers = Array.from({length: 3}, () => data.request('blocker', () => release.promise));
  const api = {getRecordCount: async () => {counts++; return count(0);}, getRecords: async () => page([])};
  const pending = data.readAll(options(api, {isCancelled: () => cancelled}));
  const rejected = assert.rejects(pending, error => error.cancelled === true && /superseded/.test(error.message));
  cancelled = true; release.resolve(); await Promise.all(blockers); await rejected;
  assert.equal(counts, 0, 'A cancelled queued request must not call the Creator SDK.');
  cancelled = false;
  assert.deepEqual(plain(await data.readAll(options(api))), [], 'A new read after cancellation can proceed.');
}
{
  const {data} = harness(), release = gate(); let cancelled = false, records = 0;
  const api = {getRecordCount: async () => count(1), getRecords: async () => {records++; if (records === 1) await release.promise; return page([row('allowed')]);}};
  const pending = data.readAll(options(api, {isCancelled: () => cancelled, ttlMs: 60000}));
  const rejected = assert.rejects(pending, error => error.cancelled === true);
  await until(() => records === 1, 'Cancellable read did not start.');
  cancelled = true; release.resolve(); await rejected;
  assert.equal((await data.readAll(options(api, {ttlMs: 60000})))[0].ID, 'allowed', 'Cancellation must not leave a rejected in-flight promise or cache an abandoned response.');
  assert.equal(records, 2);
  await assert.rejects(data.readAll(options(api, {ttlMs: 60000, isCancelled: () => true})), error => error.cancelled === true, 'A cached result must also honor cancellation.');
}
{
  const {data} = harness(); let attempts = 0;
  const api = {getRecordCount: async () => count(1), getRecords: async () => {attempts++; if (attempts === 1) throw Object.assign(new Error('Temporary failure'), {code: 500}); return page([row('retry-success')]);}};
  await assert.rejects(data.readAll(options(api)), error => error.code === '500');
  assert.equal((await data.readAll(options(api)))[0].ID, 'retry-success', 'Rejected reads must be removed from in-flight deduplication before retry.');
  assert.equal(attempts, 2);
}
console.log('PASS: Creator adapter exact IDs and pagination, count/permission failures, three-read concurrency, deduplication, identity/environment caches, mutation generation, cancellation, retry, private telemetry, and identical widget copies.');
