import assert from 'node:assert/strict';
import vm from 'node:vm';
import {stableWidgetLoader, stampLocalAssets} from './stable-widget-loader.mjs';

const documentHtml = '<html><head><script src="https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js"></script><script src="./creator-data.js"></script><link rel="stylesheet" href="./widget.css"></head><body>Ready</body></html>';
const response = (html = documentHtml) => ({ok: true, text: async () => html});
const mappedVersions = {dev:'2.0-dev',stage:'3.0-stage',prod:'1.0-prod'};
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return {promise, resolve, reject};
};
async function flush() { for (let i = 0; i < 24; i++) await Promise.resolve(); }

function harness(params, {framed = true, routed = true, handshake, fetchImpl, abortable = true, widget = 'budget-manager', version = 'url-version', versions = mappedVersions, canonicalWidget = widget} = {}) {
  const state = {fetchCalls: [], handshakeCalls: 0, writes: [], opens: 0, errors: [], aborts: 0};
  const timers = new Map();
  let nextTimer = 0;
  const html = stableWidgetLoader(widget, version, routed, versions, canonicalWidget);
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
    location: {href: `https://rbelliveau-wbw.github.io/land-master/prod/${widget}/?creatorContext=preserved#embedded`},
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
    state, timers, window, html, location:context.location, parent:window.parent,
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
  assert(r.state.writes[0].includes(`src="./creator-data.js?_lmv=${mappedVersions[env]}"`), 'helper cache key must follow native environment release, not the registered URL release');
  assert(r.state.writes[0].includes(`href="./widget.css?_lmv=${mappedVersions[env]}"`));
  assert(r.state.writes[0].includes('src="https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js"'), 'external SDK URL stays exact');
  assert.equal(r.location.href, 'https://rbelliveau-wbw.github.io/land-master/prod/budget-manager/?creatorContext=preserved#embedded');
  assert.equal(r.window.parent, r.parent, 'versioning must retain the original Creator parent and query/fragment context');
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
  assert(r.state.writes[0].includes('src="./creator-data.js?_lmv=url-version"'), 'standalone/nonrouted document uses its selected URL release');
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
{
  const r = harness({envUrlFragment:'environment/development'}, {widget:'insights',canonicalWidget:'lot-sales-explorer',versions:{dev:'1.5-dev',stage:'1.5-stage',prod:'1.5-prod'}});
  await r.sdkLoad();
  assert.equal(new URL(r.state.fetchCalls[0].url).pathname, '/land-master/dev/lot-sales-explorer/widget.html', 'alias resolves canonical widget directory');
  assert(r.state.writes[0].includes('<base href="https://rbelliveau-wbw.github.io/land-master/dev/lot-sales-explorer/">'));
  assert(r.state.writes[0].includes('src="./creator-data.js?_lmv=1.5-dev"'));
  assert.equal(r.location.href, 'https://rbelliveau-wbw.github.io/land-master/prod/insights/?creatorContext=preserved#embedded');
}
{
  const r = harness({envUrlFragment:'environment/development'}, {versions:{prod:'1.0-prod'}});
  await r.sdkLoad(); assert.equal(r.state.fetchCalls.length, 0); assertFailed(r, /No widget release is mapped/);
}
{
  const original = `<html><head data-hint="> preserved">
<SCRIPT defer data-template="src='./fake.js'" SRC = './runtime-context.js?existing=1&amp;other=2#ready'></SCRIPT>
<script src=../creator-data.js#boot></script>
<link HREF="app.css?v=old#theme" media="screen" ReL='alternate StyleSheet'>
<link rel=stylesheet href='theme.css?'>
<script src="module.mjs&#35;encoded-fragment"></script>
<script src="encoded.js&#63;key=1&amp;other=2"></script>
</head></html>`;
  const expected = `<html><head data-hint="> preserved">
<SCRIPT defer data-template="src='./fake.js'" SRC = './runtime-context.js?existing=1&amp;other=2&_lmv=release-2#ready'></SCRIPT>
<script src=../creator-data.js?_lmv=release-2#boot></script>
<link HREF="app.css?v=old&_lmv=release-2#theme" media="screen" ReL='alternate StyleSheet'>
<link rel=stylesheet href='theme.css?_lmv=release-2'>
<script src="module.mjs?_lmv=release-2&#35;encoded-fragment"></script>
<script src="encoded.js&#63;key=1&amp;other=2&_lmv=release-2"></script>
</head></html>`;
  assert.equal(stampLocalAssets(original, 'release-2'), expected, 'Only intended asset URL values change; quotes, attributes, queries, fragments and surrounding document bytes remain exact.');
  const r = harness({envUrlFragment:'environment/stage'}, {fetchImpl:() => Promise.resolve(response(original)),versions:{dev:'release-1',stage:'release-2',prod:'release-3'}});
  await r.sdkLoad();
  assert.equal(r.state.writes[0], expected.replace('<head data-hint="> preserved">', '<head data-hint="> preserved"><base href="https://rbelliveau-wbw.github.io/land-master/stage/budget-manager/">'), 'Injected runtime executes the actual stamping function with the selected environment version.');
}
{
  const unchanged = `<!doctype html><!-- <script src='./comment.js'></script><link rel=stylesheet href=comment.css> -->
<script src="https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js"></script>
<script src="//cdn.example.test/vendor.js?x=1#frag"></script>
<script src="https&colon;//cdn.example.test/entity.js"></script>
<script src="&#104;ttps://cdn.example.test/entity.js"></script>
<script src="data:text/javascript,noop()"></script>
<script src="blob:https://example.test/token"></script>
<script src="/api/v2/owner/app/Report/1/Attachment/download?filepath=creator.js"></script>
<script src="#existing-script"></script>
<script>const snippet = "<script src='./inline.js'>"; const css = '<link rel="stylesheet" href="inline.css">';</script>
<style>.sample::after {content:'<script src="style.js">'} @import url('inline.css');</style>
<textarea><script src="text.js"></script></textarea>
<noscript><link rel="stylesheet" href="fallback.css"></noscript>
<iframe src="https://creator.zoho.com/file.js"><script src="frame.js"></script></iframe>
<a href="local.js">Asset anchor</a><a href="https://creator.zoho.com/api/file/download">Creator file</a>
<link rel="icon" href="icon.css"><img src="image.js"><base href="./original/">`;
  assert.equal(stampLocalAssets(unchanged, 'release-2'), unchanged, 'External/vendor/Creator file URLs, inline text, comments, nonstylesheet links and ordinary element URLs must remain byte-identical.');
}
{
  assert.equal(stampLocalAssets("<script src='local.js'></script>", `release '2' & "3"`), "<script src='local.js?_lmv=release%20%272%27%20%26%20%223%22'></script>", 'Release value is encoded without breaking attribute quotes.');
  assert.equal(stampLocalAssets('<link rel="stylesheet" href="/assets/app.css"><script src="./app.js?v=original#load"></script>', 'next'), '<link rel="stylesheet" href="/assets/app.css?_lmv=next"><script src="./app.js?v=original&_lmv=next#load"></script>');
  assert.equal(stampLocalAssets('<script>unclosed raw content <link rel="stylesheet" href="raw.css">', 'next'), '<script>unclosed raw content <link rel="stylesheet" href="raw.css">', 'An unclosed raw block must not be rewritten as markup.');
}
console.log('Stable frontend loader checks passed: authoritative environment asset versions, canonical aliases, exact tag-bound stamping, immutable document preservation, bounded script/handshake/fetch/body, abort, late-result guards, SDK reinstall, and fresh retry.');
