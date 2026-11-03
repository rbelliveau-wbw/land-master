// Executes the actual native snapshot and track-final-state bodies. This local
// adapter is not the Creator compiler, a publication check, or a live write.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';
const F=['Labor_Budget','Materials_Budget','Equipment_Budget','Subcontractor_Budget','Other_Budget'];
const P=F.map(name=>'Prelim_'+name), parts=(values,fields=F)=>Object.fromEntries(fields.map((name,index)=>[name,values[index]]));
function compile(name) {
  let source=fs.readFileSync(`creator/functions/${name}.dg`,'utf8');
  source=source.replace(/\{([^{}]*)\}/g,(whole,body)=>/^\s*"(?:\\.|[^"\\])*"\s*:/.test(body)?'recordValues('+body.replace(/(^|,)\s*("(?:\\.|[^"\\])*")\s*:/g,'$1$2,')+')':whole);
  source=source.replace(/\.sum\((\w+)\)/g,'.sum("$1")');
  return translate(source).js+`;thisapp.${name}=${name};`;
}
const program=['snapshotBudgetItemComponents','applyBudgetTrackFinalState'].map(compile).join('\n');
const id={budget:'90071992547409941',dev:'90071992547409951',eng:'90071992547409952',construction:'90071992547409953',devItem:'90071992547409961',engItem:'90071992547409962',constructionItem:'90071992547409963'};
const item=(ID,category,overrides={})=>({ID,Budget:id.budget,Budget_Category:category,Template_Item:false,Budget_Ttl:100.1234,Prelim_Budget_Ttl:100.1234,Unapproved_Final_Budget_Ttl:100.1234,HCSS_Actuals:12.3456,PROJ_Actual:98.7654,...parts([null,null,null,null,null]),...parts([null,null,null,null,null],P),...overrides});
function fixture(overrides={}) {
  const initial={
    Add_Budget:[{ID:id.budget,Development_Budget_Approval_Status:'Approved',Const_Budget_Approval_Status:'Approved',Budget_Grand_Total:600.7404}],
    Budget_Category:[{ID:id.dev,Budget:id.budget,Deparment:'Development',Budget_Total:100.1234},{ID:id.eng,Budget:id.budget,Deparment:'Engineering',Budget_Total:100.1234},{ID:id.construction,Budget:id.budget,Deparment:'Construction',Budget_Total:400.4936}],
    Budget_Item:[item(id.devItem,id.dev),item(id.engItem,id.eng),item(id.constructionItem,id.construction,{Budget_Ttl:400.4936})],Budget_Import_Item:[],...overrides
  };
  const c=vm.createContext({initial:structuredClone(initial)});
  vm.runInContext(`
    var tables=JSON.parse(JSON.stringify(initial)),writes=[],thisapp={};
    function map(value){if(value&&typeof value==='object'&&!Array.isArray(value)){Object.defineProperties(value,{get:{value:function(k){return this[k]??null;}},put:{value:function(k,v){this[k]=v;}},toString:{value:function(){return JSON.stringify(this);}}});}return value;}
    function Map(){return map({});}function List(){return [];}function ifnull(value,fallback){return value==null?fallback:value;}
    function recordValues(...pairs){var value={};for(var i=0;i<pairs.length;i+=2)value[pairs[i]]=pairs[i+1];return map(value);}
    Array.prototype.count=Array.prototype.size=function(){return this.length;};
    String.prototype.toLong=Number.prototype.toLong=function(){return BigInt(this);};BigInt.prototype.toLong=function(){return this.valueOf();};
    String.prototype.contains=function(value){return this.includes(value);};Number.prototype.round=function(n){var factor=10**n;return Math.round(this*factor)/factor;};
    var lookups={Budget:'Add_Budget',Budget_Category:'Budget_Category',Budget_Item:'Budget_Item'};
    function lookup(form,id){var row=(tables[form]||[]).find(row=>row.ID==id)||{ID:String(id)};return new Proxy(row,{get(o,k){if(k==='valueOf')return ()=>BigInt(o.ID);if(k==='toString')return ()=>String(o.ID);return o[k]??null;}});}
    function record(form,row){return new Proxy(row,{get(o,k){if(k in lookups&&o[k]!=null)return lookup(lookups[k],o[k]);return o[k]??null;},set(o,k,v){writes.push({form,id:o.ID,field:k});o[k]=typeof v==='bigint'?v.toString():v;return true;}});}
    function query(form,predicate){var rows=(tables[form]||[]).map(row=>record(form,row)).filter(predicate);return new Proxy(rows,{get(a,k){if(k==='sum')return field=>a.reduce((sum,row)=>sum+Number(row[field]??0),0);return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;},set(a,k,v){if(!a.length)throw Error('Missing record');a[0][k]=v;return true;}});}
  `+program,c);
  const call=(name,args)=>vm.runInContext(`thisapp.${name}(${args.map(value=>JSON.stringify(value)).join(',')})`,c);
  return {c,call,snapshot:(itemId=id.devItem,initializeOnly=false,dryRun=false)=>JSON.parse(JSON.stringify(call('snapshotBudgetItemComponents',[itemId,initializeOnly,dryRun]))),track:(type,action)=>JSON.parse(call('applyBudgetTrackFinalState',[id.budget,type,action])),rows:()=>JSON.parse(JSON.stringify(c.tables)),writes:()=>JSON.parse(JSON.stringify(c.writes))};
}
let h=fixture();assert.equal(h.snapshot().applied,true);assert.deepEqual(Object.fromEntries(F.map(name=>[name,h.rows().Budget_Item[0][name]])),parts([0,0,0,0,100.1234]));
h=fixture();assert.equal(h.snapshot(id.engItem).applied,true);assert.deepEqual(Object.fromEntries(F.map(name=>[name,h.rows().Budget_Item[1][name]])),parts([100.1234,0,0,0,0]));
for(const amount of [0,-100.1234]) {
  h=fixture({Budget_Item:[item(id.devItem,id.dev,{Budget_Ttl:amount})]});assert.equal(h.snapshot().applied,true);assert.equal(h.rows().Budget_Item[0].Other_Budget,amount,'zero and signed credit Final amounts are retained exactly');
}
const explicit=parts([1.1234,2,3,4,90]);
h=fixture({Budget_Item:[item(id.devItem,id.dev,{...parts(Object.values(explicit),P)})]});const before=h.rows();assert.equal(h.snapshot().applied,true);assert.deepEqual(Object.fromEntries(F.map(name=>[name,h.rows().Budget_Item[0][name]])),explicit);
for(const field of ['Budget_Ttl','Prelim_Budget_Ttl','Unapproved_Final_Budget_Ttl','HCSS_Actuals','PROJ_Actual'])assert.equal(h.rows().Budget_Item[0][field],before.Budget_Item[0][field]);
assert.ok(h.writes().every(write=>F.includes(write.field)),'snapshot writes only frozen component fields');
for(const existing of [parts([0,0,0,0,0]),parts([null,12,null,null,null]),parts([-12,0,0,0,0])]) {
  h=fixture({Budget_Item:[item(id.devItem,id.dev,existing)]});const saved=h.rows();assert.equal(h.snapshot().applied,false);assert.equal(h.snapshot().ok,true);assert.deepEqual(h.rows(),saved);assert.equal(h.writes().length,0,'any explicit Final allocation remains frozen');
}
for(const incomplete of [parts([0,null,null,null,null],P),parts([null,null,null,0,null],P),parts([1,2,3,4,5],P)]) {
  h=fixture({Budget_Item:[item(id.devItem,id.dev,incomplete)]});const saved=h.rows();assert.equal(h.snapshot().ok,false);assert.deepEqual(h.rows(),saved);assert.equal(h.writes().length,0,'partial or mismatched Preliminary never falls back silently');
}
h=fixture({Budget_Item:[item(id.devItem,id.dev,{Budget_Ttl:null})]});assert.equal(h.snapshot().ok,false);assert.equal(h.writes().length,0);
h=fixture({Budget_Item:[item(id.devItem,id.dev,{Budget_Ttl:0,...parts(Object.values(explicit),P)})]});assert.equal(h.snapshot(id.devItem,false,true).ready,true,'dry-run finalization checks staged Unapproved rather than old Final');assert.equal(h.writes().length,0);assert.equal(h.snapshot().ok,false,'real snapshot validates against the finalized total');
h=fixture();const untouched=h.rows();assert.equal(h.snapshot(id.devItem,false,true).ready,true);assert.deepEqual(h.rows(),untouched);assert.equal(h.writes().length,0);
h=fixture({Add_Budget:[{ID:id.budget,Development_Budget_Approval_Status:'Pending',Const_Budget_Approval_Status:'Approved'}]});assert.equal(h.snapshot(id.devItem,true).ready,false);assert.equal(h.writes().length,0);

