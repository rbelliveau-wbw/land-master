import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const budget = fs.readFileSync('widgets/budget-manager/src/app/widget.html', 'utf8');
const proforma = fs.readFileSync('widgets/proforma-manager/src/app/widget.html', 'utf8');
const modAdmin = fs.readFileSync('creator/functions/modificationAdmin.dg', 'utf8');
const pfStart = fs.readFileSync('creator/functions/Start_Proforma_Approval_Chain.dg', 'utf8');

let finished;
const budgetContext = { queueVerifiedApprovalProgress(_p, kind, message) { finished = {kind, message}; }, renderApprovalProgress() {}, paceApprovalProgress() {} };
vm.runInNewContext(budget.slice(budget.indexOf('function inspectApprovalProgress('), budget.indexOf('\nfunction checkApprovalProgress(')), budgetContext);
const goodMod = {status:'Submitted', rowCount:2, firstStatus:'Pending', pendingCount:1, approvedCount:0, sentDate:'2026-09-24', role:'VP', address:'vp@example.com'};
function checkMod(override) { finished = null; budgetContext.inspectApprovalProgress({kind:'modification', targetStep:0}, {...goodMod, ...override}); return finished; }
assert.match(checkMod({}).message, /Submitted and routed to VP\. Email sent to vp@example.com\./);
for (const override of [{status:'Draft'}, {rowCount:0}, {firstStatus:'Not Sent'}, {pendingCount:2}, {approvedCount:1}, {sentDate:''}, {role:''}, {address:''}]) {
  assert.equal(checkMod(override), null, `modification must not claim delivery for ${JSON.stringify(override)}`);
}

const pfContext = {};
vm.runInNewContext(proforma.slice(proforma.indexOf('function pfApprovalValid('), proforma.indexOf('\nfunction pfApprovalRender(')), pfContext);
const goodPf = {status:'Pending Approval', locked:true, rowCount:4, pendingCount:1, approvedCount:0, firstStatus:'Pending', sentDate:'2026-09-24', role:'VP', address:'vp@example.com'};
assert.equal(pfContext.pfApprovalValid(goodPf), true);
for (const override of [{status:'Draft'}, {locked:false}, {rowCount:0}, {pendingCount:2}, {approvedCount:1}, {firstStatus:'Not Sent'}, {sentDate:''}, {role:''}, {address:''}]) {
  assert.equal(pfContext.pfApprovalValid({...goodPf, ...override}), false, `Pro Forma must not claim delivery for ${JSON.stringify(override)}`);
}
assert.match(budget, /data-modsubmit[\s\S]*?openModificationProgress\(modId/);
assert.match(budget, /openModificationProgress\("", b\.ID, trigger/);
assert.match(budget, /setTimeout\(function\(\) \{ checkApprovalProgress\(p\); \}, 1000\)/);
assert.match(proforma, /pfApprovalSnapshot\(p\.id,"Check"\)/);
assert.match(proforma, /p\.repairUsed=true;pfApprovalSnapshot\(p\.id,"Repair"\)/);
assert.match(modAdmin, /Budget_Approvals\[Budget_Modification == vModId && Type1 == "Modification"\]/);
assert.match(pfStart, /Budget_Approvals\[Proforma == proformaIdLong\]/);
console.log('Send for approvals progress verification passed.');
