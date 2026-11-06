import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';
const names=['budgetElementExportValues','budgetElementExportRows','budgetElementExportHtml','poElementExportRows'];
function compile(source){return translate(source.replace(/\{([^{}]*)\}/g,(whole,body)=>/^\s*"(?:\\.|[^"\\])*"\s*:/.test(body)?`recordValues(${body.replace(/(^|,)\s*("(?:\\.|[^"\\])*")\s*:/g,'$1$2,')})`:whole)).js;}
const runtime=vm.createContext({});
vm.runInContext(`
var tables={},thisapp={};
function ifnull(value,fallback){return value==null?fallback:value;}
function List(){return [];}
function recordValues(...pairs){var result={};for(var i=0;i<pairs.length;i+=2)result[pairs[i]]=pairs[i+1];return result;}
function Map(){return {};}
Object.defineProperties(Object.prototype,{get:{value:function(key){return this[key]??null;}},put:{value:function(key,value){this[key]=value;}}});
Array.prototype.add=function(value){this.push(value);};Array.prototype.get=function(index){return this[index]??null;};Array.prototype.count=Array.prototype.size=function(){return this.length;};Array.prototype.contains=function(value){return this.includes(value);};
String.prototype.toLong=String.prototype.toDecimal=function(){return Number(this);};String.prototype.contains=function(value){return this.includes(value);};String.prototype.matches=function(value){return new RegExp('^(?:'+value+')$').test(this);};
String.prototype.replaceAll=function(pattern,value){return this.replace(new RegExp(pattern,'g'),value);};
Number.prototype.toLong=Number.prototype.toDecimal=function(){return Number(this);};Number.prototype.abs=function(){return Math.abs(this);};Number.prototype.text=function(){return '$'+Number(this).toLocaleString('en-US',{maximumFractionDigits:4});};
var relations={Budget_Category:'Budget_Category',Budget_Item:'Budget_Item',Budget:'Add_Budget'};
function record(form,row){return new Proxy(row,{get(object,key){if(key==='valueOf')return ()=>object.ID;if(key==='toString')return ()=>String(object.ID);if(relations[key]&&object[key]!=null){var target=(tables[relations[key]]||[]).find(value=>value.ID===object[key]);return target?record(relations[key],target):null;}return object[key]??null;},set(){throw Error('Export helpers cannot write');}});}
function query(form,predicate,sort){var rows=(tables[form]||[]).map(row=>record(form,row)).filter(predicate);if(sort)rows.sort((a,b)=>a[sort]>b[sort]?1:a[sort]<b[sort]?-1:0);return new Proxy(rows,{get(array,key){return key in array||typeof key==='symbol'?array[key]:array[0]?.[key]??null;}});}
`,runtime);
for(const name of names)vm.runInContext(compile(fs.readFileSync(`creator/functions/${name}.dg`,'utf8'))+`;thisapp.${name}=${name};`,runtime);
const fields=['Labor_Budget','Materials_Budget','Equipment_Budget','Subcontractor_Budget','Other_Budget'];
const parts=values=>Object.fromEntries(fields.map((field,index)=>[field,values[index]]));
const importParts=values=>Object.fromEntries(fields.map((field,index)=>[field.replace('_Budget',''),values[index]]));
const prelim=values=>Object.fromEntries(fields.map((field,index)=>['Prelim_'+field,values[index]]));
const con={ID:21,Budget_Category:11,Item_Name:'Road & <scope>',Prelim_Budget_Ttl:1000,Unapproved_Final_Budget_Ttl:600,Budget_Ttl:600,HCSS_Actuals:100,PROJ_Actual:150,...parts([100.1234,200,50,150,99.8766]),...prelim([1,2,3,4,5])};
runtime.tables={Budget_Category:[{ID:11,Deparment:'Construction'},{ID:12,Deparment:'Development'},{ID:13,Deparment:'Engineering'}],Budget_Item:[con,{ID:22,Budget_Category:12,Item_Name:'Credit',Prelim_Budget_Ttl:-20,Unapproved_Final_Budget_Ttl:-25,Budget_Ttl:-30,HCSS_Actuals:-5,PROJ_Actual:-6},{ID:23,Budget_Category:13,Item_Name:'Design',Budget_Ttl:30,HCSS_Actuals:15,PROJ_Actual:20,...parts([10,null,null,null,null])}],Budget_Import_Item:[{ID:31,Budget_Item:21,Data_Source:'HeavyJob Budget',Cost:600,...importParts([100.1234,200,50,150,99.8766])},{ID:32,Budget_Item:22,Data_Source:'Great Plains',Cost:999,...importParts([999,0,0,0,0])}],Budget_Modification:[{ID:41,Budget_Item:21,Status:'Approved',Modification_Type:'Increase',Amount:5,...parts([5,0,0,0,0])},{ID:42,Budget_Item:21,Status:'Submitted',Modification_Type:'Increase',Amount:999,...parts([999,0,0,0,0])}],Add_Budget:[{ID:61}],Payment_Request:[{ID:51,Budget:61,Request_Type:'Purchase Order',PO_Revision:'one',PO_Commitment_State:'Reserved'}],PO_Item:[{ID:71,Purchase_Order:51,Revision:'one',Line_Order:1,Budget_Item:21,Cost_Element:'5',Final_Amount_Exact:'20.00'}]};
vm.runInContext('tables=JSON.parse(JSON.stringify(tables));',runtime);
const plain=value=>JSON.parse(JSON.stringify(value)),call=(name,arg)=>plain(runtime[name](arg));
let rows=call('budgetElementExportRows',21);assert.equal(rows.length,5);assert.deepEqual(rows.map(row=>row.label),['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other']);
assert.deepEqual(rows[0].values,['(1) Labor',1,100.1234,100.1234,5,105.1234,null,null]);
assert.equal(rows[4].values[3],99.8766);assert.equal(con.Budget_Ttl,600,'native parent total stays independent');
rows=call('budgetElementExportRows',22);assert.deepEqual(rows[4].values,['(5) Other',-20,-25,-30,0,-30,null,null]);assert.equal(rows[0].values[3],0);
rows=call('budgetElementExportRows',23);assert.equal(rows[0].values[3],10);assert.equal(rows[1].values[3],null,'partial native Final split is not replaced by department default');assert.equal(rows[0].values[6],null);assert.equal(rows[1].values[6],null,'department defaults never impersonate measured actuals');
const measured=(prefix,values)=>Object.fromEntries(fields.map((field,index)=>[prefix+'_'+field.replace('_Budget','')+'_Actuals',values[index]]));
Object.assign(runtime.tables.Budget_Item[1],measured('HCSS',[-1,-2,0,0,-2]),measured('GP',[-2,0,-1,-3,0]));
rows=call('budgetElementExportRows',22);assert.deepEqual(rows.map(row=>row.values[6]),[-1,-2,0,0,-2]);assert.deepEqual(rows.map(row=>row.values[7]),[-2,0,-1,-3,0],'signed measured allocation can differ from department budget default');
runtime.tables.Budget_Item[1].GP_Equipment_Actuals=null;assert.ok(call('budgetElementExportRows',22).every(row=>row.values[7]===null),'partial measured allocation stays unavailable');
Object.assign(runtime.tables.Budget_Item[1],measured('GP',[0,0,0,0,7]));assert.equal(call('budgetElementExportRows',22)[4].values[7],7,'complete saved native actual fields are not rejected by an aggregate equality gate');
Object.assign(runtime.tables.Budget_Item[1],measured('GP',[0,0,0,0,-6]));
Object.assign(runtime.tables.Budget_Item[0],measured('GP',[50.0049,0,0,100.0049,0]));
runtime.tables.Budget_Import_Item.push({ID:33,Budget_Item:21,Data_Source:'Great Plains',Minor_Code:3101,Cost:75},{ID:34,Budget_Item:21,Data_Source:'Great Plains',Minor_Code:3101,Cost:75});
rows=call('budgetElementExportRows',21);assert.equal(rows[0].values[7],50.0049);assert.equal(rows[3].values[7],100.0049,'multiple GP Const source rounding residuals never alter measured elements');
runtime.tables.Budget_Import_Item.splice(-2);for(const key of Object.keys(measured('GP',[0,0,0,0,0])))delete runtime.tables.Budget_Item[0][key];
runtime.tables.Budget_Item.push({ID:24,Budget_Category:12,Item_Name:'Unknown totals'});assert.ok(call('budgetElementExportRows',24).every(row=>[1,2,3,5,6,7].every(index=>row.values[index]===null)),'unknown department source totals never fabricate zero component amounts');
runtime.tables.Budget_Import_Item[0].Cost=601;assert.equal(call('budgetElementExportRows',21)[0].values[2],null,'newer Imports cannot impersonate saved Unapproved');runtime.tables.Budget_Import_Item[0].Cost=600;
runtime.tables.Budget_Modification.push({ID:43,Budget_Item:21,Status:'Approved',Amount:10});assert.equal(call('budgetElementExportRows',21)[0].values[4],null,'legacy modification allocation remains unknown');runtime.tables.Budget_Modification.pop();
vm.runInContext(`thisapp.poBudgetBalances=function(){return {success:true,balances:[{budgetItemId:'21',unallocatedIssuedCents:'0',unallocatedModificationCents:'0',componentBalances:['1','2','3','4','5'].map(costElement=>({costElement,finalCents:'10000',modCents:'0',issuedCents:costElement==='5'?'5000':'0'}))}]};};`,runtime);
rows=call('poElementExportRows','51');assert.equal(rows.length,5);assert.deepEqual(rows[4].values,['Road & <scope>','(5) Other',100,0,100,30,70,20,50],'saved own PO is excluded once from Existing POs');
const html=runtime.budgetElementExportHtml(21);assert.match(html,/\(1\) Labor/);assert.match(html,/\$100\.1234/);assert.match(html,/—/);

const front=vm.createContext({});vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/full-budget-export.js','utf8'),front);vm.runInContext(fs.readFileSync('widgets/land-master/src/app/vendor/xlsx.full.min.js','utf8'),front);
const parentValues=['=Project','Phase','Construction','3100','Site','3101','Road','LF',10,1000,600,600,5,100,150,'=note'];
const native={id:'4410926000005159046',values:parentValues,elements:call('budgetElementExportRows',21)};
const collected=await front.BudgetFullExport.collect(async()=>({contract:'budget-full-detail-v1',ok:true,rows:[native],total:1,through:native.id,after:'0',next:native.id,hasMore:false}));
assert.equal(collected.length,1);assert.equal(collected.elementRows.length,5);
const book=front.BudgetFullExport.workbook(front.XLSX,collected),round=front.XLSX.read(front.XLSX.write(book,{type:'array',bookType:'xlsx'}),{type:'array',cellNF:true});
assert.deepEqual(plain(round.SheetNames),['Budget Detail','Budget Elements']);assert.equal(round.Sheets['Budget Detail'].L2.v,600);assert.equal(round.Sheets['Budget Elements'].K2.v,100.1234);assert.match(round.Sheets['Budget Elements'].K2.z,/####/);assert.equal(round.Sheets['Budget Elements'].H2.v,'(1) Labor');assert.equal(round.Sheets['Budget Elements'].N2,undefined);
const csv=front.BudgetFullExport.csv(collected);assert.match(csv,/Row Type/);assert.match(csv,/Budget Item Total/);assert.equal((csv.match(/Element Detail/g)||[]).length,5);assert.match(csv,/100\.1234/);assert.match(csv,/'=Project/,'CSV spreadsheet formulas remain text');
const invalid={...native,elements:native.elements.slice(0,4)};await assert.rejects(()=>front.BudgetFullExport.collect(async()=>({contract:'budget-full-detail-v1',ok:true,rows:[invalid],total:1,through:native.id,after:'0',next:native.id,hasMore:false})),/Incomplete element/);
const offsetValues=parentValues.slice();for(const column of [9,10,11,13,14])offsetValues[column]=0;
const offsetDetails=copyElements(native.elements);offsetDetails[0].values[3]=100;offsetDetails[4].values[3]=-100;
function copyElements(value){return JSON.parse(JSON.stringify(value));}
const offsets=await front.BudgetFullExport.collect(async()=>({contract:'budget-full-detail-v1',ok:true,rows:[{...native,values:offsetValues,elements:offsetDetails}],total:1,through:native.id,after:'0',next:native.id,hasMore:false}));assert.equal(offsets.length,1);assert.equal(offsets[0][11],0,'offsetting element values cannot replace the parent zero');assert.equal(offsets.elementRows[0][10],100);assert.equal(offsets.elementRows[4][10],-100);
console.log('Budget element exports: actual native readonly helpers, explicit/preliminary/imported/frozen/signed/unknown/department fields, PO own reservation math, workbook precision/parent totals, all-five CSV rows and formula-safe text passed.');
