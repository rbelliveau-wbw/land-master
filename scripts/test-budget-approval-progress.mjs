import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('widgets/budget-manager/src/app/widget.html', 'utf8');
const backend = fs.readFileSync('creator/functions/handleApprovalAction.dg', 'utf8');
const start = html.indexOf('function inspectApprovalProgress(');
const end = html.indexOf('\nfunction checkApprovalProgress(', start);
assert.ok(start >= 0 && end > start, 'approval progress evaluator exists');

let finished;
const context = {
  queueVerifiedApprovalProgress(_progress, kind, message) { finished = { kind, message }; },
  renderApprovalProgress() {},
  paceApprovalProgress() {},
};
vm.runInNewContext(html.slice(start, end), context);
function inspect(state, final = false) {
  finished = null;
  const progress = { final, targetStep:0 };
  const result = context.inspectApprovalProgress(progress, state);
  return { progress, result, finished };
}
const routed = { currentStatus:'Approved', nextId:'42', nextStatus:'Pending', pendingCount:1, role:'CFO', address:'cfo@example.com', emailSent:true, sentDate:'2026-09-23' };
assert.equal(inspect(routed).finished?.kind, 'success');
assert.match(inspect(routed).finished.message, /Approved and routed to CFO\. Email sent to cfo@example.com\./);
for (const override of [
  { currentStatus:'Pending' }, { nextStatus:'Not Sent' }, { pendingCount:2 },
  { emailSent:false }, { sentDate:'' }, { role:'' }, { address:'' },
]) assert.equal(inspect({ ...routed, ...override }).finished, null, `must not claim routing for ${JSON.stringify(override)}`);

const complete = { currentStatus:'Approved', nextId:'', pendingCount:0, allApproved:true, parentStatus:'Approved', financialFinalized:true };
assert.equal(inspect(complete, true).finished?.kind, 'success');
for (const override of [
  { allApproved:false }, { parentStatus:'Pending' }, { financialFinalized:false }, { pendingCount:1 },
]) assert.equal(inspect({ ...complete, ...override }, true).finished, null, `must not claim finalization for ${JSON.stringify(override)}`);

assert.match(backend, /vAction == "Check" \|\| vAction == "Repair"/);
assert.match(backend, /nextApproval\.Sent_Date=null;/);
assert.match(backend, /progress\.put\("emailSent",nextSentDate != ""\)/);
assert.match(html, /setTimeout\(function\(\) \{ checkApprovalProgress\(p\); \}, 1000\)/);
assert.match(html, /approvalProgressDeadline\(p\); \}, 20000\)/);
const paceStart = html.indexOf('var APPROVAL_PROGRESS_TICK = 560;');
const paceEnd = html.indexOf('\nfunction renderApprovalProgress(', paceStart);
assert.ok(paceStart >= 0 && paceEnd > paceStart, 'paced display exists');
const jobs = [], frames = [];
let pacedFinish;
const paced = { terminal:'', displayStep:0, targetStep:0, visualTimer:null, pendingFinish:null };
const pacing = {
  approvalProgress:paced,
  setTimeout(fn, ms) { jobs.push({ fn, ms }); return jobs.length; },
  clearTimeout() {},
  renderApprovalProgress() { frames.push(paced.displayStep); },
  finishApprovalProgress(_progress, kind, message) { pacedFinish = { kind, message }; },
};
vm.runInNewContext(html.slice(paceStart, paceEnd), pacing);
pacing.queueVerifiedApprovalProgress(paced, 'success', 'Verified');
assert.equal(pacedFinish, undefined, 'success waits for readable phases');
for (let i = 1; i <= 3; i++) {
  const job = jobs.shift();
  assert.equal(job.ms, 560);
  job.fn();
  assert.equal(paced.displayStep, i);
  assert.equal(pacedFinish, undefined);
}
assert.deepEqual(frames, [1, 2, 3]);
const finalJob = jobs.shift();
assert.equal(finalJob.ms, 560);
finalJob.fn();
assert.deepEqual(pacedFinish, { kind:'success', message:'Verified' });
console.log('Budget approval progress verification passed.');