const imports=[{ID:'90071992547409971',Budget_Item:id.constructionItem,Data_Source:'HeavyJob Budget',...parts([1.1234,2,3,4,5])},{ID:'90071992547409972',Budget_Item:id.constructionItem,Data_Source:'HeavyJob Budget',...parts([0.0001,0,0,0,0])},{ID:'90071992547409973',Budget_Item:id.devItem,Data_Source:'HeavyJob Budget',...parts([100,100,100,100,100])},{ID:'90071992547409974',Budget_Item:id.constructionItem,Data_Source:'Great Plains',...parts([200,200,200,200,200])}];
h=fixture({Budget_Import_Item:imports});const construction=h.snapshot(id.constructionItem);assert.equal(construction.applied,true);assert.equal(construction.sourceCount,2);assert.deepEqual(Object.values(construction.components),[1.1235,2,3,4,5],'Construction retains exact assigned source sums without a new reconciliation rule');
h=fixture();assert.equal(h.snapshot(id.constructionItem).ready,false);assert.equal(h.writes().length,0,'missing Construction source remains unavailable');
h=fixture({Budget_Import_Item:[{...imports[0],Labor_Budget:null}]});assert.equal(h.snapshot(id.constructionItem).ready,false);assert.equal(h.writes().length,0);

// Execute the real track function, preserving the opposite approval track and
// source Preliminary amounts. This catches cross-phase/department leakage.
h=fixture({Budget_Item:[item(id.devItem,id.dev,{...parts([1,2,3,4,90.1234],P)}),item(id.engItem,id.eng,{...parts([100.1234,0,0,0,0],P)}),item(id.constructionItem,id.construction,{Budget_Ttl:400.4936,...parts([10,20,30,40,300.4936])})]});
assert.equal(h.track('Development','FINALIZE').ok,true);let rows=h.rows().Budget_Item;
assert.deepEqual(Object.fromEntries(F.map(name=>[name,rows[0][name]])),parts([1,2,3,4,90.1234]));assert.equal(rows[1].Labor_Budget,100.1234);assert.equal(rows[0].Unapproved_Final_Budget_Ttl,0);assert.equal(rows[2].Budget_Ttl,400.4936);
assert.equal(h.track('Development','STAGE').ok,true);rows=h.rows().Budget_Item;
assert.ok(F.every(name=>rows[0][name]===null&&rows[1][name]===null));assert.equal(rows[0].Prelim_Other_Budget,90.1234);assert.equal(rows[2].Other_Budget,300.4936,'new Development cycle does not clear Construction');
const engineeringBefore=JSON.stringify(rows[1]);assert.equal(h.track('Construction','CLEAR').ok,true);rows=h.rows().Budget_Item;
assert.equal(JSON.stringify(rows[1]),engineeringBefore,'Construction track cannot select Engineering through an unparenthesized condition');
assert.ok(F.every(name=>rows[2][name]===null));
h=fixture({Budget_Item:[item(id.devItem,id.dev,{Budget_Ttl:0,...parts([1,null,null,null,null],P)})]});const failedBefore=h.rows();assert.equal(h.track('Development','FINALIZE').ok,false);assert.deepEqual(h.rows(),failedBefore,'invalid Preliminary allocation is rejected before that item Final total changes');
h=fixture({Budget_Item:[item(id.devItem,id.dev,{Budget_Ttl:0}),item(id.engItem,id.eng,{Budget_Ttl:0,...parts([1,null,null,null,null],P)})]});const lateInvalidBefore=h.rows();assert.equal(h.track('Development','FINALIZE').ok,false);assert.deepEqual(h.rows(),lateInvalidBefore,'a later invalid Engineering allocation cannot partially finalize an earlier Development item');assert.equal(h.writes().length,0);

