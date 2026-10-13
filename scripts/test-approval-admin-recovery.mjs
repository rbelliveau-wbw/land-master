import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../widgets/settings-manager/src/app/approval-admin.js',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const editable=value=>{const result=clone(value);for(const key of ['version','duplicatePerson','effectiveFrom','effectiveTo','adapterEnabled'])delete result[key];if(Array.isArray(result.steps))result.steps.forEach(step=>delete step.poTestCFO);return result;};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const token='b2bf8b11-672b-45cb-84a1-71538d9564d1';
const intended={id:'',companyId:'',workflow:'Purchase Order',version:2,status:'Draft',adapterEnabled:false,enabled:true,selfApproval:'Deny',duplicatePerson:'Reject',steps:[{key:'test-cfo',order:1,roleId:'81',condition:'Always',enabled:true,poTestCFO:{budgetId:'9007199254740993',userAccessId:'9007199254740994',email:'test@example.com',allowSelfApproval:true,maxAmount:'55.00'}}]};
const after={...clone(intended),id:'9007199254740995'};
const audit={id:'91',action:'SavePolicy',status:'Started',actorId:'9007199254740994',token,intended:clone(intended)};
const configuration={roles:[{id:'81',name:'CFO',active:true}],assignments:[],users:[{id:'9007199254740994',name:'Test person',user:'test-login',routingEnabled:false}],companies:[],territories:[],policies:[clone(after)],audit:[clone(audit)]};
const receipt={contract:'approval-policy-v1',success:true,writeState:'verified',token,after};
const nodes=new Map();
const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',hidden:false,disabled:false,value:0});return nodes.get(selector);};
const chips=[{textContent:''},{textContent:''},{textContent:''}];
const card={querySelector:node,querySelectorAll:selector=>selector==='ol span'?chips:selector==='footer button'?[node('[data-ap-save]')]:[],focus(){}};
let removed=false;
const panel={remove(){removed=true;}};
const calls=[];
let scope='same-admin-session',answer=()=>receipt;
const context=vm.createContext({JSON,Promise,Error,crypto:{randomUUID:()=>token},performance:{now:()=>0},window:{matchMedia:()=>({matches:true})},setTimeout:(fn,ms)=>ms===90000?90000:setTimeout(fn,ms),clearTimeout:id=>{if(id!==90000)clearTimeout(id);}});
vm.runInContext(await readFile(new URL('../widgets/settings-manager/src/app/approval-policy-domain.js',import.meta.url),'utf8'),context);
// Export the real closure handlers into this fixture without changing production code.
assert.equal(source.split('return {open:open};').length,2);
vm.runInContext(source.replace('return {open:open};',`return {open:open,click:click,load:load,send:send,close:close,listing:listing,reconcileAudit:reconcileAudit,
  fixture:function(value){panel=value.panel;card=value.card;config=value.config;policyReady=value.policyReady!==false;today='2026-10-11';actorId='9007199254740994';tab=value.tab||'Audit';draft=value.draft||null;editing=value.editing||'';pending=null;busy=false;scope=value.scope;epoch=1;inert=[];},
  state:function(){return {pending:pending,busy:busy,draft:draft,tab:tab,editing:editing,config:config,panel:panel};}};`),context);
const admin=context.LMApprovalAdmin;
const instance=admin.create({scope:()=>scope,call:async payload=>{calls.push(clone(payload));return payload.action==='List'?{contract:'approval-policy-v1',success:true,canAdmin:true,policyModel:'ordered-cfo-v1',currentDate:'2026-10-11',actorId:'9007199254740994',configuration:clone(configuration)}:answer(payload);}});
const reset=()=>{removed=false;calls.length=0;scope='same-admin-session';answer=()=>receipt;instance.fixture({policyReady:true,panel,card,config:clone(configuration),scope});};
function button(dataset={},attrs=[]){return {target:{dataset,hasAttribute:name=>attrs.includes(name),closest(){return this;}}};}

reset();assert.match(instance.listing(),/Verify saved draft/);assert.match(instance.listing(),new RegExp(token));
for(const patch of [{token:''},{token:'short'},{token:12},{action:'Publish'},{status:'Complete'},{intended:null},{intended:undefined},{intended:{...intended,workflow:'Budget'}},{intended:{...intended,steps:[]}},{intended:{...intended,steps:[{...intended.steps[0],enabled:false}]}},{intended:{...intended,steps:[{...intended.steps[0],condition:'Above'}]}},{intended:{...intended,steps:[{...intended.steps[0],poTestCFO:null}]}},{intended:{...intended,steps:[JSON.stringify(intended.steps[0])]}}]){
  const next=clone(configuration);next.audit=[{...clone(audit),...patch}];instance.fixture({policyReady:true,panel,card,config:next,scope});assert.doesNotMatch(instance.listing(),/data-ap-reconcile/,'Only the scoped owner receipt exposes recovery');
}

