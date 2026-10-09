import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertReleaseSource} from './lib/release-source-guard.mjs';
import {latestWidgetRelease, developmentReleaseErrors} from './lib/development-releases.mjs';
import vm from 'node:vm';
import {stableWidgetLoader, stampLocalAssets, htmlAssetFingerprint} from './stable-widget-loader.mjs';

const documentHtml = '<html><head><script src="https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js"></script><script src="./creator-data.js"></script><link rel="stylesheet" href="./widget.css"></head><body>Ready</body></html>';
const response = (html = documentHtml) => ({ok: true, text: async () => html});
const mappedVersions = {dev:'2.0-dev',stage:'3.0-stage',prod:'1.0-prod'};
const documentFingerprint = htmlAssetFingerprint(documentHtml);
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
  assert(r.state.writes[0].includes(`src="./creator-data.js?_lmv=${mappedVersions[env]}&_lmh=${documentFingerprint}"`), 'helper cache key includes native environment release and actual fetched document fingerprint');
  assert(r.state.writes[0].includes(`href="./widget.css?_lmv=${mappedVersions[env]}&_lmh=${documentFingerprint}"`));
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
  assert(r.state.writes[0].includes(`src="./creator-data.js?_lmv=url-version&_lmh=${documentFingerprint}"`), 'standalone/nonrouted document uses its selected URL release plus actual document fingerprint');
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
  assert(r.state.writes[0].includes(`src="./creator-data.js?_lmv=1.5-dev&_lmh=${documentFingerprint}"`));
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
  const fingerprint = htmlAssetFingerprint(original);
  const expected = `<html><head data-hint="> preserved">
<SCRIPT defer data-template="src='./fake.js'" SRC = './runtime-context.js?existing=1&amp;other=2&_lmv=release-2&_lmh=${fingerprint}#ready'></SCRIPT>
<script src=../creator-data.js?_lmv=release-2&_lmh=${fingerprint}#boot></script>
<link HREF="app.css?v=old&_lmv=release-2&_lmh=${fingerprint}#theme" media="screen" ReL='alternate StyleSheet'>
<link rel=stylesheet href='theme.css?_lmv=release-2&_lmh=${fingerprint}'>
<script src="module.mjs?_lmv=release-2&_lmh=${fingerprint}&#35;encoded-fragment"></script>
<script src="encoded.js&#63;key=1&amp;other=2&_lmv=release-2&_lmh=${fingerprint}"></script>
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
  const quoteFixture = "<script src='local.js'></script>";
  assert.equal(stampLocalAssets(quoteFixture, `release '2' & "3"`), `<script src='local.js?_lmv=release%20%272%27%20%26%20%223%22&_lmh=${htmlAssetFingerprint(quoteFixture)}'></script>`, 'Release value is encoded without breaking attribute quotes.');
  const localFixture = '<link rel="stylesheet" href="/assets/app.css"><script src="./app.js?v=original#load"></script>', fingerprint = htmlAssetFingerprint(localFixture);
  assert.equal(stampLocalAssets(localFixture, 'next'), `<link rel="stylesheet" href="/assets/app.css?_lmv=next&_lmh=${fingerprint}"><script src="./app.js?v=original&_lmv=next&_lmh=${fingerprint}#load"></script>`);
  assert.equal(stampLocalAssets('<script>unclosed raw content <link rel="stylesheet" href="raw.css">', 'next'), '<script>unclosed raw content <link rel="stylesheet" href="raw.css">', 'An unclosed raw block must not be rewritten as markup.');
}
assert.equal(htmlAssetFingerprint(''), '0-811c9dc5');
assert.equal(htmlAssetFingerprint('a'), '1-e40c292c', 'FNV-1a known vector pins actual fingerprint computation.');
assert.notEqual(htmlAssetFingerprint('abc'), htmlAssetFingerprint('abd'), 'Equal-length changed content must affect this fixture cache key.');
assert.notEqual(htmlAssetFingerprint('😃'), htmlAssetFingerprint('😄'), 'UTF16 content changes are included.');
{
  const priorHtml = documentHtml.replace('Ready', 'Release 1.5.36'), currentHtml = documentHtml.replace('Ready', 'Release 1.5.37');
  const oldMap = {dev:'1.5.36',stage:'1.5.36',prod:'1.5.36'};
  for (const options of [{}, {routed:false}, {framed:false}]) {
    const prior = harness({envUrlFragment:''}, {...options,versions:oldMap,fetchImpl:() => Promise.resolve(response(priorHtml))});
    const current = harness({envUrlFragment:''}, {...options,versions:oldMap,fetchImpl:() => Promise.resolve(response(currentHtml))});
    if (options.routed === false || options.framed === false) {await flush();} else {await prior.sdkLoad(); await current.sdkLoad();}
    const source = result => result.state.writes[0].match(/src="(\.\/creator-data\.js[^\"]*)"/)[1];
    const oldUrl = new URL(source(prior), prior.location.href), currentUrl = new URL(source(current), current.location.href);
    assert.equal(oldUrl.searchParams.get('_lmv'), currentUrl.searchParams.get('_lmv'), 'Fixture deliberately retains the old permanent loader version table.');
    assert.notEqual(oldUrl.searchParams.get('_lmh'), currentUrl.searchParams.get('_lmh'), 'New fetched HTML must create a different helper cache URL despite a stale loader map.');
    assert.equal(currentUrl.searchParams.get('_lmh'), htmlAssetFingerprint(currentHtml), 'Fingerprint uses raw fetched document, before base insertion or attribute stamping.');
    assert(current.state.writes[0].includes('Release 1.5.37'));
    assert.equal(current.state.fetchCalls.length, 1, 'Fingerprinting requires no metadata or second network read.');
    assert.equal(current.timers.size, 0);
    const repeat = stampLocalAssets(currentHtml, oldMap.prod);
    assert.equal(repeat, stampLocalAssets(currentHtml, oldMap.prod), 'Identical immutable HTML gets stable asset URLs without per-startup cache churn.');
  }
}
{
  const root = new URL('../', import.meta.url), widgetRoot = new URL('widgets/', root);
  for (const widget of fs.readdirSync(widgetRoot, {withFileTypes:true}).filter(entry => entry.isDirectory()).map(entry => entry.name)) {
    const configPath = new URL(`widgets/${widget}/widget.config.json`, root), sourcePath = new URL(`widgets/${widget}/src/app/widget.html`, root);
    if (!fs.existsSync(configPath) || !fs.existsSync(sourcePath)) continue;
    const {version} = JSON.parse(fs.readFileSync(configPath, 'utf8')), html = fs.readFileSync(sourcePath, 'utf8');
    assert(html.includes(version), `${widget}: current source HTML must change its version marker even when only helper files change.`);
    const oldStamped = stampLocalAssets(html, 'stale-loader-map');
    const nextHtml = html.replaceAll(version, 'next-release-marker'), nextStamped = stampLocalAssets(nextHtml, 'stale-loader-map');
    assert.notEqual(htmlAssetFingerprint(html), htmlAssetFingerprint(nextHtml), `${widget}: release marker changes must invalidate the fetched-content cache key.`);
    assert.notEqual(oldStamped, nextStamped);
  }
}
{
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'creator-release-guard-'));
  const widget = 'fixture-widget', version = '1.2.4';
  const sourceDir = path.join(directory, 'widgets', widget, 'src', 'app'), configPath = path.join(directory, 'widgets', widget, 'widget.config.json'), sourcePath = path.join(sourceDir, 'widget.html'), target = path.join(directory, 'releases', widget, version);
  const writeSource = (configVersion, html) => {fs.mkdirSync(sourceDir, {recursive:true}); fs.writeFileSync(configPath, JSON.stringify({version:configVersion})); fs.writeFileSync(sourcePath, html);};
  const createRelease = () => spawnSync(process.execPath, [fileURLToPath(new URL('./create-release.mjs', import.meta.url)),widget,version], {cwd:directory,encoding:'utf8'});
  try {
    const environmentFile = path.join(directory, 'deploy', 'environments.json');
    const deployment = {environments:{development:{[widget]:'1.2.3','other-widget':'2.0.0'},stage:{[widget]:'1.2.1'},production:{[widget]:'1.2.2'}},runtime_frontend_routing:[widget]};
    fs.mkdirSync(path.dirname(environmentFile), {recursive:true}); fs.writeFileSync(environmentFile, JSON.stringify(deployment));
    const initialEnvironmentBytes = fs.readFileSync(environmentFile);
    writeSource(version, '<script>const version="1.2.4";</script>');
    const result = assertReleaseSource(directory, widget, version);
    assert.equal(result.sourceHash, crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'));
    assert.equal(fs.existsSync(target), false, 'Successful preflight performs no release writes.');
    writeSource('1.2.3', '<script>const version="1.2.4";</script>');
    assert.throws(() => assertReleaseSource(directory, widget, version), /config version must match/);
    const mismatch = createRelease(); assert.notEqual(mismatch.status, 0); assert.match(mismatch.stderr, /config version must match/);
    assert.equal(fs.existsSync(target), false);
    assert(fs.readFileSync(environmentFile).equals(initialEnvironmentBytes), 'A failed release cannot change any environment mapping.');
    writeSource(version, '<script>const version="1.2.3";</script>');
    assert.throws(() => assertReleaseSource(directory, widget, version), /Stamp the requested version/);
    writeSource(version, '<script>const version="1.2.40";</script>');
    assert.throws(() => assertReleaseSource(directory, widget, version), /Stamp the requested version/, 'A different longer version is not the requested version marker.');
    writeSource(version, '<script>const version="1.2.4";</script>');
    fs.mkdirSync(target, {recursive:true}); fs.writeFileSync(path.join(target, 'untouched'), 'immutable sentinel');
    assert.throws(() => assertReleaseSource(directory, widget, version), /already exists and is immutable/);
    assert.equal(fs.readFileSync(path.join(target, 'untouched'), 'utf8'), 'immutable sentinel');
    // This test-owned directory is inside the unique temporary root, never a real release.
    fs.rmSync(target, {recursive:true});
    const prior = path.join(directory, 'releases', widget, '1.2.3'); fs.mkdirSync(prior, {recursive:true});
    fs.writeFileSync(path.join(prior, 'release.json'), JSON.stringify({version:'1.2.3',source_sha256:result.sourceHash}));
    assert.throws(() => assertReleaseSource(directory, widget, version), /Source HTML matches prior release/, 'A helper-only change cannot create another release with identical HTML.');
    const duplicate = createRelease(); assert.notEqual(duplicate.status, 0); assert.match(duplicate.stderr, /Source HTML matches prior release/);
    assert.equal(fs.existsSync(target), false);
    const historical = path.join(directory, 'releases', widget, 'historical'); fs.mkdirSync(historical, {recursive:true});
    fs.writeFileSync(path.join(historical, 'release.json'), '{historical nonstandard metadata');
    const nullMetadata = path.join(directory, 'releases', widget, 'historical-null'); fs.mkdirSync(nullMetadata, {recursive:true}); fs.writeFileSync(path.join(nullMetadata, 'release.json'), 'null');
    writeSource(version, '<script>const version="1.2.4-LAZY";</script>');
    assertReleaseSource(directory, widget, version);
    assert.equal(fs.readFileSync(path.join(historical, 'release.json'), 'utf8'), '{historical nonstandard metadata', 'Existing historical metadata is never repaired/rejected retroactively.');
    const created = createRelease(); assert.equal(created.status, 0, created.stderr);
    const updatedDeployment = JSON.parse(fs.readFileSync(environmentFile, 'utf8'));
    assert.equal(updatedDeployment.environments.development[widget], version, 'The actual release CLI automatically promotes its widget to Development.');
    assert.equal(updatedDeployment.environments.development['other-widget'], '2.0.0');
    assert.deepEqual(updatedDeployment.environments.stage, deployment.environments.stage);
    assert.deepEqual(updatedDeployment.environments.production, deployment.environments.production);
    assert.deepEqual(updatedDeployment.runtime_frontend_routing, deployment.runtime_frontend_routing);
    assert.deepEqual(developmentReleaseErrors(directory, [widget], updatedDeployment.environments.development), []);
    assert.match(developmentReleaseErrors(directory, [widget], {[widget]:'1.2.3'})[0], /must use latest immutable release 1\.2\.4/);
    assert.match(developmentReleaseErrors(directory, [widget], {})[0], /found \(missing\)/);
    assert(fs.readFileSync(path.join(target, 'index.html')).equals(fs.readFileSync(sourcePath)), 'Actual release CLI preserves source document bytes after passing preflight.');
    assert.equal(JSON.parse(fs.readFileSync(path.join(target, 'release.json'), 'utf8')).source_sha256, crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'));
    const repeat = createRelease(); assert.notEqual(repeat.status, 0); assert.match(repeat.stderr, /already exists and is immutable/);
    assert.deepEqual(JSON.parse(fs.readFileSync(environmentFile, 'utf8')), updatedDeployment, 'An immutable-release replay leaves all environment mappings intact.');
    for (const candidate of ['1.9.20','1.10.0','2.0.0','10.0.0']) {
      const candidatePath = path.join(directory, 'releases', widget, candidate); fs.mkdirSync(candidatePath, {recursive:true}); fs.writeFileSync(path.join(candidatePath, 'index.html'), '<html>Fixture</html>');
    }
    fs.mkdirSync(path.join(directory, 'releases', widget, '99.0.0'), {recursive:true});
    assert.equal(latestWidgetRelease(directory, widget), '10.0.0', 'Numeric version ordering handles major/minor/patch boundaries and ignores incomplete folders.');
    assert.match(developmentReleaseErrors(directory, [widget], updatedDeployment.environments.development)[0], /must use latest immutable release 10\.0\.0/);
    assert.equal(latestWidgetRelease(directory, 'missing-widget'), null);
    const widgetRoot = new URL('../widgets/', import.meta.url);
    for (const entry of fs.readdirSync(widgetRoot, {withFileTypes:true}).filter(entry => entry.isDirectory())) {
      const config = new URL(`${entry.name}/widget.config.json`, widgetRoot), source = new URL(`${entry.name}/src/app/widget.html`, widgetRoot);
      if (!fs.existsSync(config) || !fs.existsSync(source)) continue;
      const current = JSON.parse(fs.readFileSync(config, 'utf8')), tempSource = path.join(directory, 'widgets', entry.name, 'src', 'app');
      fs.mkdirSync(tempSource, {recursive:true}); fs.copyFileSync(config, path.join(directory, 'widgets', entry.name, 'widget.config.json')); fs.copyFileSync(source, path.join(tempSource, 'widget.html'));
      assertReleaseSource(directory, entry.name, current.version);
      assert.equal(fs.existsSync(path.join(directory, 'releases', entry.name, current.version)), false, `${entry.name}: actual source fixture is accepted without writing a release.`);
    }
  } finally {
    assert.equal(path.dirname(directory), os.tmpdir()); assert(path.basename(directory).startsWith('creator-release-guard-'));
    fs.rmSync(directory, {recursive:true,force:true});
  }
}
console.log('Stable frontend loader checks passed: fetched-content fingerprints defeat stale loader maps, all-nine release-marker preflight/temp filesystem guards, authoritative environment asset versions, canonical aliases, exact tag-bound stamping, immutable document preservation, bounded script/handshake/fetch/body, abort, late-result guards, SDK reinstall, and fresh retry.');
