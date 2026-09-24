import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const budget = fs.readFileSync('widgets/budget-manager/src/app/widget.html', 'utf8');
const proforma = fs.readFileSync('widgets/proforma-manager/src/app/widget.html', 'utf8');
const contract = fs.readFileSync('widgets/contract-management/src/app/widget.html', 'utf8');
const modAdmin = fs.readFileSync('creator/functions/modificationAdmin.dg', 'utf8');
const pfStart = fs.readFileSync('creator/functions/Start_Proforma_Approval_Chain.dg', 'utf8');
const budgetStart = fs.readFileSync('creator/functions/startApprovalChain.dg', 'utf8');
const budgetAction = fs.readFileSync('creator/functions/handleApprovalAction.dg', 'utf8');
const contractSend = fs.readFileSync('creator/functions/Send_Contract_Approvals.dg', 'utf8');

let finished;
const budgetContext = { queueVerifiedApprovalProgress(_p, kind, message) { finished = {kind, message}; }, renderApprovalProgress() {}, paceApprovalProgress() {} };
vm.runInNewContext(budget.slice(budget.indexOf('function inspectApprovalProgress('), budget.indexOf('\nfunction checkApprovalProgress(')), budgetContext);
const goodMod = {status:'Submitted', rowCount:2, firstStatus:'Pending', pendingCount:1, approvedCount:0, sentDate:'2026-09-24', role:'VP', address:'vp@example.com'};
function checkMod(override) { finished = null; budgetContext.inspectApprovalProgress({kind:'modification', targetStep:0}, {...goodMod, ...override}); return finished; }
assert.match(checkMod({}).message, /Submitted and routed to VP\. Email sent to vp@example.com\./);
for (const override of [{status:'Draft'}, {rowCount:0}, {firstStatus:'Not Sent'}, {pendingCount:2}, {approvedCount:1}, {sentDate:''}, {role:''}, {address:''}]) {
  assert.equal(checkMod(override), null, `modification must not claim delivery for ${JSON.stringify(override)}`);
}
const goodBudgetStart = {parentStatus:'Pending',rowCount:3,firstId:'100',firstStatus:'Pending',pendingCount:1,approvedCount:0,emailSent:true,sentDate:'2026-09-24',role:'VP',address:'vp@example.com'};
function checkBudgetStart(override) { finished=null; budgetContext.inspectApprovalProgress({kind:'start',approvalId:'100',targetStep:0},{...goodBudgetStart,...override}); return finished; }
assert.match(checkBudgetStart({}).message,/Approvals started and routed to VP\. Email sent to vp@example.com\./);
for (const override of [{parentStatus:'Not Sent'},{rowCount:0},{firstId:'wrong'},{firstStatus:'Not Sent'},{pendingCount:2},{approvedCount:1},{emailSent:false},{sentDate:''},{role:''},{address:''}]) {
  assert.equal(checkBudgetStart(override),null,`Budget start must not claim delivery for ${JSON.stringify(override)}`);
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
assert.match(budget, /return openBudgetStartProgress\(bid, typ, document\.activeElement\)/);
assert.match(budgetAction, /vAction == "CheckStart" \|\| vAction == "RepairStart"/);
assert.match(budgetStart, /firstApproval\.Sent_Date=null;/);
assert.match(budgetStart, /approval track is already active/);
const contractContext={contractApprovalProgress:null,contractProgressRender(){},contractProgressPace(){},clearTimeout(){}};
vm.runInNewContext(contract.slice(contract.indexOf('function contractProgressInspect('),contract.indexOf('\nfunction contractProgressSchedule(')),contractContext);
const goodContract={parentStatus:'Awaiting Approvals',contractId:'500',targetCount:2,activeCount:2,sentCount:2,missingCount:0,addresses:['vp@example.com','cfo@example.com']};
function checkContract(override){
  const p={cid:'500',ids:['10','11'],target:0,step:0,terminal:'',timer:null,deadline:null,pendingResult:null};
  contractContext.contractApprovalProgress=p;
  const verified=contractContext.contractProgressInspect(p,{...goodContract,...override});
  return {verified,result:p.pendingResult};
}
assert.equal(checkContract({}).verified,true);
for(const override of [{parentStatus:'Draft'},{activeCount:1},{sentCount:1},{missingCount:1},{addresses:['vp@example.com','']}]) {
  assert.equal(checkContract(override).verified,false,`Contract send must not claim delivery for ${JSON.stringify(override)}`);
}
assert.match(contractSend,/mode == "Check" \|\| mode == "Repair"/);
assert.match(contractSend,/targetRow\.Last_Reminder_Date != null/);
assert.match(contract,/p\.timer=setTimeout\(function\(\)\{contractProgressCheck\(p\);\},1000\)/);
assert.match(contract,/p\.deadline=setTimeout\(function\(\)\{contractProgressDeadline\(p\);\},20000\)/);
console.log('Send for approvals progress verification passed.');
