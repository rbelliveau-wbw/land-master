import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,ACTION} from './test-contract-sdk-v2-foundation.mjs';
const deletes=h=>h.calls.filter(call=>call.method==='delete');
const key=h=>'delete:'+h.c.CFG.reports.actions+':'+ACTION;
for(const code of [1130,2896,2897,2932,2945])for(const wrapped of [false,true]){
 const h=await ready(),failure={code,message:'Native permission or validation denied',data:{ID:Number(ACTION)}};
 h.api.deleteRecords=async()=>wrapped?{code:3000,result:[failure]}:failure;
 await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION),error=>String(error.code)===String(code));
 assert.equal(h.reports.All_Contract_Actions.length,1);assert.equal(h.c.contractHasReviews(),false,'native rejection is reported without a synthetic acknowledgement review');
}
for(const reply of [{code:3000},{code:3000,data:{ID:ID}},{code:3000,result:[{code:3000,data:{ID:Number(ACTION)}}]}]){
 const h=await ready(),native=h.api.deleteRecords,nativeRead=h.api.getRecords,nativeCount=h.api.getRecordCount;let sent=false;
 h.api.deleteRecords=async config=>{await native(config);sent=true;return reply;};
 h.api.getRecords=config=>sent?Promise.reject(Error('Post-save reports unavailable')):nativeRead(config);
 h.api.getRecordCount=config=>sent?Promise.reject(Error('Post-save reports unavailable')):nativeCount(config);
 const result=await h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION);
 assert.equal(result.data.ID,ACTION);assert.equal(result.verifiedRow,true);assert.equal(deletes(h).length,1);
 assert.equal(deletes(h)[0].config.payload.criteria,'(ID == '+ACTION+')');assert.equal(deletes(h)[0].config.payload.skip_workflow,undefined);
 assert.equal(h.c.contractHasReviews(),false);assert.equal(h.reports.All_Contract_Actions.length,0,'post-save report availability cannot overturn native success');
}
{
 const h=await ready({realDOM:true}),native=h.api.deleteRecords;h.c.ncApplyAccess({found:true,ctEdit:true,ctDeleteArchive:true});
 h.c.S.selId=ID;h.c.S.view='detail';h.api.deleteRecords=async config=>{await native(config);return {code:3000};};
 h.c.deleteContract(ID);h.c.confirmProceed();await drain();assert.equal(h.c.findContract(ID),null);
 assert.equal(h.c.S.selId,null);assert.equal(h.c.S.view,'home');assert.match(h.node('banners').innerHTML,/Contract deleted/);assert.equal(deletes(h).length,1);
}
{
 const h=await ready(),native=h.api.deleteRecords;h.api.deleteRecords=async config=>{await native(config);throw Error('Network reply lost');};
 await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION),/Network reply lost/);
 assert.equal(h.c.S.sdkMutationReviews[key(h)].status,'unknown');await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION));
 assert.equal(deletes(h).length,1);assert.equal(await h.c.recheckContractMutation(key(h)),true);assert.equal(deletes(h).length,1,'explicit recovery never repeats deletion');
}
{
 const h=await ready();h.reports.All_Contract_Actions=[];
 await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION),/current child record is unavailable|exact record was not returned/);
 assert.equal(deletes(h).length,0,'prewrite scope and permissions remain enforced');
}
{
 const h=await ready(),native=h.api.deleteRecords,gate=deferred();h.api.deleteRecords=config=>gate.promise.then(()=>native(config));
 const pending=h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION);await drain();await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION));
 gate.resolve();await pending;assert.equal(deletes(h).length,1,'pending duplicate sends remain blocked');
}
{
 const h=await ready(),native=h.api.deleteRecords;h.api.deleteRecords=async config=>{await native(config);h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'other-actor@example.test'});return {code:3000};};
 await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION),/session changed/);assert.equal(h.c.S.sdkMutationReviews[key(h)].status,'unknown');
}
console.log('PASS native delete results: no acknowledgement-shape or post-save validation; actual errors, prewrite access, captured target, pending duplicate protection, actor changes and explicit transport recovery remain enforced.');
