import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import './test-po-test-cfo-backend.mjs';
import './test-approval-scope-migration.mjs';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('widgets/settings-manager/src/app/approval-policy-domain.js','utf8'),ctx);
const api=ctx.LMApprovalPolicy,clone=v=>JSON.parse(JSON.stringify(v));
const config={roles:[{id:'1',name:'CFO',active:true},{id:'2',name:'COO',active:true},{id:'3',name:'VP',active:true}],users:[{id:'11',name:'First',user:'first',approverEmail:'first@example.com',routingEnabled:true},{id:'12',name:'Second',user:'second',approverEmail:'second@example.com',routingEnabled:true},{id:'13',name:'Third',user:'third',approverEmail:'third@example.com',routingEnabled:true}],assignments:[{id:'21',roleId:'1',companyId:'31',userAccessId:'11',active:true},{id:'22',roleId:'2',companyId:'31',userAccessId:'12',active:true},{id:'23',roleId:'3',companyId:'31',userAccessId:'13',active:true}],territories:[{id:'North',vpUserAccessIds:['13']}],policies:[{id:'41',companyId:'31',workflow:'Budget',status:'Published',enabled:true,selfApproval:'Deny',steps:[{key:'cfo',order:1,roleId:'1',condition:'Always',enabled:true},{key:'coo',order:2,roleId:'2',condition:'Above',threshold:'100.00',enabled:true}]}]};
const context={workflow:'Budget',submitterId:'19',territory:'North',department:'Development',amount:'100.00',recordId:'51'};
assert.equal(api.resolve(config,context).route.length,1);assert.equal(api.resolve(config,{...context,amount:'100.01'}).route.length,2);
let c=clone(config);c.policies[0].steps[1].condition='At or above';assert.equal(api.resolve(c,context).route.length,2);c.policies[0].steps[1].enabled=false;assert.equal(api.resolve(c,{...context,amount:'99999.99'}).route.length,1);
c=clone(config);c.assignments.push({...c.assignments[0],id:'24',territory:'North',userAccessId:'12'});assert.equal(api.resolve(c,context).route[0].userAccessId,'12');c.assignments.at(-1).active=false;assert.throws(()=>api.resolve(c,context),/inactive/);
c=clone(config);c.assignments.push({...c.assignments[0],id:'24'});assert.throws(()=>api.resolve(c,context),/Ambiguous/);c=clone(config);c.assignments=[];assert.throws(()=>api.resolve(c,context),/Missing assignment/);
for(const user of [{routingEnabled:false},{approverEmail:'invalid'}]){c=clone(config);Object.assign(c.users[0],user);assert.throws(()=>api.resolve(c,context),/inactive|unroutable/);}
assert.equal(api.resolve(config,{...context,submitterId:'11'}).route[0].userAccessId,'11');assert.equal(api.resolve(config,{...context,submitterId:'11'}).selfApproval,'Allow');assert.throws(()=>api.resolve(config,{...context,amount:100}),/currency/);assert.throws(()=>api.resolve(config,{...context,submitterId:19}),/ID string/);
c=clone(config);Object.assign(c.assignments[0],{companyId:'999',effectiveFrom:'2099-01-01',effectiveTo:'1900-01-01'});assert.equal(api.resolve(c,{...context,companyId:31,effectiveDate:'invalid'}).route[0].userAccessId,'11','Assignments are permanent and Company/date context has no routing semantics.');
c=clone(config);Object.assign(c.policies[0],{version:0,effectiveFrom:'2030-01-01',effectiveTo:'2020-01-01',duplicatePerson:'ignored'});const snapshot=api.resolve(c,context);assert.equal(snapshot.route.length,1);assert.equal('policyVersion' in snapshot,false);assert.equal('duplicatePerson' in snapshot,false);c.users[0].approverEmail='later@example.com';assert.equal(snapshot.route[0].email,'first@example.com');
c=clone(config);c.policies.push({...c.policies[0],id:'42'});assert.throws(()=>api.resolve(c,context),/Ambiguous/);assert.throws(()=>api.assertPublish({...c.policies[0],id:'43'},c.policies),/already exists/);
for(const workflow of ['Pro Forma','Contract']){c=clone(config);c.policies[0].workflow=workflow;assert.throws(()=>api.resolve(c,{...context,workflow}),/straight approval chains/);c.policies[0].steps.forEach(s=>s.condition='Always');const input={...context,workflow};delete input.amount;assert.equal(api.resolve(c,input).route.length,2);}

