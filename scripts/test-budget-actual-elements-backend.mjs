// Execute the checked-in Deluge helper and native batch action. This is a local
// record adapter, not a substitute for native Creator compilation/publication.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const root='creator/workflows/budget-actual-elements/';
const components=['Labor','Materials','Equipment','Subcontractor','Other'];
const parts=values=>Object.fromEntries(components.map((name,index)=>[name,values[index]]));
const itemId='90071992547409961';
function compile(source){
  let previous;
  do {
    previous=source;
    source=source.replace(/\{([^{}]*)\}/g,(whole,body)=>/^\s*"(?:\\.|[^"\\])*"\s*:/.test(body)?`recordValues(${body.replace(/(^|,)\s*("(?:\\.|[^"\\])*")\s*:/g,'$1$2,')})`:whole);
  } while(source!==previous);
  return translate(source.replace(/\.sum\((\w+)\)/g,'.sum("$1")')).js;
}
const helper=compile(fs.readFileSync('creator/functions/budgetImportedActualElements.dg','utf8'));
const execute=compile('void applyActuals()\n{\n'+fs.readFileSync(root+'Budgets_Apply_Cost_to_Bud.action-1.dg','utf8')+'\n}');
const failure=compile('void nativeFailure()\n{\n'+fs.readFileSync(root+'Budgets_Apply_Cost_to_Bud.failure.dg','utf8')+'\n}');
function fixture(imports=[],itemExtra={}){
  const c=vm.createContext({initial:{Budget_Import_Item:structuredClone(imports),Budget_Item:[{ID:itemId,Budget:'90071992547409941',Department:'Construction',PROJ_Actual:999,HCSS_Actuals:888,Unapproved_Final_Budget_Ttl:777,...itemExtra}],Add_Budget:[{ID:'90071992547409941',Const_Budget_Approval_Status:'Pending'}]}});
  vm.runInContext(`
    var tables=JSON.parse(JSON.stringify(initial)),writes=[],events=[],thisapp={};
    function ifnull(value,fallback){return value==null?fallback:value;}
    function Map(){return {};}
    function recordValues(...pairs){var result={};for(var i=0;i<pairs.length;i+=2)result[pairs[i]]=pairs[i+1];return result;}
    Object.defineProperties(Object.prototype,{get:{value:function(key){return this[key]??null;}},put:{value:function(key,value){this[key]=value;}},keys:{value:function(){return Object.keys(this);}}});
    Array.prototype.count=Array.prototype.size=function(){return this.length;};
    String.prototype.toLong=Number.prototype.toLong=function(){return BigInt(this);};
    Number.prototype.round=function(n){var factor=10**n;return Math.round(this*factor)/factor;};
    function record(form,row){return new Proxy(row,{get(o,k){if(k==='valueOf')return ()=>BigInt(o.ID);if(k==='toString')return ()=>String(o.ID);if(k==='Budget'){var budget=tables.Add_Budget.find(b=>b.ID==o[k]);return budget?record('Add_Budget',budget):null;}if(k==='Budget_Item')return {valueOf:()=>BigInt(o[k])};return o[k]??null;},set(o,k,v){writes.push({form,id:o.ID,field:k});o[k]=v;return true;}});}
    function query(form,predicate){var rows=(tables[form]||[]).map(row=>record(form,row)).filter(predicate);return new Proxy(rows,{get(a,k){if(k==='sum')return field=>a.reduce((sum,row)=>sum+Number(row[field]??0),0);return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;}});}
    thisapp.workflowRunLog=function(event){events.push(JSON.parse(JSON.stringify(event)));return {id:'90071992547409981'};};
    var input=record('Budget_Item',tables.Budget_Item[0]);
  `+helper+'\nthisapp.budgetImportedActualElements=budgetImportedActualElements;\n'+execute+'\n'+failure,c);
  return {c,read:source=>JSON.parse(JSON.stringify(c.budgetImportedActualElements(itemId,source))),apply:()=>c.applyActuals(),nativeFailure:()=>c.nativeFailure(),row:()=>JSON.parse(JSON.stringify(c.tables.Budget_Item[0])),writes:()=>JSON.parse(JSON.stringify(c.writes)),events:()=>JSON.parse(JSON.stringify(c.events))};
}
const row=(id,source,total,values,extra={})=>({ID:String(id),Budget_Item:itemId,Data_Source:source,Code:`J-${source}-${id}`,Minor_Code:3101,Cost:total,Cost_to_Complete:5,Percent_Complete:0.1,...(values?parts(values):{}),...extra});
let h=fixture([row(31,'HeavyJob',15.1234,[1.1234,2,3,4,5]),row(32,'HeavyJob',-5.0001,[-0.0001,0,0,0,-5]),row(33,'Great Plains',999,[999,0,0,0,0]),row(34,'HeavyJob Budget',600,[100,100,100,100,200]),row(35,'HeavyJob',100,[100,0,0,0,0],{Budget_Item:'90071992547409962'})]);
let result=h.read('HeavyJob');assert.equal(result.complete,true);assert.equal(result.rows,2);assert.ok(Math.abs(result.total-10.1233)<1e-12);assert.deepEqual(result.components,parts([1.1233,2,3,4,0]));assert.equal(h.writes().length,0,'source preflight never writes');
h.apply();let saved=h.row();assert.ok(Math.abs(saved.HCSS_Actuals-10.1233)<1e-12);assert.equal(saved.GP_Labor_Actuals,999);assert.equal(saved.HCSS_Other_Actuals,0);assert.equal(saved.Unapproved_Final_Budget_Ttl,600,'Construction unapproved budget still reads only HeavyJob Budget');assert.equal(saved.Cost_to_Complete,10);assert.equal(h.events().length,0,'success does not create one log per Budget Item');

h=fixture();result=h.read('HeavyJob');assert.equal(result.complete,false);assert.deepEqual(result.components,parts([null,null,null,null,null]));
h=fixture([row(31,'HeavyJob',50)]);result=h.read('HeavyJob');assert.equal(result.total,50);assert.equal(result.complete,false);assert.equal(result.legacyRows,1);h.apply();assert.equal(h.row().HCSS_Actuals,50);assert.equal(h.row().HCSS_Labor_Actuals,null,'legacy totals never fabricate a zero split');
h=fixture([row(31,'HeavyJob',0,[0,0,0,0,0])]);assert.equal(h.read('HeavyJob').complete,true,'explicit all-zero split remains measured');
h=fixture([row(31,'Great Plains',10,[10.0049,0,0,0,0])]);assert.equal(h.read('Great Plains').complete,true,'GP Construction cents total does not discard four-place measured amount');
h=fixture([row(31,'Great Plains',-10.12,[-10.1234,0,0,0,0])]);assert.equal(h.read('Great Plains').complete,true,'reconciliation retains signed amounts');
for(const broken of [row(31,'Great Plains',10,[10.006,0,0,0,0]),row(31,'Great Plains',10,[10.0049,0,0,0,0],{Minor_Code:4101}),row(31,'Great Plains',10,[10,null,0,0,0])]){
  h=fixture([broken]);assert.throws(()=>h.apply(),/elements/i);assert.equal(h.writes().length,0,'invalid source is rejected before any Budget Item fields change');
  const events=h.events();assert.equal(events.length,2);assert.equal(events[1].status,'Failed');assert.equal(events[1].reference,itemId);assert.equal(events[1].counts.failed,1);assert.match(events[1].message,/Great Plains/);assert.match(events[1].details,/batch size=100/);
}
h=fixture([row(31,'Great Plains',5,[5,0,0,0,0]),row(32,'HeavyJob',7,[1,null,2,2,2])]);assert.throws(()=>h.apply(),/Incomplete/);assert.equal(h.writes().length,0,'second-source validation cannot partially apply the first source');assert.match(h.events()[1].details,/HeavyJob/);
h=fixture();h.nativeFailure();assert.equal(h.events()[1].status,'Failed');assert.equal(h.events()[1].stage,'Native Batch Failure');assert.match(h.events()[1].details,/statement|runtime|batch/i);

const schema=JSON.parse(fs.readFileSync(root+'schema.json','utf8'));
assert.deepEqual(schema.import_renames.map(field=>field.to),components);assert.deepEqual(schema.import_renames.map(field=>field.from),components.map(field=>field+'_Budget'));
assert.equal(schema.actual_fields.length,10);assert.ok(schema.actual_fields.every(field=>field.type==='USD'&&field.maxchar===16&&field.decimalplace===4&&!field.required&&field.initial_value===null));
assert.ok(schema.preserve_fields.includes('Budget_Item.Labor_Budget'));
const manifest=JSON.parse(fs.readFileSync(root+'promotion-manifest.json','utf8'));assert.equal(manifest.batch_workflow.batch_size,100);for(const entry of manifest.functions)assert.ok(fs.existsSync(entry.source));
const snapshot=fs.readFileSync('creator/functions/snapshotBudgetItemComponents.dg','utf8'),exports=fs.readFileSync('creator/functions/budgetElementExportRows.dg','utf8');
for(const field of components){assert.ok(snapshot.includes(`sourceImport.${field}`));assert.ok(!snapshot.includes(`sourceImport.${field}_Budget`));assert.ok(exports.includes(`source.${field}`));}
console.log('PASS: actual source preflight + native batch execute/failure, long IDs, source isolation, legacy unknown vs explicit zero, signed values, 4-place elements/cents totals, before-write rejection, durable Workflow Log and additive schema contracts.');
