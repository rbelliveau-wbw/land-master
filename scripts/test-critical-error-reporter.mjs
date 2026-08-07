import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { setTimeout as wait } from 'node:timers/promises';

const source = fs.readFileSync(path.join(process.cwd(), 'widgets/budget-manager/src/app/critical-error-reporter.js'), 'utf8');
const calls = [];
const window = {
  location: { href:'https://example.test/widget/' },
  navigator: { userAgent:'critical-error-reporter-test' },
  console,
  Promise,
  setTimeout,
  clearTimeout,
  Date,
  Math,
  JSON,
  Error,
  ZOHO: {
    CREATOR: {
      API: {
        invokeCustomApi(config) {
          calls.push(config);
          return Promise.resolve({ result:JSON.stringify({ success:true }) });
        }
      }
    }
  }
};
window.window = window;

vm.runInNewContext(source, window, { filename:'critical-error-reporter.js' });
window.LMCriticalErrors.configure({
  widget:'Test Widget', version:'1.2.3', code:'TST',
  apiCandidates:['Report_Proforma_Widget_Error'],
  getContext:() => ({ view:'test', recordId:'123' })
});
window.LMCriticalErrors.markReady();
window.LMCriticalErrors.breadcrumb('info', 'Before failure', { step:'load' });
window.LMCriticalErrors.breadcrumb('error', 'Synthetic critical failure', { tokenId:'must-not-leak', detail:'broken payload' }, true);
await wait(1400);

assert.equal(calls.length, 1, 'one critical error should produce one API call');
assert.equal(calls[0].api_name, 'Report_Proforma_Widget_Error');
const report = JSON.parse(calls[0].payload.payload);
assert.match(report.body, /LLM FIX REQUEST/);
assert.match(report.body, /Synthetic critical failure/);
assert.match(report.body, /Before failure/);
assert.match(report.body, /\[redacted\]/);
assert.doesNotMatch(report.body, /must-not-leak/);

window.LMCriticalErrors.breadcrumb('error', 'Synthetic critical failure', { tokenId:'must-not-leak', detail:'broken payload' }, true);
await wait(1400);
assert.equal(calls.length, 1, 'duplicate errors should be suppressed for ten minutes');

console.log('Critical-error reporter batching, LLM body, redaction, and deduplication passed.');
