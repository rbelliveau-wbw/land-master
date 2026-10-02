// Keep Creator's registered iframe URL and SDK message context unchanged.
// Only the document content and asset base follow the authenticated environment.
export function stableWidgetLoader(widget, version, routeEnvironment = false) {
  const routing = routeEnvironment ? `
  var sdk = document.createElement('script');
  sdk.src = 'https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js';
  var sdkLoaded = false;
  sdk.onload = function () {
    if (finished || sdkLoaded) return;
    sdkLoaded = true;
    deadline('Creator environment handshake timed out');
    Promise.resolve().then(function () { if (finished) return; return ZOHO.CREATOR.UTIL.getInitParams(); })
      .then(function (params) {
        if (finished) return;
        var fragment = params && params.envUrlFragment;
        if (typeof fragment !== 'string') throw new Error('Creator did not identify its environment');
        var env = fragment === '' ? 'prod' : /(?:^|\\/)environment\\/development\\/?$/.test(fragment) ? 'dev' : /(?:^|\\/)environment\\/(?:stage|staging)\\/?$/.test(fragment) ? 'stage' : '';
        if (!env) throw new Error('Unrecognized Creator environment');
        window.LMFrontendContext = { params: params, environment: env };
        var base = new URL('../..', location.href);
        base.pathname = base.pathname.replace(/\\/?$/, '/') + env + '/${widget}/';
        load(new URL('widget.html', base).href, base.href, true);
      }).catch(failed);
  };
  sdk.onerror = function () { failed(new Error('Creator SDK could not load')); };
  // A standalone preview has no Creator message host; use its selected URL.
  if (window.parent === window) load('./widget.html', null, false);
  else { deadline('Creator SDK load timed out'); document.head.appendChild(sdk); }` : `
  load('./widget.html', null, false);`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0">
<title>Loading ${widget}</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;font:13px system-ui;color:#5c7394;background:#f0f3f7">
<div id="lm-loader">Loading ${widget}...</div><script>
(function () {
  var finished = false, loading = false, timer = null, fetchAbort = null;
  function clearDeadline() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }
  function deadline(message) {
    clearDeadline();
    timer = setTimeout(function () { failed(new Error(message)); }, 15000);
  }
  function failed(error) {
    if (finished) return;
    finished = true;
    clearDeadline();
    if (fetchAbort) fetchAbort.abort();
    var loader = document.getElementById('lm-loader');
    if (loader) loader.textContent = 'Could not load ${widget}. Refresh to retry.';
    console.error('Stable widget loader failed', error);
  }
  function load(url, base, reuseSDK) {
    if (finished || loading) return;
    loading = true;
    deadline('Widget document fetch timed out');
    var target = url + '?_lmcb=' + Date.now().toString();
    var options = { cache: 'no-store', credentials: 'same-origin' };
    if (typeof AbortController === 'function') { fetchAbort = new AbortController(); options.signal = fetchAbort.signal; }
    fetch(target, options)
      .then(function (response) { if (finished) return; if (!response.ok) throw new Error('HTTP ' + response.status); return response.text(); })
      .then(function (html) {
        if (finished) return;
        finished = true;
        clearDeadline();
        if (base) html = html.replace(/<head(?:\\s[^>]*)?>/i, function (head) { return head + '<base href="' + base + '">'; });
        // document.open clears SDK message listeners; reload SDK in the new document.
        document.open();
        document.write(html);
        document.close();
      }).catch(failed);
  }${routing}
}());
</script><noscript><a href="./widget.html">Open ${widget} ${version}</a></noscript></body></html>
`;
}
