import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Preflight only: never creates, replaces or repairs a release/config file.
export function assertReleaseSource(root, widget, version) {
  const sourceRoot = path.join(root, 'widgets', widget, 'src', 'app');
  const sourceHtml = path.join(sourceRoot, 'widget.html');
  const target = path.join(root, 'releases', widget, version);
  if (!fs.existsSync(sourceHtml)) throw new Error(`Unknown widget or missing widget.html: ${widget}`);
  if (fs.existsSync(target)) throw new Error(`Release already exists and is immutable: ${widget} ${version}`);
  const config = JSON.parse(fs.readFileSync(path.join(root, 'widgets', widget, 'widget.config.json'), 'utf8'));
  if (config.version !== version) throw new Error(`Widget config version must match requested release: ${widget} ${version}`);
  const bytes = fs.readFileSync(sourceHtml);
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp('(?:^|[^\\da-z.])' + escaped + '(?=$|[^\\da-z.])', 'i').test(bytes.toString('utf8'))) {
    throw new Error(`Stamp the requested version in widget.html before releasing: ${widget} ${version}`);
  }
  const sourceHash = crypto.createHash('sha256').update(bytes).digest('hex');
  const history = path.join(root, 'releases', widget);
  if (fs.existsSync(history)) for (const entry of fs.readdirSync(history, {withFileTypes:true})) {
    if (!entry.isDirectory() || entry.name === version) continue;
    const metadataPath = path.join(history, entry.name, 'release.json');
    if (!fs.existsSync(metadataPath)) continue;
    let metadata;
    try {metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));} catch {continue;}
    if (metadata && typeof metadata === 'object' && metadata.source_sha256 === sourceHash) throw new Error(`Source HTML matches prior release ${widget} ${entry.name}; update the HTML version marker before creating ${version}.`);
  }
  return {sourceRoot, sourceHtml, target, bytes, sourceHash};
}
