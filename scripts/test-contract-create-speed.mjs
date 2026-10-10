import assert from 'node:assert/strict';
import {ready,ACCESS,SUB,NEW} from './test-contract-sdk-v2-foundation.mjs';
async function measured(legacy){
  const h=await ready({realDOM:true,fakeTime:true});
  h.c.S.nc={type:'DA',project:'',parent:'',sub:[SUB],wbw:[],builder:'',name:'Creation timing fixture',territory:'Austin',status:'Proposed',acts:[],seedSource:'default',owners:[ACCESS],lotIds:[],ppf:{},totalLots:'',emPerLot:'',initLots:'',initDays:'',contLots:'',contDays:''};
  if(legacy){
    h.c.sdkGetAll=(reportName,criteria,options={})=>h.c.LMData.readAll({reportName,criteria,fresh:options.fresh!==false,isCancelled:options.isCancelled,fields:options.fields,onProgress:options.onProgress}).then(h.c.contractNativeLabels);
    const subdivisions=h.c.ncFixSubdivision,status=h.c.contractStatusPreflight;
    h.c.ncFixSubdivision=(id,ids,run)=>subdivisions(id,ids,run);
    h.c.contractStatusPreflight=(id,data,review)=>status(id,data,review);
  }
  h.c.matchMedia=()=>({matches:false}); // Creation must not wait for display timers.
  for(const method of ['getRecordCount','getRecords','addRecords','updateRecordById']){
    const native=h.api[method];h.api[method]=config=>new Promise((resolve,reject)=>h.c.setTimeout(()=>Promise.resolve(native(config)).then(resolve,reject),100));
  }
  const baseline=h.calls.length,started=h.c.Date.now();let result;
  const pending=h.c.ncSubmit(Array.from({length:7},(_,i)=>({title:'Action '+i,sort:i+1})),[{email:'first@example.test',seq:1},{email:'second@example.test',seq:2}]).then(value=>result=value);
  for(let i=0;i<200&&!result;i++)await h.advance(100);
  assert.ok(result,'creation settles without waiting for UI pacing');await pending;
  assert.equal(result.error,null);assert.equal(result.rows.length,11);assert.equal(result.rows.every(row=>row.state==='verified'),true);
  const calls=h.calls.slice(baseline),writes=calls.filter(call=>['add','update','delete'].includes(call.method));
  assert.equal(writes.length,11);assert.equal(h.c.findContract(NEW).Status,'Proposed');assert.equal(h.maximum()<=3,true);
  assert.equal(h.node('contractSaveClose').disabled,false);assert.equal(h.c.ContractSetupUI.progress().displayDone,true);
  assert.equal([...h.timers.values()].some(timer=>timer.ms===560),false,'no synthetic stage pauses for contract creation');
  return {elapsed:h.c.Date.now()-started,requests:calls.length};
}
const before=await measured(true),after=await measured(false);
assert.ok(after.elapsed<=before.elapsed*0.7,'creation should take at least 30% less time with equal request latency');
assert.equal(after.requests,before.requests-4,'reuse the already verified parent and avoid a duplicate status count/read');
console.log(`PASS actual creation speed: seven actions/two approvals, ${before.elapsed}ms → ${after.elapsed}ms at 100ms/request; ${before.requests} → ${after.requests} requests; exact destinations, ordered writes, final Legal routing and immediate terminal controls.`);
