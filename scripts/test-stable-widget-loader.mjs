import assert from 'node:assert/strict';
import vm from 'node:vm';
import {stableWidgetLoader} from './stable-widget-loader.mjs';

const documentHtml = '<html><head><script src="https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js"></script><script src="./creator-data.js"></script></head><body>Ready</body></html>';
const response = () => ({ok: true, text: async () => documentHtml});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return {promise, resolve, reject};
};
async function flush() { for (let i = 0; i < 24; i++) await Promise.resolve(); }

function harness(params, {framed = true, routed = true, handshake, fetchImpl, abortable = true} = {}) {
  const state = {fetchCalls: [], handshakeCalls: 0, writes: [], opens: 0, errors: [], aborts: 0};
  const timers = new Map();
  let nextTimer = 0;
  const html = stableWidgetLoader('budget-manager', 'test', routed);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const document = {
    createElement: () => ({}),
    head: {appendChild: sdk => { state.sdk = sdk; }},
    getElementById: () => ({set textContent(value) { state.error = value; }}),
    open() { state.opens++; }, close() {}, write(value) { state.writes.push(value); }
  };
  const window = {}; window.parent = framed ? {} : window;
  const context = {
    document, window,
    location: {href: 'https://rbelliveau-wbw.github.io/land-master/prod/budget-manager/'},
    URL, Date, Promise,
    setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, {fn, ms}); return id; },
    clearTimeout(id) { timers.delete(id); },
    console: {error(...args) { state.errors.push(args); }},
    ZOHO: {CREATOR: {UTIL: {getInitParams() {
      state.handshakeCalls++;
      return handshake ? handshake() : Promise.resolve(params);
    }}}},
    fetch(url, opts) {
      state.fetchCalls.push({url, opts});
      return fetchImpl ? fetchImpl(url, opts) : Promise.resolve(response());
    }
  };
  if (abortable) context.AbortController = class {
    constructor() { this.signal = {aborted: false}; }
    abort() { this.signal.aborted = true; state.aborts++; }
  };
  vm.runInNewContext(script, context);
  return {
    state, timers, window, html,
    async sdkLoad() { assert(state.sdk); state.sdk.onload(); await flush(); },
    timeout() {
      assert.equal(timers.size, 1, 'each phase must have exactly one active deadline');
      const [id, timer] = [...timers][0];
      assert.equal(timer.ms, 15000, 'script, handshake, and document body must each be bounded');
      timers.delete(id); timer.fn();
    }
  };
}
function assertFailed(r, message) {
  assert.match(r.state.error, /Could not load budget-manager\. Refresh to retry\./);
  assert.equal(r.state.errors.length, 1, 'failure must be reported once');
  if (message) assert.match(r.state.errors[0][1].message, message);
  assert.equal(r.state.writes.length, 0);
  assert.equal(r.state.opens, 0);
  assert.equal(r.timers.size, 0, 'failure must release its timer');
}

