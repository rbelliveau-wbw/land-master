import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const native=fs.readFileSync('creator/functions/exportBudgetSnapshot.dg','utf8');
// The full-export optimization must preserve individual PDF/Excel/approved
// attachment behavior. Update this baseline only for an intentional legacy edit.
assert.equal(createHash('sha256').update(native.slice(native.indexOf('// An export persists'))).digest('hex'),'1d82aa64ca5aa9aff06e7d2c330a7fe0c21a091e69bba941fbded330a4528d2b','legacy snapshot export bytes stay unchanged');
const retainedMarker="\t// Existing scoped snapshot and legacy attachment exports are retained below.\n";
assert.equal(createHash('sha256').update(native.slice(native.indexOf(retainedMarker)+retainedMarker.length)).digest('hex'),'c7537b8822bbd610e815fbb085267542a0b8ce94fd2dfdc1a30028c5728d2540','current native scoped snapshot/meta and attachment export body stays byte-for-byte unchanged');
const branch=native.slice(native.indexOf('// Read-only, application-wide export.'),native.indexOf(retainedMarker));
const oldElements=fs.readFileSync('scripts/fixtures/budget-element-export-before-batching.dg','utf8');
const oldName='budgetElementExportRowsBeforeBatching';
const branchSource='string fullExport(string budgetId, string exportType)\n{\n'+branch+'\nreturn "LEGACY";\n}';
function compile(source){
  // Adapt only map literals, native membership/range and collection projection.
  // Queries still execute the production criteria against explicit native shapes.
  for(;;){const next=source.replace(/\{([^{}]*)\}/g,(whole,body)=>/^\s*"(?:\\.|[^"\\])*"\s*:/.test(body)?`recordValues(${body.replace(/(^|,)\s*("(?:\\.|[^"\\])*")\s*:/g,'$1$2,')})`:whole);if(next===source)break;source=next;}
  return translate(source).js
    .replace(/\) desc range from 0 to 0/g,').reverse().slice(0,1)')
    .replace(/\) range from 0 to 99/g,').slice(0,100)')
    .replace(/\b(ID|Budget_Item) in (\w+)/g,'containsId($2,row.$1)')
    .replace(/(\w+)\.(ID|Budget_Category|Budget|Subdivision1|Project)\.getAll\(\)/g,'getAll($1,"$2")')
    .replaceAll('Budget_Category.row.Budget','row.Budget_Category.Budget');
}
const c=vm.createContext({});
vm.runInContext(`
  var zoho={loginuser:'viewer-with-no-owned-budgets'},tables={},writes=0,queries=[],thisapp={};
  function ifnull(value,fallback){return value==null?fallback:value;}
  function List(){return [];}
  function recordValues(...pairs){var result={};for(var i=0;i<pairs.length;i+=2)result[pairs[i]]=pairs[i+1];return result;}
  function Map(){return {};}
  Object.defineProperties(Object.prototype,{get:{value:function(key){return this[key]??null;}},put:{value:function(key,value){this[key]=value;}},toString:{value:function(){return JSON.stringify(this);}}});
  String.prototype.toMap=function(){return JSON.parse(this);};
  String.prototype.toLong=function(){return BigInt(this);};
  String.prototype.contains=function(value){return this.includes(value);};
  Number.prototype.abs=function(){return Math.abs(this);};
  Array.prototype.add=function(value){this.push(value??null);};
  Array.prototype.size=Array.prototype.count=function(){return this.length;};
  var links={Budget_Category:'Budget_Category',Budget:'Add_Budget',Subdivision1:'Subdivision',Project:'Project',Budget_Item:'Budget_Item'};
  function rec(form,row){return new Proxy(row,{get(object,key){
    if(key==='valueOf')return ()=>BigInt(object.ID);
    if(key==='toString')return ()=>String(object.ID);
    if(links[key]&&object[key]!=null&&!(form==='Add_Budget'&&key==='Project')){var parent=(tables[links[key]]||[]).find(value=>String(value.ID)===String(object[key]));return rec(links[key],parent||{ID:String(object[key])});}
    return object[key]??null;
  },set(){writes++;throw Error('Export must not write');}});}
  function query(form,predicate,sort){queries.push(form);var rows=Array.from(tables[form]||[],row=>rec(form,row)).filter(predicate);if(sort)rows.sort((a,b)=>BigInt(a[sort])>BigInt(b[sort])?1:BigInt(a[sort])<BigInt(b[sort])?-1:0);return new Proxy(rows,{get(array,key){return key in array||typeof key==='symbol'?array[key]:array[0]?.[key]??null;}});}
  function containsId(values,value){return values.some(entry=>String(entry)===String(value));}
  function getAll(rows,field){return Array.from(rows,row=>row[field]).filter(value=>value!=null);}
