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
assert.equal(result.selfApproval,'Allow');assert.equal('duplicatePerson' in result,false);assert.equal('policyVersion' in result,false);
for(const changed of [{budgetId:'another-budget'},{budgetId:Number(test.budgetId)},{budgetId:undefined},{amount:'55.01'},{hasBudgetModification:true},{hasBudgetOverrun:true},{hasBudgetModification:undefined},{hasBudgetOverrun:undefined}])assert.throws(()=>api.resolve(config,{...context,...changed}),/scope|ID|currency/);
let next=clone(config);next.policies[0].steps[0].poTestCFO.maxAmount='0.01';assert.equal(api.resolve(next,{...context,amount:'0.01'}).route.length,1);assert.throws(()=>api.resolve(next,{...context,amount:'0.02'}),/scope/);
for(const changed of [{maxAmount:'55.01'},{maxAmount:'0.00'},{maxAmount:'55.001'},{maxAmount:55},{allowSelfApproval:false},{email:'invalid'},{userAccessId:Number(test.userAccessId)},{budgetId:Number(test.budgetId)}]){next=clone(config);Object.assign(next.policies[0].steps[0].poTestCFO,changed);assert.throws(()=>api.resolve(next,context));}
for(const email of ['one@example.com,two@example.com','one@example.com;two@example.com','Person <one@example.com>','"one"@example.com','one@@example.com',['one@example.com'],'one@example.com\n']){next=clone(config);next.policies[0].steps[0].poTestCFO.email=email;assert.throws(()=>api.resolve(next,context),/one email/);}
for(const workflow of ['Budget','Budget Modification','Pro Forma','Contract']){next=clone(config);next.policies[0].workflow=workflow;assert.throws(()=>api.resolve(next,{...context,workflow}),/Test CFO/);}
for(const changed of [{enabled:false},{condition:'Above',threshold:'1.00'}]){next=clone(config);Object.assign(next.policies[0].steps[0],changed);assert.throws(()=>api.resolve(next,context),/Test CFO/);}
next=clone(config);next.policies[0].steps.push({key:'disabled',order:2,roleId:'1',condition:'Always',enabled:false});assert.throws(()=>api.resolve(next,context),/one enabled Always/);
next=clone(config);next.roles[0].name='COO';assert.throws(()=>api.resolve(next,context),/CFO/);
next=clone(config);next.roles[0].active=false;assert.throws(()=>api.resolve(next,context),/inactive role/);
for(const users of [[],[{...config.users[0],user:''}],[{...config.users[0],user:null}],[config.users[0],config.users[0]]]){next=clone(config);next.users=users;assert.throws(()=>api.resolve(next,context),/unroutable/);}
next=clone(config);next.policies[0].selfApproval='Allow';assert.equal(api.resolve(next,context).selfApproval,'Allow');
next=clone(config);delete next.policies[0].steps[0].poTestCFO;
const normal=api.resolve(next,context);assert.equal(normal.route[0].userAccessId,'12');assert.equal('poTestCFO' in normal.route[0],false);assert.equal(api.resolve(next,{...context,submitterId:'12'}).route[0].userAccessId,'12');
next.assignments[0].userAccessId=test.userAccessId;assert.throws(()=>api.resolve(next,context),/unroutable/,'General routing remains disabled outside the test');
next=clone(config);next.policies[0].steps[0].poTestCFO.email='later@example.com';assert.equal(result.route[0].poTestCFO.email,'test@example.com','Captured test scope is detached');

// Historical routes retain their captured safeguards; new configuration has no
// budget test controls, marker, amount cap or self-approval exception.
assert.throws(()=>api.assertPublish(config.policies[0],[]),/no longer supported/);
assert.equal(admin.split('return {open:open,mount:mount,navigate:navigate,canLeave:canLeave,state:state};').length,2);
vm.runInContext(admin.replace('return {open:open,mount:mount,navigate:navigate,canLeave:canLeave,state:state};',`return {open:open,editor:editor,policyData:policyData,preview:preview,
 fixture:function(value){config=value.config;editing=value.editing;draft=value.draft;card=value.card||null;panel=value.panel||null;policyReady=value.policyReady!==false;scope='frontend-fixture';busy=false;actorId='12';},
 state:function(){return {draft:draft,config:config};}};`),c);
let sent;const nodes={};const uiCard={querySelector:selector=>nodes[selector]||(nodes[selector]={disabled:false,innerHTML:'',textContent:''})};
const uiOptions={scope:()=> 'frontend-fixture',call:async request=>{sent=clone(request);return {contract:'approval-policy-v1',success:true,snapshot:clone(api.resolve(globalConfig,request.context))};}};
const ui=c.LMApprovalAdmin.create(uiOptions);
const savedConfig=clone(config),policyDraft=ui.policyData(clone(config.policies[0]));ui.fixture({config:savedConfig,editing:'Policies',draft:policyDraft});
assert.equal(policyDraft.steps[0].poTestCFO,undefined);assert.equal('companyId' in policyDraft,false);assert.deepEqual(clone(savedConfig.policies[0].steps[0].poTestCFO),test,'Reading config never alters saved history');
let html=ui.editor();assert.match(html,/CFO/);assert.match(html,/Without budget modifications/);assert.match(html,/With attached budget modifications/);assert.doesNotMatch(html,/Test CFO|Budget ID|Test settings|Maximum test amount|data-ap-test|Company/);
const previewDraft={...clone(context)};delete previewDraft.budgetId;ui.fixture({config:savedConfig,editing:'Preview',draft:previewDraft});assert.doesNotMatch(ui.editor(),/Test budget|Budget ID|Company|Effective date/);
const globalConfig=clone(config);globalConfig.policies[0]=ui.policyData(globalConfig.policies[0]);for(const row of globalConfig.assignments){delete row.companyId;delete row.effectiveFrom;delete row.effectiveTo;}
for(const companyId of ['31','99'])for(const amount of ['0.01','55.01','1000000.00']){
  const routed=api.resolve(globalConfig,{...previewDraft,companyId,territory:'Any territory',amount});assert.equal(routed.route.length,1);assert.equal(routed.route[0].userAccessId,'12');assert.equal(routed.route[0].reason,'Required step');assert.equal(routed.route[0].poTestCFO,undefined);
}
assert.equal(api.resolve(globalConfig,{...previewDraft,submitterId:'12'}).route[0].userAccessId,'12');
ui.fixture({config:globalConfig,editing:'Preview',draft:previewDraft,panel:{},card:uiCard});await ui.preview();assert.equal(sent.context.budgetId,undefined);assert.equal('companyId' in sent.context,false);assert.equal('effectiveDate' in sent.context,false);assert.match(nodes['[data-ap-route]'].innerHTML,/Normal CFO/);
console.log('Perpetual CFO configuration: no test/company/date controls or new overrides, ordinary assignments across amounts, preserved historical routes and manual PO submitter approval.');
