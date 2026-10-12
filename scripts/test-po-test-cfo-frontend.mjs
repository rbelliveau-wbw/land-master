import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const domain=fs.readFileSync('widgets/settings-manager/src/app/approval-policy-domain.js','utf8');
const admin=fs.readFileSync('widgets/settings-manager/src/app/approval-admin.js','utf8');
const c=vm.createContext({Promise,Date,JSON,Error,Set,Number});c.root=c;vm.runInContext(domain,c);
const api=c.LMApprovalPolicy,clone=value=>JSON.parse(JSON.stringify(value));
const test={budgetId:'900000000000000001',userAccessId:'900000000000000002',email:'test@example.com',allowSelfApproval:true,maxAmount:'55.00'};
const config={roles:[{id:'1',name:'CFO',active:true}],users:[{id:test.userAccessId,name:'Test Person',user:'existing-login',approverEmail:'',routingEnabled:false},{id:'12',name:'Normal CFO',user:'normal-login',approverEmail:'normal@example.com',routingEnabled:true}],assignments:[{id:'21',roleId:'1',companyId:'31',userAccessId:'12',active:true}],companies:[],territories:[],policies:[{id:'41',companyId:'31',workflow:'Purchase Order',version:1,status:'Published',enabled:true,selfApproval:'Deny',duplicatePerson:'Reject',steps:[{key:'cfo',order:1,roleId:'1',condition:'Always',enabled:true,poTestCFO:test}]}]};
const context={workflow:'Purchase Order',companyId:'31',submitterId:test.userAccessId,budgetId:test.budgetId,amount:'55.00',effectiveDate:'2026-10-11',hasBudgetModification:false,hasBudgetOverrun:false};
const result=api.resolve(config,context);
assert.equal(result.route.length,1);assert.equal(result.route[0].userAccessId,test.userAccessId);assert.equal(result.route[0].email,test.email);assert.equal(result.route[0].reason,'PO test CFO');assert.equal(result.route[0].assignmentId,'');assert.deepEqual(clone(result.route[0].poTestCFO),test);
assert.equal(result.selfApproval,'Deny');assert.equal('duplicatePerson' in result,false);assert.equal('policyVersion' in result,false);
for(const changed of [{budgetId:'another-budget'},{budgetId:Number(test.budgetId)},{budgetId:undefined},{amount:'55.01'},{hasBudgetModification:true},{hasBudgetOverrun:true},{hasBudgetModification:undefined},{hasBudgetOverrun:undefined}])assert.throws(()=>api.resolve(config,{...context,...changed}),/scope|ID|currency/);
let next=clone(config);next.policies[0].steps[0].poTestCFO.maxAmount='0.01';assert.equal(api.resolve(next,{...context,amount:'0.01'}).route.length,1);assert.throws(()=>api.resolve(next,{...context,amount:'0.02'}),/scope/);
for(const changed of [{maxAmount:'55.01'},{maxAmount:'0.00'},{maxAmount:'55.001'},{maxAmount:55},{allowSelfApproval:false},{email:'invalid'},{userAccessId:Number(test.userAccessId)},{budgetId:Number(test.budgetId)}]){next=clone(config);Object.assign(next.policies[0].steps[0].poTestCFO,changed);assert.throws(()=>api.resolve(next,context));}
for(const email of ['one@example.com,two@example.com','one@example.com;two@example.com','Person <one@example.com>','"one"@example.com','one@@example.com',['one@example.com'],'one@example.com\n']){next=clone(config);next.policies[0].steps[0].poTestCFO.email=email;assert.throws(()=>api.resolve(next,context),/one email/);}
for(const workflow of ['Budget','Budget Modification','Pro Forma','Contract']){next=clone(config);next.policies[0].workflow=workflow;assert.throws(()=>api.resolve(next,{...context,workflow}),/Test CFO/);}
for(const changed of [{enabled:false},{condition:'Above',threshold:'1.00'}]){next=clone(config);Object.assign(next.policies[0].steps[0],changed);assert.throws(()=>api.resolve(next,context),/Test CFO/);}
next=clone(config);next.policies[0].steps.push({key:'disabled',order:2,roleId:'1',condition:'Always',enabled:false});assert.throws(()=>api.resolve(next,context),/one enabled Always/);
next=clone(config);next.roles[0].name='COO';assert.throws(()=>api.resolve(next,context),/CFO role|CFO first/);
next=clone(config);next.roles[0].active=false;assert.throws(()=>api.resolve(next,context),/inactive role/);
for(const users of [[],[{...config.users[0],user:''}],[{...config.users[0],user:null}],[config.users[0],config.users[0]]]){next=clone(config);next.users=users;assert.throws(()=>api.resolve(next,context),/unroutable/);}
next=clone(config);next.policies[0].selfApproval='Allow';assert.throws(()=>api.resolve(next,context),/forbid submitter/);
next=clone(config);delete next.policies[0].steps[0].poTestCFO;
const normal=api.resolve(next,context);assert.equal(normal.route[0].userAccessId,'12');assert.equal('poTestCFO' in normal.route[0],false);assert.throws(()=>api.resolve(next,{...context,submitterId:'12'}),/self-approval/);
next.assignments[0].userAccessId=test.userAccessId;assert.throws(()=>api.resolve(next,context),/unroutable/,'General routing remains disabled outside the test');
next=clone(config);next.policies[0].steps[0].poTestCFO.email='later@example.com';assert.equal(result.route[0].poTestCFO.email,'test@example.com','Captured test scope is detached');

