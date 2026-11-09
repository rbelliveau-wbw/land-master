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
  source=source.replace(/(\b[A-Z][A-Za-z_]+\[[^\]]+\])\.sum\((\w+)\)/g,'nativeSum($1,"$2")').replace(/\.count\((\w+)\)/g,'.count("$1")');
  source=source.replace(/update (\w+)\s*\[([\s\S]*?)\];/g,(_,target,body)=>'updateRecord('+target+',{'+body.trim().split('\n').map(line=>line.trim()).filter(Boolean).map(line=>line.replace(/^(\w+)\s*=\s*(.*)$/,'"$1":$2')).join(',')+'});');
  source=source.replace(/\binfo ([^\n]+);/g,'fixtureInfo($1);');
  let previous;
  do {
    previous=source;
    source=source.replace(/\{([^{}]*)\}/g,(whole,body)=>/^\s*"(?:\\.|[^"\\])*"\s*:/.test(body)?`recordValues(${body.replace(/(^|,)\s*("(?:\\.|[^"\\])*")\s*:/g,'$1$2,')})`:whole);
  } while(source!==previous);
  return translate(source.replace(/\.sum\((\w+)\)/g,'.sum("$1")')).js;
}
const helperSource=fs.readFileSync('creator/functions/budgetImportedActualElements.dg','utf8');
const helper=compile(helperSource);
const previousHelper=compile(fs.readFileSync('creator/budget-batch-optimization-2026-11-09/native-before/budgetImportedActualElements.dg','utf8'));
const execute=compile('void applyActuals()\n{\n'+fs.readFileSync(root+'Budgets_Apply_Cost_to_Bud.action-1.dg','utf8')+'\n}');
const previousExecute=compile('void applyActuals()\n{\n'+fs.readFileSync('creator/budget-batch-optimization-2026-11-09/native-before/Budgets_Apply_Cost_to_Bud.action-1.dg','utf8')+'\n}');
const failure=compile('void nativeFailure()\n{\n'+fs.readFileSync(root+'Budgets_Apply_Cost_to_Bud.failure.dg','utf8')+'\n}');
function fixture(imports=[],itemExtra={},options={},helperBody=helper,executeBody=execute){
  const c=vm.createContext({options:structuredClone(options),initial:{Budget_Import_Item:structuredClone(imports),Budget_Item:[{ID:itemId,Budget:'90071992547409941',Department:'Construction',PROJ_Actual:999,HCSS_Actuals:888,Unapproved_Final_Budget_Ttl:777,...itemExtra}],Add_Budget:[{ID:'90071992547409941',Const_Budget_Approval_Status:options.approvalStatus||'Pending'}]}});
  vm.runInContext(`
    var tables=JSON.parse(JSON.stringify(initial)),writes=[],events=[],diagnostics=[],updateCalls=0,sourceIterations=0,thisapp={};
    function fixtureInfo(value){diagnostics.push(String(value));}
    function ifnull(value,fallback){return value==null?fallback:value;}
    function Map(){return {};}
    function recordValues(...pairs){var result={};for(var i=0;i<pairs.length;i+=2)result[pairs[i]]=pairs[i+1];return result;}
    Object.defineProperties(Object.prototype,{get:{value:function(key){return this[key]??null;}},put:{value:function(key,value){this[key]=value;}},keys:{value:function(){return Object.keys(this);}}});
    Array.prototype.count=Array.prototype.size=function(){return this.length;};
    String.prototype.toLong=Number.prototype.toLong=function(){return BigInt(this);};
    Number.prototype.round=function(n){var factor=10**n;return Math.round(this*factor)/factor;};
    Number.prototype.toDecimal=function(){if(!Number.isFinite(Number(this)))throw Error('Invalid native decimal');return Number(this);};
    function record(form,row){return new Proxy(row,{get(o,k){if(k==='valueOf')return ()=>BigInt(o.ID);if(k==='toString')return ()=>String(o.ID);if(k==='Budget'){var budget=tables.Add_Budget.find(b=>b.ID==o[k]);return budget?record('Add_Budget',budget):null;}if(k==='Budget_Item')return {valueOf:()=>BigInt(o[k])};return o[k]??null;},set(o,k,v){writes.push({form,id:o.ID,field:k});o[k]=v;return true;}});}
    function nativeSum(rows,field){return rows.reduce((sum,row)=>sum+Number(row[field]??0),0);}
    function query(form,predicate,sort,start=0,end=Infinity){var rows=(tables[form]||[]).map(row=>record(form,row)).filter(predicate).slice(start,end+1);return new Proxy(rows,{get(a,k){if(k===Symbol.iterator&&form==='Budget_Import_Item')return function*(){for(var row of a){sourceIterations++;yield row;}};if(k==='count')return field=>field?a.filter(row=>row[field]!=null).length:a.length;if(k==='sum')return field=>{var present=a.filter(row=>row[field]!=null);return present.length?present.reduce((sum,row)=>sum+Number(row[field]),0):a.length?null:0;};return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;}});}
    function updateRecord(rows,patch){updateCalls++;if(options.failUpdate)throw Error('Fixture native update failed');for(var row of rows)for(var key of Object.keys(patch))row[key]=patch[key];}
    thisapp.workflowRunLog=function(event){events.push(JSON.parse(JSON.stringify(event)));if(options.failAudit)throw Error('Fixture audit reply lost');return {id:'90071992547409981'};};
    var input=record('Budget_Item',tables.Budget_Item[0]);
  `+helperBody+'\nthisapp.budgetImportedActualElements=budgetImportedActualElements;\n'+executeBody+'\n'+failure,c);
  return {c,read:source=>JSON.parse(JSON.stringify(c.budgetImportedActualElements(itemId,source))),apply:()=>c.applyActuals(),nativeFailure:()=>c.nativeFailure(),row:()=>JSON.parse(JSON.stringify(c.tables.Budget_Item[0])),writes:()=>JSON.parse(JSON.stringify(c.writes)),events:()=>JSON.parse(JSON.stringify(c.events)),diagnostics:()=>JSON.parse(JSON.stringify(c.diagnostics)),updateCalls:()=>c.updateCalls,sourceIterations:()=>c.sourceIterations};
}
const row=(id,source,total,values,extra={})=>({ID:String(id),Budget_Item:itemId,Data_Source:source,Code:`J-${source}-${id}`,Minor_Code:3101,Cost:total,Cost_to_Complete:5,Percent_Complete:0.1,...(values?parts(values):{}),...extra});
for(const department of ['Construction','Engineering'])for(const approvalStatus of ['Not Sent','Pending','Approved','Rejected']){
 const imports=[row(31,'Great Plains',12.1234,[1.0001,2,3,4,5]),row(32,'HeavyJob',-4.0099,[0,-2,0,-2.0099,0],{Cost_to_Complete:null}),row(33,'HeavyJob Budget',100)];
 const previous=fixture(imports,{Department:department},{approvalStatus},previousHelper,previousExecute),current=fixture(imports,{Department:department},{approvalStatus});previous.apply();current.apply();
 assert.deepEqual(current.row(),previous.row(),'Combined update preserves every original destination and approval-owned value');assert.equal(current.updateCalls(),1);assert.equal(current.events().length,0);
}
// Check every five-field presence combination against the real previous body,
// including absent/null totals, mixed legacy/measured rows and both sources.
for(const source of ['HeavyJob','Great Plains'])for(let mask=0;mask<32;mask++)for(const cost of [null,-3.1211]){
 const values=components.map((_,i)=>mask&(1<<i)?[0,-1.0001,3.2567,0,9][i]:null);
 for(const imports of [[row(31,source,cost,values)],[row(30,source,4),row(31,source,cost,values),row(32,source,7,[1,2,3,4,5])]]){
  const evaluate=body=>{try{return {result:fixture(imports,{}, {},body).read(source)};}catch(error){return {error:String(error)};}};
  assert.deepEqual(evaluate(helper),evaluate(previousHelper),'Complete/legacy/invalid native currency semantics are preserved');
 }
}
assert.doesNotMatch(helperSource,/\b(?:sources|invalid)\.(?:sum|count)\(/,'No fetched-record aggregates remain');
{
 const allNull=row(31,'HeavyJob',null,null,{Cost_to_Complete:null});
 const r=fixture([allNull]).read('HeavyJob');assert.equal(r.total,null);assert.equal(r.costToComplete,null,'Nonempty all-null aggregate columns retain native fetched-record null semantics');
 const empty=fixture().read('HeavyJob');assert.equal(empty.total,0);assert.equal(empty.costToComplete,0,'Native empty collections total zero');
 const highFanout=Array.from({length:6000},(_,i)=>row(1000+i,'HeavyJob',999,[1,2,3,4,5]));
 const many=fixture(highFanout);const result=many.read('HeavyJob');assert.equal(result.rows,6000);assert.equal(result.total,5994000);assert.deepEqual(result.components,parts([6000,12000,18000,24000,30000]));assert.equal(many.sourceIterations(),0,'Successful work stays in native aggregates beyond the diagnostic read bound');
 const broken=fixture([...highFanout.slice(0,5000),row(9000,'HeavyJob',10,[1,null,3,4,5])]);assert.throws(()=>broken.apply(),/outside the bounded diagnostic read/);assert.equal(broken.writes().length,0);assert.equal(broken.sourceIterations(),5000,'Invalid-source diagnostics remain bounded without permitting partial application');
}
let h=fixture([row(31,'HeavyJob',15.1234,[1.1234,2,3,4,5]),row(32,'HeavyJob',-5.0001,[-0.0001,0,0,0,-5]),row(33,'Great Plains',999,[999,0,0,0,0]),row(34,'HeavyJob Budget',600,[100,100,100,100,200]),row(35,'HeavyJob',100,[100,0,0,0,0],{Budget_Item:'90071992547409962'})]);
let result=h.read('HeavyJob');assert.equal(result.complete,true);assert.equal(result.rows,2);assert.ok(Math.abs(result.total-10.1233)<1e-12);assert.deepEqual(result.components,parts([1.1233,2,3,4,0]));assert.equal(h.writes().length,0,'source preflight never writes');
assert.equal(h.sourceIterations(),0,'Successful aggregation never iterates source records in Deluge');
h.apply();let saved=h.row();assert.ok(Math.abs(saved.HCSS_Actuals-10.1233)<1e-12);assert.equal(saved.GP_Labor_Actuals,999);assert.equal(saved.HCSS_Other_Actuals,0);assert.equal(saved.Unapproved_Final_Budget_Ttl,600,'Construction unapproved budget still reads only HeavyJob Budget');assert.equal(saved.Cost_to_Complete,10);assert.equal(h.events().length,0,'success does not create one log per Budget Item');

h=fixture();result=h.read('HeavyJob');assert.equal(result.complete,false);assert.deepEqual(result.components,parts([null,null,null,null,null]));
h=fixture([row(31,'HeavyJob',50)]);result=h.read('HeavyJob');assert.equal(result.total,50);assert.equal(result.complete,false);assert.equal(result.legacyRows,1);h.apply();assert.equal(h.row().HCSS_Actuals,50);assert.equal(h.row().HCSS_Labor_Actuals,null,'legacy totals never fabricate a zero split');
h=fixture([row(31,'HeavyJob',0,[0,0,0,0,0])]);assert.equal(h.read('HeavyJob').complete,true,'explicit all-zero split remains measured');
h=fixture([row(31,'Great Plains',10,[10.0049,0,0,0,0])]);assert.equal(h.read('Great Plains').complete,true,'GP Construction cents total does not discard four-place measured amount');
h=fixture([row(31,'Great Plains',-10.12,[-10.1234,0,0,0,0])]);assert.equal(h.read('Great Plains').complete,true,'independent fields retain signed amounts');
for(const source of ['HeavyJob','Great Plains'])for(const [cost,values] of [[123.4567,[1,2,3,4,5]],[0,[10,0,-4,0,0]],[-9.8765,[0,0,0,0,0]]]){
  h=fixture([row(31,source,cost,values,{Minor_Code:4101})]);result=h.read(source);assert.equal(result.complete,true);assert.equal(result.total,cost);assert.deepEqual(result.components,parts(values),'selected elements do not absorb any parent difference');
  h.apply();const prefix=source==='HeavyJob'?'HCSS':'GP',parent=source==='HeavyJob'?'HCSS_Actuals':'PROJ_Actual';saved=h.row();assert.equal(saved[parent],cost);assert.deepEqual(components.map(name=>saved[prefix+'_'+name+'_Actuals']),values);assert.equal(h.events().length,0,'a parent/element difference is permitted and creates no failure log');
}
for(const broken of [row(31,'Great Plains',10,[10,null,0,0,0]),row(31,'Great Plains',null,[10,0,0,0,0])]){
  h=fixture([broken]);assert.throws(()=>h.apply(),/elements/i);assert.equal(h.writes().length,0,'invalid source is rejected before any Budget Item fields change');
  const events=h.events();assert.equal(events.length,1);assert.equal(events[0].terminal,true);assert.equal(events[0].status,'Failed');assert.equal(events[0].reference,itemId);assert.equal(events[0].counts.failed,1);assert.match(events[0].message,/Great Plains/);assert.match(events[0].details,/batch size=100/);
}
h=fixture([row(31,'Great Plains',5,[5,0,0,0,0]),row(32,'HeavyJob',7,[1,null,2,2,2])]);assert.throws(()=>h.apply(),/Incomplete/);assert.equal(h.writes().length,0,'second-source validation cannot partially apply the first source');assert.match(h.events()[0].details,/HeavyJob/);
h=fixture();h.nativeFailure();assert.equal(h.events().length,1);assert.equal(h.events()[0].status,'Failed');assert.match(h.events()[0].stage,/Counts Unavailable/);assert.match(h.events()[0].details,/counts are unknown/);assert.equal(h.events()[0].terminal,true);
{
  const broken=row(31,'Great Plains',5,[1,null,2,2,0]);
  h=fixture([broken],{},{failAudit:true});assert.throws(()=>h.apply(),error=>String(error).includes('Incomplete actual elements')&&String(error).includes(itemId)&&!String(error).includes('audit reply lost'));assert.equal(h.events().length,1,'A lost audit reply is never replayed');assert.equal(h.writes().length,0);assert.match(h.diagnostics()[0],/Incomplete/);assert.match(h.diagnostics()[1],/audit reply lost/);
  h=fixture([],{}, {failAudit:true});assert.doesNotThrow(()=>h.nativeFailure());assert.equal(h.events().length,1);assert.match(h.diagnostics().at(-1),/audit reply lost/);
  h=fixture([row(31,'Great Plains',5,[5,0,0,0,0])],{}, {failUpdate:true});assert.throws(()=>h.apply(),/native update failed/);assert.equal(h.events()[0].status,'Partial');assert.equal(h.updateCalls(),1);
  h=fixture([row(31,'HeavyJob Budget',600)],{}, {approvalStatus:'Approved'});h.apply();assert.equal(h.row().Unapproved_Final_Budget_Ttl,0);assert.equal(h.updateCalls(),1,'Fourteen actual fields use one native update');
  h=fixture([row(31,'HeavyJob Budget',600)],{Department:'Engineering'});h.apply();assert.equal(h.row().Unapproved_Final_Budget_Ttl,777,'Other departments retain their original approval-owned field');assert.equal(h.updateCalls(),1);
}

const schema=JSON.parse(fs.readFileSync(root+'schema.json','utf8'));
assert.deepEqual(schema.import_renames.map(field=>field.to),components);assert.deepEqual(schema.import_renames.map(field=>field.from),components.map(field=>field+'_Budget'));
assert.equal(schema.actual_fields.length,10);assert.ok(schema.actual_fields.every(field=>field.type==='USD'&&field.maxchar===16&&field.decimalplace===4&&!field.required&&field.initial_value===null));
assert.ok(schema.preserve_fields.includes('Budget_Item.Labor_Budget'));
const manifest=JSON.parse(fs.readFileSync(root+'promotion-manifest.json','utf8'));assert.equal(manifest.batch_workflow.batch_size,100);for(const entry of manifest.functions)assert.ok(fs.existsSync(entry.source));
const snapshot=fs.readFileSync('creator/functions/snapshotBudgetItemComponents.dg','utf8'),exports=fs.readFileSync('creator/functions/budgetElementExportRows.dg','utf8');
for(const field of components){assert.ok(snapshot.includes(`sourceImport.${field}`));assert.ok(!snapshot.includes(`sourceImport.${field}_Budget`));assert.ok(exports.includes(`source.${field}`));}
console.log('PASS: independent actual parent/selected element amounts, no residual redistribution, source preflight + native batch execute/failure, long IDs, legacy unknown vs explicit zero, signed precision, before-write completeness rejection, durable Workflow Log and additive schema contracts.');
