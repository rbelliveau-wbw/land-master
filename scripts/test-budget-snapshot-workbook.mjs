import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the production collector and bundled XLSX writer, including a real
// workbook round trip. These fixtures model the paged API; no Creator writes run.
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/full-budget-export.js','utf8'),context);
vm.runInContext(fs.readFileSync('widgets/land-master/src/app/vendor/xlsx.full.min.js','utf8'),context);
const E=context.BudgetFullExport,X=context.XLSX,plain=value=>JSON.parse(JSON.stringify(value));
const budgetId='4410926000000000123',labels=['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other'];
function row(index){
  const zero=index===2,final=zero?0:index===0?-100.1234:index+0.1234;
  return {
    id:String(4410926000008000001n+BigInt(index)),
    values:['=Project','Phase 01 - 001',index===3?'=Department':'Construction',index%2?'100':'20',index===3?'+Category':'Category '+(index%2),String(1000-index).padStart(6,'0'),index===3?'=1+1':'Item '+index,index===1?'':'LF',index===0?null:index===1?123.4567:0,0,zero?0:-0.0123,final,zero?0:-10.4321,0,zero?0:-9.8765,index===3?'=formula<br>next':'Note '+index],
    elements:labels.map((label,element)=>({code:String(element+1),label,values:zero?[label,null,null,0,0,0,null,null]:[label,element===0?null:element+0.1234,0,-element-0.1234,element===4?null:-0.0123,element===4?null:-element-0.1357,null,element===0?0:element+0.4321]}))
  };
}
const records=Array.from({length:227},(_,index)=>row(index));
function page(rows,after='0',total=rows.length,through=rows.at(-1)?.id||'0',size=20){
  return {contract:'budget-full-detail-v1',ok:true,budgetId,rows,total,after,next:rows.at(-1)?.id||after,through,hasMore:rows.length===size,pageSize:size};
}
function source(all,{size=20,mutate}={}){
  const requests=[];
  return {requests,read:async cursor=>{
    requests.push(plain(cursor));
    const remaining=all.filter(record=>cursor.after==='0'||BigInt(record.id)>BigInt(cursor.after));
    const result=page(remaining.slice(0,size),cursor.after,all.length,all.at(-1)?.id||'0',size);
    if(mutate)mutate(result,requests.length);
    return {code:3000,details:{output:JSON.stringify(result)}};
  }};
}
const pages=source(records),progress=[];
const rows=await E.collect(pages.read,(count,total)=>progress.push([count,total]),()=>true,{budgetId,allowZero:true});
assert.equal(rows.length,227);assert.equal(rows.elementRows.length,1135);
assert.equal(rows.budgetId,budgetId);assert.equal(pages.requests.length,12);
assert.deepEqual(pages.requests[0],{after:'0',through:'0',budgetId});
assert.deepEqual(pages.requests[1],{after:records[19].id,through:records.at(-1).id,budgetId});
assert.deepEqual(progress.at(-1),[227,227]);
assert.equal(rows[3][15],'=formula\nnext');

