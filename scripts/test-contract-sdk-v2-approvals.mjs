import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,ACCESS,NEW} from './test-contract-sdk-v2-foundation.mjs';
const APR=(BigInt(NEW)+50n).toString();
function approval(h){h.flags.users[0].userName='authoritative-creator-user';h.c.S.users=structuredClone(h.flags.users);h.c.S.approvals=[{ID:APR,Contract1:{ID},Approver:'approver@example.test',Approval_Email:true,Status:'Not Sent',Approval_Sequence:1}];h.reports.All_Contract_Approvals=structuredClone(h.c.S.approvals);}
function service(h,{initialSent=true,loseSend=false}={}){
 const native=h.api.invokeCustomApi,calls=[];let sent=false;
 h.api.invokeCustomApi=async config=>{if(!config.api_name.startsWith('Send_Contract_Approvals'))return native(config);calls.push(structuredClone(config));const body=config.payload;assert.equal(body.contractId,ID);assert.deepEqual(body.targetIds,[APR]);assert.equal(body.user,'authoritative-creator-user');
 if(body.mode==='Send'){h.reports.All_Contracts1[0].Status='Awaiting Approvals';h.reports.All_Contract_Approvals[0].Status='Awaiting Approval';sent=initialSent;if(loseSend)throw new Error('Applied Send but reply lost');return {code:3000,details:{output:JSON.stringify({success:true,sent:sent?['approver@example.test']:[]})}};}
 if(body.mode==='Repair')sent=true;
 return {code:3000,details:{output:JSON.stringify({ok:true,contractId:ID,targetCount:1,parentStatus:'Awaiting Approvals',activeCount:1,sentCount:sent?1:0,missingCount:sent?0:1,addresses:['approver@example.test']})}};
 };return calls;
}
async function finish(h){for(let i=0;i<8;i++){await drain();if(h.c.contractApprovalProgress?.terminal)break;const entry=[...h.timers].find(([,timer])=>timer.ms===560);if(entry)h.tick(560);}assert.equal(h.c.contractApprovalProgress.terminal,'success');}
for(const loseSend of [false,true]){
 const h=await ready({realDOM:true});approval(h);const calls=service(h,{loseSend});assert.equal(await h.c.aprSendNow(ID),true);assert.equal(h.node('contractApprovalProgress').hidden,false);assert.equal(h.node('contractApprovalProgressSteps').children.length,3,'actual source renderer mounted approval phases');assert.equal(h.node('contractApprovalProgressClose').disabled,true);assert.equal(await h.c.aprSendNow(ID),false);h.tick(1000);await finish(h);assert.equal(calls.filter(row=>row.payload.mode==='Send').length,1);assert.equal(calls.filter(row=>row.payload.mode==='Repair').length,0,'applied/lost Send is only checked, never repeated');assert.equal(h.node('contractApprovalProgressTitle').textContent,'Approvals sent');assert.equal(await h.c.contractProgressClose(),true);assert.equal(h.c.contractApprovalProgress,null);assert.equal(h.c.S.approvals[0].Status,'Awaiting Approval');
}
{
 const h=await ready({realDOM:true});approval(h);const calls=service(h,{initialSent:false});await h.c.aprSendNow(ID);h.c.contractApprovalProgress.started-=5001;h.tick(1000);await finish(h);assert.deepEqual(calls.map(row=>row.payload.mode),['Send','Check','Repair'],'actual targeted Check permits one existing safe Repair for missing email');
}
{
 const h=await ready({realDOM:true});approval(h);const calls=service(h),native=h.api.invokeCustomApi,gate=deferred();h.api.invokeCustomApi=config=>config.api_name.startsWith('Send_Contract_Approvals')&&config.payload.mode==='Send'?gate.promise.then(()=>native(config)):native(config);
 const pending=h.c.aprSendNow(ID);await drain();h.tick(20000);assert.equal(h.c.contractApprovalProgress.terminal,'error');assert.equal(h.node('contractApprovalProgressClose').disabled,true);assert.equal(h.node('contractApprovalProgressRetry').disabled,true);assert.equal(h.c.contractProgressClose(),false);await h.node('contractApprovalProgressRetry').fire('click');assert.equal(await h.c.aprSendNow(ID),false);assert.equal(calls.length,0);gate.resolve();await pending;assert.equal(calls.filter(row=>row.payload.mode==='Send').length,1);assert.equal(h.node('contractApprovalProgressClose').disabled,false);await h.node('contractApprovalProgressRetry').fire('click');await finish(h);assert.equal(calls.filter(row=>row.payload.mode==='Send').length,1);assert.equal(calls.filter(row=>row.payload.mode==='Repair').length,0,'terminal retry executes actual Check before any Repair');
}
{
 const h=await ready({realDOM:true});approval(h);const native=h.api.invokeCustomApi,gate=deferred();let writes=0;h.api.invokeCustomApi=config=>config.api_name.startsWith('Send_Contract_Approvals')?(writes++,gate.promise):native(config);const pending=h.c.aprSendNow(ID);await drain();h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'other@example.test'});gate.resolve({code:3000,details:{output:JSON.stringify({success:true})}});assert.equal(await pending,false);assert.equal(writes,1);assert.equal(h.c.contractApprovalProgress.pendingResult,null);h.tick(20000);assert.equal(h.c.contractApprovalProgress.terminal,'error');assert.equal(await h.c.contractProgressClose(),true);assert.equal(h.c.canEdit(),false);
}
{
 const h=await ready({realDOM:true,accessFailure:true});h.c.S.approvals=[{ID:APR,Contract1:{ID},Approval_Email:true,Status:'Not Sent'}];const before=h.calls.length;assert.equal(h.c.canEdit(),true,'legacy degraded general-edit policy retained');assert.equal(await h.c.aprSendNow(ID),false,'no guessed local-part/admin sender identity');assert.equal(h.calls.length,before);
}
console.log('PASS actual mounted approval Send/Check/Repair handlers: authoritative captured sender/IDs, native one Send on lost reply, targeted safe Repair, pending Close/Retry guards, stale actor exclusion and exact fresh model refresh. No live emails were sent.');
