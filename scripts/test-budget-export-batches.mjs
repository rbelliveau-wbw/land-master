import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

// Execute the actual read-only Deluge branches and shared element helper.
// Adapt native record/list/query/date behavior only; this is not a Creator compiler
// or proof of the plan's native statement budget.
const native=fs.readFileSync('creator/functions/exportBudgetSnapshot.dg','utf8');
const readBranch=native.slice(native.indexOf('// Read-only, application-wide export.'),native.indexOf('// An export persists'));
assert.doesNotMatch(readBranch,/insert into|delete from|sendmail|invokeurl|\.toFile\(|\.convertToPDF\(/,'paged reads cannot create files or records');
assert.match(readBranch,/fullResult\.put\("pageSize",20\)/);
assert.match(readBranch,/fullResult\.put\("hasMore",fullRows\.size\(\) == 20\)/);
assert.equal((readBranch.match(/range from 0 to 19/g)||[]).length,2,'both row modes are limited to twenty parents');
assert.doesNotMatch(readBranch,/range from 0 to 199/);

function compile(source){
  // Deluge map literals are not part of the basic packet adapter.
  source=source.replace(/\{([^{}]*)\}/g,(whole,body)=>/^\s*"(?:\\.|[^"\\])*"\s*:/.test(body)
    ?`recordValues(${body.replace(/(^|,)\s*("(?:\\.|[^"\\])*")\s*:/g,'$1$2,')})`:whole);
  return translate(source).js
    .replace(/\) desc range from 0 to 0/g,').toReversed().slice(0,1)')
    .replace(/\) range from 0 to 19/g,').slice(0,20)')
    .replaceAll('Budget_Category.row.Budget','row.Budget_Category?.Budget');
}

const c=vm.createContext({});
vm.runInContext(`
var tables={},writes=0,helperCalls=0,queries=[],thisapp={};
var zoho={loginuser:'jking',currenttime:{toString(format){if(format!=='MM/dd/yyyy hh:mm a')throw Error('Unexpected export date format');return '11/05/2026 03:44 PM';}}};
function ifnull(value,fallback){return value==null?fallback:value;}
function List(){return [];}
function Map(){return {put(key,value){this[key]=value;},get(key){return this[key]??null;},toString(){return JSON.stringify(this);}};}
function recordValues(...pairs){var result=Map();for(var i=0;i<pairs.length;i+=2)result.put(pairs[i],pairs[i+1]);return result;}
Object.defineProperty(Object.prototype,'get',{value:function(key){return this[key]??null;}});
Array.prototype.add=function(value){this.push(value??null);};
Array.prototype.get=function(index){return this[index]??null;};
Array.prototype.size=Array.prototype.count=function(){return this.length;};
Array.prototype.contains=function(value){return this.includes(value);};
String.prototype.toMap=function(){return JSON.parse(this);};
String.prototype.toLong=function(){return BigInt(this);};
String.prototype.toDecimal=function(){return Number(this);};
String.prototype.contains=function(value){return this.includes(value);};
String.prototype.matches=function(value){return new RegExp('^(?:'+value+')$').test(this);};
Number.prototype.toLong=function(){return BigInt(this);};
Number.prototype.toDecimal=function(){return Number(this);};
Number.prototype.abs=function(){return Math.abs(this);};
BigInt.prototype.toLong=function(){return this.valueOf();};
var links={Budget_Category:'Budget_Category',Budget:'Add_Budget',Budget_Item:'Budget_Item',Subdivision1:'Subdivision',Project:'Project'};
function record(form,row){
  return new Proxy(row,{get(object,key){
    if(key==='valueOf')return ()=>BigInt(object.ID);
    if(key==='toString')return ()=>String(object.ID);
    if(key==='ID')return BigInt(object.ID);
    if(links[key]&&object[key]!=null&&!(form==='Add_Budget'&&key==='Project')){
      var parent=(tables[links[key]]||[]).find(value=>String(value.ID)===String(object[key]));
      return parent?record(links[key],parent):null;
    }
    return object[key]??null;
  },set(){writes++;throw Error('Read-only export attempted a write');}});
}
function query(form,predicate,sort){
  var rows=Array.from(tables[form]||[],row=>record(form,row)).filter(predicate);
  if(sort)rows.sort((a,b)=>a[sort]>b[sort]?1:a[sort]<b[sort]?-1:0);
  queries.push(form);
  return new Proxy(rows,{get(array,key){return key in array||typeof key==='symbol'?array[key]:array[0]?.[key]??null;},set(){writes++;throw Error('Read-only collection attempted a write');}});
}
`,c);
vm.runInContext(compile(fs.readFileSync('creator/functions/budgetElementExportRows.dg','utf8'))+`;thisapp.budgetElementExportRows=function(id){helperCalls++;return budgetElementExportRows(id);};`,c);
vm.runInContext(compile('string exportRead(string budgetId, string exportType)\n{\n'+readBranch+'\nreturn "LEGACY";\n}'),c);