const handle=fs.readFileSync('creator/functions/handleApprovalAction.dg','utf8'),start=fs.readFileSync('creator/functions/startApprovalChain.dg','utf8');
assert.ok(handle.indexOf('componentPreflight = thisapp.snapshotBudgetItemComponents')<handle.indexOf('itemToFinalize.Budget_Ttl=unapprovedVal;'));
assert.ok(handle.includes('componentSnapshot = thisapp.snapshotBudgetItemComponents(itemToFinalize.ID,false,false);'));
for(const field of F)assert.ok(start.includes(`itemToStage.${field}=null;`));
for(const field of P)assert.ok(!start.includes(`itemToStage.${field}=null;`));
const schema=JSON.parse(fs.readFileSync('creator/workflows/budget-preliminary-elements/schema.json','utf8'));
assert.deepEqual(schema.fields.map(field=>field.link_name),P);
assert.ok(schema.fields.every(field=>field.type==='USD'&&field.decimalplace===4&&field.maxchar===16&&field.initial_value===null&&field.required===false),'Preliminary fields match existing input capacity without defaults/mandatory writes');
assert.deepEqual(schema.scheduled_workflows_added,[]);
const promotion=JSON.parse(fs.readFileSync('creator/workflows/budget-preliminary-elements/promotion-manifest.json','utf8'));
assert.deepEqual(promotion.schema.fields.map(field=>field.link_name),P);
assert.ok(promotion.schema.fields.every(field=>field.max_digits===16&&field.decimal_places===4));
assert.deepEqual(promotion.reports[0].fields,P,'every new persisted field is included in the native report handoff');
assert.ok(promotion.reports[0].include_once_in.includes('quickview')&&promotion.reports[0].include_once_in.includes('detailview'));
for(const entry of promotion.functions)assert.ok(fs.existsSync(entry.source),entry.source+' must be present for native review');
console.log('PASS: actual native Final component lifecycle; Dev/Eng defaults, complete/partial/mismatched Preliminary, signed precision, frozen explicit snapshots, no total/actual mutation, dry-run preflight, native Construction parity, scoped finalization and new-cycle clearing. Native compilation/publication remains pending.');