for (const [fragment, env] of [['', 'prod'], ['environment/development', 'dev'], ['environment/stage', 'stage'], ['/environment/staging/', 'stage']]) {
  const r = harness({envUrlFragment: fragment, loginUser: 'test'});
  await r.sdkLoad();
  assert.equal(r.state.fetchCalls.length, 1);
  const fetched = r.state.fetchCalls[0];
  assert.equal(new URL(fetched.url).pathname, `/land-master/${env}/budget-manager/widget.html`);
  assert.equal(fetched.opts.cache, 'no-store');
  assert.equal(fetched.opts.credentials, 'same-origin');
  assert.match(fetched.url, /\?_lmcb=\d+$/);
  assert.equal(fetched.opts.signal.aborted, false);
  assert.equal(r.state.writes.length, 1);
  assert(r.state.writes[0].includes(`<base href="https://rbelliveau-wbw.github.io/land-master/${env}/budget-manager/">`));
  assert(r.state.writes[0].includes('widgetsdk-min.js'), 'replacement must reinstall SDK listeners');
  assert.equal(r.window.LMFrontendContext.params.envUrlFragment, fragment);
  assert.equal(r.timers.size, 0, 'success must release its timer');
  assert.equal(r.state.aborts, 0);
  assert(!r.html.includes('location.replace'));
  assert(!r.html.includes('<iframe'));
  await r.sdkLoad();
  assert.equal(r.state.handshakeCalls, 1, 'late/duplicate onload cannot start another handshake');
  assert.equal(r.state.fetchCalls.length, 1);
  assert.equal(r.state.writes.length, 1);
}
for (const params of [{}, null, {envUrlFragment: 'unknown'}]) {
  const r = harness(params); await r.sdkLoad();
  assert.equal(r.state.fetchCalls.length, 0); assertFailed(r);
}
{
  const r = harness(null, {handshake: () => Promise.reject(new Error('offline'))});
  await r.sdkLoad(); assert.equal(r.state.fetchCalls.length, 0); assertFailed(r, /offline/);
}
{
  const r = harness({envUrlFragment: 'environment/development'});
  r.timeout(); assertFailed(r, /SDK load timed out/);
  await r.sdkLoad();
  assert.equal(r.state.handshakeCalls, 0, 'late script must not contact Creator after timeout');
  assert.equal(r.state.fetchCalls.length, 0);
  assertFailed(r, /SDK load timed out/);
}
{
  const pending = deferred();
  const r = harness(null, {handshake: () => pending.promise});
  await r.sdkLoad(); await r.sdkLoad();
  assert.equal(r.state.handshakeCalls, 1, 'duplicate script callback cannot reset the handshake deadline');
  r.timeout(); assertFailed(r, /handshake timed out/);
  pending.resolve({envUrlFragment: 'environment/development'}); await flush();
  assert.equal(r.state.fetchCalls.length, 0);
  assert.equal(r.window.LMFrontendContext, undefined, 'late context must not select a frontend');
  assertFailed(r, /handshake timed out/);
}
for (const abortable of [true, false]) {
  const pending = deferred(); let bodyCalls = 0;
  const r = harness({envUrlFragment: ''}, {fetchImpl: () => pending.promise, abortable});
  await r.sdkLoad(); assert.equal(r.state.fetchCalls.length, 1);
  r.timeout(); assertFailed(r, /document fetch timed out/);
  assert.equal(r.state.aborts, abortable ? 1 : 0);
  if (abortable) assert.equal(r.state.fetchCalls[0].opts.signal.aborted, true);
  pending.resolve({ok: true, text: () => { bodyCalls++; return Promise.resolve(documentHtml); }}); await flush();
  assert.equal(bodyCalls, 0, 'late HTTP response must not begin reading its body');
  assertFailed(r, /document fetch timed out/);
}
{
  const body = deferred();
  const r = harness({envUrlFragment: ''}, {fetchImpl: () => Promise.resolve({ok: true, text: () => body.promise})});
  await r.sdkLoad(); r.timeout(); assertFailed(r, /document fetch timed out/);
  body.resolve(documentHtml); await flush();
  assertFailed(r, /document fetch timed out/);
  assert.equal(r.state.aborts, 1, 'body download must be canceled on timeout');
}
for (const fetchImpl of [() => Promise.reject(new Error('network')), () => Promise.resolve({ok: false, status: 503})]) {
  const r = harness({envUrlFragment: ''}, {fetchImpl});
  await r.sdkLoad(); assertFailed(r, /network|HTTP 503/);
  assert.equal(r.state.aborts, 1);
}
{
  const r = harness({envUrlFragment: ''}); r.state.sdk.onerror();
  assertFailed(r, /SDK could not load/); await r.sdkLoad();
  assert.equal(r.state.handshakeCalls, 0);
}
for (const options of [{framed: false}, {routed: false}]) {
  const r = harness(null, options); await flush();
  assert.equal(r.state.sdk, undefined);
  assert.equal(r.state.handshakeCalls, 0);
  assert.equal(r.state.fetchCalls[0].url.split('?')[0], './widget.html');
  assert(r.state.writes[0].includes('widgetsdk-min.js'));
  assert.equal(r.timers.size, 0);
  const pending = deferred();
  const stalled = harness(null, {...options, fetchImpl: () => pending.promise});
  stalled.timeout(); pending.resolve(response()); await flush();
  assertFailed(stalled, /document fetch timed out/);
}
// A refresh starts a fresh document; an earlier failure cannot poison that attempt.
{
  const r = harness({envUrlFragment: 'environment/development'}); await r.sdkLoad();
  assert.equal(r.state.writes.length, 1); assert.equal(r.state.error, undefined);
}
console.log('Stable frontend loader checks passed: authoritative routing, bounded script/handshake/fetch/body, abort, late-result guards, SDK reinstall, and fresh retry.');
