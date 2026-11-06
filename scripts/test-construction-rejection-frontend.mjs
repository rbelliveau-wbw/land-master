import assert from 'node:assert/strict';
import {ready,drain,deferred,ID} from './test-contract-sdk-v2-foundation.mjs';

const editor={constructionEditAll:true,constructionSubmit:false};
const submitter={constructionEditAll:false,constructionSubmit:true};
const op='cr-native-operation-000000001';
async function setup(flags=editor){
  const h=await ready({accessFlags:flags,pageParams:{workMode:'construction'},realDOM:true});
  for(const row of [h.reports.All_Contracts1[0],h.c.findContract(ID)])Object.assign(row,{Work_Module:'Construction',Status:'Proposed',Contract_Name:'Construction review fixture',Added_User:'original-submitter'});
  h.c.renderAll();h.sent=[];
  const invoke=h.api.invokeCustomApi;
  h.api.invokeCustomApi=async config=>{if(!/^Manage_Construction_Review(?:_DEV|_STAGE)?$/.test(config.api_name))return invoke(config);assert.deepEqual(Object.keys(config.payload),['payload'],'native Key and Value API binds its single payload:String argument');const body=JSON.parse(config.payload.payload);h.sent.push({...JSON.parse(JSON.stringify(config)),body});return h.respond(body);};
  h.respond=payload=>({code:3000,details:{output:JSON.stringify(snapshot(payload))}});
  return h;
}
function snapshot(payload,values={}){return {ok:true,contract:'construction-review-v1',contractId:ID,operationId:payload.operationId||op,status:'Rejected',rejectionRecorded:true,commentRecorded:true,reason:'Update the paving quantities.',reviewer:'Construction reviewer',reviewedAt:'11/06/2026 10:00:00',emailState:'sent',emailSentAt:'11/06/2026 10:00:01',recipient:'submitter@example.test',canRetryEmail:false,writeState:'acknowledged',...values};}
function reply(payload,values){return {code:3000,details:{output:JSON.stringify(snapshot(payload,values))}};}
async function submit(h){await h.c.constructionRejectOpen(ID);h.node('constructionRejectReason').value='Update the paving quantities.';return h.c.constructionRejectSubmit();}
const actions=h=>h.sent.map(call=>call.body.action);
const inert=node=>!!node&&(node.inert||inert(node.parentNode));

