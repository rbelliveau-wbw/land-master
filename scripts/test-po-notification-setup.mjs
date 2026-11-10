import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {compileDelugePO} from './test-po-test-cfo-backend.mjs';

// Runs the private installer body with native lookup shapes. This is not
// evidence of Creator compilation, live setup or Production publication.
const source=fs.readFileSync('creator/functions/setupPurchaseOrderNotifications.dg','utf8');
const program=compileDelugePO(source);
assert.doesNotMatch(source,/sendmail|invokeurl|http_method|invokeCustomApi|\.User\s*=|Edit_All_Budgets\s*=/,'The installer cannot send, call a public API or grant login/permissions.');
assert.match(source,/environmentType != "Development" \|\| zoho.loginuser != zoho.adminuser/);
assert.match(source,/Lock_Key="po-notification-setup"/);
assert.match(source,/Approval_Routing_Enabled=false/);
assert.doesNotMatch(source,/if\([^\n]*&&[^\n]*\|\|/,'Keep mixed logic in nested branches: the native formatter may strip grouping.');
const seed=[
  {Full_Name:'Samuel Spears',Approver_Email:'sspears@wbdevelopment.com'},
  {Full_Name:'Sokha Sim',Approver_Email:'ssim@wbdevelopment.com'},
  {Full_Name:'Kimberly M. Singer',Approver_Email:'kim.singer@wbdevelopment.com'},
  {Full_Name:'Michael Wilson',Approver_Email:'mwilson@wbdevelopment.com'}
];
const SETTINGS='4410926000000769023';
function runtime({contacts=[],settings=[{ID:SETTINGS,PO_Approved_Recipients:[],PO_Rejected_Recipients:[]}],environment='Development',login='owner'}={}){
  const context=vm.createContext({fixtureJSON:JSON.stringify({User_Access:contacts,Settings:settings,Approval_Config_Lock:[]}),environment,login});
  vm.runInContext(`
    var tables=JSON.parse(fixtureJSON),writes=[],hook=null,nextId=4410926000005910100n;
    function map(value){if(value===null||typeof value!=='object'||Object.hasOwn(value,'get'))return value;if(Array.isArray(value))return value.map(map);for(var key of Object.keys(value))value[key]=map(value[key]);Object.defineProperties(value,{get:{value:function(key){return this[key]??null;}},put:{value:function(key,value){this[key]=map(value);}},toString:{value:function(){return JSON.stringify(this);}}});return value;}
    function Map(){return map({});}function List(){return [];}function ifnull(value,fallback){return value==null?fallback:value;}function choose(test,a,b){return test?a:b;}
    function recordValues(...pairs){var value={};for(var i=0;i<pairs.length;i+=2)value[pairs[i]]=pairs[i+1];return map(value);}
    Array.prototype.add=function(value){this.push(value);};Array.prototype.get=function(index){return this[index]??null;};Array.prototype.size=Array.prototype.count=function(){return this.length;};Array.prototype.contains=function(value){return this.includes(value);};
    function record(row){return new Proxy(row,{get(value,key){if(['PO_Approved_Recipients','PO_Rejected_Recipients'].includes(key)&&Array.isArray(value[key]))return value[key].map(item=>typeof item==='object'?item:{ID:String(item)});return value[key]??null;},set(value,key,next){writes.push({kind:'update',id:value.ID,field:key,value:JSON.parse(JSON.stringify(next))});value[key]=next;if(hook)hook('update',value,key);return true;}});}
    function query(form,predicate){var rows=(tables[form]??[]).map(record).filter(predicate);return new Proxy(rows,{get(array,key){return key in array||typeof key==='symbol'?array[key]:array[0]?.[key]??null;},set(array,key,value){if(!array.length)throw Error('Missing native record');array[0][key]=value;return true;}});}
    function insertRecord(form,value){if(form==='Approval_Config_Lock'&&tables[form].some(row=>row.Lock_Key===value.Lock_Key))throw Error('Duplicate native Lock_Key');value.ID=String(++nextId);if(form==='User_Access')Object.assign(value,{User:null,Edit_All_Budgets:false,Create_Purchase_Orders:false});tables[form].push(value);writes.push({kind:'insert',form,id:value.ID});if(hook)hook('insert',value,form);return value.ID;}
    function removeRecords(form,rows){tables[form]=tables[form].filter(row=>!rows.some(match=>match.ID===row.ID));writes.push({kind:'delete-lock',form});}
    var zoho={loginuser:login,adminuser:'owner'};
    var thisapp={environment:{type:environment}};
    ${program}
  `,context);
  return {context,get tables(){return JSON.parse(JSON.stringify(context.tables));},get writes(){return JSON.parse(JSON.stringify(context.writes));},run(action){context.action=action;return JSON.parse(vm.runInContext('JSON.stringify(setupPurchaseOrderNotifications(action))',context));},eval(script){return vm.runInContext(script,context);}};
}

for(const [environment,login]of [['Production','owner'],['Stage','owner'],['Development','another-user']]){
  const h=runtime({environment,login});assert.equal(h.run('Apply').success,false);assert.deepEqual(h.writes,[],'Only the actual owner in Development can mutate setup data.');
}
{
  const h=runtime();assert.equal(h.run('Other').success,false);assert.deepEqual(h.writes,[]);
  const check=h.run('Check');assert.equal(check.success,true);assert.equal(check.missingCount,4);assert.equal(check.configurationState,'Empty');assert.deepEqual(check.contacts.map(row=>row.id),['','','','']);assert.deepEqual(h.writes,[],'Check is entirely read-only.');
  const applied=h.run('Apply');assert.equal(applied.success,true,JSON.stringify(applied));assert.equal(applied.writeState,'verified');assert.equal(applied.approvedCount,4);assert.equal(applied.rejectedCount,1);assert.equal(applied.setupLockPresent,false);assert.equal(new Set(applied.approvedIds).size,4);assert.deepEqual(applied.rejectedIds,[applied.approvedIds[0]]);assert.ok(applied.approvedIds.every(id=>typeof id==='string'));
  assert.deepEqual(h.tables.User_Access.map(({Full_Name,Approver_Email})=>({Full_Name,Approver_Email})),seed);
  assert.ok(h.tables.User_Access.every(row=>row.User===null&&row.Approval_Routing_Enabled===false&&row.Edit_All_Budgets===false&&row.Create_Purchase_Orders===false));
  const before=h.tables.User_Access;const again=h.run('Apply');assert.equal(again.success,true);assert.deepEqual(again.createdIds,[]);assert.deepEqual(h.tables.User_Access,before,'Repeated Apply reuses exact contacts without changing names, grants or login fields.');
  const checks=h.writes.length;assert.equal(h.run('Check').configurationState,'Configured');assert.equal(h.writes.length,checks);
}
{
  const existing={ID:'4410926000005910064',User:'existing.login',Full_Name:'Existing Display Name',Approver_Email:' SSPEARS@WBDEVELOPMENT.COM ',Edit_All_Budgets:true,Approval_Routing_Enabled:true};
  const h=runtime({contacts:[existing]});const applied=h.run('Apply');assert.equal(applied.success,true);assert.equal(applied.contacts[0].id,existing.ID);assert.deepEqual(h.tables.User_Access[0],existing,'Case-insensitive exact email reuse never changes a real person record.');assert.equal(applied.createdIds.length,3);
}
{
  const contacts=seed.map((row,index)=>({...row,ID:String(4410926000005910064n+BigInt(index))}));contacts.push({...contacts[0],ID:'4410926000005999999',Approver_Email:'SSPEARS@WBDEVELOPMENT.COM'});const h=runtime({contacts});const checked=h.run('Check');assert.equal(checked.success,false);assert.equal(checked.configurationState,'Conflict');assert.equal(checked.contacts[0].matches,2);assert.equal(h.run('Apply').success,false);assert.deepEqual(h.writes,[],'Ambiguous email matches never select a winner.');
}
for(const settings of [[],[{ID:'1',PO_Approved_Recipients:[],PO_Rejected_Recipients:[]},{ID:'2',PO_Approved_Recipients:[],PO_Rejected_Recipients:[]}]]){
  const h=runtime({settings});assert.equal(h.run('Apply').success,false);assert.deepEqual(h.writes,[],'Setup never creates or chooses among Settings singletons.');
}
{
  const h=runtime({contacts:[{ID:'4410926000005999999',Full_Name:'Unrelated',Approver_Email:'other@example.test'}],settings:[{ID:SETTINGS,PO_Approved_Recipients:[{ID:'4410926000005999999'}],PO_Rejected_Recipients:[]}]});assert.equal(h.run('Apply').success,false);assert.deepEqual(h.writes,[],'Nonempty unexpected recipient configuration is never overwritten.');
}
{
  const h=runtime();h.eval(`hook=function(kind,row,form){if(kind==='insert'&&form==='Approval_Config_Lock'){tables.User_Access.push({ID:'4410926000005999999',Approver_Email:'other@example.test'});tables.Settings[0].PO_Approved_Recipients=[{ID:'4410926000005999999'}];}};`);const result=h.run('Apply');assert.equal(result.success,false);assert.equal(h.tables.User_Access.length,1,'Configuration is rechecked under the unique setup claim before contact inserts.');assert.equal(h.tables.Approval_Config_Lock.length,0,'Only this run releases its exact lock.');
}
{
  const h=runtime();h.eval(`hook=function(kind,row,form){if(kind==='insert'&&form==='User_Access'&&!tables.changed){tables.changed=true;tables.User_Access.push({ID:'4410926000005999999',Approver_Email:'other@example.test'});tables.Settings[0].PO_Approved_Recipients=[{ID:'4410926000005999999'}];}};`);const result=h.run('Apply');assert.equal(result.success,false);assert.equal(result.writeState,'partial');assert.deepEqual(h.tables.Settings[0].PO_Approved_Recipients,[{ID:'4410926000005999999'}],'Concurrent unexpected Settings edits survive; created contacts are retained.');assert.equal(h.tables.Approval_Config_Lock.length,0);
}
{
  const h=runtime();h.eval(`var concurrentResult=null;hook=function(kind,row,form){if(kind==='insert'&&form==='Approval_Config_Lock'){concurrentResult=setupPurchaseOrderNotifications('Apply');}};`);assert.equal(h.run('Apply').success,true);assert.equal(h.eval('concurrentResult.success'),false);assert.equal(h.tables.User_Access.length,4,'A concurrent utility execution cannot create duplicate contacts.');
}
console.log('Private PO notification setup: owner/Development-only, read-only Check, exact case-insensitive contact reuse, safe idempotent creation, singleton/config guards and native unique setup serialization passed (offline fixtures).');
