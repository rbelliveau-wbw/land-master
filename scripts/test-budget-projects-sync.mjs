import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {extract} from './fixtures/tax-source.mjs';

const source = fs.readFileSync('widgets/budget-manager/src/app/widget.html', 'utf8');
const deluge = fs.readFileSync('creator/functions/syncBudgetMetricToProjects.dg', 'utf8');
function deferred() { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; }
async function drain() { for(let n=0;n<16;n++) await Promise.resolve(); }
const budgetId = '4410926000003558988';
function harness(liveSDK=true) {
  const saves=[], pushes=[], messages=[], notices=[], marks=[], timers=new Map(); let sequence=0;
  const S={liveSDK,saveTimers:{}};
  const c=vm.createContext({S,Promise,JSON,String,Error,CFG:{forms:{budget:'Add_Budget'}},
    setTimeout(fn){const id=++sequence;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},
    sdkUpdateRecord(form,id,fields){const gate=deferred();saves.push({form,id,fields,...gate});return gate.promise;},
    sdkRunBudgetFunction(name,args){const gate=deferred();pushes.push({name,args,...gate});return gate.promise;},
    setEdAutosave(){},markInputState(el,state){marks.push(state);},auditLog(){},
    setMsg(text,type){messages.push({text,type});},
    window:{LMSuccess:{begin(){},inline(key,text,group,guard){notices.push({key,text,group,guard});}}}
  });
  c.LMSuccess=c.window.LMSuccess;
  const unwrap=source.slice(source.indexOf('function unwrapBudgetManageResponse('),source.indexOf('function runBudgetManageAction('));
  vm.runInContext([unwrap,...['queueBudgetProjectsSync','queueBudgetSave'].map(name=>extract(source,name))].join('\n'),c);
  return {c,S,saves,pushes,messages,notices,marks,flush(){for(const [id,fn] of [...timers]){timers.delete(id);fn();}}};
}
function ack(field,overrides={}) { return {code:3000,result:JSON.stringify({ok:true,action:'sync-budget-metric',writeAttempted:true,budgetId,field,projectId:'1496277000013686372',...overrides})}; }

for(const field of ['Acres','Lot_Total_Residential','Equiv_LF_of_Street']) {
  const h=harness();h.c.queueBudgetSave(budgetId,field,35.51,{});h.flush();await drain();
  assert.equal(h.pushes.length,0,'never push before the native budget save succeeds');
  h.saves[0].resolve({code:3000,data:{ID:budgetId}});await drain();
  assert.equal(h.pushes.length,1);assert.equal(h.pushes[0].name,'syncBudgetMetricToProjects');
  assert.deepEqual(JSON.parse(h.pushes[0].args.payload),{budgetId,field},'send identities only; server reads the saved value and resolves Project Code');
  assert.equal(h.notices.length,0,'no Projects success before external acknowledgement');
  assert.ok(h.marks.includes('saved-ok'),'keep the existing budget inline saved state');
  h.pushes[0].resolve(ack(field));await drain();
  assert.equal(h.notices.at(-1).text,'Budget saved · Projects updated.');assert.equal(h.notices.at(-1).guard(),true);
}
{
  const h=harness();h.c.queueBudgetSave(budgetId,'Lot_Price',62500,{});h.flush();h.saves[0].resolve();await drain();
  assert.equal(h.pushes.length,0);assert.equal(h.notices[0].text,'Budget changes saved.');
}
{
  const h=harness();h.c.queueBudgetSave(budgetId,'Acres',36,{});h.flush();h.saves[0].reject(Error('Denied'));await drain();
  assert.equal(h.pushes.length,0);assert.ok(h.marks.includes('save-error'));assert.equal(h.notices.length,0);
}
for(const response of [ack('Acres',{ok:false,message:'No unique Project Code match'}),ack('Acres',{budgetId:'other'}),ack('Acres',{field:'Lot_Price'}),ack('Acres',{dryRun:true}),ack('Acres',{writeAttempted:false}),{code:3000,result:'unrecognized'}]) {
  const h=harness();h.c.queueBudgetSave(budgetId,'Acres',36,{});h.flush();h.saves[0].resolve();await drain();h.pushes[0].resolve(response);await drain();
  assert.equal(h.notices.length,0);assert.equal(h.messages.at(-1).text,'Budget saved · Projects update failed.');
  assert.equal(h.S.budgetSaveState[`budget:${budgetId}|Acres`],undefined,'Projects failure does not turn a successful native save into failure');
  assert.ok(!h.marks.includes('save-error'));assert.equal(h.pushes.length,1,'no automatic replay');
}
{
  const h=harness();h.c.queueBudgetSave(budgetId,'Acres',36,{});h.flush();h.saves[0].resolve();await drain();h.pushes[0].reject(Error('lost reply'));await drain();
  assert.equal(h.pushes.length,1);assert.equal(h.notices.length,0);assert.match(h.messages[0].text,/Budget saved/);
}
{
  const h=harness();h.c.queueBudgetSave(budgetId,'Acres',36,{});h.flush();h.c.queueBudgetSave(budgetId,'Acres',37,{});h.flush();
  h.saves[0].resolve();await drain();assert.equal(h.pushes.length,0,'superseded source acknowledgement cannot push');
  h.saves[1].resolve();await drain();assert.equal(h.pushes.length,1);h.pushes[0].resolve(ack('Acres'));await drain();assert.equal(h.notices.length,1);
}
{
  const h=harness();h.c.queueBudgetSave(budgetId,'Acres',36,{});h.flush();h.saves[0].resolve();await drain();
  h.c.queueBudgetSave(budgetId,'Acres',37,{});h.flush();h.saves[1].resolve();await drain();assert.equal(h.pushes.length,1,'serialize writes to the same external field');
  h.pushes[0].resolve(ack('Acres'));await drain();assert.equal(h.notices.length,0,'older push cannot confirm newer edit');assert.equal(h.pushes.length,2);
  h.pushes[1].resolve(ack('Acres'));await drain();assert.equal(h.notices.length,1);
}
{
  const h=harness(false);h.c.queueBudgetSave(budgetId,'Acres',36,{});h.flush();h.saves[0].resolve();await drain();
  assert.equal(h.pushes.length,0);assert.equal(h.notices[0].text,'Budget changes saved.','preview cannot claim an external update');
}
assert.match(deluge,/User_Access\[User == zoho\.loginuser\]/);
assert.match(deluge,/owner\.ID == access\.ID/,'match native multi-lookup records by ID');
assert.match(deluge,/"field_name":"project_code","criteria_condition":"is"/);
assert.match(deluge,/projects\.size\(\) != 1/);
assert.match(deluge,/value = value\.toDecimal\(\);/,'normalize native Number and Decimal values before comparing');
assert.match(deluge,/value != value\.floor\(\)\.toDecimal\(\)/,'whole-number checks compare matching Deluge types');
assert.match(deluge,/value = value\.toLong\(\);/,'destination Number fields receive integers');
assert.match(deluge,/type :PATCH/);
assert.match(deluge,/connection:"zoho_projects_connection"/);
assert.match(deluge,/return result\.toString\(\);\s*}\s*$/,'compile-safe outer return');
assert.doesNotMatch(deluge,/postman-echo|containsKey|type :POST/);
console.log('Budget Projects sync: save ordering, all three fields, native lookup shapes, failures, stale edits, serial pushes, truthful toast and preview passed.');
