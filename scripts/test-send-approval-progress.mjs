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
const pfAction = fs.readFileSync('creator/functions/Handle_Proforma_Approval_Action.dg', 'utf8');
const loiReview = fs.readFileSync('creator/functions/Review_LOI_Request.dg', 'utf8');

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
const goodBudgetReject={currentStatus:'Rejected',previousId:'99',previousStatus:'Pending',pendingCount:1,parentStatus:'Pending',emailSent:true,sentDate:'2026-09-24',role:'VP',address:'vp@example.com'};
function checkBudgetReject(override){finished=null;budgetContext.inspectApprovalProgress({kind:'reject',targetStep:0},{...goodBudgetReject,...override});return finished;}
assert.match(checkBudgetReject({}).message,/Rejected and returned to VP\. Email sent to vp@example.com\./);
for(const override of [{currentStatus:'Pending'},{previousId:''},{previousStatus:'Approved'},{pendingCount:2},{parentStatus:'Not Sent'},{emailSent:false},{sentDate:''},{role:''},{address:''}]){
  assert.equal(checkBudgetReject(override),null,`Budget reject must not claim delivery for ${JSON.stringify(override)}`);
}
const goodModReject={status:'Rejected',currentStatus:'Rejected',noteMatches:true,pendingCount:0,approvedCount:1};
function checkModReject(override,emailOutcome='sent'){finished=null;budgetContext.inspectApprovalProgress({kind:'modreject',targetStep:0,emailOutcome},{...goodModReject,...override});return finished;}
assert.match(checkModReject({}).message,/Modification rejected\. Prior approvers notified\./);
assert.equal(checkModReject({status:'Submitted'}),null);
assert.equal(checkModReject({currentStatus:'Pending'}),null);
assert.equal(checkModReject({noteMatches:false}),null);
assert.equal(checkModReject({pendingCount:1}),null);
assert.equal(checkModReject({},'unknown').kind,'warning');

