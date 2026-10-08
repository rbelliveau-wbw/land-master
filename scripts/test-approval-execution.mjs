import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

// Execute the actual Deluge adapter against explicit record fixtures. This is
// an offline regression harness, not evidence of native Creator compilation.
const source=fs.readFileSync('creator/functions/applySharedApprovalPolicy.dg','utf8');
const executable=source.replace(/insert into (\w+)\s*\[([^\]]+)\]/g,(_,form,fields)=>
  `insertRecord("${form}", recordValues(${fields.trim().split('\n').map(line=>{const m=line.trim().match(/^(\w+)=(.*)$/);return JSON.stringify(m[1])+','+m[2];}).join(',')}))`);
const js=translate(executable).js.replace('catch(adapterError) {','catch(adapterError) { result.put("testDiagnostic",adapterError.message);');
const baseRows=[{ID:101,Proforma:51,Type1:'Pro Forma',Sort_Order:1,Title:'Old VP',Approver:'old@example.com',Status:'Not Sent',Approval_Notes:'',Sent_Date:null,Responded_Date:null},{ID:102,Proforma:51,Type1:'Pro Forma',Sort_Order:2,Title:'Old CFO',Approver:'old@example.com',Status:'Not Sent',Approval_Notes:'',Sent_Date:null,Responded_Date:null}];
const basePolicy={ID:41,Workflow:'Pro Forma',Company:31,Status:'Published',Adapter_Enabled:true,Territory_Key:'',Department_Key:'',Effective_From:null,Effective_To:null};
const route=[{order:1,role:'VP',email:'first@example.com'},{order:2,role:'CFO',email:'second@example.com'}];
function execute({policies=[basePolicy],rows=baseRows,steps=route,workflow='Pro Forma',department='',amountBasisConfirmed=false,resolved=true,denied=false}={}){
  const context=vm.createContext({tables:structuredClone({Approval_Policy:policies,Budget_Approvals:rows}),steps:structuredClone(steps),workflow,department,amountBasisConfirmed,resolved,denied});
  vm.runInContext(`
  tables=JSON.parse(JSON.stringify(tables));steps=JSON.parse(JSON.stringify(steps));
  function Map(){return map({});}function map(v){return Object.assign(v,{get(k){return this[k]??null;},put(k,v){this[k]=v;}});}
  function List(){return [];}function ifnull(v,f){return v==null?f:v;}
  Array.prototype.add=function(v){this.push(v);};Array.prototype.get=function(i){return this[i]??null;};Array.prototype.count=Array.prototype.size=function(){return this.length;};Array.prototype.contains=function(v){return this.includes(v);};
  String.prototype.toLong=function(){return Number(this);};String.prototype.toDate=function(){return this.toString();};String.prototype.toJSONList=function(){return JSON.parse(this).map(map);};String.prototype.matches=function(r){return new RegExp('^(?:'+r+')$').test(this);};Number.prototype.toLong=function(){return Math.trunc(this);};
  var zoho={loginuser:'test-owner',currenttime:{toString(){return '20261008120000001';}}},captures=[],writes=0;
  function record(row){return new Proxy(row,{get(o,k){return o[k]??null;},set(o,k,v){writes++;o[k]=v;return true;}});}
  function query(form,predicate,sort){if(denied)throw Error('Denied read');var result=(tables[form]||[]).map(record).filter(predicate);if(sort)result.sort((a,b)=>a[sort]-b[sort]);return new Proxy(result,{get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;},set(a,k,v){if(!a.length)throw Error('Missing record');a[0][k]=v;return true;}});}
  function insertRecord(form,data){data.ID=Math.max(100,...tables[form].map(row=>row.ID))+1;tables[form].push(data);writes++;return data.ID;}
  function recordValues(...pairs){var data={};for(var i=0;i<pairs.length;i+=2)data[pairs[i]]=pairs[i+1];return data;}
  var thisapp={resolveApprovalRoute(){return map({success:resolved,error:resolved?null:'Missing assignment',snapshot:map({route:steps.map(map)})});},snapshotApprovalRoute(c){captures.push(JSON.parse(JSON.stringify(c)));return map({success:true,snapshotId:'71',snapshot:map({route:steps.map(map)})});}};
  var input=map({workflow,recordId:'51',budgetId:'61',companyId:'31',submitterId:'19',territory:'North',department,amountBasisConfirmed,effectiveDate:'2026-10-08'});
  `+js,context);
  const result=vm.runInContext('applySharedApprovalPolicy(input)',context);
  return {result:JSON.parse(JSON.stringify(result)),rows:JSON.parse(JSON.stringify(context.tables.Budget_Approvals)),writes:context.writes,captures:context.captures};
}
let r=execute();assert.equal(r.result.success,true,JSON.stringify(r.result));assert.equal(r.result.shared,true);assert.deepEqual(r.result.executionRows,['101','102']);assert.deepEqual(r.rows.map(row=>row.Approver),route.map(step=>step.email));assert.deepEqual(r.rows.map(row=>row.Approval_Notes),['','']);assert.equal(r.captures.length,1);
r=execute({steps:route.slice(0,1)});assert.equal(r.result.success,true);assert.equal(r.rows[1].Status,'Not Sent');assert.equal(r.rows[1].ID,102);assert.equal(r.rows[1].Proforma,null);assert.equal(r.rows[1].Budget,null);assert.equal(r.rows[1].Budget_Modification,null);
r=execute({steps:[...route,{order:3,role:'Legal',email:'legal@example.com'}]});assert.equal(r.result.success,true);assert.equal(r.rows.length,3);assert.equal(r.rows[2].Type1,'Pro Forma');assert.equal(r.rows[2].Proforma,51);
for(const history of [{Status:'Pending'},{Status:'Approved'},{Status:'Rejected'},{Approval_Notes:'Keep this note'},{Sent_Date:'2026-10-08'},{Responded_Date:'2026-10-08'}]){const rows=[{...baseRows[0],...history},baseRows[1]];r=execute({rows});assert.equal(r.result.success,true);assert.equal(r.result.shared,false);assert.equal(r.result.retainedExistingRoute,true);assert.equal(r.writes,0);assert.equal(r.captures.length,0);assert.deepEqual(r.rows,rows);}
r=execute({resolved:false});assert.equal(r.result.success,false);assert.equal(r.result.error,'Missing assignment');assert.equal(r.writes,0);
for(const policies of [[],[{...basePolicy,Adapter_Enabled:false}]]){r=execute({policies});assert.equal(r.result.success,true);assert.equal(r.result.shared,false);assert.equal(r.writes,0);assert.equal(r.captures.length,0);}
r=execute({policies:[basePolicy,{...basePolicy,ID:42}]});assert.equal(r.result.success,false);assert.equal(r.writes,0);
r=execute({policies:[basePolicy,{...basePolicy,ID:42,Territory_Key:'North',Adapter_Enabled:false}]});assert.equal(r.result.shared,false);assert.equal(r.writes,0,'highest disabled adapter retains legacy; it does not fall back to company policy');
r=execute({denied:true});assert.equal(r.result.success,false);assert.equal(r.writes,0);
r=execute({steps:Array.from({length:9},(_,i)=>({order:i+1,role:'Role '+i,email:'role'+i+'@example.com'}))});assert.equal(r.result.success,false);assert.equal(r.writes,0);assert.match(r.result.error,/8 approval steps/);
for(const department of ['Development','Construction']){
  const rows=baseRows.map(row=>({...row,Proforma:null,Budget:51,Type1:department}));const untouched={...rows[0],ID:103,Type1:department==='Development'?'Construction':'Development'};
  const policy={...basePolicy,Workflow:'Budget',Steps_JSON:JSON.stringify([{enabled:true,condition:'Always'}])};
  r=execute({workflow:'Budget',department,rows:[...rows,untouched],policies:[policy],steps:[...route,{order:3,role:'Legal',email:'legal@example.com'}]});
  assert.equal(r.result.success,true,JSON.stringify(r.result));assert.deepEqual(r.result.executionRows,['101','102','104']);assert.equal(r.rows[3].Budget,51);assert.equal(r.rows[3].Type1,department);assert.deepEqual(r.rows[2],untouched,'other budget track remains exactly unchanged');
  const conditional={...policy,Steps_JSON:JSON.stringify([{enabled:true,condition:'Above',threshold:'1000.00'}])};
  r=execute({workflow:'Budget',department,rows,policies:[conditional]});assert.equal(r.result.success,false);assert.equal(r.writes,0);assert.match(r.result.error,/amount basis/);
  r=execute({workflow:'Budget',department,rows:[{...rows[0],Status:'Rejected'},rows[1]],policies:[conditional],resolved:false});assert.equal(r.result.retainedExistingRoute,true);assert.equal(r.writes,0,'existing rejected chain does not depend on new thresholds or role assignments');
}
r=execute({workflow:'Budget Modification',rows:[],policies:[{...basePolicy,Workflow:'Budget Modification'}]});assert.equal(r.result.success,true);assert.equal(r.rows.length,2);for(const row of r.rows){assert.equal(row.Budget,61);assert.equal(row.Budget_Modification,51);assert.equal(row.Type1,'Modification');}
console.log('Templates initialize untouched native execution rows; existing decisions, recipients and notes remain unchanged. New/fewer steps, migration gates and failed reads passed.');
