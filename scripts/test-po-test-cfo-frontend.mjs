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

function block(name,nextName){let start=admin.indexOf('function '+name+'(');if(admin.slice(start-6,start)==='async ')start-=6;let end=admin.indexOf('function '+nextName+'(',start);if(admin.slice(end-6,end)==='async ')end-=6;assert.ok(start>=0&&end>start,name);return admin.slice(start,end);}
for(const [name,nextName] of [['esc','copy'],['copy','stable'],['stable','equal'],['equal','verify'],['picker','choices'],['choices','field'],['field','check'],['check','companies'],['companies','territories'],['territories','departments'],['departments','roleRows'],['roleRows','userRows'],['userRows','testCFOFields'],['testCFOFields','scopeFields'],['scopeFields','render'],['policyData','ensureCFO'],['ensureCFO','poSteps'],['poSteps','editor'],['editor','load'],['input','click'],['click','close'],['preview','input']])vm.runInContext(block(name,nextName),c);
c.config=clone(config);c.editing='Policies';c.draft=clone(config.policies[0]);delete c.draft.steps[0].poTestCFO;c.pending=null;c.busy=false;c.same=()=>true;let renders=0;c.render=()=>{renders++;};c.panel={};const scopeBadge={textContent:''};c.card={querySelector:selector=>selector==='[data-ap-test-scope="0"]'?scopeBadge:null};
function element(dataset,attrs=[],extra={}){return {dataset,...extra,hasAttribute:name=>attrs.includes(name),closest(){return this;}};}
c.input({target:element({index:'0'},['data-ap-test-toggle'],{checked:true,type:'checkbox'})});
assert.deepEqual(clone(c.draft.steps[0].poTestCFO),{budgetId:'',userAccessId:'',email:'',allowSelfApproval:true,maxAmount:'55.00'});assert.equal(c.draft.steps[0].roleId,'1');assert.equal(c.draft.steps[0].enabled,true);assert.equal(c.draft.steps[0].condition,'Always');
let html=c.editor();for(const label of ['Test CFO','Person (User Access)','Budget ID','Test email','Maximum test amount'])assert.ok(html.includes(label));assert.match(html,/Routing disabled/,'Test picker includes existing users with general routing disabled');assert.match(html,/data-ap-test-toggle/);assert.match(html,/no modifications or overruns/);
c.click({target:element({apPick:'userAccessId',index:'0',value:test.userAccessId},['data-ap-test'])});
const rendersBeforeInput=renders;
c.input({target:element({apField:'budgetId',index:'0'},['data-ap-test'],{value:test.budgetId,type:'text'})});
assert.match(scopeBadge.textContent,new RegExp(test.budgetId));assert.equal(renders,rendersBeforeInput,'Typing a scope field patches its label without rebuilding focused controls');
c.input({target:element({apField:'maxAmount',index:'0'},['data-ap-test'],{value:'12.50',type:'text'})});assert.match(scopeBadge.textContent,/up to \$12\.50/);assert.equal(renders,rendersBeforeInput);
c.input({target:element({apField:'email',index:'0'},['data-ap-test'],{value:test.email,type:'text'})});
assert.equal(c.draft.steps[0].poTestCFO.userAccessId,test.userAccessId);assert.equal(c.draft.steps[0].poTestCFO.budgetId,test.budgetId);assert.equal(c.draft.budgetId,undefined,'Test fields cannot spill onto the policy');
c.input({target:element({index:'0'},['data-ap-test-toggle'],{checked:false,type:'checkbox'})});assert.equal('poTestCFO' in c.draft.steps[0],false);
c.draft.steps[0].poTestCFO=clone(test);c.click({target:element({apPick:'workflow',index:'',value:'Budget'})});assert.equal('poTestCFO' in c.draft.steps[0],false);assert.doesNotMatch(c.editor(),/data-ap-test-toggle/);
c.draft=clone(context);c.editing='Preview';assert.match(c.editor(),/[Bb]udget ID/);c.draft.workflow='Contract';assert.doesNotMatch(c.editor(),/[Bb]udget ID/);

// The real Preview handler sends exact budget scope and compares the full test route.
c.draft=clone(context);c.config=clone(config);const nodes={};c.card={querySelector:selector=>nodes[selector]||(nodes[selector]={disabled:false,innerHTML:''})};let sent;
c.policyReady=true;c.today='2026-10-11';c.options={call:async request=>{sent=clone(request);return {contract:'approval-policy-v1',success:true,snapshot:api.resolve(c.config,request.context)};}};c.msg=message=>{throw new Error(message);};
await c.preview();assert.equal(sent.context.budgetId,test.budgetId);assert.equal(typeof sent.context.budgetId,'string');assert.match(nodes['[data-ap-route]'].innerHTML,/PO test CFO/);
c.policyReady=true;c.today='2026-10-11';c.options.call=async request=>{const snapshot=clone(api.resolve(c.config,request.context));delete snapshot.route[0].poTestCFO;return {contract:'approval-policy-v1',success:true,snapshot};};
await assert.rejects(()=>c.preview(),/Server route differs/,'Preview rejects a backend that omits the captured test scope');
console.log('Scoped PO Test CFO frontend: exact budget/amount guards, self-approval exception, normal denial, nested settings controls and Preview parity passed.');