`,c);
for(const [name,source] of [
  ['budgetElementExportValues',fs.readFileSync('creator/functions/budgetElementExportValues.dg','utf8')],
  ['budgetElementExportRows',fs.readFileSync('creator/functions/budgetElementExportRows.dg','utf8')],
  [oldName,oldElements.replace('budgetElementExportRows(',oldName+'(')],
  ['fullExport',branchSource]
])vm.runInContext(compile(source)+`;thisapp.${name}=${name};`,c);
const plain=value=>JSON.parse(JSON.stringify(value));
const read=cursor=>JSON.parse(c.fullExport(JSON.stringify(cursor),'ALL_DETAIL'));
const base=4410926000000000000n;
const itemId=index=>String(base+BigInt(index));
const fields=['Labor','Materials','Equipment','Subcontractor','Other'];
const allocation=(prefix,suffix,values)=>Object.fromEntries(fields.map((field,index)=>[prefix+field+suffix,values[index]]));
const fixtures={
  Add_Budget:[
    {ID:'11',Project:'Saved Construction Project',Subdivision1:'31',Subdivision_Code:'001',Archived:true,Budget_Owner:'someone-else'},
    {ID:'12',Project:'Saved Engineering Project',Subdivision_Code:'002'},
    {ID:'13',Project:'Saved Development Project',Subdivision1:'32',Subdivision_Code:'003'},
    {ID:'14',Project:'Saved Missing Project',Subdivision1:'33',Subdivision_Code:'004'},
    {ID:'15',Project:'Saved Missing Subdivision',Subdivision1:'34',Subdivision_Code:'005'}
  ],
  Budget_Category:[
    {ID:'21',Budget:'11',Deparment:'Construction',Category_Code:'03100',Budget_Category_Name:'Site'},
    {ID:'22',Budget:'12',Deparment:'Engineering',Category_Code:'02100',Budget_Category_Name:'Design'},
    {ID:'23',Budget:'13',Deparment:'Development',Category_Code:'01100',Budget_Category_Name:'Land'},
    {ID:'24',Budget:'14',Deparment:'Construction',Category_Code:'03200',Budget_Category_Name:'Utility'},
    {ID:'25',Budget:null,Deparment:'Construction'},
    {ID:'26',Budget:'15',Deparment:'Construction',Category_Code:'03300',Budget_Category_Name:'Missing Subdivision'}
  ],
  Subdivision:[
    {ID:'31',Subdivision_Name:'First Phase',Subdivision_Code:'001',Project:'41'},
    {ID:'32',Subdivision_Name:'Development Phase',Subdivision_Code:'003',Project:'42'},
    {ID:'33',Subdivision_Name:'Missing Project Phase',Subdivision_Code:'004',Project:'43'}
  ],
  Project:[{ID:'41',Project_Name:null},{ID:'42',Project_Name:''}],
  Budget_Item:Array.from({length:2881},(_,index)=>({ID:itemId(index+1),Budget_Category:['21','22','23','24','26'][index%5],Item_Name:'Item '+index,Cost_Code:'00101',Unit:'LF',Per_Unit:null,Description:'Notes',Budget_Ttl:100,Prelim_Budget_Ttl:null,Unapproved_Final_Budget_Ttl:100,HCSS_Actuals:0,PROJ_Actual:0,...allocation('','_Budget',[10,20,30,40,0]),...allocation('HCSS_','_Actuals',[0,0,0,0,0]),...allocation('GP_','_Actuals',[0,0,0,0,0])})),
  Budget_Import_Item:[],Budget_Modification:[]
};
for(const [index,item] of fixtures.Budget_Item.entries()){
  if(index%5===1)for(const field of fields)delete item[field+'_Budget'];
  if(index%5===2)item.Materials_Budget=null;
  if(index%7===0)item.GP_Labor_Actuals=null;
  if(index%13===0){item.HCSS_Actuals=-12.3456;Object.assign(item,allocation('HCSS_','_Actuals',[-10.0001,-2.3455,0,0,0]));}
  if(index<100){
    fixtures.Budget_Import_Item.push({ID:String(10000+index),Budget_Item:item.ID,Data_Source:'HeavyJob Budget',Cost:60,...allocation('','',[10,20,30,0,0])},{ID:String(11000+index),Budget_Item:item.ID,Data_Source:'HeavyJob Budget',Cost:40,...allocation('','',[0,0,0,40,0])},{ID:String(12000+index),Budget_Item:item.ID,Data_Source:'Great Plains',Cost:999,...allocation('','',[999,0,0,0,0])});
  }
}
fixtures.Budget_Item[0].Budget_Ttl=0;fixtures.Budget_Item[0].Unapproved_Final_Budget_Ttl=0;fixtures.Budget_Item[0].HCSS_Actuals=0;Object.assign(fixtures.Budget_Item[0],allocation('','_Budget',[100,0,0,0,-100]));
Object.assign(fixtures.Budget_Item[2880],{Prelim_Budget_Ttl:0,Budget_Ttl:0,Unapproved_Final_Budget_Ttl:0,HCSS_Actuals:0,PROJ_Actual:0},allocation('','_Budget',[0,100,-100,0,0]));
fixtures.Budget_Item[3].Unapproved_Final_Budget_Ttl=101; // stale Imports must remain unknown.
fixtures.Budget_Import_Item[6].Labor=null; // partial Construction imports must remain unknown.
fixtures.Budget_Modification.push(
  {ID:'51',Budget_Item:itemId(1),Status:'Approved',Modification_Type:'Increase',Amount:-100,...allocation('','_Budget',[10,20,30,40,0])},
  {ID:'52',Budget_Item:itemId(1),Status:'Approved',Modification_Type:'Decrease',Amount:-30,...allocation('','_Budget',[0,0,0,30,0])},
  {ID:'53',Budget_Item:itemId(1),Status:'Submitted',Modification_Type:'Increase',Amount:999,...allocation('','_Budget',[999,0,0,0,0])},
  {ID:'54',Budget_Item:itemId(2),Status:'Approved',Modification_Type:'Increase',Amount:10},
  {ID:'55',Budget_Item:itemId(2881),Status:'Approved',Modification_Type:'Decrease',Amount:20,...allocation('','_Budget',[0,0,0,0,20])}
);
fixtures.Budget_Item.push({ID:itemId(5000),Budget_Category:'21',Budget_Ttl:0},{ID:itemId(6000),Budget_Category:'25',Budget_Ttl:999});
c.tables=fixtures;
let cursor={after:'0',through:'0'},all=[],pages=0,queries=0;
do{
  c.queries=[];
  const page=read(cursor);assert.equal(page.ok,true,page.error);pages++;
  assert.equal(page.pageSize,100);assert.equal(page.total,2881);assert.equal(page.through,itemId(6000));
  assert.equal(page.after,cursor.after);assert.equal(page.hasMore,page.rows.length===100);assert.equal(page.next,page.rows.at(-1)?.id||cursor.after);
  assert.equal(c.queries.length,pages===1?9:8,'each page has one read per table, independent of item count');queries+=c.queries.length;
  assert.equal(c.queries.filter(form=>form==='Budget_Import_Item').length,1);assert.equal(c.queries.filter(form=>form==='Budget_Modification').length,1);
  for(const row of page.rows){
    assert.equal(row.values.length,16);assert.equal(row.elements.length,5);assert.ok(BigInt(row.id)>BigInt(cursor.after));
    if(pages===1||row.id===itemId(2881)){
      assert.deepEqual(plain(row.elements),plain(c[oldName](row.id)),'batched elements preserve the prior helper exactly, including null and signed detail');
      assert.deepEqual(plain(c.budgetElementExportRows(row.id)),plain(c[oldName](row.id)),'other exporters retain their existing native helper results');
    }
  }
  all.push(...page.rows);cursor={after:page.next,through:page.through};
  if(!page.hasMore)break;
}while(pages<40);
assert.equal(pages,29,'2,881 rows need 29 calls rather than 145 twenty-row calls');assert.equal(all.length,2881);assert.equal(new Set(all.map(row=>row.id)).size,2881);assert.equal(queries,233);assert.equal(c.writes,0);
assert.equal(all[0].values[0],'Saved Construction Project','null linked project name preserves the saved project');
assert.equal(all[0].values[1],'First Phase - 001');assert.equal(all[0].values[12],70,'parent modification amounts retain abs plus Increase/Decrease sign');
assert.equal(all[1].values[0],'Saved Engineering Project');assert.equal(all[1].values[1],'002');assert.equal(all[1].elements[0].values[4],null,'legacy modification allocations stay unknown');
assert.equal(all[2].values[0],'','explicit blank linked project names remain blank');assert.equal(all[3].values[0],'Saved Missing Project','missing linked project retains saved project');
assert.equal(all[4].values[1],'','missing subdivision retains the previous exporter blank label');assert.equal(all.at(-1).values[12],-20,'modifications cannot leak across page boundaries');
assert.ok([9,10,11,13,14].every(column=>all.at(-1).values[column]===0));assert.equal(all.at(-1).elements[1].values[3],100);assert.equal(all.at(-1).elements[2].values[3],-100,'last-page offsetting component rows survive a zero parent');
assert.equal(read({after:'bad',through:'0'}).ok,false);assert.equal(read({after:itemId(2),through:itemId(1)}).ok,false);
c.zoho.loginuser='';assert.equal(read({after:'0',through:'0'}).ok,false);c.zoho.loginuser='viewer';
c.tables={};const empty=read({after:'0',through:'0'});assert.equal(empty.ok,true);assert.deepEqual(empty.rows,[]);assert.equal(empty.total,0);assert.equal(empty.pageSize,100);assert.equal(empty.hasMore,false);
assert.match(branch,/Budget_Item in fullItemIds && Status == "Approved"/);assert.match(branch,/Budget_Item in fullItemIds && Data_Source == "HeavyJob Budget"/);
const itemQuery=branch.match(/fullItems = Budget_Item\[([^\n]+)\] sort by ID/)[1];
for(const alternative of itemQuery.split(' || '))assert.ok(alternative.includes('ID > afterId && ID <= throughId && Budget_Category.Budget != null'),'every nonzero OR alternative retains all native cursor/parent bounds');
assert.doesNotMatch(branch,/insert into|sendmail|delete from|Edit_All|Budget_Owner|User_Access\[/,'full export stays an authenticated global read');
assert.doesNotMatch(fs.readFileSync('creator/functions/budgetElementExportValues.dg','utf8'),/Budget_Item\[|Budget_Import_Item\[|Budget_Modification\[/,'shared row calculation cannot query per item');
console.log('Full budget backend: 2,881 exact rows in 29 bounded pages, eight table reads per page, prior-helper parity, signed/unknown/default amounts, metadata fallbacks, source/page scoping and read-only behavior passed.');
