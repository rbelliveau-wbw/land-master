
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [widget, version] = process.argv.slice(2);
if (!widget || !version) {
  console.error('Usage: npm run release -- <widget-slug> <version>');
  process.exit(2);
}
const root = process.cwd();
const sourceRoot = path.join(root, 'widgets', widget, 'src', 'app');
const sourceHtml = path.join(sourceRoot, 'widget.html');
const target = path.join(root, 'releases', widget, version);
if (!fs.existsSync(sourceHtml)) throw new Error(`Unknown widget or missing widget.html: ${widget}`);
if (fs.existsSync(target)) throw new Error(`Release already exists and is immutable: ${widget} ${version}`);
fs.mkdirSync(target, { recursive: true });
for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
  const src = path.join(sourceRoot, entry.name);
  const destName = entry.name === 'widget.html' ? 'index.html' : entry.name;
  const dest = path.join(target, destName);
  if (entry.isDirectory()) fs.cpSync(src, dest, { recursive: true });
  else fs.copyFileSync(src, dest);
}
const bytes = fs.readFileSync(sourceHtml);
fs.writeFileSync(path.join(target, 'release.json'), JSON.stringify({
  widget,
  version,
  created_at: new Date().toISOString(),
  source: `widgets/${widget}/src/app/widget.html`,
  source_sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  status: 'candidate'
}, null, 2) + '\n');
console.log(`Created immutable release ${widget} ${version}.`);
