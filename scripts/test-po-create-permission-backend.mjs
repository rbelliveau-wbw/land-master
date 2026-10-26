// These tests execute actual Deluge functions against the established native-
// shaped PO fixture adapter. Native Creator Save and signed-in testing are still required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {poTestRuntime,compileDelugePO} from './test-po-test-cfo-backend.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const creationKey='created-by-const-operation-0001';
const actor={ID:19,User:'const',Full_Name:'Demo Construction',Create_Purchase_Orders:true,Edit_All_Budgets:false,Edit_Owned_Budgets:false};
const cfo={ID:12,User:'normal-cfo',Full_Name:'CFO',Approver_Email:'normal@example.com',Approval_Routing_Enabled:true};
const coo={ID:13,User:'normal-coo',Full_Name:'COO',Approver_Email:'coo@example.com',Approval_Routing_Enabled:true};
const policy={ID:41,Company:31,Workflow:'Purchase Order',Version:1,Status:'Published',Enabled:true,Self_Approval:'Allow',Duplicate_Person:'Reject',Steps_JSON:JSON.stringify([{key:'cfo',order:1,roleId:'1',condition:'Always',enabled:true},{key:'coo',order:2,roleId:'2',condition:'Budget modification attached',enabled:true}]),Territory_Key:'',Department_Key:'',Effective_From:null,Effective_To:null,Adapter_Enabled:true};
const base={action:'Save',budgetId:'61',userAccessId:'19',vendorId:'91',budgetModificationId:null,amount:'55.00',description:'Create-only Const PO',requestDate:'2026-10-26',dateNeeded:'2026-10-27',token:creationKey,preserveApproval:false,expectedBalances:{'71':'10000'},expectedPendingModifications:{'71':'0'},lines:[{key:'one',budgetItemId:'71',description:'New work',uom:'EA',costElement:'5',costCode:'C_CB01-4130-5',pricingMode:'Manual',quantity:null,unitPrice:null,finalAmount:'55.00'}]};

function fixture({user=actor,users,login=user.User,environment='Production',budget={},tables={},available='10000',afterLock}={}){
  const r=poTestRuntime({login,environment,users:users||[clone(user),clone(cfo),clone(coo)],policyRow:policy,extraTables:{Add_Budget:[{ID:61,Archived:false,Budget_Owner:[],Const_Budget_Approval_Status:'Approved',Subdivision1:{Subdivision_Code:'CB01',Territory:'North'},...budget}],Vendors:[{ID:91,Vendor_Name:'Existing vendor'}],Budget_Item:[{ID:71,Budget:61,Budget_Category:81,Template_Item:false,Cost_Code:4130}],Budget_Category:[{ID:81,Budget:61,Deparment:'Construction'}],Approval_Role:[{ID:1,Role_Name:'CFO',Active:true},{ID:2,Role_Name:'COO',Active:true}],Approval_Role_Assignment:[{ID:21,Role:1,Company:31,Person:12,Active:true,Territory_Key:'',Department_Key:'',Effective_From:null,Effective_To:null},{ID:22,Role:2,Company:31,Person:13,Active:true,Territory_Key:'',Department_Key:'',Effective_From:null,Effective_To:null}],...clone(tables)}});
  // The adapter's ordinary choose() eagerly evaluates both branches; native
  // Deluge if() is lazy. A new unlinked Draft exercises this null-only branch.
  const manageProgram=compileDelugePO(fs.readFileSync('creator/functions/managePurchaseOrder.dg','utf8')).replace('choose(linkedModificationId == null,null,linkedModificationId.toString())','(linkedModificationId == null?null:linkedModificationId.toString())');
  vm.runInContext(manageProgram+';thisapp.managePurchaseOrder=managePurchaseOrder;',r.c);
  for(const name of ['poSnapshot','snapshotApprovalRoute']){
    let source=fs.readFileSync(`creator/functions/${name}.dg`,'utf8');
    if(name==='poSnapshot')source=source.replace(/\brow\b/g,'storedPOLine');
    vm.runInContext(compileDelugePO(source)+`;thisapp.${name}=${name};`,r.c);
  }
  r.c.available=available;
  vm.runInContext(`String.prototype.subString=String.prototype.substring;thisapp.poBudgetBalances=function(){return map({success:true,balances:[{budgetItemId:'71',availableCents:available,pendingModificationCents:'0'}]});};thisapp.sendPurchaseOrderEmail=function(){mails.push({kind:'approval'});return 'OK: sent';};`,r.c);
  if(afterLock){r.c.afterLock=afterLock;vm.runInContext(`var originalInsert=insertRecord;insertRecord=function(form,data){var id=originalInsert(form,data);if(form==='PO_Operation')afterLock(tables);return id;};`,r.c);}
  return r;
}
function call(r,p=base){r.c.permissionPayload=JSON.stringify(p);return JSON.parse(vm.runInContext('managePurchaseOrder(permissionPayload)',r.c));}
function mutationTables(r){return Object.fromEntries(['Add_Budget','Budget_Item','Budget_Category','Budget_Approvals','Budget_Modification','Vendors'].map(name=>[name,r.tables()[name]]));}
function ownDraft(options={}){const r=fixture(options),saved=call(r);assert.equal(saved.success,true,JSON.stringify(saved));return {r,saved};}
const follow=(saved,patch={})=>({...base,id:saved.snapshot.id,expectedRevision:saved.snapshot.revision,token:'follow-up-const-operation-0002',...patch});