const meta={contract:'budget-snapshot-meta-v1',ok:true,budgetId,summary:{budgetLabel:'=SUM(1,2)',subdivisionCode:'00012',territory:'+Central',exportedDate:'11/05/2026',grandFinal:-123.4567},approvals:[
  {track:'=Development',role:'VP',approver:'person@example.com',status:'Approved',respondedDate:'11/04/2026',notes:'=note<br />second line'},
  {track:'Construction',role:'CFO',approver:'@approver',status:'Pending',respondedDate:null,notes:null}
]};
const parsed=E.parseSnapshotMeta({code:3000,result:JSON.stringify(meta)},budgetId);
assert.equal(parsed.budgetId,budgetId);
const book=E.snapshotWorkbook(X,rows,parsed);
const round=X.read(X.write(book,{type:'array',bookType:'xlsx'}),{type:'array',cellNF:true});
assert.deepEqual(plain(round.SheetNames),['Summary','Budget Detail','Budget Elements','Approval History']);
const grid=name=>plain(X.utils.sheet_to_json(round.Sheets[name],{header:1,defval:null}));
assert.deepEqual(grid('Summary'),[
  ['Budget Export',null],['Field','Value'],['Budget','=SUM(1,2)'],['Subdivision Code','00012'],['Territory','+Central'],['Exported','11/05/2026'],['Current Final Budget',-123.4567]
]);
assert.equal(round.Sheets.Summary.B3.t,'s');assert.equal(round.Sheets.Summary.B3.f,undefined);
assert.equal(round.Sheets.Summary.B4.v,'00012');assert.match(round.Sheets.Summary.B7.z,/0\.00/);
const detail=grid('Budget Detail'),elements=grid('Budget Elements');
assert.equal(detail.length,228);assert.equal(elements.length,1136);
assert.deepEqual(detail[0],['Department','Category Code','Category','Cost Code','Budget Item','Unit','Cost per Unit','Preliminary','Unapproved','Final','HCSS Actuals','GP Actuals','Notes']);
assert.deepEqual(elements[0],['Department','Category','Cost Code','Budget Item','Element','Preliminary','Unapproved','Final','Approved Mods','Revised Final','HCSS Actuals','GP Actuals']);
// Native Category_Code is numeric and Cost_Code is text: category 20 precedes
// category 100, with cost codes ascending inside each category.
const expectedOrder=records.filter((_,index)=>index%2===0).reverse().concat(records.filter((_,index)=>index%2===1).reverse());
expectedOrder.forEach((record,index)=>{
  const expectedDetail=[record.values[2],record.values[3],record.values[4],record.values[5],record.values[6],record.values[7],record.values[8],record.values[9],record.values[10],record.values[11],record.values[13],record.values[14],record.values[15].replace(/<br\s*\/?\s*>/gi,'\n')];
  assert.deepEqual(detail[index+1],expectedDetail);
  record.elements.forEach((element,offset)=>assert.deepEqual(elements[index*5+offset+1],[record.values[2],record.values[4],record.values[5],record.values[6],...element.values]));
});
assert.equal(round.Sheets['Budget Detail'].B2.t,'s');assert.equal(round.Sheets['Budget Detail'].D2.t,'s');
assert.equal(round.Sheets['Budget Detail'].D2.v,'000774');
const manualRow=detail.findIndex(record=>record[4]==='Item 1')+1;
assert.equal(round.Sheets['Budget Detail']['G'+manualRow].v,123.4567,'manual rate is independent of Unit');
assert.equal(round.Sheets['Budget Detail']['F'+manualRow].v,'');
const blankRateRow=detail.findIndex(record=>record[4]==='Item 0')+1;
assert.equal(round.Sheets['Budget Detail']['G'+blankRateRow],undefined,'null rate stays blank');
assert.match(round.Sheets['Budget Detail']['J'+blankRateRow].z,/0\.00/);
assert.match(round.Sheets['Budget Elements'].H2.z,/0\.####/);
const zeroRow=detail.find(record=>record[4]==='Item 2');
assert.equal(zeroRow[6],0);assert.equal(zeroRow[9],0,'all-zero saved items remain in selected snapshots');
const formulaRow=detail.findIndex(record=>record[4]==='=1+1')+1;
for(const column of ['A','C','E','M']){const cell=round.Sheets['Budget Detail'][column+formulaRow];assert.equal(cell.t,'s');assert.equal(cell.f,undefined);}
assert.deepEqual(grid('Approval History'),[
  ['Track','Role','Approver','Status','Responded','Approval Notes'],
  ['=Development','VP','person@example.com','Approved','11/04/2026','=note\nsecond line'],
  ['Construction','CFO','@approver','Pending','','']
]);
assert.equal(round.Sheets['Approval History'].A2.t,'s');assert.equal(round.Sheets['Approval History'].A2.f,undefined);

// Legacy pages still default to 200; advertised small and exact-boundary pages
// require complete cursor/count verification and a final empty boundary page.
const legacy=page([row(0)],'0',1,row(0).id,200);delete legacy.pageSize;
assert.equal((await E.collect(async()=>legacy)).length,1);
const appWide=source(records.filter((_,index)=>index!==2));
assert.equal((await E.collect(appWide.read)).length,226,'application-wide export accepts advertised 20-row pages without changing its nonzero filter');
for(const size of [1,20,200]){
  const fixture=source(records.slice(0,size),{size});
  const result=await E.collect(fixture.read,null,null,{budgetId,allowZero:true});
  assert.equal(result.length,size);assert.equal(fixture.requests.length,2);
}
const empty=source([]);
const emptyRows=await E.collect(empty.read,null,null,{budgetId,allowZero:true});
assert.equal(E.snapshotWorkbook(X,emptyRows,{...meta,approvals:[]}).SheetNames.length,4);
for(const size of [0,-1,201,1.5,'20',null])await assert.rejects(()=>E.collect(async()=>({...page([row(0)]),pageSize:size})),/Incomplete/);
await assert.rejects(()=>E.collect(async()=>page(records.slice(0,21),'0',227,records.at(-1).id)),/Incomplete/);
for(const mutate of [
  result=>{result.after='1';},result=>{result.next='0';},result=>{result.hasMore=false;},result=>{result.total=0;},
  result=>{result.rows[1]=result.rows[0];},result=>{result.rows[0]={...result.rows[0],id:'9999999999999999999'};}
]){
  const fixture=source(records,{mutate});
  await assert.rejects(()=>E.collect(fixture.read,null,null,{budgetId,allowZero:true}),/response|row|pagination/);
}
for(const mutate of [
  (result,count)=>{if(count===2)result.pageSize=200;},
  (result,count)=>{if(count===2)delete result.pageSize;},
  (result,count)=>{if(count===2)result.total++;},
  (result,count)=>{if(count===2)result.through='9999999999999999999';},
  (result,count)=>{if(count===2)result.budgetId='4410926000000000124';}
]){
  const fixture=source(records,{mutate});
  await assert.rejects(()=>E.collect(fixture.read,null,null,{budgetId,allowZero:true}),/size changed|changed during export|different budget/);
}
await assert.rejects(()=>E.collect(async()=>({...page([row(0)]),budgetId:undefined}),null,null,{budgetId,allowZero:true}),/different budget/);
await assert.rejects(()=>E.collect(async()=>page([row(2)])),/empty budget row/,'the full export keeps its nonzero rule');
await assert.rejects(()=>E.collect(async()=>page([row(2)]),null,null,{budgetId}),/empty budget row/);
await assert.rejects(()=>E.collect(async()=>page([row(0)]),null,null,{budgetId:123,allowZero:true}),/scope/);
await assert.rejects(()=>E.collect(source(records,{mutate:result=>{result.total=228;}}).read,null,null,{budgetId,allowZero:true}),/missing/);
let current=true;
await assert.rejects(()=>E.collect(async()=>{current=false;return page([row(0)]);},null,()=>current,{budgetId,allowZero:true}),/user or environment changed/);
for(const response of [null,{},'not JSON',{code:2898,message:'Denied'},{...meta,ok:false,error:'Read failed'},{...meta,budgetId:'4410926000000000124'},{...meta,summary:null},{...meta,approvals:[{}]},{...meta,summary:{...meta.summary,grandFinal:'100'}}])assert.throws(()=>E.parseSnapshotMeta(response,budgetId));
assert.throws(()=>E.snapshotWorkbook(X,rows,{...meta,budgetId:'4410926000000000124'}),/different budget/);
console.log('Budget snapshot: 227 items / 1135 elements, four-sheet XLSX round trip, scope, precision, zeros, formula-safe text, metadata and stable bounded pagination passed.');
