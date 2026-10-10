import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,ACTION} from './test-contract-sdk-v2-foundation.mjs';

const deletes=h=>h.calls.filter(call=>call.method==='delete');
const key=h=>'delete:'+h.c.CFG.reports.actions+':'+ACTION;
const validations={code:2945,message:'Field validation failed'};

for(const code of [1130,2896,2897,2932]){
  for(const wrapped of [false,true]){
    const h=await ready(),failure={code,message:'Native permission denied',data:{ID:Number(ACTION)}};let sends=0;
    h.api.deleteRecords=async()=>{sends++;return wrapped?{code:3000,result:[failure]}:failure;};
    await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION),error=>error.message==='Native permission denied'&&String(error.code)===String(code));
    assert.equal(h.reports.All_Contract_Actions.length,1);assert.equal(h.c.contractHasReviews(),false,'known rejection plus exact retained target releases review, even if failure metadata includes an ID');
    assert.equal(sends,1,'no automatic delete replay');
  }
}

for(const reply of [
  {response:{code:3000}},
  {response:validations},
  {response:{code:3000,result:[{code:2945,message:'Field validation failed'}]}},
  {error:validations},
  {error:new Error('Reply lost after deletion')}
]){
  const h=await ready(),native=h.api.deleteRecords,before=h.calls.length;
  h.api.deleteRecords=async config=>{await native(config);if(reply.error)throw reply.error;return reply.response;};
  const result=await h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION);
  assert.equal(result.data.ID,ACTION);
  assert.equal(result.verifiedRow,true,'only counted persisted absence confirms deletion');
  assert.equal(deletes(h).length,1);
  assert.equal(deletes(h)[0].config.payload.criteria,'(ID == '+ACTION+')');
  assert.equal(deletes(h)[0].config.payload.skip_workflow,undefined,'native validations and workflows remain enabled');
  assert.equal(h.reports.All_Contract_Actions.length,0);
  assert.equal(h.c.contractHasReviews(),false);
  const allReads=h.calls.slice(before).filter(call=>['count','records'].includes(call.method));
  assert.ok(allReads.some(call=>call.config.report_name===h.c.CFG.reports.contracts&&call.config.criteria==='(ID == '+ID+')'),'deletes check the current parent lock before dispatch');
  const reads=allReads.filter(call=>call.config.report_name===h.c.CFG.reports.actions);
  assert.ok(reads.every(call=>call.config.report_name===h.c.CFG.reports.actions&&call.config.criteria==='(ID == '+ACTION+')'));
  assert.equal(reads.filter(call=>call.method==='count').length,3,'current child scope, preflight existence and post-delete absence use fresh counts');
  assert.equal(reads.filter(call=>call.method==='records').length,2,'current child scope and preflight; confirmed zero count needs no empty-page inference');
}

for(const reply of [validations,{code:3000,result:[{code:3000,data:{ID:Number(ID)}}]},{code:3000,result:[{code:3000,data:{id:ID}}]}]){
  const h=await ready({realDOM:true}),native=h.api.deleteRecords;
  h.c.ncApplyAccess({found:true,ctEdit:true,ctDeleteArchive:true});
  h.c.S.selId=ID;h.c.S.view='detail';
  h.api.deleteRecords=async config=>{await native(config);return reply;};
  h.c.deleteContract(ID);h.c.confirmProceed();await drain();
  assert.equal(h.reports.All_Contracts1.length,0);
  assert.equal(h.c.findContract(ID),null,'the actual Delete contract button drops the verified absent parent');
  assert.equal(h.c.S.selId,null);assert.equal(h.c.S.view,'home');
  assert.match(h.node('banners').innerHTML,/Contract deleted/);
  assert.doesNotMatch(h.node('banners').innerHTML,/Could not delete|err-banner/);
  assert.equal(deletes(h).length,1);
}

for(const response of [validations,{code:3000},{code:3000,result:[{code:3000,data:{ID:ACTION}}]}]){
  const h=await ready();let sent=0;
  h.api.deleteRecords=async()=>{sent++;return response;};
  await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION));
  assert.equal(sent,1,'a returned error never automatically sends deletion again');
  assert.equal(h.reports.All_Contract_Actions.length,1);
  if(response.code===3000){
    assert.equal(h.c.S.sdkMutationReviews[key(h)].status,'unknown');
    await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION));
    assert.equal(sent,1,'unverified deletion blocks a later send');
    assert.equal(await h.c.recheckContractMutation(key(h)),false);
  }else assert.equal(h.c.contractHasReviews(),false,'a definite rejection plus confirmed retained target permits an explicit corrected retry');
}

