
import fs from 'node:fs';
import path from 'node:path';
import {assertReleaseSource} from './lib/release-source-guard.mjs';
import {latestWidgetRelease} from './lib/development-releases.mjs';

const [widget, version] = process.argv.slice(2);
if (!widget || !version) {
  console.error('Usage: npm run release -- <widget-slug> <version>');
  process.exit(2);
}
const root = process.cwd();
const {sourceRoot, target, sourceHash} = assertReleaseSource(root, widget, version);
const environmentFile = path.join(root, 'deploy', 'environments.json');
const deployment = JSON.parse(fs.readFileSync(environmentFile, 'utf8'));
if (!deployment.environments?.development) throw new Error('Missing Development environment mapping.');
fs.mkdirSync(target, { recursive: true });
for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
  const src = path.join(sourceRoot, entry.name);
  const destName = entry.name === 'widget.html' ? 'index.html' : entry.name;
  const dest = path.join(target, destName);
  if (entry.isDirectory()) fs.cpSync(src, dest, { recursive: true });
  else fs.copyFileSync(src, dest);
}
fs.writeFileSync(path.join(target, 'release.json'), JSON.stringify({
  widget,
  version,
  created_at: new Date().toISOString(),
  source: `widgets/${widget}/src/app/widget.html`,
  source_sha256: sourceHash,
  status: 'candidate'
}, null, 2) + '\n');
deployment.environments.development[widget] = latestWidgetRelease(root, widget);
deployment.generated_at = new Date().toISOString();
fs.writeFileSync(environmentFile, JSON.stringify(deployment, null, 2) + '\n');
console.log(`Created immutable release ${widget} ${version}.`);
console.log(`Development now uses ${widget} ${deployment.environments.development[widget]}.`);
