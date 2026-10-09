import fs from 'node:fs';
import path from 'node:path';

export function latestWidgetRelease(root, widget) {
  const directory = path.join(root, 'releases', widget);
  if (!fs.existsSync(directory)) return null;
  const versions = fs.readdirSync(directory, {withFileTypes:true})
    .filter(entry => entry.isDirectory() && /^\d+\.\d+\.\d+$/.test(entry.name) && fs.existsSync(path.join(directory, entry.name, 'index.html')))
    .map(entry => entry.name)
    .sort((a, b) => {
      const left = a.split('.').map(Number), right = b.split('.').map(Number);
      for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
      return 0;
    });
  return versions.at(-1) || null;
}

export function developmentReleaseErrors(root, widgets, mapping) {
  return widgets.flatMap(widget => {
    const latest = latestWidgetRelease(root, widget);
    return latest && mapping?.[widget] === latest ? [] : [`development: ${widget} must use latest immutable release ${latest || '(missing)'}, found ${mapping?.[widget] || '(missing)'}. Update deploy/environments.json.`];
  });
}
