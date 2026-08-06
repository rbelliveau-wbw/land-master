
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [widget] = process.argv.slice(2);
if (!widget) {
  console.error('Usage: npm run package:creator -- <widget-slug>');
  process.exit(2);
}
const root = process.cwd();
const source = path.join(root, 'widgets', widget, 'src');
if (!fs.existsSync(path.join(source, 'app', 'widget.html'))) throw new Error(`Unknown widget: ${widget}`);
const outDir = path.join(root, 'dist', 'creator-packages');
fs.mkdirSync(outDir, { recursive: true });
const output = path.join(outDir, `${widget}.zip`);
if (fs.existsSync(output)) fs.rmSync(output);
execFileSync('zip', ['-qr', output, '.'], { cwd: source, stdio: 'inherit' });
console.log(`Created ${path.relative(root, output)}.`);