const pfContext = {};
vm.runInNewContext(proforma.slice(proforma.indexOf('function pfApprovalValid('), proforma.indexOf('\nfunction pfApprovalRender(')), pfContext);
const goodPf = {status:'Pending Approval', locked:true, rowCount:4, pendingCount:1, approvedCount:0, firstStatus:'Pending', sentDate:'2026-09-24', role:'VP', address:'vp@example.com'};
assert.equal(pfContext.pfApprovalValid(goodPf), true);
for (const override of [{status:'Draft'}, {locked:false}, {rowCount:0}, {pendingCount:2}, {approvedCount:1}, {firstStatus:'Not Sent'}, {sentDate:''}, {role:''}, {address:''}]) {
  assert.equal(pfContext.pfApprovalValid({...goodPf, ...override}), false, `Pro Forma must not claim delivery for ${JSON.stringify(override)}`);
}
const pfRejectContext={pfApprovalProgress:null,pfApprovalRender(){},pfApprovalPace(){},clearTimeout(){}};
vm.runInNewContext(proforma.slice(proforma.indexOf('function pfApprovalInspect('),proforma.indexOf('function pfApprovalSchedule(')),pfRejectContext);
const goodPfReject={status:'Pending Approval',currentStatus:'Rejected',noteMatches:true,isFirst:false,firstStatus:'Pending',pendingCount:1,approvedCount:0,sentDate:'2026-09-24',role:'VP',address:'vp@example.com'};
function checkPfReject(override,opts={}){
  const p={kind:'reject',targetStep:0,pendingFinish:null,initialSentDate:'2026-09-23',writeAcknowledged:false,...opts};
  pfRejectContext.pfApprovalProgress=p;
  const verified=pfRejectContext.pfApprovalInspect(p,{...goodPfReject,...override});
  return {verified,result:p.pendingFinish};
}
assert.equal(checkPfReject({}).result.kind,'success');
for(const override of [{currentStatus:'Pending'},{noteMatches:false},{status:'Draft'},{firstStatus:'Not Sent'},{pendingCount:2},{approvedCount:1},{sentDate:''},{role:''},{address:''}]){
  assert.equal(checkPfReject(override).verified,false,`Pro Forma reject must not claim delivery for ${JSON.stringify(override)}`);
}
assert.equal(checkPfReject({currentStatus:'Pending',isFirst:true,sentDate:'2026-09-23'}).verified,false,'A saved first-row note and old delivery stamp do not prove rejection');
assert.equal(checkPfReject({currentStatus:'Pending',isFirst:true}, {writeAcknowledged:true}).verified,true);
assert.match(budget, /data-modsubmit[\s\S]*?openModificationProgress\(modId/);
assert.match(budget, /openModificationProgress\("", b\.ID, trigger/);
assert.match(budget, /setTimeout\(function\(\) \{ checkApprovalProgress\(p\); \}, 1000\)/);
assert.match(proforma, /pfProgressSnapshot\(p,"Check"\)/);
assert.match(proforma, /p\.repairUsed=true;pfProgressSnapshot\(p,"Repair"\)/);
assert.match(proforma, /executeRejectProformaApproval\(id,aid,note\|\|"",document\.activeElement\)/);
assert.match(pfAction, /actionText == "CheckReject" \|\| actionText == "RepairReject"/);
assert.match(pfAction, /firstRow\.Sent_Date=null;/);
assert.match(modAdmin, /Budget_Approvals\[Budget_Modification == vModId && Type1 == "Modification"\]/);
assert.match(pfStart, /Budget_Approvals\[Proforma == proformaIdLong\]/);
assert.match(budget, /return openBudgetStartProgress\(bid, typ, document\.activeElement\)/);
assert.match(budgetAction, /vAction == "CheckStart" \|\| vAction == "RepairStart"/);
assert.match(budgetAction, /vAction == "CheckReject" \|\| vAction == "RepairReject"/);
assert.match(budgetAction, /ar\.Sent_Date=null;/);
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
function checkLoiReject(override,emailOutcome='sent'){
  const p={kind:'loireject',target:0,step:0,terminal:'',timer:null,deadline:null,pendingResult:null,emailOutcome,address:'owner@example.com'};
  contractContext.contractApprovalProgress=p;
  const verified=contractContext.contractProgressInspect(p,{status:'Rejected',noteMatches:true,tokenCleared:true,...override});
  return {verified,result:p.pendingResult};
}
assert.equal(checkLoiReject({}).result.kind,'success');
assert.equal(checkLoiReject({},'unknown').result.kind,'warning');
for(const override of [{status:'Pending Approval'},{noteMatches:false},{tokenCleared:false}]){
  assert.equal(checkLoiReject(override).verified,false,`LOI reject must not claim a return for ${JSON.stringify(override)}`);
}
assert.match(contractSend,/mode == "Check" \|\| mode == "Repair"/);
assert.match(contractSend,/targetRow\.Last_Reminder_Date != null/);
assert.match(contract,/p\.timer=setTimeout\(function\(\)\{contractProgressCheck\(p\);\},1000\)/);
assert.match(contract,/p\.deadline=setTimeout\(function\(\)\{contractProgressDeadline\(p\);\},20000\)/);
assert.match(contract,/LOI_REJECT_LABELS=\["Recording Legal rejection"/);
assert.match(contract,/decision:mode==="Check"\?"CHECK_REJECT":"REJECT"/);
assert.match(loiReview,/"CHECK_REJECT"/);
assert.match(modAdmin,/vAction == "check-reject" \|\| vAction == "repair-reject"/);
// An older Creator function can accept the decision but return plain text for
// the new check mode. This must stop reconciliation rather than poll until timeout.
const oldBudgetResponse={code:3000,result:'Development CFO is currently Rejected. No action was taken because this approval is not Pending.'};
const budgetApiContext={sdkRunBudgetFunction(){return Promise.resolve(oldBudgetResponse);}};
vm.runInNewContext(budget.slice(budget.indexOf('function approvalProgressPayload('),budget.indexOf('function approvalProgressButtons(')),budgetApiContext);
for(const kind of ['reject','modreject']){
  const p={kind,budgetId:'100',approvalId:'200',modificationId:'300',note:'test'};
  await assert.rejects(budgetApiContext.approvalProgressApi(p,'Check'),/targeted approval status/i);
  assert.equal(p.reconciliationUnavailable,true,`${kind} must flag an outdated Creator check`);
}
const oldPfContext={S:{liveSDK:true},invokeProformaApprovalApi(){return Promise.resolve({success:true,message:'Approval is not Pending.'});}};
vm.runInNewContext(proforma.slice(proforma.indexOf('function pfRejectSnapshot('),proforma.indexOf('function pfApprovalSnapshot(')),oldPfContext);
const oldPf={kind:'reject',id:'100',approvalId:'200',note:'test'};
await assert.rejects(oldPfContext.pfProgressSnapshot(oldPf,'Check'),/targeted Pro Forma approval status/i);
assert.equal(oldPf.reconciliationUnavailable,true);
oldPfContext.invokeProformaApprovalApi=()=>Promise.resolve({success:false,message:'Approval is not Pending.'});
oldPf.reconciliationUnavailable=false;
await assert.rejects(oldPfContext.pfProgressSnapshot(oldPf,'Check'),/targeted Pro Forma approval status/i);
assert.equal(oldPf.reconciliationUnavailable,true);
const oldContractContext={CFG:{customApis:{reviewLOI:'Review_LOI_Request',sendContractApprovals:'Send_Contract_Approvals'}},S:{currentUser:'user@example.com'},window:{},sdkInvoke(){return Promise.resolve({success:true,proformaId:'100',message:'Rejected.'});},unwrapApi(resp){return resp;}};
vm.runInNewContext(contract.slice(contract.indexOf('function contractProgressMissingCheck('),contract.indexOf('function contractProgressRender(')),oldContractContext);
const oldLoi={kind:'loireject',pfId:'100',token:'token',note:'test'};
await assert.rejects(oldContractContext.contractProgressCall(oldLoi,'Check'),/targeted approval status/i);
assert.equal(oldLoi.reconciliationUnavailable,true);
oldContractContext.sdkInvoke=()=>Promise.resolve({success:false,status:'Rejected',message:'This LOI is no longer pending Legal approval.'});
oldLoi.reconciliationUnavailable=false;
await assert.rejects(oldContractContext.contractProgressCall(oldLoi,'Check'),/targeted approval status/i);
assert.equal(oldLoi.reconciliationUnavailable,true);
const oldSend={kind:'send',cid:'500',ids:['10']};
await assert.rejects(oldContractContext.contractProgressCall(oldSend,'Check'),/targeted approval status/i);
assert.equal(oldSend.reconciliationUnavailable,true);
assert.match(budget,/if \(p\.reconciliationUnavailable\) \{\s*finishApprovalProgress\(p, "error"/);
assert.match(proforma,/if\(p\.reconciliationUnavailable\)\{pfApprovalFinish\(p,"error"/);
assert.match(contract,/if\(p\.reconciliationUnavailable\)\{contractProgressFinish\(p,"error"/);
console.log('Approval send and rejection progress verification passed.');