// A real Audit click sends only Reconcile + its existing token, locks duplicate actions,
// and keeps the terminal result mounted until Review draft refreshes/reopens that ID.
reset();let resolve;answer=()=>new Promise(done=>{resolve=done;});
instance.click(button({apReconcile:token}));
assert.deepEqual(calls,[{action:'Reconcile',token}]);assert.equal(instance.state().busy,true);assert.equal(node('[data-ap-close]').disabled,true);assert.match(node('.ap-body').innerHTML,/Verify draft and receipt/);assert.doesNotMatch(node('.ap-body').innerHTML,/Save and audit change/);
instance.click(button({apReconcile:token}));instance.click(button({},['data-ap-save']));instance.close();assert.equal(calls.length,1);assert.equal(removed,false);
resolve(receipt);await tick();await tick();
assert.equal(instance.state().busy,false);assert.equal(instance.state().pending.after.id,after.id);assert.equal(node('progress').value,3);assert.equal(node('[data-ap-check]').hidden,true);assert.equal(node('[data-ap-done]').textContent,'Review draft');assert.match(node('[data-ap-results]').textContent,/Saved draft verified/);
instance.click(button({},['data-ap-done']));await tick();
assert.deepEqual(calls,[{action:'Reconcile',token},{action:'List'}]);assert.equal(instance.state().pending,null);assert.equal(instance.state().tab,'Policies');assert.equal(instance.state().editing,'Policies');assert.deepEqual(clone(instance.state().draft),editable(after));assert.doesNotMatch(node('.ap-body').innerHTML,/data-ap-test-scope|Budget ID|Test CFO/);

// Unknown reconciliation repeats only its safe token-only recovery, never SavePolicy.
reset();answer=()=>({contract:'approval-policy-v1',success:false,writeState:'unknown',token,error:'Draft readback differs'});
await instance.reconcileAudit(token);await tick();assert.equal(instance.state().pending.unknown,true);assert.equal(node('[data-ap-check]').hidden,false);assert.equal(node('progress').value,1);
answer=()=>receipt;instance.click(button({},['data-ap-check']));await tick();await tick();assert.deepEqual(calls,[{action:'Reconcile',token},{action:'Reconcile',token}]);assert.equal(instance.state().pending.after.id,after.id,'Recovery rechecks its full receipt and releases only its own retained lock');
assert.match(node('[data-ap-results]').textContent,/Saved draft verified/);

reset();answer=()=>({contract:'approval-policy-v1',success:false,writeState:'not-started',error:'This operation belongs to another actor.'});await instance.reconcileAudit(token);await tick();assert.equal(instance.state().pending.unknown,true);assert.equal(instance.state().pending.rejected,undefined);assert.match(node('[data-ap-error]').textContent,/belongs to another actor/,'A refused recovery shows the actual backend error without claiming the draft was unsaved');

// A Complete owner receipt can still release its retained lock, only while the
// exact recorded destination remains a unique Draft in the current snapshot.
reset();const complete=clone(configuration);complete.audit[0].status='Complete';complete.audit[0].after=clone(after);instance.fixture({policyReady:true,panel,card,config:complete,scope});assert.match(instance.listing(),/Verify saved draft/);await instance.reconcileAudit(token);await tick();assert.equal(instance.state().pending.data.id,after.id);assert.deepEqual(calls,[{action:'Reconcile',token}]);
for(const policies of [[],[{...after,status:'Published'}],[clone(after),clone(after)]]){const stale=clone(complete);stale.policies=policies;instance.fixture({policyReady:true,panel,card,config:stale,scope});assert.doesNotMatch(instance.listing(),/data-ap-reconcile/);}

const recoveryRun={action:'Reconcile',data:{id:after.id},token};
for(const bad of [{token:'another-token'},{after:{...after,id:'1'}},{after:{...after,id:Number(after.id)}},{after:{...after,status:'Published'}},{after:{...after,adapterEnabled:true}}])assert.throws(()=>admin.verify({...receipt,...bad},recoveryRun));
assert.equal(admin.verify(receipt,recoveryRun).id,after.id);

reset();scope='another-session';await instance.reconcileAudit(token);assert.equal(calls.length,0,'A stale session cannot recover a receipt');
reset();await instance.reconcileAudit('not-in-snapshot');assert.equal(calls.length,0);assert.match(node('[data-ap-error]').textContent,/unavailable/);
reset();const duplicate=clone(configuration);duplicate.audit.push(clone(audit));instance.fixture({policyReady:true,panel,card,config:duplicate,scope});await instance.reconcileAudit(token);assert.equal(calls.length,0,'An ambiguous audit token cannot start recovery');

