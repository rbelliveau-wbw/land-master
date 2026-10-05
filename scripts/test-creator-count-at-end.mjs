import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('shared/creator-data.js','utf8');
function bridge(){const c=vm.createContext({LMRuntime:{current:()=>({environment:'DEVELOPMENT',user:'fixture'})}});vm.runInContext(source,c);return c.LMData;}
{
 const calls=[],api={getRecords:async config=>{calls.push('records');return config.record_cursor?{code:3000,data:[{ID:'2'}]}:{code:3000,data:[{ID:'1'}],record_cursor:'next'};},getRecordCount:async()=>{calls.push('count');return {code:3000,result:{records_count:'2'}};}};
 const rows=await bridge().readAll({api,reportName:'Fixture',countAtEnd:true});assert.equal(rows.length,2);assert.deepEqual(calls,['records','records','count']);
}
for(const count of [{code:2898,error:'Denied'},{code:3000,result:{records_count:'1'}},{code:3000,result:{records_count:'0'},output:{code:2898,error:'Denied'}}]){
 const api={getRecords:async()=>({code:3000,data:[]}),getRecordCount:async()=>count};await assert.rejects(bridge().readAll({api,reportName:'Fixture',countAtEnd:true}));
}
for(const response of [{code:3000,data:[{ID:'1'},{ID:'1'}]},{code:3000,data:[{ID:'1'}],record_cursor:'same'}]){
 let counted=false;const api={getRecords:async()=>response,getRecordCount:async()=>{counted=true;return {code:3000,result:{records_count:'1'}};}};await assert.rejects(bridge().readAll({api,reportName:'Fixture',countAtEnd:true}));assert.equal(counted,false);
}
{
 let cancelled=false,counted=false;const api={getRecords:async()=>{cancelled=true;return {code:3000,data:[]};},getRecordCount:async()=>{counted=true;return {code:3000,result:{records_count:'0'}};}};await assert.rejects(bridge().readAll({api,reportName:'Fixture',countAtEnd:true,isCancelled:()=>cancelled}),e=>e.cancelled);assert.equal(counted,false);
}
for(const terminal of ['3100','9280'])for(const wrap of [v=>v,v=>({responseText:JSON.stringify(v)}),v=>({cause:{response:{result:JSON.stringify(v)}}})])for(const rejected of [false,true]){
 const calls=[],raw=wrap({code:terminal,message:'No records found matching the given criteria.'});
 const api={getRecords:async()=>{calls.push('records');if(rejected)throw raw;return raw;},getRecordCount:async()=>{calls.push('count');return {code:3000,result:{records_count:'0'}};}};
 assert.deepEqual(JSON.parse(JSON.stringify(await bridge().readAll({api,reportName:'Comment_Log_Report',countAtEnd:true}))),[]);
 assert.deepEqual(calls,['records','count'],'A wrapped empty read is confirmed once and completes without retries.');
 api.getRecordCount=async()=>({code:3000,result:{records_count:'1'}});
 await assert.rejects(bridge().readAll({api,reportName:'Comment_Log_Report',countAtEnd:true}),/loaded 0 of 1/,'A positive count cannot be concealed as no comments.');
}
for(const raw of [
 {responseText:'{"code":3100}',details:{code:2898,error:'Denied'}},
 {responseText:'{"code":3100}',output:'{"code":'},
 {responseText:'{"code":3100}',permissionDenied:true},
 {responseText:'{"code":2898,"message":"No records found"}'},
 {message:'No records found matching the given criteria.'}
]){
 let counted=false;const api={getRecords:async()=>{throw raw;},getRecordCount:async()=>{counted=true;return {code:3000,result:{records_count:'0'}};}};
 await assert.rejects(bridge().readAll({api,reportName:'Comment_Log_Report',countAtEnd:true}));assert.equal(counted,false,'Unknown, denied or conflicting failures never become an empty thread.');
}
{
 const calls=[],api={getRecords:async config=>{calls.push('records');if(config.record_cursor)throw {responseText:'{"code":3100,"message":"No more records"}'};return {code:3000,data:[{ID:'1'}],record_cursor:'next'};},getRecordCount:async()=>{calls.push('count');return {code:3000,result:{records_count:'1'}};}};
 assert.equal((await bridge().readAll({api,reportName:'Fixture',countAtEnd:true})).length,1);assert.deepEqual(calls,['records','records','count']);
}
console.log('PASS cursor-first reads recognize native wrapped empty results; independent counts, denials, conflicting envelopes, pagination and cancellation remain verified.');