const target='4410926000001744002',foreign='4410926000001744003',empty='4410926000001744004';
const itemId=index=>String(4410926000002000000n+BigInt(index));
const fields=['Labor_Budget','Materials_Budget','Equipment_Budget','Subcontractor_Budget','Other_Budget'];
const elements=values=>Object.fromEntries(fields.map((field,index)=>[field,values[index]]));
c.tables={
  Add_Budget:[
    {ID:target,Budget_Name:'Phase Budget',Project:'Saved Project',Phase:'Phase 01',Subdivision_Code:'001',Subdivision1:'3001',Budget_Grand_Total:'123456.78',Budget_Owner:'another-user',Archived:true},
    {ID:foreign,Budget_Name:'Foreign Budget',Project:'Other Project',Subdivision_Code:'002'},
    {ID:empty,Budget_Name:'Empty Budget',Project:'',Subdivision1:'3002',Subdivision_Code:'003'}
  ],
  Budget_Category:[
    {ID:'2001',Budget:target,Deparment:'Development',Category_Code:'02100',Budget_Category_Name:'Saved Category'},
    {ID:'2002',Budget:foreign,Deparment:'Construction',Category_Code:'03100',Budget_Category_Name:'Foreign Category'},
    {ID:'2003',Budget:null,Deparment:'Development',Category_Code:'09900',Budget_Category_Name:'Orphan Category'},
    {ID:'2004',Budget:'999999999999999999',Deparment:'Engineering',Category_Code:'09901',Budget_Category_Name:'Deleted Budget'}
  ],
  Subdivision:[{ID:'3001',Subdivision_Name:'Live Subdivision',Subdivision_Code:'S001',Territory:'North Austin',Project:'4001'},{ID:'3002',Subdivision_Name:'Subdivision Fallback',Territory:'Waco'}],
  Project:[{ID:'4001',Project_Name:'Linked Project'}],
  Budget_Item:Array.from({length:227},(_,index)=>({
    ID:itemId(index+1),Budget_Category:'2001',Cost_Code:'0'+String(index+1).padStart(4,'0'),Item_Name:'Saved Item '+index,Unit:'LF',Per_Unit:index===0?null:12.34,
    Prelim_Budget_Ttl:index===0?0:index===1?-20:100,Unapproved_Final_Budget_Ttl:0,Budget_Ttl:index===0?0:200,HCSS_Actuals:0,PROJ_Actual:0,Description:index===0?'Saved <br> notes':''
  })),
  Budget_Import_Item:[],
  Budget_Modification:[
    {ID:'5001',Budget_Item:itemId(2),Status:'Approved',Modification_Type:'Increase',Amount:100,...elements([0,0,0,0,100])},
    {ID:'5002',Budget_Item:itemId(2),Status:'Approved',Modification_Type:'Decrease',Amount:30,...elements([0,0,0,0,30])},
    {ID:'5003',Budget_Item:itemId(2),Status:'Submitted',Modification_Type:'Increase',Amount:999,...elements([0,0,0,0,999])}
  ],
  Budget_Approvals:[
    {ID:'6002',Budget:target,Sort_Order:2,Type1:'Construction',Title:'CFO',Approver:'cfo@example.com',Status:'Pending',Responded_Date:null,Approval_Notes:'Pending note'},
    {ID:'6001',Budget:target,Sort_Order:1,Type1:'Development',Title:'VP',Approver:'vp@example.com',Status:'Approved',Responded_Date:{toString(format){assert.equal(format,'MM/dd/yyyy');return '11/04/2026';}},Approval_Notes:'Approved<br>with notes'},
    {ID:'6003',Budget:foreign,Sort_Order:0,Title:'Foreign',Approver:'foreign@example.com'}
  ]
};
c.tables.Budget_Item.push(
  {ID:itemId(228),Budget_Category:'2002',Item_Name:'Foreign Item',Budget_Ttl:900},
  {ID:itemId(229),Budget_Category:'2003',Item_Name:'Orphan Parent',Budget_Ttl:900},
  {ID:itemId(230),Budget_Category:'missing',Item_Name:'Missing Category',Budget_Ttl:900},
  {ID:itemId(231),Budget_Category:'2004',Item_Name:'Deleted Budget Parent',Budget_Ttl:900}
);
// The date fixture lives outside the VM, so its formatter checks native format here.
const read=(mode,payload)=>JSON.parse(c.exportRead(typeof payload==='string'?payload:JSON.stringify(payload),mode));
function collect(mode,budget){
  let after='0',through='0',total=null,rows=[],pages=[],calls=0;
  for(;;){
    const before=c.helperCalls;
    const page=read(mode,{...(budget?{budgetId:budget}:{}),after,through});
    assert.equal(page.ok,true,page.error);
    assert.equal(page.contract,'budget-full-detail-v1');assert.equal(page.pageSize,20);
    assert.ok(page.rows.length<=20);assert.equal(c.helperCalls-before,page.rows.length,'only selected page rows execute the element helper');
    assert.equal(page.after,after);assert.equal(page.hasMore,page.rows.length===20);
    if(budget)assert.equal(page.budgetId,budget);
    if(total===null){total=page.total;through=page.through;}
    assert.equal(page.total,total);assert.equal(page.through,through);
    for(const row of page.rows){assert.ok(BigInt(row.id)>BigInt(after));assert.ok(BigInt(row.id)<=BigInt(through));assert.equal(row.values.length,16);assert.equal(row.elements.length,5);after=row.id;}
    assert.equal(page.next,after);rows.push(...page.rows);pages.push(page.rows.length);
    assert.ok(++calls<100,'native pagination must terminate');
    if(!page.hasMore){assert.equal(rows.length,total);return {rows,pages,through,total};}
  }
}

