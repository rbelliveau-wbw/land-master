import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

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
assert.deepEqual(plain(round.SheetNames),['Budget Detail']);
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
const native=fs.readFileSync('creator/functions/exportBudgetSnapshot.dg','utf8');
const branch=native.slice(native.indexOf('// Read-only, application-wide export.'),native.indexOf('// An export persists'));
assert.match(branch,/Budget_Category\.Budget != null/);
for(const field of ['Prelim_Budget_Ttl','Unapproved_Final_Budget_Ttl','Budget_Ttl','HCSS_Actuals','PROJ_Actual'])assert.ok(branch.includes(`${field} != null && ${field} != 0`));
const itemQuery=branch.match(/for each fullItem in Budget_Item\[([^\n]+)\] sort by ID/)[1];
for(const alternative of itemQuery.split(' || ')){
  assert.ok(alternative.includes('ID > afterId && ID <= throughId && Budget_Category.Budget != null'), 'each OR alternative repeats all scope bounds, including after Creator removes grouping');
}
assert.match(branch,/Status == "Approved"/);assert.match(branch,/Modification_Type,""\) == "Decrease"/);
assert.equal([...branch.matchAll(/fullValues.add\(/g)].length,16);
assert.doesNotMatch(branch,/insert into|sendmail|delete from|Edit_All|Budget_Owner|User_Access\[/,'full export is a global read and cannot write or restrict to owned budgets');
// Execute the actual new Deluge branch; adapt only native query/range/list
// syntax and record wrappers to the repository's existing offline test runtime.
let nativeJs=translate('string fullExport(string budgetId, string exportType)\n{\n'+branch+'\nreturn "LEGACY";\n}').js;
nativeJs=nativeJs.replace(/\) desc range from 0 to 0/g,').reverse().slice(0,1)')
  .replace(/\) range from 0 to 199/g,').slice(0,200)')
  .replaceAll('Budget_Category.row.Budget','row.Budget_Category.Budget');
const nativeContext=vm.createContext({});
vm.runInContext(`
  var zoho={loginuser:'viewer-with-no-owned-budgets'},tables={},writes=0;
  function ifnull(v,f){return v==null?f:v;}
  function List(){return [];}
  function Map(){return {put(k,v){this[k]=v;},get(k){return this[k]??null;},toString(){return JSON.stringify(this);}};}
  String.prototype.toMap=function(){return JSON.parse(this);};
  Object.prototype.get=function(k){return this[k]??null;};
  String.prototype.toLong=function(){return BigInt(this);};
  Number.prototype.abs=function(){return Math.abs(this);};
  Array.prototype.add=function(v){this.push(v??null);};
  Array.prototype.size=Array.prototype.count=function(){return this.length;};
  var links={Budget_Category:'Budget_Category',Budget:'Add_Budget',Subdivision1:'Subdivision',Project:'Project',Budget_Item:'Budget_Item'};
  function rec(form,row){return new Proxy(row,{get(o,k){
    if(k==='valueOf')return ()=>BigInt(o.ID);
    if(k==='toString')return ()=>String(o.ID);
    if(links[k]&&o[k]!=null&&!(form==='Add_Budget'&&k==='Project')){var parent=(tables[links[k]]||[]).find(r=>r.ID===o[k]);return parent?rec(links[k],parent):null;}
    return o[k]??null;
  },set(){writes++;throw Error('Export must not write');}});}
  function query(form,predicate,sort){var rows=Array.from(tables[form]||[],r=>rec(form,r)).filter(predicate);if(sort)rows.sort((a,b)=>a[sort]>b[sort]?1:a[sort]<b[sort]?-1:0);return new Proxy(rows,{get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;}});}
`+nativeJs,nativeContext);
nativeContext.tables={
  Add_Budget:[{ID:'11',Project:'Legacy project',Subdivision1:'31',Subdivision_Code:'001',Budget_Owner:'somebody-else',Archived:true},{ID:'12',Project:'Second project',Subdivision_Code:'002'}],
  Budget_Category:[{ID:'21',Budget:'11',Deparment:'Engineering',Category_Code:'02100',Budget_Category_Name:'Design'},{ID:'22',Budget:'12',Deparment:'Construction',Category_Code:'03100',Budget_Category_Name:'Clearing'}],
  Subdivision:[{ID:'31',Subdivision_Name:'First phase',Subdivision_Code:'001',Project:'41'}],Project:[{ID:'41',Project_Name:'Linked project'}],
  Budget_Item:Array.from({length:202},(_,i)=>({ID:String(4410926000000000000n+BigInt(i+1)),Budget_Category:i%2?'22':'21',Item_Name:'Item '+i,Cost_Code:'02101',Budget_Ttl:i===201?null:100,Prelim_Budget_Ttl:null,Unapproved_Final_Budget_Ttl:0,HCSS_Actuals:0,PROJ_Actual:0,Description:'note',Unit:'LF',Per_Unit:null})),
  Budget_Modification:[{ID:'51',Budget_Item:records[0].id,Status:'Approved',Modification_Type:'Increase',Amount:100},{ID:'52',Budget_Item:records[0].id,Status:'Approved',Modification_Type:'Decrease',Amount:30},{ID:'53',Budget_Item:records[0].id,Status:'Submitted',Modification_Type:'Increase',Amount:999}]
};
const nativeRead=cursor=>JSON.parse(vm.runInContext(`fullExport(${JSON.stringify(JSON.stringify(cursor))},"ALL_DETAIL")`,nativeContext));
const first=nativeRead({after:'0',through:'0'});
assert.equal(first.ok,true,first.error);assert.equal(first.total,201);assert.equal(first.rows.length,200);
assert.equal(first.rows[0].values[0],'Linked project');assert.equal(first.rows[0].values[1],'First phase - 001');
assert.equal(first.rows[0].values[12],70,'only approved signed amounts contribute');assert.equal(first.rows[0].values[8],null);
assert.equal(first.rows[1].values[0],'Second project','all budgets include another project and archived/unowned budgets');
const nativeRows=await E.collect(async cursor=>nativeRead(cursor));assert.equal(nativeRows.length,201);
assert.equal(nativeContext.writes,0);
assert.equal(nativeRead({after:'bad',through:'0'}).ok,false);
nativeContext.zoho.loginuser='';assert.equal(nativeRead({after:'0',through:'0'}).ok,false);
const html=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
assert.match(html,/id="fullBudgetExport"/);assert.match(html,/exportType:"ALL_DETAIL"/);
console.log('Full budget export: complete pagination, XLSX round-trip, text codes, currency, credits, empty/failed/changed reads and native read-only contract passed.');
