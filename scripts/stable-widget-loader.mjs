// Keep Creator's registered iframe URL and SDK message context unchanged.
// Only the document content and asset base follow the authenticated environment.
export function stableWidgetLoader(widget, version, routeEnvironment = false) {
  const routing = routeEnvironment ? `
  var sdk = document.createElement('script');
  sdk.src = 'https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js';
  sdk.onload = function () {
    var timer = setTimeout(function () { failed(new Error('Creator environment handshake timed out')); }, 15000);
    Promise.resolve().then(function () { return ZOHO.CREATOR.UTIL.getInitParams(); })
      .then(function (params) {
        if (finished) return;
        clearTimeout(timer);
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
  else document.head.appendChild(sdk);` : `
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
  var finished = false;
  function failed(error) {
    if (finished) return;
    finished = true;
    var loader = document.getElementById('lm-loader');
    if (loader) loader.textContent = 'Could not load ${widget}. Refresh to retry.';
    console.error('Stable widget loader failed', error);
  }
  function load(url, base, reuseSDK) {
    var target = url + '?_lmcb=' + Date.now().toString();
    fetch(target, { cache: 'no-store', credentials: 'same-origin' })
      .then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.text(); })
      .then(function (html) {
        if (finished) return;
        finished = true;
        if (base) html = html.replace(/<head(?:\\s[^>]*)?>/i, function (head) { return head + '<base href="' + base + '">'; });
        if (reuseSDK) html = html.replace(/<script\\b[^>]*src=["']https:\\/\\/static\\.zohocdn\\.com\\/creator\\/widgets\\/version\\/2\\.0\\/widgetsdk-min\\.js["'][^>]*>\\s*<\\/script>/i, '');
        document.open();
        document.write(html);
        document.close();
      }).catch(failed);
  }${routing}
}());
</script><noscript><a href="./widget.html">Open ${widget} ${version}</a></noscript></body></html>
`;
}