const snapshot=collect('SNAPSHOT_DETAIL',target);
assert.equal(snapshot.total,227);assert.equal(snapshot.rows.flatMap(row=>row.elements).length,1135);
assert.deepEqual(snapshot.pages,[20,20,20,20,20,20,20,20,20,20,20,7]);
assert.equal(snapshot.through,itemId(227),'foreign/orphan rows cannot extend the per-budget upper bound');
assert.equal(snapshot.rows[0].id,itemId(1));assert.equal(snapshot.rows[0].values[11],0,'snapshot preserves zero rows');
assert.equal(snapshot.rows[0].values[8],null);assert.equal(snapshot.rows[0].values[15],'Saved <br> notes','native read returns saved text without rewriting it');
assert.equal(snapshot.rows[1].values[9],-20,'credits remain signed');assert.equal(snapshot.rows[1].values[12],70,'only approved signed modifications contribute');
assert.equal(snapshot.rows[0].values[0],'Linked Project');assert.equal(snapshot.rows[0].values[1],'Live Subdivision - S001');
assert.equal(new Set(snapshot.rows.map(row=>row.id)).size,227,'all exact large IDs occur once');
const bounded=read('SNAPSHOT_DETAIL',{budgetId:target,after:itemId(200),through:itemId(210)});
assert.equal(bounded.rows.length,10);assert.equal(bounded.total,210);assert.equal(bounded.next,itemId(210));assert.equal(bounded.hasMore,false);
assert.equal(collect('SNAPSHOT_DETAIL',empty).total,0);