// Every PO uses VP → CFO. COO depends on the signed net modification total.
c=clone(config);c.policies[0].workflow='Purchase Order';c.policies[0].steps=[{key:'vp',order:1,roleId:'3',condition:'Always',enabled:true},{key:'cfo',order:2,roleId:'1',condition:'Always',enabled:true},{key:'coo',order:3,roleId:'2',condition:'At or above',threshold:'10000.00',enabled:true}];
const po={...context,workflow:'Purchase Order',netBudgetChange:'0.00',hasBudgetModification:false,hasBudgetOverrun:false};
for(const amount of ['0.01','100.00','999999.00'])for(const netBudgetChange of ['-50000.00','0.00','9999.00','9999.99','10000.00','10000.01','49995.00'])assert.deepEqual(clone(api.resolve(c,{...po,amount,netBudgetChange}).route.map(row=>row.role)),Number(netBudgetChange)>=10000?['VP','CFO','COO']:['VP','CFO']);
for(const netBudgetChange of [undefined,null,10000,'10000.001','NaN','--100.00'])assert.throws(()=>api.resolve(c,{...po,netBudgetChange}),/signed currency/);
assert.deepEqual(clone(api.resolve(c,{...po,hasBudgetModification:true,hasBudgetOverrun:true}).route.map(row=>row.role)),['VP','CFO']);
const wrongCFO=clone(c);wrongCFO.roles[0].name='Legal';assert.throws(()=>api.resolve(wrongCFO,po),/VP → CFO/);assert.equal(api.resolve(c,{...po,submitterId:'11'}).route[1].userAccessId,'11');
const missingVP=clone(c);missingVP.territories[0].vpUserAccessIds=[];assert.throws(()=>api.resolve(missingVP,po),/exactly one VP/);
c.policies[0].companyId='';c.assignments.forEach(a=>a.companyId='');assert.equal(api.resolve(c,{...po,companyId:'32'}).route[1].userAccessId,'11');c.policies.push({...clone(c.policies[0]),id:'42',territory:'North'});assert.equal(api.resolve(c,po).policyId,'42');
const collision=clone(c);collision.policies.push({...collision.policies[1],id:'43',companyId:'99'});assert.throws(()=>api.resolve(collision,po),/Ambiguous/);
const assignmentCollision=clone(config);assignmentCollision.assignments.push({...assignmentCollision.assignments[0],id:'24',companyId:'99',effectiveFrom:'2099-01-01'});assert.throws(()=>api.resolve(assignmentCollision,context),/Ambiguous/,'Company/date-only assignment duplicates cannot silently choose a recipient.');
const scoped=clone(config);scoped.policies.push({...clone(scoped.policies[0]),id:'42',department:'Development'});scoped.policies.push({...clone(scoped.policies[0]),id:'43',territory:'North'});scoped.policies.push({...clone(scoped.policies[0]),id:'44',territory:'North',department:'Development'});assert.equal(api.resolve(scoped,context).policyId,'44');assert.equal(api.resolve(scoped,{...context,department:'Engineering'}).policyId,'43');assert.equal(api.resolve(scoped,{...context,territory:'South'}).policyId,'42');assert.equal(api.resolve(scoped,{...context,territory:'South',department:'Engineering'}).policyId,'41');
const native=fs.readFileSync('creator/functions/managePurchaseOrder.dg','utf8');assert.match(native,/netBudgetChangeCents = netBudgetChangeCents \+ planCents/);assert.match(native,/Every PO requires VP → CFO approval/);
const ordered=clone(c);ordered.policies=ordered.policies.slice(0,1);
assert.deepEqual(clone(api.resolve(ordered,po).route.map(row=>row.role)),['VP','CFO']);assert.equal(api.resolve(ordered,po).route[0].policyStepOrder,1);
for(const mutate of [p=>p.steps.splice(1,1),p=>p.steps[2].roleId='1',p=>p.steps[0].enabled=false,p=>p.steps[2].threshold='9999.00',p=>p.steps.reverse()]){const invalid=clone(ordered);mutate(invalid.policies[0]);invalid.policies[0].steps.forEach((step,index)=>step.order=index+1);assert.throws(()=>api.resolve(invalid,po),/VP → CFO/);}
const previewSource=native.slice(native.indexOf('if(action == "PreviewApprovals")'),native.indexOf('if(action != "Save"'));
assert.match(previewSource,/canCreatePO != true \|\| budget.Archived == true/);assert.match(native,/canCreatePO = canEdit \|\| access.Create_Purchase_Orders == true/);assert.match(previewSource,/budget.Subdivision1/);assert.match(previewSource,/resolveApprovalRoute/);assert.doesNotMatch(previewSource,/insert into|sendmail|snapshotApprovalRoute|delete from/);
console.log('Perpetual territory policy routing: no Company or date semantics; Territory+Department > Territory > Department > All; collisions fail closed, mandatory VP/CFO and the inclusive net-change COO threshold, exact identities and immutable submitted routes passed.');

