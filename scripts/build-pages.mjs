
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'dist');
const config = JSON.parse(fs.readFileSync(path.join(root, 'deploy/environments.json'), 'utf8'));

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dest = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function writeStableWidgetLoader(target, widget, version) {
  const entry = path.join(target, 'index.html');
  const current = path.join(target, 'widget.html');
  fs.renameSync(entry, current);
  fs.writeFileSync(entry, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>Loading ${widget}</title>
</head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;font:13px system-ui;color:#5c7394;background:#f0f3f7">
<div id="lm-loader">Loading ${widget}...</div>
<script>
(function () {
  var target = './widget.html?_lmcb=' + Date.now().toString();
  fetch(target, { cache: 'no-store', credentials: 'same-origin' })
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    })
    .then(function (html) {
      document.open();
      document.write(html);
      document.close();
    })
    .catch(function (error) {
      var loader = document.getElementById('lm-loader');
      if (loader) loader.textContent = 'Could not load ${widget}. Refresh to retry.';
      console.error('Stable widget loader failed', error);
    });
}());
</script>
<noscript><a href="./widget.html">Open ${widget} ${version}</a></noscript>
</body>
</html>
`);
}

function verifyStableWidgetLoader(source, target, environment, widget, version) {
  const loader = fs.readFileSync(path.join(target, 'index.html'), 'utf8');
  if (!loader.includes("fetch(target, { cache: 'no-store'") ||
      !loader.includes('document.write(html)') ||
      loader.includes('window.location.replace')) {
    throw new Error(`Invalid permanent widget loader: ${environment}/${widget}`);
  }
  const promoted = fs.readFileSync(path.join(target, 'widget.html'));
  const release = fs.readFileSync(path.join(source, 'index.html'));
  if (!promoted.equals(release)) {
    throw new Error(`Promoted widget does not match release: ${environment}/${widget} ${version}`);
  }
}

const rows = [];
for (const [environment, widgets] of Object.entries(config.environments)) {
  const shortName = environment === 'development' ? 'dev' : environment === 'production' ? 'prod' : 'stage';
  for (const [widget, version] of Object.entries(widgets)) {
    const source = path.join(root, 'releases', widget, version);
    if (!fs.existsSync(path.join(source, 'index.html'))) {
      throw new Error(`Missing release entry: ${widget} ${version}`);
    }
    const target = path.join(out, shortName, widget);
    copyDir(source, target);
    writeStableWidgetLoader(target, widget, version);
    verifyStableWidgetLoader(source, target, environment, widget, version);
    rows.push({ environment, path: `${shortName}/${widget}/`, widget, version });
  }
}

const body = rows.map(r => `<tr><td>${r.environment}</td><td>${r.widget}</td><td>${r.version}</td><td><a href="${r.path}">${r.path}</a></td></tr>`).join('');
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Land Master Widgets</title><style>body{font-family:system-ui;margin:40px;color:#0f2744}table{border-collapse:collapse;width:100%;max-width:1000px}th,td{padding:10px;border-bottom:1px solid #dde4ef;text-align:left}code{background:#f1f5f9;padding:2px 5px;border-radius:4px}</style></head><body><h1>Land Master Widget Releases</h1><p>This site contains browser-delivered widget assets only. Source, Creator exports, and knowledge files are not published.</p><table><thead><tr><th>Environment</th><th>Widget</th><th>Version</th><th>Path</th></tr></thead><tbody>${body}</tbody></table></body></html>`);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`Built ${rows.length} widget environment paths in dist/.`);
