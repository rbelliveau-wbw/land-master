import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,ACCESS,NEW} from './test-contract-sdk-v2-foundation.mjs';

const APR=(BigInt(NEW)+70n).toString(),SECOND=(BigInt(NEW)+71n).toString();
const OTHER=(BigInt(NEW)+72n).toString(),OTHER_APR=(BigInt(NEW)+73n).toString();
const ATT=(BigInt(NEW)+74n).toString();
const copy=value=>JSON.parse(JSON.stringify(value));
const row=(id,parent,email,sequence=1)=>({ID:id,Contract1:{ID:parent,zc_display_value:'Fixture contract'},Approver:email,Type1:'Contract Approval',Approval_Email:true,Status:'Not Sent',Approval_Sequence:sequence});
const localRows=h=>copy(h.c.S.approvals);
const body=h=>{const el=h.c.document.querySelector('#overlays .modal-body');return el?[el.innerHTML,el.textContent,...el.querySelectorAll('input').map(input=>input.value)].join(' '):'';};
const send=h=>h.c.document.querySelector('#overlays .apr-send');
const approvalReads=h=>h.calls.filter(call=>call.method==='records'&&call.config.report_name==='All_Contract_Approvals');
const writes=h=>h.calls.filter(call=>['add','update','delete'].includes(call.method)||call.method==='custom'&&call.config.api_name.startsWith('Send_Contract_Approvals'));

function fixture(h){
 h.flags.users[0].userName='authoritative-creator-user';h.c.S.users=copy(h.flags.users);
 const unrelated=row(OTHER_APR,OTHER,'unrelated@example.test');
 h.c.S.approvals=[row(APR,ID,'pshepherd@example.test'),copy(unrelated)];
 h.reports.All_Contract_Approvals=[row(APR,ID,'first-vp@example.test'),row(SECOND,ID,'second-vp@example.test',2),copy(unrelated)];
 h.c.S.versions=[{ID:ATT,Contract1:{ID},Email_Attachment:true,File_field1:'/fixture.pdf'}];
 const parent={...copy(h.reports.All_Contracts1[0]),ID:OTHER,Contract_Name:'Other fixture contract'};
 h.reports.All_Contracts1.push(parent);h.c.S.contracts.push(copy(parent));
}

// Hold the actual counted SDK response after it has captured the old server data.
// Later reads can complete, making stale-result tests distinguish real instances.
function holdNextApprovalRead(h,cid=ID){
 const native=h.api.getRecords,gate=deferred();let captured=false;
 h.api.getRecords=async config=>{
  const response=await native(config);
  if(!captured&&config.report_name==='All_Contract_Approvals'&&config.criteria==='(Contract1 == '+cid+')'){
   captured=true;await gate.promise;
  }
  return response;
 };
 return {release:()=>gate.resolve(),captured:()=>captured};
}

{
 const h=await ready({realDOM:true});fixture(h);const gate=holdNextApprovalRead(h),before=writes(h).length;
 h.c.showApprovalsModal(ID);await drain();
 assert.equal(gate.captured(),true,'first open performs an exact-parent approval read');
 assert.equal(send(h)?.disabled,true,'Send is disabled while the native route is loading');
 assert.doesNotMatch(body(h),/pshepherd@example\.test/,'loading hides the stale cached approver');
 gate.release();await drain();
 assert.deepEqual(localRows(h).filter(a=>h.c.lookupId(a.Contract1)===ID).map(a=>a.Approver),['first-vp@example.test','second-vp@example.test']);
 assert.deepEqual(localRows(h).find(a=>a.ID===OTHER_APR),row(OTHER_APR,OTHER,'unrelated@example.test'),'refresh merges only the captured parent');
 assert.match(body(h),/first-vp@example\.test/);assert.match(body(h),/second-vp@example\.test/);
 assert.equal(send(h)?.disabled,false,'the fully loaded valid route can be sent');
 assert.equal(writes(h).length,before,'opening the modal is read-only');
 assert.ok(approvalReads(h).every(call=>call.config.criteria==='(Contract1 == '+ID+')'),'no broad approval reload');
 const routeReads=()=>approvalReads(h).filter(call=>call.config.criteria==='(Contract1 == '+ID+')').length,reads=routeReads();
 h.c.showApprovalsModal(ID,'attachments');h.c.showApprovalsModal(ID,'approvers');await drain();
 assert.equal(routeReads(),reads,'same mounted tabs reuse the loaded route');
 await h.c.aprToggleEmail(APR);await drain();
 assert.equal(routeReads(),reads,'the actual optimistic email toggle does not refetch the whole route');
 assert.equal(h.c.truthy(h.c.findApproval(APR).Approval_Email),false,'repaint retains the native saved toggle value');
}

