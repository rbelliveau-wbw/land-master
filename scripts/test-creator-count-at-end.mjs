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
console.log('PASS opt-in cursor-first reads require final independent count; denial/mismatch/duplicate/cursor/cancellation fail closed.');
