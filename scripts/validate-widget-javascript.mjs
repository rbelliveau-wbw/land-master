import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const widgets = JSON.parse(fs.readFileSync(path.join(root, 'manifests/widgets.json'), 'utf8')).widgets;
const errors = [];

for (const widget of widgets) {
  const htmlPath = path.join(root, widget.source_entry);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  inlineScripts.forEach((match, index) => {
    try {
      new vm.Script(match[1], { filename: `${widget.slug}:inline-${index + 1}.js` });
    } catch (error) {
      errors.push(`${widget.slug}: inline JavaScript ${index + 1} does not parse: ${error.message}`);
    }
  });

  const reporterPath = path.join(path.dirname(htmlPath), 'critical-error-reporter.js');
  const hasLegacyReporter = html.includes('queueAutomaticErrorEmail') || html.includes('queueErrorEmail');
  const referencesSharedReporter = html.includes('critical-error-reporter.js');
  if (!hasLegacyReporter && !referencesSharedReporter) {
    errors.push(`${widget.slug}: no critical-error email reporter is wired in.`);
  }
  if (referencesSharedReporter) {
    if (!fs.existsSync(reporterPath)) {
      errors.push(`${widget.slug}: critical-error-reporter.js is referenced but missing.`);
    } else {
      const reporter = fs.readFileSync(reporterPath, 'utf8');
      try {
        new vm.Script(reporter, { filename: `${widget.slug}:critical-error-reporter.js` });
      } catch (error) {
        errors.push(`${widget.slug}: critical-error-reporter.js does not parse: ${error.message}`);
      }
      for (const required of ['LLM FIX REQUEST', 'Report_Proforma_Widget_Error', 'sessionSent', '600000']) {
        if (!reporter.includes(required)) errors.push(`${widget.slug}: critical-error reporter is missing ${required}.`);
      }
      if (!html.includes('LMCriticalErrors.markReady')) errors.push(`${widget.slug}: reporter is never marked ready after Creator initialization.`);
    }
  }
}

const budgetHtml = fs.readFileSync(path.join(root, 'widgets/budget-manager/src/app/widget.html'), 'utf8');
if (!budgetHtml.includes('class="audit-top-btn"') || !budgetHtml.includes('.audit-log{position:fixed;top:48px;right:0')) {
  errors.push('budget-manager: audit log control/drawer is not anchored to the top right.');
}

const proformaHtml = fs.readFileSync(path.join(root, 'widgets/proforma-manager/src/app/widget.html'), 'utf8');
if (!proformaHtml.includes('btn-new-icon') || !proformaHtml.includes('POLISHED-CREATE-ACTION')) {
  errors.push('proforma-manager: polished New Pro Forma action is missing.');
}
for (const required of [
  'id="vAttachments"',
  'id="btnDashAttachments"',
  'id="btnEdAttachments"',
  'attachmentProformaField:"Pro_Forma"',
  'Create_Proforma_Attachment_Record',
  'Delete_Proforma_Attachment',
  'Get_Proforma_Attachment_Preview'
]) {
  if (!proformaHtml.includes(required)) errors.push(`proforma-manager: Pro Forma attachment workflow is missing ${required}.`);
}
if (!proformaHtml.includes('var files=Array.prototype.slice.call(this.files||[]);') ||
    proformaHtml.indexOf('var files=Array.prototype.slice.call(this.files||[]);') > proformaHtml.indexOf('this.value="";', proformaHtml.indexOf('proformaAttachmentInput'))) {
  errors.push('proforma-manager: attachment files must be snapshotted before clearing the live file input.');
}
if (proformaHtml.includes('View All Pro Formas')) {
  errors.push('proforma-manager: obsolete View All Pro Formas dashboard button is still present.');
}

if (errors.length) {
  console.error('\nWidget JavaScript validation errors:');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Parsed JavaScript and verified critical-error reporting for ${widgets.length} widgets.`);