{
 const h=await ready({realDOM:true});fixture(h);h.c.showApprovalsModal(ID);await drain();
 h.reports.All_Contract_Approvals=h.reports.All_Contract_Approvals.filter(a=>a.ID!==SECOND);
 const third=(BigInt(SECOND)+100n).toString();h.reports.All_Contract_Approvals.push(row(third,ID,'newly-assigned-vp@example.test',2));
 const gate=holdNextApprovalRead(h),before=writes(h).length,pending=h.c.aprSend(ID);await drain();
 assert.equal(gate.captured(),true,'Send reads the current parent route again');
 assert.equal(h.c.pendingConfirm,null,'confirmation cannot list cached recipients while refresh is pending');
 assert.equal(writes(h).length,before,'pre-send refresh does not invoke Send');
 gate.release();await Promise.resolve(pending);await drain();
 assert.equal(typeof h.c.pendingConfirm,'function','confirmation opens only after the current route is read');
 assert.match(body(h),/first-vp@example\.test/);assert.match(body(h),/newly-assigned-vp@example\.test/);
 assert.doesNotMatch(body(h),/second-vp@example\.test/);
 assert.deepEqual(localRows(h).filter(a=>h.c.lookupId(a.Contract1)===ID).map(a=>a.ID),[APR,third]);
 assert.equal(writes(h).length,before,'displaying the confirmation sends no email');
 h.c.closeOverlays();await drain();
}

{
 const h=await ready({realDOM:true});fixture(h);h.c.showApprovalsModal(ID);await drain();
 const native=h.api.getRecords;
 h.api.getRecords=async config=>{if(config.report_name==='All_Contract_Approvals'&&config.criteria==='(Contract1 == '+ID+')')throw {code:2898,message:'Approval route denied'};return native(config);};
 const before=writes(h).length;
 await h.c.aprSend(ID);await drain();
 assert.equal(h.c.pendingConfirm,null,'a denied pre-send read cannot confirm the cached route');
 assert.equal(send(h)?.disabled,true,'a failed pre-send read keeps Send disabled');
 assert.doesNotMatch(body(h),/first-vp@example\.test/,'a failed pre-send read hides cached recipients');
 assert.equal(writes(h).length,before,'a failed pre-send refresh sends no email');
}

for(const invalid of ['denied','foreign-parent','duplicate-id']){
 const h=await ready({realDOM:true});fixture(h);const native=h.api.getRecords;let fail=true;
 h.api.getRecords=async config=>{
  const response=await native(config);
  if(!fail||config.report_name!=='All_Contract_Approvals'||config.criteria!=='(Contract1 == '+ID+')')return response;
  if(invalid==='denied')throw {code:2898,message:'Approval route denied'};
  const data=copy(response.data);
  if(invalid==='foreign-parent')data[0].Contract1={ID:OTHER};
  else data[1].ID=data[0].ID;
  return {...response,data};
 };
 h.c.showApprovalsModal(ID);await drain();
 assert.equal(send(h)?.disabled,true,invalid+' keeps Send disabled');
 assert.doesNotMatch(body(h),/pshepherd@example\.test/,'failed reads hide cached recipients');
 assert.match(body(h),/retry|try again|unavailable|could not|failed/i,'failed reads have a visible recovery state');
 assert.equal(writes(h).length,0,'invalid reads perform no writes');
 fail=false;h.c.aprRefreshApprovals(ID);await drain();
 assert.match(body(h),/second-vp@example\.test/,'explicit Retry can recover the current route');
 assert.equal(send(h)?.disabled,false);
}

{
 const h=await ready({realDOM:true});fixture(h);const gate=holdNextApprovalRead(h);
 h.c.showApprovalsModal(ID);await drain();assert.equal(gate.captured(),true);
 h.tick(20000);await drain();
 assert.equal(send(h)?.disabled,true,'a hung route read reaches a bounded error with Send disabled');
 assert.match(body(h),/try again/i,'timeout exposes explicit recovery');
 gate.release();await drain();
 assert.equal(localRows(h).some(a=>a.Approver==='second-vp@example.test'),false,'the late timed-out reply cannot commit its route');
 assert.doesNotMatch(body(h),/first-vp@example\.test/,'the late reply cannot replace the timeout recovery state');
 h.reports.All_Contract_Approvals.find(a=>a.ID===APR).Approver='retried-vp@example.test';
 await h.c.aprRefreshApprovals(ID);await drain();
 assert.match(body(h),/retried-vp@example\.test/);assert.match(body(h),/second-vp@example\.test/);
 assert.equal(send(h)?.disabled,false,'explicit Retry reads the current route and recovers');
 assert.equal(writes(h).length,0,'timeout and Retry perform no writes');
}

