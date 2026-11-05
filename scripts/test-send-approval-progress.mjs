import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ready as readyContract} from './test-contract-sdk-v2-foundation.mjs';

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
assert.match(contract,/decision:mode===['"]Check['"]\?['"]CHECK_REJECT['"]:['"]REJECT['"]/);
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
const legal=await readyContract({realDOM:true}),oldContractContext=legal.c,legalCalls=[];
let oldLegalBody={success:true,proformaId:'100',message:'Rejected.'};
legal.api.invokeCustomApi=config=>{legalCalls.push(JSON.parse(JSON.stringify(config)));return Promise.resolve({code:3000,result:JSON.stringify(oldLegalBody)});};
const oldLoi={kind:'loireject',pfId:'100',token:'token',note:'test',target:0,step:0};oldContractContext.contractApprovalProgress=oldLoi;
await assert.rejects(oldContractContext.contractProgressCall(oldLoi,'Check'),/targeted approval status/i);
assert.equal(oldLoi.reconciliationUnavailable,true);
assert.equal(legalCalls.at(-1).payload.decision,'CHECK_REJECT');assert.equal(legalCalls.at(-1).payload.proformaId,'100');assert.equal(legalCalls.at(-1).payload.tokenId,'token');
oldLegalBody={success:false,status:'Rejected',message:'This LOI is no longer pending Legal approval.'};
oldLoi.reconciliationUnavailable=false;
await assert.rejects(oldContractContext.contractProgressCall(oldLoi,'Check'),/targeted approval status/i);
assert.equal(oldLoi.reconciliationUnavailable,true);
const oldSend={kind:'send',cid:'500',ids:['10'],target:0,step:0};oldContractContext.contractApprovalProgress=oldSend;oldLegalBody={success:true,message:'Approval sent.'};
await assert.rejects(oldContractContext.contractProgressCall(oldSend,'Check'),/targeted approval status/i);
assert.equal(oldSend.reconciliationUnavailable,true);
assert.equal(legalCalls.at(-1).payload.mode,'Check');assert.deepEqual(legalCalls.at(-1).payload.targetIds,['10']);assert.equal(legalCalls.at(-1).payload.contractId,'500');
const targeted={ok:true,contractId:'500',targetCount:1,parentStatus:'Awaiting Approvals',activeCount:1,sentCount:1,missingCount:0,addresses:['fixture-approver@example.test']};
for(const reply of [JSON.stringify({code:3000,result:JSON.stringify(targeted)}),{code:3000,result:[{code:3000,details:{output:JSON.stringify(targeted)}}]},[{code:3000,result:JSON.stringify(targeted)}],{code:3000,responseText:JSON.stringify({result:[{output:targeted}]})}]){
 legal.api.invokeCustomApi=async config=>{legalCalls.push(JSON.parse(JSON.stringify(config)));return reply;};
 const p={kind:'send',cid:'500',ids:['10'],target:0,step:0};oldContractContext.contractApprovalProgress=p;
 const out=await oldContractContext.contractProgressCall(p,'Check');assert.equal(out.ok,true);assert.equal(out.contractId,'500');assert.equal(out.sentCount,1);assert.equal(p.reconciliationUnavailable,undefined,'targeted native results survive JSON and result-array wrappers');
 assert.equal(legalCalls.at(-1).payload.mode,'Check','wrapper decoding never falls back to Send or Repair');
}
assert.match(budget,/if \(p\.reconciliationUnavailable\) \{\s*finishApprovalProgress\(p, "error"/);
assert.match(proforma,/if\(p\.reconciliationUnavailable\)\{pfApprovalFinish\(p,"error"/);
assert.match(contract,/if\(p\.reconciliationUnavailable\)\{contractProgressFinish\(p,"error"/);
console.log('Approval send and rejection progress verification passed.');

// Execute the actual Budget progress lifecycle with delayed native replies and
// a deterministic clock. Slow mail generation must not look like a failed write.
function progressFunction(name) {
  const start=budget.indexOf('function '+name+'('),next=budget.indexOf(name==='openModificationProgress'?'\n$("approvalProgressClose")':'\nfunction ',start+1);
  assert.ok(start>=0,name);
  return budget.slice(start,next<0?budget.length:next);
}
function pendingReply(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
async function progressTurn(){for(let i=0;i<12;i++)await Promise.resolve();}
function progressHarness(reply=()=>Promise.resolve(goodBudgetStart)) {
  let now=0,serial=0;
  const timers=new Map(),calls=[],nodes=new Map(),listeners={};
  function element(){
    const parts=new Map(),el={children:[],style:{},hidden:false,disabled:false,focus(){},appendChild(child){this.children.push(child);},querySelector(selector){if(!parts.has(selector))parts.set(selector,element());return parts.get(selector);},addEventListener(name,handler){this[name]=handler;},classList:{contains(){return false;},add(){}}};
    let value='';Object.defineProperty(el,'textContent',{get(){return value;},set(v){value=v;el.children=[];}});return el;
  }
  function $(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}
  const c={Promise,Error,Number,String,Math,Date:{now:()=>now},APPROVAL_PROGRESS_TICK:0,S:{modifications:[],edBudget:null},approvalProgress:null,$,
    document:{createElement:element,querySelectorAll:()=>[],activeElement:null,addEventListener(name,handler){listeners[name]=handler;}},
    setTimeout(fn,ms){const id=++serial;timers.set(id,{at:now+ms,fn});return id;},clearTimeout(id){timers.delete(id);},
    auditLog(){},setEdAutosave(){},refreshBudgetWorkflowState:()=>Promise.resolve(),refreshModSurfaces(){},
    requireBudgetModsReady:()=>true,budgetFunctionResultText:r=>typeof r==='string'?r:r.result,
    approvalProgressApi(p,action){calls.push(action);return reply(p,action);},sdkRunBudgetFunction(name,args){calls.push(name);return reply(args,name);}
  };
  vm.createContext(c);
  for(const name of ['approvalProgressButtons','approvalProgressLabels','paceApprovalProgress','queueVerifiedApprovalProgress','renderApprovalProgress','closeApprovalProgress','finishApprovalProgress','approvalProgressDeadline','scheduleApprovalProgressCheck','inspectApprovalProgress','checkApprovalProgress','approvalProgressAttemptCurrent','beginApprovalProgressReconciliation','approvalProgressMutation','startApprovalProgressAttempt','openModificationProgress'])vm.runInContext(progressFunction(name),c);
  c.APPROVAL_PROGRESS_TICK=0;
  const retryStart=budget.indexOf('$("approvalProgressRetry").addEventListener(');
  vm.runInContext(budget.slice(retryStart,budget.indexOf('\ndocument.addEventListener("keydown"',retryStart)),c);
  function progress(kind='start'){
    const p={kind,budgetId:'100',approvalId:'100',track:'Construction',role:'VP',displayStep:0,targetStep:0,terminal:'',timer:null,deadlineTimer:null,visualTimer:null,last:null,repairUsed:false,pendingFinish:null};
    c.approvalProgress=p;return p;
  }
  async function advance(ms){
    const target=now+ms;
    for(;;){const next=[...timers].filter(([,v])=>v.at<=target).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await progressTurn();}
    now=target;await progressTurn();
  }
  return {c,calls,nodes,$,progress,advance,timers};
}
{
  const write=pendingReply(),h=progressHarness((_p,action)=>action==='Start'?write.promise:Promise.resolve(goodBudgetStart)),p=h.progress();
  h.c.startApprovalProgressAttempt(p,true);await h.advance(30000);
  assert.equal(p.terminal,'','a 30s native Start has not failed before its reply');assert.equal(p.writePending,true);assert.equal(h.$('approvalProgressClose').disabled,true);assert.equal(h.$('approvalProgressRetry').hidden,true);assert.deepEqual(h.calls,['Start']);
  assert.equal(h.c.startApprovalProgressAttempt(p,true),false,'a pending write cannot start another attempt');h.c.closeApprovalProgress();assert.equal(h.c.approvalProgress,p);
  write.resolve({code:3000,result:'Approval chain started.'});await progressTurn();await h.advance(1000);
  assert.equal(p.terminal,'success');assert.match(p.message,/routed to VP/);assert.deepEqual(h.calls,['Start','Check'],'slow success is reconciled without resending');
}
{
  const write=pendingReply(),h=progressHarness((_p,action)=>action==='Start'?write.promise:Promise.resolve(goodBudgetStart)),p=h.progress();
  h.c.startApprovalProgressAttempt(p,true);await h.advance(30000);write.reject(new Error('Lost workflow reply'));await progressTurn();await h.advance(1000);
  assert.equal(p.terminal,'success','a lost reply is reconciled from persisted state');assert.deepEqual(h.calls,['Start','Check']);
}
{
  const write=pendingReply(),h=progressHarness((_p,action)=>action==='Start'?write.promise:Promise.resolve({...goodBudgetStart,parentStatus:'Not Sent',firstStatus:'Not Sent',pendingCount:0,emailSent:false,sentDate:''})),p=h.progress();
  h.c.startApprovalProgressAttempt(p,true);await h.advance(30000);write.resolve({code:3000});await progressTurn();await h.advance(19999);
  assert.equal(p.terminal,'','settled write receives its own full reconciliation window');await h.advance(1);assert.equal(p.terminal,'error');assert.equal(h.$('approvalProgressClose').disabled,false);assert.equal(h.calls.filter(x=>x==='Start').length,1);
}
{
  const repair=pendingReply(),h=progressHarness((_p,action)=>action==='Repair'?repair.promise:Promise.resolve({...goodBudgetStart,emailSent:false,sentDate:''})),p=h.progress();
  h.c.startApprovalProgressAttempt(p,false);h.c.scheduleApprovalProgressCheck(p);await h.advance(5000);
  assert.equal(p.writePending,true);assert.equal(h.calls.filter(x=>x==='Repair').length,1);await h.advance(30000);assert.equal(p.terminal,'','a slow guarded repair cannot expose Retry while it is sending');assert.equal(h.$('approvalProgressClose').disabled,true);
  repair.resolve(goodBudgetStart);await progressTurn();await h.advance(0);assert.equal(p.terminal,'success');assert.equal(h.calls.filter(x=>x==='Repair').length,1);
}
{
  const write=pendingReply();let checks=0;
  const empty={...goodBudgetStart,parentStatus:'Not Sent',firstStatus:'Not Sent',pendingCount:0,emailSent:false,sentDate:''};
  const h=progressHarness((_p,action)=>action==='Start'?write.promise:Promise.resolve(++checks===1?empty:goodBudgetStart)),p=h.progress();p.terminal='error';
  h.$('approvalProgressRetry').click();await progressTurn();assert.deepEqual(h.calls,['Check','Start'],'retry checks saved state before starting');await h.advance(30000);assert.equal(p.terminal,'');assert.equal(p.writePending,true);
  write.resolve({code:3000});await progressTurn();await h.advance(1000);assert.equal(p.terminal,'success');assert.equal(h.calls.filter(x=>x==='Start').length,1);
}
{
  const old=pendingReply();let count=0;
  const h=progressHarness(()=>++count===1?old.promise:Promise.resolve(goodBudgetStart)),p=h.progress();
  h.c.startApprovalProgressAttempt(p,false);h.c.checkApprovalProgress(p);await h.advance(20000);assert.equal(p.terminal,'error');
  h.c.startApprovalProgressAttempt(p,false);old.resolve(goodBudgetStart);await progressTurn();assert.equal(p.last,null,'late success from an expired attempt cannot finish the retry');assert.equal(p.terminal,'');
  h.c.checkApprovalProgress(p);await progressTurn();await h.advance(0);assert.equal(p.terminal,'success');
}
{
  const create=pendingReply(),h=progressHarness(()=>Promise.resolve({...goodMod,modificationId:'300'}));
  h.c.openModificationProgress('','100',null,()=>create.promise);const p=h.c.approvalProgress;await h.advance(30000);
  assert.equal(p.terminal,'');assert.equal(p.writePending,true);assert.equal(h.$('approvalProgressClose').disabled,true);assert.deepEqual(h.calls,[],'external modification create does not poll before it returns an ID');
  create.resolve({result:'Modification 300 submitted.'});await progressTurn();await h.advance(1000);assert.equal(p.modificationId,'300');assert.equal(p.terminal,'success');assert.deepEqual(h.calls,['Check']);
}
{
  const oldRead=pendingReply(),newRead=pendingReply(),h=progressHarness(()=>Promise.resolve(goodMod)),p=h.progress('modification');
  let reads=0;p.modificationId='';p.knownIds=[];p.terminal='error';
  h.c.refreshBudgetWorkflowState=()=>++reads===1?oldRead.promise:newRead.promise;
  h.c.lookupMatchesId=(value,id)=>String(value&&value.ID||value)===id;
  h.$('approvalProgressRetry').click();await h.advance(20000);assert.equal(p.terminal,'error');
  h.$('approvalProgressRetry').click();oldRead.reject(new Error('Old list read failed'));await progressTurn();
  assert.equal(p.terminal,'','late identification failure cannot terminate the next retry');
  h.c.S.modifications=[{ID:'300',Budget:'100'}];newRead.resolve();await progressTurn();await h.advance(1000);assert.equal(p.terminal,'success');assert.equal(p.modificationId,'300');
}
console.log('Budget pending native writes, post-settlement deadlines, one-shot repair, read-first retries, stale checks and delayed modification creation passed.');
