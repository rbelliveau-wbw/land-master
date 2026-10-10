import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('shared/creator-data.js','utf8');
const bridge=()=>{const c=vm.createContext({LMRuntime:{current:()=>({environment:'PRODUCTION',user:'fixture'})}});vm.runInContext(source,c);return c.LMData;};
const criteria='(ID == 90071992547409931)',id='90071992547409931';
const options=api=>({api,reportName:'Fixture',criteria,parallelExact:true,fresh:true});
const drain=async()=>{for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));};
{
  const calls=[],release={};
  const api={getRecordCount:()=>{calls.push('count');return new Promise(resolve=>release.count=resolve);},getRecords:()=>{calls.push('records');return new Promise(resolve=>release.records=resolve);}};
  let done=false;const pending=bridge().readAll(options(api)).then(rows=>{done=true;return rows;});await drain();
  assert.deepEqual(calls.slice().sort(),['count','records'],'both requests start without waiting for the other');
  release.records({code:3000,data:[{ID:id}]});await drain();assert.equal(done,false,'a row alone cannot confirm the destination');
  release.count({code:3000,result:{records_count:'1'}});assert.equal((await pending)[0].ID,id);
}
for(const scenario of [
  {count:{code:2898,message:'Denied'}},
  {count:{code:3000,result:{records_count:'1'},output:{code:2898}}},
  {count:{code:3000,result:{records_count:'NaN'}}},
  {count:{code:3000,result:{records_count:'0'}}},
  {count:{code:3000,result:{records_count:'2'}}},
  {record:{code:3000,data:[{ID:'90071992547409932'}]}},
  {record:{code:3000,data:[{ID:Number(id)}]}},
  {record:{code:3000,data:[{ID:id},{ID:id}]}},
  {record:{code:3000,data:[{ID:id}],record_cursor:'unexpected'}},
  {record:{code:3000,data:[{ID:id}],output:{code:2898}}}
]){
  const api={getRecordCount:async()=>scenario.count||{code:3000,result:{records_count:'1'}},getRecords:async()=>scenario.record||{code:3000,data:[{ID:id}]}};
  await assert.rejects(bridge().readAll(options(api)));
}
for(const empty of [{code:3000,data:[]},{code:3100},{responseText:'{"code":9280}'}]){
  const api={getRecordCount:async()=>({code:3000,result:{records_count:'0'}}),getRecords:async()=>empty};
  assert.equal((await bridge().readAll(options(api))).length,0);
}
{
  let cancelled=false;const api={getRecordCount:async()=>{cancelled=true;return {code:3000,result:{records_count:'1'}};},getRecords:async()=>({code:3000,data:[{ID:id}]})};
  await assert.rejects(bridge().readAll({...options(api),isCancelled:()=>cancelled}),error=>error.cancelled===true);
  await assert.rejects(bridge().readAll({...options(api),criteria:'Contract1 == 1'}));
}
console.log('PASS parallel exact reads: simultaneous count/full-row dispatch, both required, exact string ID/count, empty records, cancellation, denial, conflicting envelopes, cursor and malformed results.');
