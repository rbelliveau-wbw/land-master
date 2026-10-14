import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../widgets/settings-manager/src/app/approval-admin.js',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const editable=value=>{const result=clone(value);result.selfApproval='Allow';for(const key of ['companyId','version','duplicatePerson','effectiveFrom','effectiveTo','adapterEnabled'])delete result[key];if(Array.isArray(result.steps))result.steps.forEach(step=>delete step.poTestCFO);return result;};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const token='b2bf8b11-672b-45cb-84a1-71538d9564d1';
const intended={id:'',companyId:'',workflow:'Purchase Order',version:2,status:'Draft',adapterEnabled:false,enabled:true,selfApproval:'Deny',duplicatePerson:'Reject',steps:[{key:'test-cfo',order:1,roleId:'81',condition:'Always',enabled:true,poTestCFO:{budgetId:'9007199254740993',userAccessId:'9007199254740994',email:'test@example.com',allowSelfApproval:true,maxAmount:'55.00'}}]};
const after={...clone(intended),id:'9007199254740995'};
const audit={id:'91',action:'SavePolicy',status:'Started',actorId:'9007199254740994',token,intended:clone(intended)};
const configuration={roles:[{id:'81',name:'CFO',active:true}],assignments:[],users:[{id:'9007199254740994',name:'Test person',user:'test-login',approverEmail:'test@example.com',routingEnabled:false}],territories:[],policies:[clone(after)],audit:[clone(audit)]};
const receipt={contract:'approval-policy-v1',success:true,writeState:'verified',token,after};
const nodes=new Map();
const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',hidden:false,disabled:false,value:0,focus(){}});return nodes.get(selector);};
const chips=[{textContent:''},{textContent:''},{textContent:''}];
const card={querySelector:node,querySelectorAll:selector=>selector==='ol span'?chips:selector==='footer button'?[node('[data-ap-save]')]:[],focus(){}};
let removed=false;
const panel={remove(){removed=true;}};
const calls=[];
let scope='same-admin-session',answer=()=>receipt;
const context=vm.createContext({JSON,Promise,Error,crypto:{randomUUID:()=>token},performance:{now:()=>0},window:{matchMedia:()=>({matches:true})},setTimeout:(fn,ms)=>ms===650?650:ms===90000?90000:setTimeout(fn,ms),clearTimeout:id=>{if(id!==90000&&id!==650)clearTimeout(id);}});
vm.runInContext(await readFile(new URL('../widgets/settings-manager/src/app/approval-policy-domain.js',import.meta.url),'utf8'),context);
// Export the real closure handlers into this fixture without changing production code.
assert.equal(source.split('return {open:open};').length,2);
vm.runInContext(source.replace('return {open:open};',`return {open:open,click:click,load:load,send:send,close:close,listing:listing,reconcileAudit:reconcileAudit,
  fixture:function(value){panel=value.panel;card=value.card;config=value.config;policyReady=value.policyReady!==false;actorId='9007199254740994';tab=value.tab||'Audit';draft=value.draft||null;editing=value.editing||'';pending=null;busy=false;scope=value.scope;epoch=1;inert=[];resetInline();},
  state:function(){return {pending:pending,busy:busy,draft:draft,tab:tab,editing:editing,config:config,panel:panel,policyReady:policyReady};}};`),context);
const admin=context.LMApprovalAdmin;
let policyModel='territory-perpetual-v2';
const instance=admin.create({scope:()=>scope,call:async payload=>{calls.push(clone(payload));return payload.action==='List'?{contract:'approval-policy-v1',success:true,canAdmin:true,policyModel,actorId:'9007199254740994',configuration:clone(configuration)}:answer(payload);}});
const reset=()=>{removed=false;calls.length=0;scope='same-admin-session';answer=()=>receipt;instance.fixture({policyReady:true,panel,card,config:clone(configuration),scope});};
function button(dataset={},attrs=[]){return {target:{dataset,hasAttribute:name=>attrs.includes(name),closest(){return this;}}};}