// New permission creates a managed PO without granting any budget edit permission.
let r=fixture(),before=mutationTables(r),saved=call(r);
assert.equal(saved.success,true,JSON.stringify(saved));assert.equal(saved.snapshot.canEditDraft,true);assert.equal(saved.snapshot.canEditInFlight,false);
assert.deepEqual(mutationTables(r),before,'Draft creation cannot change budgets, items, vendors, approvals or modifications');
assert.equal(r.tables().Payment_Request.length,1);assert.equal(r.tables().PO_Item.length,1);assert.equal(r.tables().PO_Operation[0].Actor,19);assert.equal(r.tables().PO_Phase_Lock.length,0);
const read={action:'Get',budgetId:'61',userAccessId:'19',id:saved.snapshot.id};
assert.equal(call(r,read).snapshot.canEditDraft,true);assert.equal(call(r,{action:'List',budgetId:'61',userAccessId:'19'}).rows[0].canEditDraft,true);
let updated=call(r,follow(saved,{description:'Saved own draft'}));assert.equal(updated.success,true,JSON.stringify(updated));assert.equal(updated.snapshot.description,'Saved own draft');assert.equal(updated.snapshot.canEditDraft,true);
const submitted=call(r,follow(updated,{action:'Submit',token:'submit-own-const-operation-0003'}));assert.equal(submitted.success,true,JSON.stringify(submitted));assert.equal(submitted.snapshot.status,'Submitted');assert.equal(submitted.snapshot.approvalState,'Pending');assert.equal(submitted.snapshot.canEditDraft,false);assert.equal(submitted.snapshot.canEditInFlight,false);assert.equal(r.c.mails.length,1);assert.equal(r.tables().Budget_Modification.length,0);assert.equal(r.tables().Add_Budget[0].Const_Budget_Approval_Status,'Approved');
before=mutationTables(r);const writes=r.c.writes;assert.equal(call(r,follow(submitted,{preserveApproval:true,token:'denied-pending-operation-0004'})).success,false);assert.equal(r.c.writes,writes);assert.deepEqual(mutationTables(r),before);
for(const action of ['PreviewDelete','Delete','CheckDelete']){assert.equal(call(r,{...read,action,expectedRevision:submitted.snapshot.revision}).success,false);assert.equal(r.c.writes,writes);}

