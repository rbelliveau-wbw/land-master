
import fs from 'node:fs';
import path from 'node:path';
import {assertReleaseSource} from './lib/release-source-guard.mjs';

const [widget, version] = process.argv.slice(2);
if (!widget || !version) {
  console.error('Usage: npm run release -- <widget-slug> <version>');
  process.exit(2);
}
const root = process.cwd();
const {sourceRoot, target, sourceHash} = assertReleaseSource(root, widget, version);
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
console.log(`Created immutable release ${widget} ${version}.`);