{
  const h=await setup();await h.c.constructionReviewDecision(ID,false);
  assert.equal(h.node('constructionRejectReason').getAttribute('maxlength'),'5000');
  assert.equal(h.c.document.activeElement,h.node('constructionRejectReason'));
  assert.equal(inert(h.node('view')),true);
  await h.c.constructionRejectSubmit();assert.match(h.node('constructionRejectError').textContent,/Enter a reason/);assert.equal(h.sent.length,0);
  h.node('constructionRejectReason').value='Retained draft';h.c.constructionRejectDraftSet(ID,'Retained draft');h.c.closeOverlays();assert.equal(h.node('view').inert,false);
  await h.c.constructionRejectOpen(ID);assert.equal(h.node('constructionRejectReason').value,'Retained draft');h.c.closeOverlays();
}
{
  const h=await setup();await submit(h);
  assert.deepEqual(actions(h),['reject'],'an acknowledged decision does not trigger automatic post-save field comparisons');
  assert.match(h.sent[0].body.operationId,/^[A-Za-z0-9-]{20,80}$/);
  assert.equal(h.sent[0].body.reason,'Update the paving quantities.');
  assert.equal(h.c.contractApprovalProgress.terminal,'success');assert.match(h.node('contractApprovalProgressStatus').textContent,/Email sent to submitter@example.test/);
  assert.match(h.node('constructionRejectSaved').textContent,/Update the paving quantities/);
  assert.equal(h.c.findContract(ID).Status,'Rejected');assert.equal(h.c.contractProgressClose(),true);assert.equal(h.node('view').inert,false);
  h.c.openContract(ID);assert.match(h.node('view').innerHTML,/View Rejection/);
}
{
  const h=await setup(),held=deferred();h.respond=()=>held.promise;
  await h.c.constructionRejectOpen(ID);h.node('constructionRejectReason').value='Update the paving quantities.';
  const pending=h.c.constructionRejectSubmit();await drain();
  assert.equal(h.sent.length,1);assert.equal(h.node('contractApprovalProgressClose').disabled,true);
  assert.equal(h.c.contractProgressClose(),false);await h.c.constructionRejectSubmit();await h.c.constructionReviewDecision(ID,false);assert.equal(h.sent.length,1);
  held.resolve(reply(h.sent[0].body));await pending;assert.equal(h.c.contractApprovalProgress.terminal,'success');
}
{
  const h=await setup();h.respond=payload=>{if(payload.action==='reject')throw new Error('Transport response lost');return reply(payload);};
  await submit(h);assert.deepEqual(actions(h),['reject','check']);assert.equal(h.c.contractApprovalProgress.terminal,'success');
}
for(const emailState of ['unknown','sending']){
  const h=await setup();h.respond=payload=>reply(payload,{emailState,emailSentAt:'',canRetryEmail:true});
  await submit(h);const p=h.c.contractApprovalProgress;
  assert.equal(p.terminal,'warning');assert.equal(p.canRetryEmail,false);assert.equal(h.node('contractApprovalProgressRetry').textContent,'Check Status');
  await h.c.constructionRejectRetry(p);assert.deepEqual(actions(h),['reject','check'],'ambiguous delivery is never resent');
  assert.equal(h.c.contractProgressClose(),true);await h.c.constructionRejectView(ID);assert.deepEqual(actions(h),['reject','check','check']);
}
for(const emailState of ['failed','not-started','missing-recipient']){
  const h=await setup();h.respond=payload=>reply(payload,payload.action==='retry-email'?{}:{emailState,emailSentAt:'',canRetryEmail:true});
  await submit(h);const p=h.c.contractApprovalProgress;assert.equal(p.terminal,'warning');assert.equal(h.node('contractApprovalProgressRetry').textContent,'Retry Email');
  await h.c.constructionRejectRetry(p);assert.deepEqual(actions(h),['reject','check','retry-email']);assert.equal(p.terminal,'success');
}
{
  const h=await setup();h.respond=payload=>reply(payload,payload.action==='reject'?{emailState:'failed',emailSentAt:'',canRetryEmail:true}:{emailState:'unknown',emailSentAt:'',canRetryEmail:true});
  await submit(h);await h.c.constructionRejectRetry(h.c.contractApprovalProgress);assert.deepEqual(actions(h),['reject','check'],'a fresh check can withdraw retry eligibility');
}
{
  const h=await setup(submitter);assert.equal(await h.c.constructionRejectOpen(ID),false);assert.equal(h.sent.length,0);
  Object.assign(h.c.findContract(ID),{Status:'Rejected',Construction_Rejection_Operation:op});h.respond=payload=>reply(payload,{emailState:'failed',emailSentAt:'',canRetryEmail:true});
  await h.c.constructionRejectView(ID);assert.equal(h.c.contractApprovalProgress.canRetryEmail,false);await h.c.constructionRejectRetry(h.c.contractApprovalProgress);assert.deepEqual(actions(h),['check','check']);
}
{
  const h=await setup();h.respond=payload=>reply(payload,{ok:false,rejectionRecorded:false,commentRecorded:false,emailState:'not-started',emailSentAt:'',writeState:'not-started',message:'The request is no longer awaiting review.'});
  await submit(h);assert.equal(h.c.contractApprovalProgress.terminal,'error');assert.equal(h.c.findContract(ID).Status,'Proposed');assert.deepEqual(actions(h),['reject']);
  assert.equal(h.c.contractProgressClose(),true);await h.c.constructionRejectOpen(ID);assert.ok(h.c.S.constructionRejectModal,'a definite prewrite failure permits correcting the retained reason');assert.equal(h.node('constructionRejectReason').value,'Update the paving quantities.');h.c.closeOverlays();
}
{
  const h=await setup();h.respond=()=>({code:3000,details:{output:'Old endpoint response'}});await submit(h);
  assert.equal(h.c.contractApprovalProgress.terminal,'error');assert.match(h.node('contractApprovalProgressStatus').textContent,/unavailable/);assert.deepEqual(actions(h),['reject']);
}
{
  const h=await setup(),held=deferred();h.respond=()=>held.promise;const pending=submit(h);await drain();
  h.c.S.contractDataGeneration++;held.resolve(reply(h.sent[0].body));await pending;
  assert.equal(h.c.contractApprovalProgress,null);assert.equal(h.node('view').inert,false);assert.equal(h.node('contractApprovalProgress').hidden,true);assert.equal(h.c.findContract(ID).Status,'Proposed');
}
console.log('PASS Construction rejection UI: required retained reason, original submitter outcome, one authenticated operation, duplicate locks, stale-session removal, read-only lost-reply checks, safe email-only retry, profile gates and saved rejection recovery.');