// Historical routes retain their captured safeguards; new configuration has no
// budget test controls, marker, amount cap or self-approval exception.
assert.throws(()=>api.assertPublish(config.policies[0],[]),/no longer supported/);
function block(name,nextName){let start=admin.indexOf('function '+name+'(');if(admin.slice(start-6,start)==='async ')start-=6;let end=admin.indexOf('function '+nextName+'(',start);if(admin.slice(end-6,end)==='async ')end-=6;assert.ok(start>=0&&end>start,name);return admin.slice(start,end);}
for(const [name,nextName] of [['esc','copy'],['copy','stable'],['stable','equal'],['equal','verify'],['picker','choices'],['choices','field'],['field','check'],['check','companies'],['companies','territories'],['territories','departments'],['departments','roleRows'],['roleRows','userRows'],['userRows','scopeFields'],['scopeFields','render'],['policyData','ensureCFO'],['ensureCFO','poSteps'],['poSteps','editor'],['editor','load'],['preview','input']])vm.runInContext(block(name,nextName),c);
c.config=clone(config);c.editing='Policies';c.draft=c.policyData(clone(config.policies[0]));
assert.equal(c.draft.steps[0].poTestCFO,undefined);assert.deepEqual(clone(c.config.policies[0].steps[0].poTestCFO),test,'Reading config never alters saved history');
let html=c.editor();assert.match(html,/CFO · Always/);assert.doesNotMatch(html,/Test CFO|Budget ID|Test settings|Maximum test amount|data-ap-test/);
c.editing='Preview';c.draft={...clone(context)};delete c.draft.budgetId;assert.doesNotMatch(c.editor(),/Test budget|Budget ID/);
const globalConfig=clone(config);globalConfig.policies[0]=c.policyData(globalConfig.policies[0]);globalConfig.policies[0].companyId='';globalConfig.assignments[0].companyId='';
for(const companyId of ['31','99'])for(const amount of ['0.01','55.01','1000000.00']){
  const routed=api.resolve(globalConfig,{...c.draft,companyId,territory:'Any territory',amount});assert.equal(routed.route.length,1);assert.equal(routed.route[0].userAccessId,'12');assert.equal(routed.route[0].reason,'Required step');assert.equal(routed.route[0].poTestCFO,undefined);
}
assert.throws(()=>api.resolve(globalConfig,{...c.draft,submitterId:'12'}),/self-approval/);
c.config=globalConfig;c.busy=false;c.same=()=>true;c.panel={};c.policyReady=true;c.today='2026-10-12';const nodes={};c.card={querySelector:selector=>nodes[selector]||(nodes[selector]={disabled:false,innerHTML:''})};let sent;
c.options={call:async request=>{sent=clone(request);return {contract:'approval-policy-v1',success:true,snapshot:clone(api.resolve(globalConfig,request.context))};}};c.msg=message=>{throw new Error(message);};
await c.preview();assert.equal(sent.context.budgetId,undefined);assert.match(nodes['[data-ap-route]'].innerHTML,/Normal CFO/);
console.log('All-budget CFO configuration: no test-budget controls or new overrides, ordinary assignments across companies and amounts, preserved historical routes and standard self-approval denial.');