let all=collect('ALL_DETAIL');
assert.equal(all.total,227,'ALL_DETAIL excludes the zero row and orphan parents, and includes the foreign valid budget');
assert.ok(!all.rows.some(row=>row.id===itemId(1)));
assert.ok(all.rows.some(row=>row.id===itemId(228)));
c.tables.Budget_Item.push(
  {ID:itemId(232),Budget_Category:'2001',Item_Name:'Offsetting elements',Budget_Ttl:0,Prelim_Budget_Ttl:0,HCSS_Actuals:0,PROJ_Actual:0,...elements([100,0,0,0,-100])},
  {ID:itemId(233),Budget_Category:'2001',Item_Name:'Actual only',Budget_Ttl:0,Prelim_Budget_Ttl:0,HCSS_Actuals:-12,PROJ_Actual:0}
);
all=collect('ALL_DETAIL');assert.equal(all.total,229);assert.ok(all.rows.some(row=>row.id===itemId(232)),'offsetting native elements preserve a zero-total parent');assert.ok(all.rows.some(row=>row.id===itemId(233)),'actual-only signed records remain');

const meta=read('SNAPSHOT_META',target);
assert.equal(meta.ok,true,meta.error);assert.equal(meta.contract,'budget-snapshot-meta-v1');assert.equal(meta.budgetId,target);
assert.deepEqual(meta.summary,{budgetLabel:'Saved Project - Phase 01 - Phase Budget',subdivisionCode:'001',territory:'North Austin',exportedDate:'11/05/2026 03:44 PM',grandFinal:123456.78});
assert.deepEqual(meta.approvals,[
  {track:'Development',role:'VP',approver:'vp@example.com',status:'Approved',respondedDate:'11/04/2026',notes:'Approved<br>with notes'},
  {track:'Construction',role:'CFO',approver:'cfo@example.com',status:'Pending',respondedDate:'',notes:'Pending note'}
]);
assert.equal(read('SNAPSHOT_META',empty).summary.budgetLabel,'Subdivision Fallback - Empty Budget');
assert.equal(read('SNAPSHOT_META',foreign).summary.budgetLabel,'Other Project - Foreign Budget');
assert.equal(read('SNAPSHOT_META',foreign).summary.grandFinal,0);
for(const bad of ['', 'not-an-id', '0', '999999999999999999']){
  assert.equal(read('SNAPSHOT_META',bad).ok,false,bad);
  assert.equal(read('SNAPSHOT_DETAIL',{budgetId:bad,after:'0',through:'0'}).ok,false,bad);
}
for(const cursor of [{after:'bad',through:'0'},{after:'-1',through:'0'},{after:itemId(2),through:itemId(1)}]){
  assert.equal(read('SNAPSHOT_DETAIL',{budgetId:target,...cursor}).ok,false);
  assert.equal(read('ALL_DETAIL',cursor).ok,false);
}
c.zoho.loginuser='';
for(const [mode,payload] of [['ALL_DETAIL',{after:'0',through:'0'}],['SNAPSHOT_DETAIL',{budgetId:target,after:'0',through:'0'}],['SNAPSHOT_META',target]])assert.equal(read(mode,payload).ok,false,'every read branch requires the authenticated native caller');
assert.equal(c.writes,0);
assert.ok(!c.queries.includes('User_Access'),'read-only export does not add an ownership or edit grant gate');
console.log('Budget export native batches: twenty-row pages, 227 exact scoped items / 1135 elements, all-budget zero/credit/actual/offsetting rules, metadata/history and no writes passed.');
