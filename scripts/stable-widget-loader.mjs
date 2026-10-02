// Keep Creator's registered iframe URL and SDK message context unchanged.
// Only the document content and asset base follow the authenticated environment.
// Change asset attributes only; never serialize the document or scan inline script/style contents.
export function stampLocalAssets(html, version) {
  const tags = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<(?:[^"'<>]|"[^"]*"|'[^']*')*>/g;
  const rawTags = /^(?:script|style|textarea|title|xmp|iframe|noembed|noframes|noscript|plaintext)$/i;
  const decode = value => value.replace(/&(?:#(\d+);?|#x([\da-f]+);?|(amp|colon|sol|bsol|num|quest|tab|newline);)/gi, (entity, decimal, hex, name) => {
    if (decimal || hex) {const number = parseInt(decimal || hex, hex ? 16 : 10); return number <= 0x10ffff ? String.fromCodePoint(number) : entity;}
    return {amp:'&',colon:':',sol:'/',bsol:'\\',num:'#',quest:'?',tab:'\t',newline:'\n'}[name.toLowerCase()] || entity;
  });
  function stamp(value) {
    const decoded = decode(value).trim().replace(/[\u0000-\u0020]/g, '');
    if (!decoded || /^[a-z][a-z\d+.-]*:/i.test(decoded) || /^[\/\\]{2}/.test(decoded) || /^[?#]/.test(decoded)) return value;
    // Creator download/file endpoints are outside the static asset contract.
    if (/^\/?api\/v\d+(?:\.[\d]+)?\//i.test(decoded)) return value;
    const references = /&(?:#\d+;?|#x[\da-f]+;?|[a-z][\da-z]*;)|#/gi;
    let fragment = null, reference;
    while ((reference = references.exec(value))) if (decode(reference[0]) === '#') {fragment = reference; break;}
    const before = fragment ? value.slice(0, fragment.index) : value, after = fragment ? value.slice(fragment.index) : '';
    const separator = decode(before).includes('?') ? /[?&]$/.test(decode(before)) ? '' : '&' : '?';
    const encoded = encodeURIComponent(String(version)).replace(/['"<>]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase());
    return before + separator + '_lmv=' + encoded + after;
  }
  let output = '', previous = 0, match;
  while ((match = tags.exec(html))) {
    const tag = match[0], opening = /^<([a-z][\w:-]*)\b/i.exec(tag);
    output += html.slice(previous, match.index);
    let changed = tag;
    if (opening && /^(?:script|link)$/i.test(opening[1])) {
      const attrs = [], pattern = /([^\s"'<>/=]+)(?:([\t\n\f\r ]*=[\t\n\f\r ]*)(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
      const contents = tag.slice(opening[0].length, -1); let attr;
      while ((attr = pattern.exec(contents))) {
        if (!attr[2]) continue;
        const value = attr[3] !== undefined ? attr[3] : attr[4] !== undefined ? attr[4] : attr[5];
        const quoted = attr[3] !== undefined || attr[4] !== undefined;
        attrs.push({name:attr[1].toLowerCase(),value,start:opening[0].length + attr.index + attr[1].length + attr[2].length + (quoted ? 1 : 0)});
      }
      const script = opening[1].toLowerCase() === 'script';
      const rel = attrs.find(attr => attr.name === 'rel');
      const stylesheet = rel && decode(rel.value).toLowerCase().split(/\s+/).includes('stylesheet');
      const asset = (script || stylesheet) && attrs.find(attr => attr.name === (script ? 'src' : 'href'));
      if (asset) changed = tag.slice(0, asset.start) + stamp(asset.value) + tag.slice(asset.start + asset.value.length);
    }
    output += changed;
    previous = tags.lastIndex;
    if (opening && rawTags.test(opening[1])) {
      const end = new RegExp('</' + opening[1] + '\\s*>', 'gi'); end.lastIndex = previous;
      const close = opening[1].toLowerCase() === 'plaintext' ? null : end.exec(html);
      const stop = close ? close.index : html.length;
      output += html.slice(previous, stop); previous = stop; tags.lastIndex = stop;
      if (!close) break;
    }
  }
  return output + html.slice(previous);
}

export function stableWidgetLoader(widget, version, routeEnvironment = false, environmentVersions = {dev:version,stage:version,prod:version}, canonicalWidget = widget) {
  const versions = JSON.stringify(environmentVersions).replace(/</g, '\\u003c');
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
        var selectedVersion = releaseVersions[env];
        if (typeof selectedVersion !== 'string' || !selectedVersion) throw new Error('No widget release is mapped for the Creator environment');
        window.LMFrontendContext = { params: params, environment: env };
        var base = new URL('../..', location.href);
        base.pathname = base.pathname.replace(/\\/?$/, '/') + env + '/${canonicalWidget}/';
        load(new URL('widget.html', base).href, base.href, true, selectedVersion);
      }).catch(failed);
  };
  sdk.onerror = function () { failed(new Error('Creator SDK could not load')); };
  // A standalone preview has no Creator message host; use its selected URL.
  if (window.parent === window) load('./widget.html', null, false, ${JSON.stringify(version)});
  else { deadline('Creator SDK load timed out'); document.head.appendChild(sdk); }` : `
  load('./widget.html', null, false, ${JSON.stringify(version)});`;
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
  var releaseVersions = ${versions};
  var stampLocalAssets = ${stampLocalAssets.toString()};
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
  function load(url, base, reuseSDK, selectedVersion) {
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
        html = stampLocalAssets(html, selectedVersion);
        if (base) html = html.replace(/<head\\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/i, function (head) { return head + '<base href="' + base + '">'; });
        finished = true;
        clearDeadline();
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
