import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/full-budget-export.js','utf8'),context);
vm.runInContext(fs.readFileSync('widgets/land-master/src/app/vendor/xlsx.full.min.js','utf8'),context);
const E=context.BudgetFullExport,X=context.XLSX,plain=value=>JSON.parse(JSON.stringify(value));
function row(i,values={}){return {id:String(4410926000000000000n+BigInt(i)),values:Object.assign(['=Project','Phase 01 - 001','Engineering','02100','Design','02101','Design','LF',null,0,0,100,-20,0,0,'a<br>b'],values)};}
function page(rows,after='0',total=rows.length,through=rows.at(-1)?.id||'0'){
  return {contract:'budget-full-detail-v1',ok:true,rows,total,after,next:rows.at(-1)?.id||after,through,hasMore:rows.length===200};
}
const records=Array.from({length:201},(_,i)=>row(i+1)),requests=[],progress=[];
const all=await E.collect(async cursor=>{
  requests.push(plain(cursor));
  return {code:3000,result:JSON.stringify(page(cursor.after==='0'?records.slice(0,200):records.slice(200),cursor.after,201,records.at(-1).id))};
},(count,total)=>progress.push([count,total]),()=>true);
assert.equal(all.length,201);assert.deepEqual(requests,[{after:'0',through:'0'},{after:records[199].id,through:records[200].id}]);
assert.deepEqual(progress,[[200,201],[201,201]]);
assert.equal(all[0][15],'a\nb');
const book=E.workbook(X,all),bytes=X.write(book,{type:'array',bookType:'xlsx'}),round=X.read(bytes,{type:'array',cellNF:true});
assert.deepEqual(plain(round.SheetNames),['Budget Detail','Budget Elements']);
assert.equal(X.utils.sheet_to_json(round.Sheets['Budget Elements'],{header:1}).length,201*5+1,'all five element rows export separately from parent totals');
const sheet=round.Sheets['Budget Detail'];
assert.deepEqual(plain(X.utils.sheet_to_json(sheet,{header:1})[0]),plain(E.headers));
assert.equal(sheet.A2.v,'=Project');assert.equal(sheet.A2.t,'s');assert.equal(sheet.A2.f,undefined,'text must not become an Excel formula');
assert.equal(sheet.D2.v,'02100');assert.equal(sheet.F2.v,'02101');
assert.equal(sheet.M2.v,-20);assert.equal(sheet.M2.t,'n');assert.match(sheet.M2.z,/\$/);
assert.equal(sheet.I2,undefined,'blank cost per unit stays blank');
assert.equal(sheet['!autofilter'].ref,'A1:P202');
assert.equal(sheet.P2.v,'a\nb');
assert.deepEqual(plain(await E.collect(async()=>page([]))),[]);
for(const amounts of [{9:-1,11:0},{11:0,13:0.01},{11:0,14:-50}]){
  assert.equal((await E.collect(async()=>page([row(1,amounts)]))).length,1,'credits and actual-only rows remain');
}
await assert.rejects(()=>E.collect(async()=>page([row(1,{11:0})])),/empty budget row/);
await assert.rejects(()=>E.collect(async()=>page([row(1,{11:'100'})])),/Invalid amount/);
await assert.rejects(()=>E.collect(async()=>page([row(2),row(1)])),/Invalid full export row/);
await assert.rejects(()=>E.collect(async()=>page([row(1),row(1)])),/Invalid full export row/);
await assert.rejects(()=>E.collect(async()=>page([row(1)],'0',2)),/missing/);
await assert.rejects(()=>E.collect(async()=>({code:2898,message:'Denied'})),/Denied/);
await assert.rejects(()=>E.collect(async()=>({contract:'budget-full-detail-v1',ok:false,error:'Read failed'})),/Read failed/);
await assert.rejects(()=>E.collect(async()=>page([row(1)]),null,()=>false),/user or environment changed/);
let calls=0;
await assert.rejects(()=>E.collect(async cursor=>{
  calls++;if(calls===2)throw new Error('Network failed');return page(records.slice(0,200),cursor.after,201,records.at(-1).id);
}),/Network failed/);
calls=0;
await assert.rejects(()=>E.collect(async cursor=>{
  calls++;return page(calls===1?records.slice(0,200):records.slice(200),cursor.after,calls===1?201:202,records.at(-1).id);
}),/changed during export/);
await import('./test-budget-full-export-backend.mjs');
const html=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
assert.match(html,/id="fullBudgetExport"/);assert.match(html,/exportType:"ALL_DETAIL"/);
console.log('Full budget export: complete pagination, XLSX round-trip, text codes, currency, credits, empty/failed/changed reads and native read-only contract passed.');