// All budget editors keep the same creation access, including owned-phase scope.
for(const [user,budget,allowed] of [[{...actor,Create_Purchase_Orders:false,Edit_All_Budgets:true},{},true],[{...actor,Create_Purchase_Orders:false,Edit_Owned_Budgets:true},{Budget_Owner:[{ID:19}]},true],[{...actor,Create_Purchase_Orders:false,Edit_Owned_Budgets:true},{Budget_Owner:[{ID:12}]},false],[{...actor,Create_Purchase_Orders:false},{},false],[{...actor,Create_Purchase_Orders:null},{},false],[{...actor,Create_Purchase_Orders:'true'},{},false],[actor,{Archived:true},false]]){
  r=fixture({user,budget});const response=call(r);assert.equal(response.success,allowed,JSON.stringify({user,budget,response}));if(!allowed)assert.equal(r.c.writes,0);
}

// Creation proof uses the initial immutable operation actor, not native Added_User.
for(const change of [t=>{t.Payment_Request[0].Added_User='const';t.PO_Operation[0].Actor=12;},t=>{t.Payment_Request[0].PO_Client_Key='unmanaged';},t=>{t.PO_Operation[0].Budget=62;},t=>{t.PO_Operation[0].Purchase_Order=999;},t=>{t.PO_Operation[0].Status='Started';},t=>{t.PO_Operation.push({...t.PO_Operation[0],ID:999});}]){
  ({r,saved}=ownDraft());change(r.c.tables);const count=r.c.writes;
  assert.equal(call(r,read).snapshot.canEditDraft,false);assert.equal(call(r,{action:'List',budgetId:'61',userAccessId:'19'}).rows[0].canEditDraft,false);
  for(const action of ['Save','Submit']){const response=call(r,follow(saved,{action}));assert.equal(response.success,false,JSON.stringify(response));assert.equal(r.c.writes,count,'Foreign or incomplete creation proof fails before the lock');}
}
({r,saved}=ownDraft({environment:'Development',login:'test-owner'}));assert.equal(r.tables().Payment_Request[0].Added_User,'test-owner');assert.equal(r.tables().PO_Operation[0].Actor,19);assert.equal(call(r,follow(saved)).success,true,'Development View-as owner writes retain the selected actor as PO creator');
for(const environment of ['Production','Stage']){r=fixture({environment,login:'test-owner'});assert.equal(call(r).success,false);assert.equal(r.c.writes,0,'Production/Stage owner cannot supply a different actor');}
for(const users of [[],[actor,{...actor,ID:29}]]){r=fixture({users});assert.equal(call(r).success,false);assert.equal(r.c.writes,0,'Missing/duplicate authenticated identities fail before writing');}

// Preserve exact revision/idempotency and deny submitted/rejected edits to create-only.
({r,saved}=ownDraft());let count=r.c.writes;assert.equal(call(r).success,false);assert.equal(r.c.writes,count,'Repeated creation token never replays');assert.equal(call(r,follow(saved,{expectedRevision:'stale'})).success,false);assert.equal(r.c.writes,count);
for(const state of [{PO_Status:'Submitted',PO_Commitment_State:'Reserved',PO_Approval_State:'Rejected'},{PO_Status:'Submitted',PO_Commitment_State:'Reserved',PO_Approval_State:'Approved'},{PO_Status:'Draft',PO_Commitment_State:'Reserved',PO_Approval_State:'Not Configured'}]){
  ({r,saved}=ownDraft());Object.assign(r.c.tables.Payment_Request[0],state);count=r.c.writes;assert.equal(call(r,follow(saved)).success,false);assert.equal(r.c.writes,count);
}
({r,saved}=ownDraft());r.c.tables.Budget_Modification.push({ID:91,Budget:61});count=r.c.writes;assert.equal(call(r,follow(saved,{budgetModificationId:'91'})).success,false);assert.equal(r.c.writes,count,'Create-only cannot manually link a budget modification');

