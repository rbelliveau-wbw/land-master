import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../shared/creator-data.js', import.meta.url), 'utf8');
const widgets = ['budget-manager', 'land-master', 'lot-sales-explorer', 'milestone-gantt'];
const canonicalOnly = process.argv.includes('--canonical-only');
if (!canonicalOnly) for (const widget of widgets) assert.equal(fs.readFileSync(new URL(`../widgets/${widget}/src/app/creator-data.js`, import.meta.url), 'utf8'), source, `${widget} must use the exact shared adapter.`);
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
for (const phase of ['count', 'records']) for (const raw of [{code: 2898}, {code: '500', description: 'Temporary SDK failure'}, Object.assign(new Error('Read refused'), {code: 'fixture-code', permissionDenied: true})]) {
  const {data} = harness();
  let attempts = 0, records = 0;
  const api = {
    getRecordCount: async () => {if (phase === 'count' && attempts++ === 0) throw raw; return count(1);},
    getRecords: async () => {records++; if (phase === 'records' && attempts++ === 0) throw raw; return page([row('retry-after-rejection')]);}
  };
  await assert.rejects(data.readAll(options(api)), error => error !== raw && error.code === String(raw.code) && error.response === raw && error.cause === raw && error.permissionDenied === (String(raw.code) === '2898' || !!raw.permissionDenied) && typeof error.message === 'string' && error.message.length > 0);
  if (phase === 'count') assert.equal(records, 0, 'A rejected count cannot start record paging.');
  assert.equal((await data.readAll(options(api)))[0].ID, 'retry-after-rejection', 'Rejected count/page failures detach the failed in-flight promise so a new read can retry.');
}
for (const phase of ['count', 'records']) {
  const {data} = harness(), raw = null;
  const api = {getRecordCount: async () => {if (phase === 'count') throw raw; return count(1);}, getRecords: async () => {throw raw;}};
  await assert.rejects(data.readAll(options(api)), error => error.response === raw && error.cause === raw && /readable response/.test(error.message), 'Even null SDK rejections must become a useful failed-load message.');
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
  const window = {location: {href: 'https://example.test/prod/land-master/', ancestorOrigins: []}}, context = vm.createContext({window, document: {referrer: ''}, Promise});
  vm.runInContext(fs.readFileSync(new URL('../widgets/land-master/src/app/runtime-context.js', import.meta.url), 'utf8'), context);
  vm.runInContext(source, context);
  let counts = 0;
  const api = {getRecordCount: async () => {counts++; return count(1);}, getRecords: async () => page([row(window.LMRuntime.current().appLinkName)])};
  const config = options(api, {ttlMs: 60000});
  window.LMRuntime.apply({envUrlFragment: '', loginUser: 'actor', appLinkName: 'first-app'});
  assert.equal((await window.LMData.readAll(config))[0].ID, 'first-app');
  window.LMRuntime.apply({envUrlFragment: '', loginUser: 'actor', appLinkName: 'second-app'});
  assert.equal((await window.LMData.readAll(config))[0].ID, 'second-app', 'The actual runtime must expose the app key used by the canonical cache.');
  await window.LMData.readAll(config);
  assert.equal(counts, 2, 'A cached report stays separated by authenticated app, not just stubbed test context.');
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
{
  const {data, perf} = harness(), a = gate(), b = gate(), counts = {}, records = {};
  const api = {
    getRecordCount: async config => {counts[config.report_name] = (counts[config.report_name] || 0) + 1; return count(1);},
    getRecords: async config => {
      const report = config.report_name, attempt = records[report] = (records[report] || 0) + 1;
      if (report === 'A' && attempt === 1) {await a.promise; return page([row('old-A')]);}
      if (report === 'B') await b.promise;
      return page([row(`${report}-${attempt}`)]);
    }
  };
  const config = reportName => options(api, {reportName, ttlMs: 60000});
  await data.readAll(config('Warm'));
  const oldA = data.readAll(config('A')), pendingB = data.readAll(config('B'));
  await until(() => records.A === 1 && records.B === 1, 'Both report reads must be in flight before scope invalidation.');
  data.invalidate(read => read.reportName === 'A');
  assert.equal(data.readAll(config('B')), pendingB, 'Invalidating A must preserve the exact unrelated B in-flight promise.');
  assert.equal((await data.readAll(config('Warm')))[0].ID, 'Warm-1', 'Unrelated warm cache remains reusable during A invalidation.');
  const newA = data.readAll(config('A'));
  assert.notEqual(newA, oldA);
  assert.equal((await newA)[0].ID, 'A-2');
  a.resolve(); b.resolve();
  assert.equal((await oldA)[0].ID, 'old-A', 'Invalidation preserves existing callers unless their controller cancels them.');
  assert.equal((await pendingB)[0].ID, 'B-1');
  assert.equal((await data.readAll(config('A')))[0].ID, 'A-2', 'Late old A cannot replace newer authoritative rows.');
  assert.equal((await data.readAll(config('B')))[0].ID, 'B-1', 'B may still seed its cache after unrelated invalidation.');
  assert.deepEqual(counts, {Warm: 1, A: 2, B: 1});
  assert.equal(perf.snapshot().pendingReads, 0);
}
{
  const {data, perf} = harness(), old = gate(); let records = 0, saved = 'before-write';
  const api = {getRecordCount: async () => count(1), getRecords: async () => {records++; const captured = saved; if (records === 1) await old.promise; return page([row(captured)]);}};
  const config = options(api, {ttlMs: 60000, criteria: '(Project == 4410926000004465004)'});
  const before = data.readAll(config);
  await until(() => records === 1, 'Pre-mutation scoped read must start.');
  data.invalidate(read => read.reportName === 'Fixture_Report' && read.criteria === config.criteria);
  saved = 'partially-applied-write';
  await assert.rejects(Promise.reject(Object.assign(new Error('Second write failed'), {code: '2945'})), /Second write failed/);
  old.resolve(); assert.equal((await before)[0].ID, 'before-write');
  assert.equal(perf.snapshot().cachedReads, 0, 'Even after an ambiguous write failure, the already-invalidated pre-write token stays invalid.');
  assert.equal((await data.readAll(config))[0].ID, 'partially-applied-write', 'A rejected/partial write must not resurrect the invalidated pre-write read cache.');
  assert.equal(records, 2, 'Invalidation remains in force without a successful-write callback.');
}
{
  const {data} = harness(), old = gate(); let records = 0, counts = 0;
  const api = {getRecordCount: async () => {counts++; return count(1);}, getRecords: async () => {const attempt = ++records; if (attempt === 1) await old.promise; return page([row(`version-${attempt}`)]);}};
  const config = options(api, {ttlMs: 60000});
  const prior = data.readAll(config);
  await until(() => records === 1, 'Old read did not start before fresh read.');
  const fresh = data.readAll({...config, fresh: true});
  assert.notEqual(fresh, prior, 'Fresh must bypass an existing in-flight promise.');
  assert.equal((await fresh)[0].ID, 'version-2');
  old.resolve(); assert.equal((await prior)[0].ID, 'version-1');
  assert.equal((await data.readAll(config))[0].ID, 'version-2', 'Without explicit invalidation, a late older read still cannot overwrite fresh cached rows.');
  assert.equal((await data.readAll({...config, fresh: true}))[0].ID, 'version-3', 'Fresh also bypasses already-cached rows.');
  assert.equal(counts, 3);
}
{
  const {data} = harness(), old = gate(), newer = gate(); let records = 0;
  const api = {getRecordCount: async () => count(1), getRecords: async () => {const attempt = ++records; await (attempt === 1 ? old : newer).promise; return page([row(`version-${attempt}`)]);}};
  const config = options(api, {ttlMs: 60000}), prior = data.readAll(config);
  await until(() => records === 1, 'Old read did not start.');
  const fresh = data.readAll({...config, fresh: true});
  await until(() => records === 2, 'New fresh read did not start.');
  old.resolve(); await prior;
  assert.equal(data.readAll(config), fresh, 'Old settlement cannot detach the newer fresh in-flight entry or expose its stale result.');
  newer.resolve(); assert.equal((await fresh)[0].ID, 'version-2');
  assert.equal((await data.readAll(config))[0].ID, 'version-2');
  assert.equal(records, 2);
}
{
  const {data} = harness(), release = gate(); let records = 0;
  const api = {getRecordCount: async () => count(1), getRecords: async () => {const attempt = ++records; if (attempt === 1) await release.promise; return page([row(`fresh-${attempt}`)]);}};
  const config = options(api, {ttlMs: 60000}), pending = data.readAll({...config, fresh: true, isCancelled: () => false});
  await until(() => records === 1, 'Fresh cancellable read must be tracked while pending.');
  data.invalidate(read => read.reportName === 'Fixture_Report');
  release.resolve(); assert.equal((await pending)[0].ID, 'fresh-1');
  assert.equal((await data.readAll(config))[0].ID, 'fresh-2', 'Fresh/cancellable reads also cannot cache after matching invalidation.');
}
{
  const {data} = harness(); let counts = 0;
  const api = {getRecordCount: async () => {counts++; return count(1);}, getRecords: async config => page([row(`${config.criteria}:${config.fields || 'all'}`)])};
  const config = extra => options(api, {reportName: 'Scoped', ttlMs: 60000, ...extra});
  const alpha = config({criteria: 'alpha', fields: ['ID']}), alphaProjection = config({criteria: 'alpha', fields: ['ID', 'Name'], cacheKey: 'other-view'}), beta = config({criteria: 'beta', fields: ['ID']});
  await Promise.all([data.readAll(alpha), data.readAll(alphaProjection), data.readAll(beta)]);
  data.invalidate(read => read.reportName === 'Scoped' && read.criteria === 'alpha');
  await data.readAll(beta); assert.equal(counts, 3, 'Criteria-scoped invalidation must preserve another query on the same report.');
  await data.readAll(alpha); await data.readAll(alphaProjection); assert.equal(counts, 5, 'Both projections/custom-key variants of the affected criteria are invalidated.');
  data.invalidate(read => read.reportName === 'Scoped');
  await Promise.all([data.readAll(alpha), data.readAll(alphaProjection), data.readAll(beta)]);
  assert.equal(counts, 8, 'Report-wide invalidation covers all criteria and projection variants.');
}
{
  const {data} = harness(), release = gate(); let records = 0;
  const api = {getRecordCount: async () => count(1), getRecords: async config => {records++; if (records === 1) await release.promise; return page([row(config.fields)]);}};
  const original = {api, report_name: 'Alias_Report', criteria: 'original', fields: ['ID'], ttlMs: 60000};
  const pending = data.readAll(original);
  await until(() => records === 1, 'Snapshot options read did not start.');
  original.criteria = 'changed'; original.fields.push('Name');
  let matched = 0;
  data.invalidate(read => {if (read.reportName !== 'Alias_Report' || read.criteria !== 'original') return false; assert.deepEqual(plain(read.fields), ['ID']); matched++; return true;});
  assert.equal(matched, 1, 'Predicates receive normalized report names and stable per-read options, not later caller mutations.');
  release.resolve(); await pending;
  await data.readAll({api, report_name: 'Alias_Report', criteria: 'original', fields: ['ID'], ttlMs: 60000});
  assert.equal(records, 2, 'The correctly matched snapshot cannot populate stale cache.');
}
{
  const window = {location: {href: 'https://example.test/prod/land-master/', ancestorOrigins: []}}, context = vm.createContext({window, document: {referrer: ''}, Promise});
  vm.runInContext(fs.readFileSync(new URL('../widgets/land-master/src/app/runtime-context.js', import.meta.url), 'utf8'), context);
  vm.runInContext(source, context);
  const old = gate(); let records = 0;
  const apply = (user, envUrlFragment = '', appLinkName = 'first-app') => window.LMRuntime.apply({envUrlFragment, loginUser: user, appLinkName});
  const api = {getRecordCount: async () => count(1), getRecords: async () => {const attempt = ++records, identity = window.LMRuntime.current(); const id = `${identity.environment}:${identity.user}:${identity.appLinkName}`; if (attempt === 1) await old.promise; return page([row(id)]);}};
  const config = options(api, {ttlMs: 60000});
  apply('fixture-A'); const prior = window.LMData.readAll(config);
  await until(() => records === 1, 'Authenticated A read did not start.');
  apply('fixture-B'); assert.equal((await window.LMData.readAll(config))[0].ID, 'PRODUCTION:fixture-B:first-app');
  window.LMData.invalidate((read, key) => read.reportName === 'Fixture_Report' && JSON.parse(key)[0] === 'PRODUCTION|fixture-A|first-app');
  await window.LMData.readAll(config); assert.equal(records, 2, 'Targeting the A query key must preserve B cache under the actual runtime.');
  old.resolve(); assert.equal((await prior)[0].ID, 'PRODUCTION:fixture-A:first-app');
  apply('fixture-A'); await window.LMData.readAll(config); assert.equal(records, 3, 'A stale completion cannot resurrect its isolated invalidated cache.');
  apply('fixture-A', 'environment/development/'); await window.LMData.readAll(config); assert.equal(records, 4, 'Same actor/report in Development must not reuse Production data.');
  apply('fixture-A', '', 'second-app'); await window.LMData.readAll(config); assert.equal(records, 5, 'Same actor/report in another authenticated app remains separate.');
}
{
  const {data} = harness(), release = gate(); let counts = 0, records = 0;
  const api = {getRecordCount: async () => {counts++; return count(1);}, getRecords: async config => {records++; if (config.report_name === 'Hold') await release.promise; return page([row(config.report_name)]);}};
  const config = reportName => options(api, {reportName, ttlMs: 60000});
  await data.readAll(config('Warm')); const pending = data.readAll(config('Hold'));
  await until(() => records === 2, 'Throwing-predicate pending read did not start.');
  assert.throws(() => data.invalidate(read => {if (read.reportName === 'Hold') throw new Error('Bad scope'); return true;}), /Bad scope/);
  assert.equal(data.readAll(config('Hold')), pending, 'A failed predicate cannot partly detach active work.');
  await data.readAll(config('Warm')); assert.equal(counts, 2, 'A failed predicate cannot partly remove a matched warm cache.');
  data.invalidate(() => false); assert.equal(data.readAll(config('Hold')), pending, 'A no-match scope preserves active work.');
  release.resolve(); await pending;
  await data.readAll(config('Hold')); assert.equal(counts, 2, 'Failed/no-match invalidation cannot disable valid pending cache writes.');
}
{
  const {data, perf} = harness(), a = gate(), b = gate(); let counts = 0;
  const api = {getRecordCount: async () => {counts++; return count(1);}, getRecords: async config => {if (config.report_name === 'A') await a.promise; if (config.report_name === 'B') await b.promise; return page([row(config.report_name)]);}};
  const config = reportName => options(api, {reportName, ttlMs: 60000});
  await data.readAll(config('Warm')); const pendingA = data.readAll(config('A')), pendingB = data.readAll(config('B'));
  await until(() => perf.snapshot().active === 2 && perf.snapshot().pendingReads === 2, 'Global-invalidation active reads did not start.');
  data.invalidate(); a.resolve(); b.resolve(); await Promise.all([pendingA, pendingB]);
  assert.equal(perf.snapshot().cachedReads, 0, 'Global invalidation removes every warm snapshot and blocks all pending cache writes.');
  await Promise.all([data.readAll(config('Warm')), data.readAll(config('A')), data.readAll(config('B'))]);
  assert.equal(counts, 6);
}
{
  const {data, perf} = harness(); let counts = 0, records = 0;
  const api = {getRecordCount: async () => {counts++; return count(2);}, getRecords: async () => {records++; return records === 1 ? page([row('partial')]) : page([row('complete-1'), row('complete-2')]);}};
  const config = options(api, {ttlMs: 60000});
  await assert.rejects(data.readAll(config), /loaded 1 of 2/);
  assert.equal(perf.snapshot().cachedReads, 0, 'Incomplete reads never write a positive-TTL test cache.');
  assert.equal(perf.snapshot().pendingReads, 0);
  assert.deepEqual(plain(await data.readAll(config)).map(value => value.ID), ['complete-1', 'complete-2']);
  assert.equal(counts, 2);
}
{
  const {data, perf} = harness(); let counts = 0;
  const api = {getRecordCount: async () => {counts++; return count(0);}, getRecords: async () => page([])};
  for (let cycle = 0; cycle < 50; cycle++) {
    await data.readAll(options(api, {criteria: `fixture-${cycle}`}));
    data.invalidate(read => read.criteria === `fixture-${cycle}`);
  }
  await data.readAll(options(api)); await data.readAll(options(api));
  assert.equal(counts, 52, 'Default TTL zero must continue fetching native data on every completed read.');
  assert.equal(perf.snapshot().pendingReads, 0, 'Settled non-TTL reads must not retain per-query tokens.');
  assert.equal(perf.snapshot().inFlightReads, 0);
  assert.equal(perf.snapshot().cachedReads, 0);
}
console.log(`PASS: Creator adapter exact IDs/pagination/errors, bounded concurrency, scoped/global invalidation, unrelated dedup/cache preservation, fresh ordering, actual-runtime actor isolation, partial writes, cancellation/retry, token cleanup, private telemetry${canonicalOnly ? ' (canonical only; widget copy sync pending)' : ', and identical widget copies'}.`);
