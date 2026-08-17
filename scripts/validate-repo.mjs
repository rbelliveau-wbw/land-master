
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const errors = [];
const warnings = [];
const widgets = JSON.parse(fs.readFileSync(path.join(root, 'manifests/widgets.json'), 'utf8')).widgets;
const envs = JSON.parse(fs.readFileSync(path.join(root, 'deploy/environments.json'), 'utf8')).environments;
const forms = JSON.parse(fs.readFileSync(path.join(root, 'creator/generated/forms.json'), 'utf8')).forms;
const formSet = new Set(forms.map(f => f.link_name));

for (const widget of widgets) {
  const html = path.join(root, widget.source_entry);
  const config = path.join(root, 'widgets', widget.slug, 'widget.config.json');
  if (!fs.existsSync(html)) errors.push(`Missing widget source: ${widget.source_entry}`);
  if (!fs.existsSync(config)) errors.push(`Missing widget config: ${widget.slug}`);
  if (fs.existsSync(html)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex');
    if (actual !== widget.source_sha256) warnings.push(`${widget.slug}: source changed since manifest generation; update widget.config.json and create a release.`);
    const text = fs.readFileSync(html, 'utf8');
    if (!text.includes('widgetsdk-min.js')) warnings.push(`${widget.slug}: no Creator widget SDK reference detected.`);
    if (!text.toLowerCase().includes('zoho.creator.init')) warnings.push(`${widget.slug}: no ZOHO.CREATOR.init call detected.`);
    // The critical-error reporter stamps its own version constant on every emailed
    // report. If it drifts from the released version, triage points at the wrong build.
    const reported = text.match(/LMCriticalErrors\.configure\(\{[\s\S]{0,400}?version\s*:\s*"([^"]+)"/);
    if (reported && reported[1] !== widget.version) {
      errors.push(`${widget.slug}: critical-error reporter version "${reported[1]}" does not match released version "${widget.version}". Update the version in LMCriticalErrors.configure.`);
    }
  }
}

for (const [environment, mapping] of Object.entries(envs)) {
  for (const [widget, version] of Object.entries(mapping)) {
    const entry = path.join(root, 'releases', widget, version, 'index.html');
    if (!fs.existsSync(entry)) errors.push(`${environment}: missing release ${widget} ${version}`);
  }
}

for (const required of ['Add_Pro_Forma', 'Add_Budget', 'Contract', 'Contract_Version', 'Subdivision', 'Company', 'User_Access']) {
  if (!formSet.has(required)) warnings.push(`Expected core form not parsed from current export: ${required}`);
}

if (warnings.length) {
  console.warn('\nWarnings:');
  for (const w of warnings) console.warn(`- ${w}`);
}
if (errors.length) {
  console.error('\nErrors:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`Validated ${widgets.length} widgets and ${Object.keys(envs).length} environment mappings.`);
