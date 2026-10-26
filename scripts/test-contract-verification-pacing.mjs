import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,ACTION} from './test-contract-sdk-v2-foundation.mjs';

const updates=h=>h.calls.filter(call=>call.method==='update');
const attempt=h=>Object.values(h.c.S.sdkMutationReviews||{})[0];

{
 const h=await ready({ratePacing:true,fakeTime:true});
 while(h.c.LMPerf.snapshot().rate.dispatched<35)await h.c.LMData.request('budget-fixture',()=>({code:3000}));
 const pending=h.c.updateRecord(ACTION,{Dev_Notes:'paced display refresh'},h.c.CFG.reports.actions);await drain();
 assert.equal(updates(h).length,1);await h.advance(2000);const result=await pending;
 assert.equal(result.verifiedRow.Dev_Notes,'paced display refresh');assert.equal(h.c.contractHasReviews(),false,'queued display reads cannot gate native save success');
 await h.advance(59000);assert.equal(updates(h).length,1,'a later display read cannot replay the write');
}
{
 const h=await ready({fakeTime:true}),held=deferred(),native=h.api.getRecords;let reads=0;
 h.api.getRecords=config=>config.report_name===h.c.CFG.reports.actions&&config.criteria==='(ID == '+ACTION+')'&&++reads>1?held.promise.then(()=>native(config)):native(config);
 const pending=h.c.updateRecord(ACTION,{Dev_Notes:'hung display refresh'},h.c.CFG.reports.actions);await drain();
 assert.equal(updates(h).length,1);await h.advance(2000);const result=await pending;
 assert.equal(result.verifiedRow.Dev_Notes,'hung display refresh');assert.equal(h.c.contractHasReviews(),false,'a hung optional refresh cannot fail or lock the completed write');
 held.resolve();await drain();assert.equal(updates(h).length,1);assert.equal(h.c.contractHasReviews(),false);
}

{
  const h=await ready({ratePacing:true,fakeTime:true}),held=deferred(),native=h.api.updateRecordById;let sends=0;
  h.api.updateRecordById=config=>{sends++;return held.promise.then(()=>native(config));};
  const pending=h.c.updateRecord(ACTION,{Dev_Notes:'hung native'},h.c.CFG.reports.actions),rejected=assert.rejects(pending,error=>error.noReplay===true);
  await drain();assert.equal(h.c.LMPerf.snapshot().active,1);assert.equal(attempt(h).nativePending,true);
  await h.advance(30000);await rejected;
  assert.equal(attempt(h).expired,true);assert.equal(attempt(h).status,'unknown','native dispatch keeps its original 30-second deadline');
  await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'second click'},h.c.CFG.reports.actions));assert.equal(sends,1);
  held.resolve();await drain();assert.equal(sends,1);assert.equal(attempt(h).status,'unknown');
}

{
  const h=await ready({ratePacing:true,fakeTime:true});let checks=0;
  h.api.invokeCustomApi=async()=>++checks===1?{code:3000,details:{code:2955,message:'API limit exceeded'}}:{code:3000,details:{output:'{}'}};
  const pending=h.c.sdkInvoke({api_name:h.c.CFG.customApis.completeLotContract,http_method:'POST',payload:{mode:'Check',contractId:ID,lotIds:[]}});
  await drain();assert.equal(checks,1);assert.equal(h.c.LMPerf.snapshot().rate.reason,'creator-throttle');
  await h.advance(30000);assert.equal(checks,1);
  await h.advance(31000);await pending;assert.equal(checks,2,'only the read-only completion Check retries after Creator throttle');
  let sends=0;h.api.updateRecordById=async()=>{sends++;throw {code:2955,message:'API limit exceeded'};};
  await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'throttled write'},h.c.CFG.reports.actions),error=>error.noReplay===true);
  await h.advance(61000);assert.equal(sends,1,'a throttled native write is never automatically replayed');
  await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'second click'},h.c.CFG.reports.actions));assert.equal(sends,1);
}

console.log('PASS verification pacing: queued/hung display refresh cannot invalidate native success; native deadlines remain strict; late settlements and throttle never replay writes; read-only Complete Check alone retries.');