reset();assert.match(instance.listing(),/Verify Saved Draft/);assert.match(instance.listing(),new RegExp(token));
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
assert.equal(instance.state().busy,false);assert.equal(instance.state().pending.after.id,after.id);assert.equal(node('progress').value,3);assert.equal(node('[data-ap-check]').hidden,true);assert.equal(node('[data-ap-done]').textContent,'Review Draft');assert.match(node('[data-ap-results]').textContent,/Saved draft verified/);
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
reset();const complete=clone(configuration);complete.audit[0].status='Complete';complete.audit[0].after=clone(after);instance.fixture({policyReady:true,panel,card,config:complete,scope});assert.match(instance.listing(),/Verify Saved Draft/);await instance.reconcileAudit(token);await tick();assert.equal(instance.state().pending.data.id,after.id);assert.deepEqual(calls,[{action:'Reconcile',token}]);
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
reset();const active={...clone(after),status:'Published',effectiveFrom:'2099-01-01',effectiveTo:'2099-02-01'};const activeConfig=clone(configuration);activeConfig.policies=[active];instance.fixture({panel,card,config:activeConfig,scope,tab:'Policies'});instance.click(button({apEdit:active.id}));assert.equal(instance.state().draft.id,active.id);assert.equal(instance.state().draft.status,'Published');assert.match(node('footer').innerHTML,/data-ap-inline-status/);assert.match(node('.ap-body').innerHTML,/Without budget modifications/);assert.match(node('.ap-body').innerHTML,/With attached budget modifications/);assert.doesNotMatch(node('.ap-body').innerHTML,/Effective from|Effective to|Version|Duplicate person|Threshold|Condition|Company/);answer=()=>({...receipt,after:active});instance.click(button({},['data-ap-save']));await tick();await tick();assert.equal(calls[0].data.id,active.id);assert.equal(calls[0].data.status,'Published');for(const key of ['companyId','version','duplicatePerson','effectiveFrom','effectiveTo','adapterEnabled'])assert.equal(key in calls[0].data,false,key);assert.equal(instance.state().pending.after.status,'Published');
reset();instance.fixture({panel,card,config:clone(configuration),scope,tab:'Policies',editing:'Policies',draft:editable(after),policyReady:false});instance.click(button({},['data-ap-save']));await tick();assert.equal(calls.length,0);assert.match(node('[data-ap-error]').textContent,/Creator update pending|Promote the updated Creator/);
console.log('Approval admin recovery: owner PO audit, token-only reconciliation, lock cleanup, exact Draft receipt, clear PO scenarios, in-place Published save and Creator readiness gate passed.');

// The Approvers list exposes who receives requests; the Rules list shows the
// two PO scenarios instead of requiring an edit just to discover the chain.
const readable=clone(configuration);
readable.users[0].routingEnabled=true;
readable.roles.push({id:'82',name:'VP',active:true},{id:'83',name:'COO',active:true});
readable.users.push({id:'101',name:'Avery Brooks',user:'vp-login',approverEmail:'vp@example.com',routingEnabled:true},{id:'102',name:'Riley Parker',user:'coo-login',approverEmail:'coo@example.com',routingEnabled:true},{id:'103',name:'Jordan Lane',user:'requester-login',approverEmail:'requester@example.com',routingEnabled:true});
readable.territories=[{id:'201',label:'Bryan / College Station',vpUserAccessIds:['101']}];
readable.assignments=[{id:'301',roleId:'81',userAccessId:'9007199254740994',territory:'',department:'',active:true},{id:'302',roleId:'83',userAccessId:'102',territory:'201',department:'Development',active:true}];
readable.policies=[{...editable(after),status:'Published',steps:[{key:'vp',order:1,roleId:'82',enabled:true,condition:'Budget modification attached'},{key:'cfo',order:2,roleId:'81',enabled:true,condition:'Always'},{key:'coo',order:3,roleId:'83',enabled:true,condition:'Budget modification attached'}]}];
reset();instance.fixture({panel,card,config:readable,scope,tab:'Assignments'});
const people=instance.listing();assert.match(people,/Test person/);assert.match(people,/test@example\.com/);assert.match(people,/Riley Parker/);assert.match(people,/coo@example\.com/);assert.match(people,/Bryan \/ College Station/);assert.doesNotMatch(people,/companyId|Effective from|Effective to/);
instance.fixture({panel,card,config:readable,scope,tab:'Policies'});const rules=instance.listing();assert.match(rules,/Without budget mods/);assert.match(rules,/With budget mods/);assert.match(rules,/VP/);assert.match(rules,/CFO/);assert.match(rules,/COO/);