// Revalidate identity, capability, creator, phase and draft revision under the lock.
for(const mutate of [t=>{t.User_Access[0].Create_Purchase_Orders=false;},t=>{t.User_Access[0].ID=29;},t=>{t.Add_Budget[0].Archived=true;}]){
  r=fixture({afterLock:mutate});const response=call(r);assert.equal(response.success,false,JSON.stringify(response));assert.equal(r.tables().Payment_Request.length,0);assert.equal(r.tables().PO_Item.length,0);assert.equal(r.tables().PO_Phase_Lock.length,0);assert.equal(r.tables().PO_Operation[0].Status,'Rejected');
}
for(const mutate of [t=>{t.PO_Operation[0].Actor=12;},t=>{t.Payment_Request[0].PO_Revision='newer';},t=>{t.Payment_Request[0].PO_Commitment_State='Reserved';}]){
  const draft=ownDraft();r=fixture({tables:draft.r.tables(),afterLock:mutate});const response=call(r,follow(draft.saved));assert.equal(response.success,false,JSON.stringify(response));assert.equal(r.tables().PO_Item.length,1,'Lock recheck rejects before replacing PO lines');assert.equal(r.tables().PO_Phase_Lock.length,0);
}

// Existing approved PO routing covers intrinsic shortfalls without standalone mod grants.
r=fixture({available:'5000'});const withShortfall=call(r,{...base,action:'Submit',expectedBalances:{'71':'5000'}});assert.equal(withShortfall.success,true,JSON.stringify(withShortfall));assert.equal(withShortfall.snapshot.approvalState,'Pending');assert.equal(withShortfall.snapshot.approvalBundle.rows.length,2);assert.deepEqual(withShortfall.snapshot.approvalBundle.rows.map(row=>row.role),['CFO','COO']);assert.equal(r.tables().Budget_Modification.length,1);assert.equal(r.tables().Budget_Modification[0].Amount,5);assert.equal(r.tables().Budget_Modification[0].Status,'Submitted');assert.equal(r.tables().Add_Budget[0].Const_Budget_Approval_Status,'Approved');assert.equal(r.tables().User_Access[0].Edit_All_Budgets,false);assert.equal(r.tables().User_Access[0].Edit_Owned_Budgets,false);

// An uncertain own submission keeps exact-token recovery without new business writes.
function recoverableOwn({direct=false}={}){
  let r,saved;
  if(direct){r=fixture();saved=call(r,{...base,action:'Submit'});}
  else {({r,saved}=ownDraft());saved=call(r,follow(saved,{action:'Submit'}));}
  assert.equal(saved.success,true,JSON.stringify(saved));
  r.c.tables.PO_Operation.at(-1).Status='Unknown';
  r.c.tables.PO_Phase_Lock.push({ID:302,Phase_Key:'61',Operation_Token:saved.snapshot.revision,Actor:19});
  return {r,saved,p:{action:'Recover',budgetId:'61',userAccessId:'19',id:saved.snapshot.id,token:saved.snapshot.revision,expectedRevision:saved.snapshot.revision}};
}
for(const direct of [false,true]){
  const recovery=recoverableOwn({direct});const business=Object.fromEntries(['Payment_Request','PO_Item','Add_Budget','Budget_Item','Budget_Approvals','Budget_Modification','Approval_Route_Snapshot'].map(name=>[name,recovery.r.tables()[name]]));
  assert.equal(call(recovery.r,{...recovery.p,action:'Get'}).recoveryAvailable,true);
  const recovered=call(recovery.r,recovery.p);assert.equal(recovered.success,true,JSON.stringify(recovered));assert.equal(recovery.r.tables().PO_Phase_Lock.length,0);assert.equal(recovery.r.tables().PO_Operation.at(-1).Status,'Complete');
  for(const [name,expected] of Object.entries(business))assert.deepEqual(recovery.r.tables()[name],expected,name+' unchanged by create-only recovery');
  const writeCount=recovery.r.c.writes;assert.equal(call(recovery.r,{...recovery.p,action:'CheckRecovery'}).success,true);assert.equal(recovery.r.c.writes,writeCount);
}
for(const mutate of [t=>{t.PO_Operation[0].Actor=12;},t=>{t.User_Access[0].Create_Purchase_Orders=false;},t=>{t.PO_Phase_Lock[0].Actor=12;},t=>{t.Add_Budget[0].Archived=true;}]){
  const recovery=recoverableOwn();mutate(recovery.r.c.tables);const writeCount=recovery.r.c.writes;
  assert.equal(call(recovery.r,{...recovery.p,action:'Get'}).recoveryAvailable===true,false);
  assert.equal(call(recovery.r,recovery.p).success,false);assert.equal(recovery.r.c.writes,writeCount,'A foreign creator/lock, revoked grant or archive cannot recover a PO');
}