const dm=clone(config);dm.roles.push({id:'4',name:'Dev Mgr',active:true});dm.users.push({id:'101',name:'Dev One',user:'dev-one',approverEmail:'dev1@example.com',routingEnabled:true},{id:'102',name:'Dev Two',user:'dev-two',approverEmail:'dev2@example.com',routingEnabled:true});dm.territories[0].devMgrUserAccessIds=['101','102','101'];dm.policies[0].workflow='Budget';dm.policies[0].steps=[{key:'dev-mgr',order:1,roleId:'4',condition:'Always',enabled:true},{key:'cfo',order:2,roleId:'1',condition:'Always',enabled:true}];
const dmContext={workflow:'Budget',territory:'North',department:'',submitterId:'99',amount:'1.00',hasBudgetModification:true};let dmRoute=clone(api.resolve(dm,dmContext).route);assert.deepEqual(dmRoute.map(row=>row.userAccessId),['101','102','11']);assert.deepEqual(dmRoute.map(row=>row.order),[1,2,3]);assert.deepEqual(dmRoute.map(row=>row.policyStepOrder),[1,1,2]);assert.equal(new Set(dmRoute.map(row=>row.key)).size,3);assert.deepEqual(clone(api.resolve(dm,{...dmContext,hasBudgetModification:false}).route).map(row=>row.role),['Dev Mgr','Dev Mgr','CFO']);const dmMissing=clone(dm);dmMissing.territories[0].devMgrUserAccessIds=[];assert.throws(()=>api.resolve(dmMissing,dmContext),/at least one Dev Mgr/);assert.deepEqual(clone(api.resolve(dm,{...dmContext,submitterId:'101'}).route).map(row=>row.userAccessId),['101','102','11']);const dmInactive=clone(dm);dmInactive.users.find(u=>u.id==='102').routingEnabled=false;assert.throws(()=>api.resolve(dmInactive,dmContext),/unroutable/);
console.log('Approval preview Territory Dev Mgr mirrors native multi-recipient expansion and keeps every selected approval before the following role.');

// VP and every Dev Mgr come from the document's Territory in every workflow.
// Legacy/scoped assignments for those roles cannot change that source.
for(const workflow of ['Pro Forma','Budget','Budget Modification','Contract']){
 const all=clone(dm);all.territories=[{id:'Waco',vpUserAccessIds:['13'],devMgrUserAccessIds:['101','102']}];
 all.assignments.push({id:'25',roleId:'3',territory:'Waco',userAccessId:'12',active:true},{id:'26',roleId:'4',territory:'Waco',userAccessId:'12',active:true});
 const conditional=workflow==='Purchase Order'?'Budget modification attached':'Always';
 all.policies[0].workflow=workflow;all.policies[0].steps=[{key:'vp',order:1,roleId:'3',condition:conditional,enabled:true},{key:'dev-mgr',order:2,roleId:'4',condition:conditional,enabled:true},{key:'cfo',order:3,roleId:'1',condition:'Always',enabled:true}];
 const input={...dmContext,workflow,territory:'Waco',recordId:'51'};
 const captured=clone(api.resolve(all,input));
 assert.deepEqual(captured.route.map(row=>row.userAccessId),['13','101','102','11'],workflow);
 assert.deepEqual(captured.route.map(row=>row.order),[1,2,3,4],workflow);
 assert.deepEqual(captured.route.map(row=>row.policyStepOrder),[1,2,2,3],workflow);
 assert.deepEqual(captured.route.slice(0,3).map(row=>row.assignmentId),['','',''],workflow);
 const noVP=clone(all);noVP.territories[0].vpUserAccessIds=[];assert.throws(()=>api.resolve(noVP,input),workflow==='Contract'?/at least one VP/:/exactly one VP/,workflow);
 const bothVPs=clone(all);bothVPs.territories[0].vpUserAccessIds=['13','12','13'];
 if(workflow==='Contract'){
  const both=clone(api.resolve(bothVPs,input).route);assert.deepEqual(both.map(row=>row.userAccessId),['13','12','101','102','11']);assert.deepEqual(both.map(row=>row.policyStepOrder),[1,1,2,2,3]);assert.equal(new Set(both.map(row=>row.key)).size,both.length);
  bothVPs.users.find(user=>user.id==='12').routingEnabled=false;assert.throws(()=>api.resolve(bothVPs,input),/unroutable/,'one inactive Contract VP blocks the whole route');
 }else assert.throws(()=>api.resolve(bothVPs,input),/exactly one VP/,'non-Contract workflows retain one VP');
 const noManagers=clone(all);noManagers.territories[0].devMgrUserAccessIds=[];assert.throws(()=>api.resolve(noManagers,input),/at least one Dev Mgr/,workflow);
 assert.throws(()=>api.resolve(all,{...input,territory:'Unassigned'}),/one Territory record/,workflow);
 all.territories[0].vpUserAccessIds=['12'];all.territories[0].devMgrUserAccessIds=['101'];
 assert.deepEqual(captured.route.map(row=>row.userAccessId),['13','101','102','11'],'captured recipients survive Territory edits');
 assert.deepEqual(clone(api.resolve(all,input)).route.map(row=>row.userAccessId),['12','101','11'],'future submissions use current Territory recipients');
}
console.log('All workflow previews use Territory VP and all Territory Dev Mgrs, with no legacy assignment fallback.');

const ownThird=api.resolve(dm,{...dmContext,submitterId:'11'});assert.equal(ownThird.route[2].order,3);assert.equal(ownThird.route[2].userAccessId,'11');assert.equal(ownThird.route.length,3);