// Editing a legacy assignment does not hide a company/date constraint in the
// next save. The UI produces the perpetual territory-only contract and retains
// the exact assignment/person identity, enabled setting and department.
reset();const assignment={...clone(readable.assignments[1]),companyId:'999',effectiveFrom:'2099-01-01',effectiveTo:'2099-02-01'};const assignmentConfig=clone(readable);assignmentConfig.assignments=[assignment];
instance.fixture({panel,card,config:assignmentConfig,scope,tab:'Assignments'});instance.click(button({apEdit:assignment.id}));
assert.match(node('.ap-body').innerHTML,/Approver/);assert.match(node('.ap-body').innerHTML,/Applies to/);assert.match(node('.ap-body').innerHTML,/data-ap-open-picker/);assert.doesNotMatch(node('.ap-body').innerHTML,/Company|Effective from|Effective to|2099-/);
const mountedAssignment=instance.state().draft;answer=payload=>({...receipt,after:{...clone(payload.data),id:assignment.id}});instance.click(button({},['data-ap-save']));await tick();await tick();
assert.equal(calls[0].action,'SaveAssignment');assert.equal(calls[0].data.id,assignment.id);assert.equal(calls[0].data.userAccessId,'102');assert.equal(calls[0].data.territory,'201');assert.equal(calls[0].data.department,'Development');assert.equal(calls[0].data.active,true);for(const key of ['companyId','effectiveFrom','effectiveTo'])assert.equal(key in calls[0].data,false,key);assert.equal(mountedAssignment.id,assignment.id);

// v1 is inspectable while Creator is awaiting promotion, but every new native
// configuration mutation and route preview is stopped before any write/API.
reset();policyModel='ordered-cfo-v1';await instance.load();assert.equal(instance.state().policyReady,false);assert.match(node('.ap-body').innerHTML,/Creator update pending/);assert.equal(calls.length,1);
for(const [editing,draft] of [['Roles',{id:'',name:'Treasurer',active:true}],['Assignments',{id:'',roleId:'81',userAccessId:'9007199254740994',territory:'',department:'',active:true}],['Policies',editable(after)],['Preview',{workflow:'Purchase Order',territory:'201',department:'',submitterId:'103',amount:'100.00',hasBudgetModification:false,hasBudgetOverrun:false}]]){
  instance.fixture({panel,card,config:readable,scope,tab:editing,editing,draft,policyReady:false});const beforeCount=calls.length;instance.click(button({},['data-ap-save']));await tick();assert.equal(calls.length,beforeCount,editing+' must wait for the v2 native model');assert.match(node('[data-ap-error]').textContent,/Creator update pending|Promote the updated Creator/);
}
instance.fixture({panel,card,config:readable,scope,tab:'Policies',policyReady:false});instance.click(button({apPublish:after.id}));await tick();assert.equal(calls.length,1,'Publish cannot cross a legacy native contract');policyModel='territory-perpetual-v2';

// Actual Preview drops legacy context carriers and shows the exact resolved
// person/email. The source configuration remains unchanged after evaluation.
reset();const previewDraft={workflow:'Purchase Order',territory:'201',department:'',submitterId:'103',amount:'100.00',hasBudgetModification:false,hasBudgetOverrun:false,companyId:'999',effectiveDate:'2099-01-01'};
instance.fixture({panel,card,config:readable,scope,tab:'Preview',editing:'Preview',draft:previewDraft});answer=payload=>({contract:'approval-policy-v1',success:true,snapshot:context.LMApprovalPolicy.resolve(readable,payload.context)});
instance.click(button({},['data-ap-save']));await tick();assert.equal(calls[0].action,'Preview');for(const key of ['companyId','effectiveDate'])assert.equal(key in calls[0].context,false,key);assert.equal(calls[0].context.territory,'201');assert.equal(calls[0].context.amount,'100.00');assert.match(node('[data-ap-route]').innerHTML,/Test person/);assert.match(node('[data-ap-route]').innerHTML,/test@example\.com/);assert.equal(previewDraft.companyId,'999','Context sanitization does not mutate an existing draft');
instance.fixture({panel,card,config:readable,scope,tab:'Preview',editing:'Preview',draft:{...previewDraft,department:'Development',hasBudgetModification:true}});instance.click(button({},['data-ap-save']));await tick();assert.equal(calls[1].context.hasBudgetModification,true);const completeRoute=node('[data-ap-route]').innerHTML;for(const identity of ['Avery Brooks','vp@example.com','Test person','test@example.com','Riley Parker','coo@example.com'])assert.ok(completeRoute.includes(identity),identity);assert.ok(completeRoute.indexOf('Avery Brooks')<completeRoute.indexOf('Test person'));assert.ok(completeRoute.indexOf('Test person')<completeRoute.indexOf('Riley Parker'),'PO modifications preserve VP, CFO, COO order');
console.log('Approval admin v2: real approver identities and routes, company/date-free saves and previews, floating-picker controls, and legacy native readiness gates passed.');