for(const invalid of ['denied','missing','foreign-id']){
 const h=await ready({realDOM:true});fixture(h);const native=h.api.getRecords;let fail=true;
 h.api.getRecords=async config=>{
  const response=await native(config);
  if(!fail||config.report_name!=='All_Contracts1'||config.criteria!=='(ID == '+ID+')')return response;
  if(invalid==='denied')throw {code:2898,message:'Parent denied'};
  return {...response,data:invalid==='missing'?[]:[{...copy(response.data[0]),ID:OTHER}]};
 };
 h.c.showApprovalsModal(ID);await drain();
 assert.equal(send(h)?.disabled,true,'a '+invalid+' parent read blocks Send');
 assert.doesNotMatch(body(h),/pshepherd@example\.test/,'an unavailable parent cannot expose its cached route');
 assert.equal(h.c.findApproval(APR).Approver,'pshepherd@example.test','approval rows cannot commit without the captured native parent');
 assert.match(body(h),/try again/i);
 fail=false;await h.c.aprRefreshApprovals(ID);await drain();
 assert.match(body(h),/second-vp@example\.test/,'Retry recovers only after parent identity is available');
 assert.equal(send(h)?.disabled,false);assert.equal(writes(h).length,0);
}

for(const change of ['close','actor','generation']){
 const h=await ready({realDOM:true});fixture(h);const gate=holdNextApprovalRead(h);
 h.c.showApprovalsModal(ID);await drain();assert.equal(gate.captured(),true);
 if(change==='close')h.c.closeOverlays();
 else if(change==='actor')h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'other@example.test'});
 else h.c.S.contractDataGeneration++;
 gate.release();await drain();
 assert.equal(localRows(h).some(a=>a.Approver==='second-vp@example.test'),false,change+' excludes an old modal result');
 if(change==='close')assert.equal(h.c.document.querySelector('#overlays .modal-back'),null,'a late result cannot reopen the closed modal');
 assert.equal(writes(h).length,0);
}

{
 const h=await ready({realDOM:true});fixture(h);const gate=holdNextApprovalRead(h);
 h.c.showApprovalsModal(ID);await drain();h.c.closeOverlays();h.c.showApprovalsModal(OTHER);await drain();
 assert.match(body(h),/unrelated@example\.test/);
 gate.release();await drain();
 assert.equal(h.c.S.aprCid,OTHER);assert.match(body(h),/unrelated@example\.test/);
 assert.doesNotMatch(body(h),/first-vp@example\.test/,'the old parent cannot replace the current modal');
 assert.equal(localRows(h).some(a=>a.Approver==='second-vp@example.test'),false,'the old parent read cannot mutate the shared model');
}

{
 const h=await ready({realDOM:true});fixture(h);const gate=holdNextApprovalRead(h);
 h.c.showApprovalsModal(ID);await drain();h.c.closeOverlays();h.c.showApprovalsModal(OTHER);await drain();h.c.closeOverlays();
 h.reports.All_Contract_Approvals.find(a=>a.ID===APR).Approver='reopened-vp@example.test';
 h.c.showApprovalsModal(ID);await drain();
 assert.match(body(h),/reopened-vp@example\.test/,'reopening the same parent starts a new modal read');
 gate.release();await drain();
 assert.equal(h.c.findApproval(APR).Approver,'reopened-vp@example.test','an old A result cannot replace a newer A instance after A to B to A navigation');
 assert.match(body(h),/reopened-vp@example\.test/);assert.doesNotMatch(body(h),/first-vp@example\.test/);
}

for(const complete of [false,true]){
 const h=await ready({realDOM:true,accessFlags:{ctEdit:complete}});fixture(h);
 if(complete){h.reports.All_Contracts1[0].Status='Complete';h.c.findContract(ID).Status='Complete';}
 h.c.showApprovalsModal(ID);await drain();
 assert.equal(h.c.mayEdit(ID),false);
 assert.match(body(h),/first-vp@example\.test/);assert.match(body(h),/second-vp@example\.test/,'view refresh does not require write permission');
 assert.equal(send(h)?.disabled,true,'read-only and completed contracts remain unsendable');
 assert.equal(writes(h).length,0);
}

console.log('PASS actual approval-modal refresh: exact-parent native VP discovery and isolated merge, same-modal edit preservation, fresh pre-send confirmation, read failure/Retry, stale actor/generation/modal exclusion, and read-only completed history. No live emails were sent.');