// A historical captured approval role must not override Const's read-only
// Budget profile. Other profiles retain the captured approver contract.
r=fixture();const recorded=call(r,{...base,action:'Submit'});assert.equal(recorded.success,true,JSON.stringify(recorded));
const priorActor=fixture({login:'normal-cfo',users:[actor,{...cfo,Create_Purchase_Orders:true},coo],tables:r.tables()});
vm.runInContext(`thisapp.permissions.profileForUser=function(user){return user==='normal-cfo'?'Construction Budgeting':'';};`,priorActor.c);
const priorGet={action:'Get',budgetId:'61',userAccessId:'12',id:recorded.snapshot.id};
assert.equal(call(priorActor,priorGet).snapshot.approvalBundle.canApprove,false);assert.equal(call(priorActor,priorGet).snapshot.approvalBundle.canRetryEmail,false);
for(const [action,decision] of [['Approve',null],['Reject',null],['CheckDecision','Approve'],['RetryEmail',null],['CheckDecision','RetryEmail']]){
  const before=priorActor.tables(),writes=priorActor.c.writes;
  const denied=call(priorActor,{...priorGet,action,decision,approvalId:recorded.snapshot.approvalBundle.rows[0].id,expectedRevision:recorded.snapshot.revision,note:''});
  assert.equal(denied.success,false,JSON.stringify(denied));assert.deepEqual(priorActor.tables(),before);assert.equal(priorActor.c.writes,writes,'Const cannot use a prior assigned PO approval or foreign notification');
}
const selfAssignment={ID:21,Role:1,Person:19,Active:true,Territory_Key:'',Department_Key:''};
r=fixture({user:{...actor,Approver_Email:'const@example.test',Approval_Routing_Enabled:true},tables:{Approval_Role_Assignment:[selfAssignment]}});
vm.runInContext(`thisapp.permissions.profileForUser=function(){return 'Construction Budgeting';};thisapp.sendPurchaseOrderEmail=function(){var pending=tables.Budget_Approvals.find(row=>row.Status==='Pending');pending.Sent_Date='2026-10-26';mails.push({kind:'approval'});return 'OK: sent';};`,r.c);
const ownSubmission=call(r,{...base,action:'Submit'});assert.equal(ownSubmission.success,true,JSON.stringify(ownSubmission));assert.equal(ownSubmission.snapshot.approvalBundle.canApprove,false);assert.equal(ownSubmission.snapshot.approvalBundle.canRetryEmail,true);
const ownApproval={action:'RetryEmail',budgetId:'61',userAccessId:'19',id:ownSubmission.snapshot.id,approvalId:ownSubmission.snapshot.approvalBundle.rows[0].id,expectedRevision:ownSubmission.snapshot.revision,note:''};
assert.equal(call(r,ownApproval).success,true,'Create-only retains explicit own submission email retry');assert.equal(call(r,{...ownApproval,action:'CheckDecision',decision:'RetryEmail'}).success,true,'Own retry recovery remains available');
const noApprovalWrites=r.c.writes;assert.equal(call(r,{...ownApproval,action:'Approve'}).success,false);assert.equal(r.c.writes,noApprovalWrites);assert.equal(r.tables().Payment_Request[0].PO_Approval_State,'Pending','Being the submitter and captured approver never auto-grants Const a decision');

console.log('PASS: create-only native PO new/save/reopen/submit/recover; immutable actor ownership; legacy all/owned editors; denied foreign/rejected/in-flight/delete/manual-mod/archived paths; identity/cardinality, revision/idempotency and post-lock revocation; approval-gated shortfall mods.');
console.log('PASS: Const captured PO approvals stay read-only, truthful hints, no foreign notification retry, own submission notification/recovery retained without approval authority.');