for(const conflict of [ID,Number(ACTION)]){
  const h=await ready(),native=h.api.deleteRecords;
  h.api.deleteRecords=async config=>{await native(config);return {code:3000,result:[{code:3000,data:{ID:conflict}}]};};
  const result=await h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION);
  assert.equal(result.data.ID,ACTION,'the captured exact string ID is retained despite an inconsistent acknowledgement');
  assert.equal(result.verifiedRow,true,'fresh counted absence confirms the requested delete');
  assert.equal(h.c.contractHasReviews(),false,'a verified successful delete does not quarantine later UI writes');
  assert.equal(deletes(h).length,1);
}

for(const conflict of [ID,Number(ACTION)]){
  const h=await ready();let sends=0;
  h.api.deleteRecords=async()=>{sends++;return {code:3000,result:[{code:3000,data:{ID:conflict}}]};};
  await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION),/conflicting deletion record/);
  assert.equal(h.c.S.sdkMutationReviews[key(h)].id,ACTION,'conflicting acknowledgements cannot replace the captured exact string target');
  assert.equal(h.c.S.sdkMutationReviews[key(h)].status,'unknown');
  await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION));
  assert.equal(sends,1,'a conflicting acknowledgement cannot replay a delete when persisted absence is unverified');
}

{
  const h=await ready();h.reports.All_Contract_Actions=[];
  await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION),/current child record is unavailable|exact record was not returned/);
  assert.equal(deletes(h).length,0,'an already absent or invisible target cannot authorize a new delete');
  assert.equal(h.c.contractHasReviews(),false);
}

{
  const h=await ready(),native=h.api.getRecords,gate=deferred();
  h.api.getRecords=config=>config.report_name===h.c.CFG.reports.actions?gate.promise.then(()=>native(config)):native(config);
  const first=h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION);await drain();
  await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION),/still being checked/);
  assert.equal(deletes(h).length,0,'duplicate interaction is blocked during the read-only preflight');
  gate.resolve();await first;assert.equal(deletes(h).length,1);
}

for(const phase of ['before','after']){
  for(const failure of ['denied','malformed-count','incomplete']){
    const h=await ready(),nativeCount=h.api.getRecordCount,nativeRead=h.api.getRecords,nativeDelete=h.api.deleteRecords;let dispatched=false;
    h.api.deleteRecords=async config=>{dispatched=true;await nativeDelete(config);return validations;};
    h.api.getRecordCount=async config=>{
      if(config.report_name===h.c.CFG.reports.actions&&(phase==='before'||dispatched)){
        if(failure==='denied')throw {code:2898,message:'Permission denied'};
        if(failure==='malformed-count')return {code:3000,result:{records_count:'unknown'}};
        return {code:3000,result:{records_count:'1'}};
      }
      return nativeCount(config);
    };
    h.api.getRecords=async config=>config.report_name===h.c.CFG.reports.actions&&(phase==='before'||dispatched)&&failure==='incomplete'?{code:3100}:nativeRead(config);
    await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION));
    assert.equal(deletes(h).length,phase==='before'?0:1);
    if(phase==='after'){
      assert.equal(h.reports.All_Contract_Actions.length,0,'the target was deleted but unavailable verification stays unknown');
      assert.equal(h.c.S.sdkMutationReviews[key(h)].status,'unknown');
      await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION));
      assert.equal(deletes(h).length,1);
    }else assert.equal(h.c.contractHasReviews(),false,'failed read-only preflight dispatches no mutation');
  }
}

{
  const h=await ready(),native=h.api.deleteRecords,gate=deferred();let sends=0;
  h.api.deleteRecords=config=>{sends++;return gate.promise.then(()=>native(config));};
  const pending=h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION),rejected=assert.rejects(pending,error=>error.noReplay===true);
  await drain();assert.equal(sends,1);h.tick(30000);await rejected;
  assert.equal(h.c.S.sdkMutationReviews[key(h)].nativePending,true);
  assert.equal(await h.c.recheckContractMutation(key(h)),false,'pending native request cannot be reconciled or sent again');
  gate.resolve();await drain();
  assert.equal(h.reports.All_Contract_Actions.length,0);
  assert.equal(h.c.S.sdkMutationReviews[key(h)].status,'unknown','late native settlement never automatically changes timed-out result');
  assert.equal(await h.c.recheckContractMutation(key(h)),true,'a later explicit check verifies absence without replay');
  assert.equal(sends,1);assert.equal(deletes(h).length,1);
}

{
  const h=await ready(),native=h.api.deleteRecords;
  h.api.deleteRecords=async config=>{await native(config);h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'changed-actor@example.test'});return validations;};
  await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.actions,ACTION));
  assert.equal(h.c.S.sdkMutationReviews[key(h)].status,'unknown','changed actor cannot infer absence in another scope');
  assert.equal(deletes(h).length,1);
}

console.log('PASS Contracts delete: fresh exact target existence and counted absence; actual Delete button succeeds after applied validation/lost or conflicting replies; captured string ID never changes; one dispatch; still-present/conflicting rejection; denied/malformed/incomplete reads cannot prove absence; pending timeout and changed actor remain unknown; explicit read-only recheck.');