// The real workflow + save handlers keep PO Preview flags out of every policy
// write while preserving an already mounted legacy editor draft.
reset();instance.fixture({policyReady:true,panel,card,config:clone(configuration),scope,tab:'Policies',editing:'Policies',draft:{...clone(after),workflow:''}});instance.click(button({apPick:'workflow',index:'',value:'Purchase Order'}));assert.equal('hasBudgetModification' in instance.state().draft,false);assert.equal('hasBudgetOverrun' in instance.state().draft,false);
const mounted=instance.state().draft;mounted.hasBudgetModification=false;mounted.hasBudgetOverrun=false;instance.click(button({},['data-ap-save']));await tick();await tick();assert.equal(calls[0].action,'SavePolicy');assert.equal('hasBudgetModification' in calls[0].data,false);assert.equal('hasBudgetOverrun' in calls[0].data,false);assert.equal(mounted.hasBudgetModification,false);assert.equal(mounted.hasBudgetOverrun,false);assert.equal(calls[0].data.steps[0].poTestCFO,undefined);
reset();instance.fixture({policyReady:true,panel,card,config:clone(configuration),scope,editing:'Preview',draft:{workflow:''}});instance.click(button({apPick:'workflow',index:'',value:'Purchase Order'}));assert.equal(instance.state().draft.hasBudgetModification,false);assert.equal(instance.state().draft.hasBudgetOverrun,false);

// Old native DTOs represent each JSONList step as JSON text. Normalize only
// those items, retain exact string IDs, and reject malformed shapes or numbers.
reset();const native=clone(configuration);native.policies[0].steps=native.policies[0].steps.map(JSON.stringify);for(const key of ['before','after','intended'])native.audit[0][key]={...clone(after),steps:after.steps.map(JSON.stringify)};
// Point List to the native-shaped fixture using the same real load handler.
const expectedConfiguration=clone(configuration);Object.assign(configuration,native);await instance.load(after.id);assert.equal(instance.state().draft.steps[0].poTestCFO,undefined);assert.equal(typeof instance.state().draft.steps[0].roleId,'string');assert.match(node('.ap-body').innerHTML,/CFO/);assert.doesNotMatch(node('.ap-body').innerHTML,/Test CFO|Budget ID/);assert.doesNotMatch(node('.ap-body').innerHTML,/data-ap-field="enabled" data-index="0" >/);for(const key of ['before','after','intended'])assert.deepEqual(clone(instance.state().config.audit[0][key].steps),after.steps);Object.assign(configuration,expectedConfiguration);
for(const malformed of ['not json','null','[]','42',JSON.stringify({...after.steps[0],roleId:81}),JSON.stringify({...after.steps[0],poTestCFO:{...after.steps[0].poTestCFO,budgetId:9007199254740993}})]){reset();configuration.policies[0].steps=[malformed];await instance.load(after.id);assert.equal(instance.state().draft,null);assert.equal(node('[data-ap-error]').hidden,false);assert.equal(node('[data-ap-save]').disabled,true);Object.assign(configuration,clone(expectedConfiguration));}

// Refresh must find one exact Draft policy before opening any editing controls.
reset();configuration.policies=[];await instance.load(after.id);assert.equal(instance.state().draft,null);assert.match(node('[data-ap-error]').textContent,/verified draft is unavailable/);assert.equal(node('[data-ap-save]').disabled,true);configuration.policies=[clone(after)];
// Published policies edit the same record and Save applies to future submissions.
reset();const active={...clone(after),status:'Published',effectiveFrom:'2099-01-01',effectiveTo:'2099-02-01'};const activeConfig=clone(configuration);activeConfig.policies=[active];instance.fixture({panel,card,config:activeConfig,scope,tab:'Policies'});instance.click(button({apEdit:active.id}));assert.equal(instance.state().draft.id,active.id);assert.equal(instance.state().draft.status,'Published');assert.match(node('footer').innerHTML,/Save changes/);assert.match(node('.ap-body').innerHTML,/Every purchase order/);assert.match(node('.ap-body').innerHTML,/With budget modifications · approval order/);assert.doesNotMatch(node('.ap-body').innerHTML,/Effective from|Effective to|Version|Duplicate person|Threshold|Condition/);answer=()=>({...receipt,after:active});instance.click(button({},['data-ap-save']));await tick();await tick();assert.equal(calls[0].data.id,active.id);assert.equal(calls[0].data.status,'Published');for(const key of ['version','duplicatePerson','effectiveFrom','effectiveTo','adapterEnabled'])assert.equal(key in calls[0].data,false,key);assert.equal(instance.state().pending.after.status,'Published');
reset();instance.fixture({panel,card,config:clone(configuration),scope,tab:'Policies',editing:'Policies',draft:editable(after),policyReady:false});instance.click(button({},['data-ap-save']));await tick();assert.equal(calls.length,0);assert.match(node('[data-ap-error]').textContent,/Promote the updated Creator/);
console.log('Approval admin recovery: owner PO audit, token-only reconciliation, lock cleanup, exact Draft receipt, simple PO editor, in-place Published save and Creator readiness gate passed.');
