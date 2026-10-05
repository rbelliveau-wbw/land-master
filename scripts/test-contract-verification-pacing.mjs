import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,ACTION} from './test-contract-sdk-v2-foundation.mjs';

const updates=h=>h.calls.filter(call=>call.method==='update');
const attempt=h=>Object.values(h.c.S.sdkMutationReviews||{})[0];

{
  const h=await ready({ratePacing:true,fakeTime:true});
  while(h.c.LMPerf.snapshot().rate.dispatched<39)await h.c.LMData.request('budget-fixture',()=>({code:3000}));
  const pending=h.c.updateRecord(ACTION,{Dev_Notes:'paced verification'},h.c.CFG.reports.actions);
  await drain();
  assert.equal(updates(h).length,1);assert.equal(attempt(h).status,'pending');assert.equal(attempt(h).verificationPending,true);
  assert.equal(h.c.LMPerf.snapshot().active,0);assert.equal(h.c.LMPerf.snapshot().rate.waitMs,61000);
  await h.advance(30000);
  assert.equal(attempt(h).expired,undefined,'known budget idle cannot turn a successful native write into an unknown result');
  assert.equal(attempt(h).status,'pending');assert.equal(attempt(h).verificationPending,true);
  await h.advance(31000);await pending;
  assert.equal(h.reports.All_Contract_Actions[0].Dev_Notes,'paced verification');assert.equal(h.c.contractHasReviews(),false);
  assert.equal(updates(h).length,1,'the waiting readback never replays the native mutation');
  const requests=h.c.LMPerf.snapshot().requests;
  assert.equal(requests.length,42);assert.equal(requests.filter(row=>row.startedAtMs<61000).length,40);
  assert.equal(requests.filter(row=>row.startedAtMs>=61000).length,2,'count and full-field records dispatch when the budget opens');
}

{
  const h=await ready({ratePacing:true,fakeTime:true}),held=deferred(),native=h.api.getRecords;
  while(h.c.LMPerf.snapshot().rate.dispatched<37)await h.c.LMData.request('budget-fixture',()=>({code:3000}));
  h.api.getRecords=config=>config.report_name===h.c.CFG.reports.actions&&config.criteria==='(ID == '+ACTION+')'?held.promise.then(()=>native(config)):native(config);
  const pending=h.c.updateRecord(ACTION,{Dev_Notes:'hung readback'},h.c.CFG.reports.actions),rejected=assert.rejects(pending,error=>error.noReplay===true);
  await drain();assert.equal(h.c.LMPerf.snapshot().active,1);assert.equal(attempt(h).verificationPending,true);
  const queued=h.c.LMData.request('unrelated-budget-queue',()=>({code:3000}));await drain();
  assert.equal(h.c.LMPerf.snapshot().rate.waitMs,61000,'an unrelated queued read cannot extend an active hung verification');
  await h.advance(30000);await rejected;
  assert.equal(attempt(h).expired,true);assert.equal(attempt(h).status,'unknown','an actually dispatched hung read still expires');
  await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'second click'},h.c.CFG.reports.actions));assert.equal(updates(h).length,1);
  held.resolve();await drain();assert.equal(attempt(h).status,'unknown','late read settlement cannot silently change the timed-out outcome');
  await h.advance(31000);await queued;assert.equal(attempt(h).status,'unknown');
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

console.log('PASS verification pacing: production 40-per-61s budget; queued fresh readback survives 30s idle and completes at 61s; active hung read/native deadlines remain strict; late settlements and throttle never replay writes; read-only Complete Check alone retries.');
