import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {poTestRuntime,compileDelugePO} from './test-po-test-cfo-backend.mjs';

// Creator rejects chained get() expressions directly in a for-each source.
// The JavaScript adapter accepts them, so retain this native syntax regression.
for(const name of ['managePurchaseOrder','budgetElementExportRows','exportBudgetSnapshot']){
 const nativeSource=fs.readFileSync(`creator/functions/${name}.dg`,'utf8');
 assert.doesNotMatch(nativeSource,/\bfor\s+each(?:\s+index)?\s+\w+\s+in\s+[^\r\n{]*\.get\([^\r\n{]*\)\s*\.get\(/,`${name}: assign chained map lookups to a list variable before for-each`);
}

// Execute the actual native planner, snapshots, bundle and balance producer.
// Policy capture/mail are local adapters; this does not compile/publish Creator.
const programs=['poCurrencyString','poSnapshot','poBudgetBalancesForItems','poBudgetBalances','recalcItemRevisedFinal','recalcBudgetModifiedTotals','managePurchaseOrder'].map(name=>{let source=fs.readFileSync(`creator/functions/${name}.dg`,'utf8');if(name==='poSnapshot')source=source.replace(/\brow\b/g,'storedPOLine');return compileDelugePO(source).replace(/catch\s*\((\w+)\)\s*\{/g,(_,error)=>`catch(${error}) { if(typeof result!=='undefined') result.put('testDiagnostic',${error}.stack);`)+`;thisapp.${name}=${name};`;}).join('\n');
const fields=['Labor_Budget','Materials_Budget','Equipment_Budget','Subcontractor_Budget','Other_Budget'];
const components=values=>Object.fromEntries(values.map((value,i)=>[String(i+1),String(value)]));
function runtime({createOnly=false}={}){
  const users=[{ID:20,User:'coo',Full_Name:'COO',Approver_Email:'coo@example.com',Approval_Routing_Enabled:true},{ID:12,User:'normal-cfo',Full_Name:'CFO',Approver_Email:'cfo@example.com',Approval_Routing_Enabled:true,Edit_All_Budgets:!createOnly,Create_Purchase_Orders:true},{ID:19,User:'vp',Full_Name:'VP',Approver_Email:'vp@example.com',Approval_Routing_Enabled:true}];
  const policy={ID:41,Workflow:'Purchase Order',Version:1,Status:'Published',Enabled:true,Self_Approval:'Deny',Duplicate_Person:'Reject',Territory_Key:'',Department_Key:'',Effective_From:null,Effective_To:null,Steps_JSON:JSON.stringify([{key:'vp',order:1,roleId:'2',condition:'Always',enabled:true},{key:'cfo',order:2,roleId:'1',condition:'Always',enabled:true},{key:'coo',order:3,roleId:'3',condition:'At or above',threshold:'10000.00',enabled:true}])};
  const extraTables={User_Access:users,Approval_Policy:[policy],Territory:[],Approval_Role:[{ID:3,Role_Name:'COO',Active:true},{ID:1,Role_Name:'CFO',Active:true},{ID:2,Role_Name:'VP',Active:true}],Approval_Role_Assignment:[{ID:23,Role:3,Person:20,Active:true,Territory_Key:'',Department_Key:''},{ID:21,Role:1,Person:12,Active:true,Territory_Key:'',Department_Key:'',Effective_From:null,Effective_To:null},{ID:22,Role:2,Person:19,Active:true,Territory_Key:'',Department_Key:'',Effective_From:null,Effective_To:null}],Add_Budget:[{ID:61,Archived:false,Budget_Owner:[],Const_Budget_Approval_Status:'Approved',Subdivision1:{Subdivision_Code:'EP01',Territory:'North'}}],Budget_Category:[{ID:81,Budget:61,Deparment:'Construction'}],Budget_Item:[{ID:71,Budget:61,Budget_Category:81,Template_Item:false,Cost_Code:3245,Budget_Ttl:34000,Revised_Final:34000,...Object.fromEntries(fields.map((field,i)=>[field,[5000,9000,20000,0,0][i]]))}],Vendors:[{ID:91,Vendor_Name:'Fixture contractor'}]};
  const r=poTestRuntime({extraTables,users,login:'normal-cfo',policyRow:policy});
  vm.runInContext(`tables.Territory.push({ID:31,Territory_Name:'North',VP:[{ID:19}]});String.prototype.subString=String.prototype.substring;String.prototype.toList=function(s){return this.split(s);};Number.prototype.floor=function(){return Math.floor(this);};Number.prototype.toDecimal=function(){return Number(this);};function indexes(a){return Array.from(a,(_,i)=>i);}
  thisapp.snapshotApprovalRoute=function(context){var resolved=thisapp.resolveApprovalRoute(context);if(resolved.get('success')!==true)return resolved;var snapshot=resolved.get('snapshot');snapshot.put('context',context);var id=insertRecord('Approval_Route_Snapshot',recordValues('Workflow','Purchase Order','Record_ID',context.get('recordId'),'Submission_Revision',context.get('submissionRevision'),'Policy',41,'Context_JSON',context.toString(),'Route_JSON',snapshot.toString(),'Execution_JSON','[]'));return map({success:true,snapshotId:String(id),snapshot:snapshot});};
  thisapp.sendPurchaseOrderEmail=function(id){var checked=thisapp.poApprovalBundle(id);if(!checked.get('success'))throw Error(checked.get('error'));var row=query('Budget_Approvals',r=>r.ID===Number(checked.get('bundle').get('active').get('id')),'');row.Sent_Date='2026-11-09';return 'OK: Fixture notification';};
  `+programs,r.c);
  r.call=payload=>{r.c.requestJSON=JSON.stringify(payload);return JSON.parse(vm.runInContext('managePurchaseOrder(requestJSON)',r.c));};
  return r;
}
function payload({amount='33000.00',deltas=['-5000.00','-9000.00','-20000.00','33000.00','0.00'],action='Submit',token='reallocation-operation-000001'}={}){
  return {action,token,budgetId:'61',userAccessId:'12',vendorId:'91',budgetModificationId:null,amount,description:'Subcontract self-performed task',requestDate:'2026-11-09',dateNeeded:'2026-11-10',automaticModifications:true,reallocationContract:'po-reallocation-v1',expectedBalances:{'71':'3400000'},expectedPendingModifications:{'71':'0'},expectedComponentBalances:{'71|1':'500000','71|2':'900000','71|3':'2000000','71|4':'0','71|5':'0'},expectedComponentPendingModifications:{'71|1':'0','71|2':'0','71|3':'0','71|4':'0','71|5':'0'},reallocation:{contract:'po-reallocation-v1',items:[{budgetItemId:'71',components:components(deltas),reason:'Switch task from self-perform to subcontract'}]},lines:[{key:'subcontract',budgetItemId:'71',description:'Subcontract work',uom:'LS',costElement:'4',costCode:'C_EP01-3245-4',pricingMode:'Manual',quantity:null,unitPrice:null,finalAmount:amount}]};
}
function balances(r){return r.run('poBudgetBalances','61');}
function assertNoBusinessWrites(r,before){const after=r.tables();for(const key of ['Payment_Request','PO_Item','Budget_Modification','Budget_Approvals','Approval_Route_Snapshot','Budget_Item','Add_Budget'])assert.deepEqual(after[key],before[key],key);assert.equal(after.PO_Phase_Lock.length,0);}

// Creator's formatter removed a grouped AND/OR condition during native save.
// Separate nested guards retain the exact gross-change/required-reason rule.
for(const [deltas,reason,accepted] of [
  [undefined,'',false],
  [undefined,'x'.repeat(1000),true],
  [undefined,'x'.repeat(1001),false],
  [['0.00','0.00','0.00','0.00','0.00'],'',true],
  [['0.00','0.00','0.00','0.00','0.00'],'x'.repeat(1001),true]
]){
  const checkRuntime=runtime(),checkPayload=payload(deltas?{deltas}:{});checkPayload.reallocation.items[0].reason=reason;
  const checked=checkRuntime.run('poValidatePayload',JSON.stringify(checkPayload));assert.equal(checked.success,accepted,JSON.stringify({deltas,reasonLength:reason.length,checked}));assert.equal(checkRuntime.c.writes,0,'Reason validation remains read-only');
}

let r=runtime(),p=payload(),result=r.call(p);assert.equal(result.success,true,JSON.stringify({result,po:r.tables().Payment_Request,lines:r.tables().PO_Item,items:r.tables().Budget_Item}));assert.equal(result.reallocationContract,'po-reallocation-v1');
assert.equal(result.snapshot.approvalBundle.modifications.length,1,'One modification per selected base cost code');
let mod=r.tables().Budget_Modification[0];assert.equal(mod.Component_Reallocation,true);assert.equal(mod.Modification_Type,'Decrease');assert.equal(mod.Amount,1000);assert.deepEqual(fields.map(field=>mod[field]),[5000,9000,20000,-33000,0]);
let entry=result.snapshot.approvalBundle.modifications[0];assert.deepEqual(entry.signedComponents,p.reallocation.items[0].components);assert.equal(entry.modificationType,'Decrease');assert.equal(entry.amount,'1000.00');assert.equal(entry.componentReallocation,true);assert.deepEqual(result.snapshot.reallocation,p.reallocation);
assert.equal(result.snapshot.approvalBundle.rows.length,2,'PO and all modifications use one captured approval round');assert.equal(r.tables().Approval_Route_Snapshot.length,1);
let financial=balances(r);assert.equal(financial.success,true,JSON.stringify(financial));let balance=financial.balances[0];assert.equal(balance.reallocationContract,'po-reallocation-v1');assert.equal(balance.pendingModificationCents,'-100000');assert.equal(balance.componentBalances[0].pendingModificationCents,'-500000');assert.equal(balance.componentBalances[0].pendingReductionCents,'500000');assert.equal(balance.componentBalances[3].pendingModificationCents,'3300000');
const writes=r.c.writes;assert.equal(r.call({...p,action:'Check'}).success,true);assert.equal(r.c.writes,writes,'Targeted Check remains read-only');assert.equal(r.call(p).success,false);assert.equal(r.c.writes,writes,'Duplicate token never replays');
const beforePendingEdit=r.tables();const deniedEdit=r.call({...p,id:result.snapshot.id,expectedRevision:p.token,action:'Save',preserveApproval:true,token:'reallocation-pending-edit-000001'});assert.equal(deniedEdit.writeState,'not-started');assert.match(deniedEdit.error,/rejected before/);assertNoBusinessWrites(r,beforePendingEdit);

// The unchanged approval handler completes the one route, then applies the net
// record through the actual item/category/phase rollups, including net decreases.
r.c.zoho.loginuser='vp';let active=result.snapshot.approvalBundle.rows[0];let decision={action:'Approve',id:result.snapshot.id,budgetId:'61',approvalId:active.id,expectedRevision:p.token,note:'',userAccessId:'19'};
let approved=r.run('handlePurchaseOrderApproval',decision);assert.equal(approved.success,true,JSON.stringify(approved));assert.equal(approved.snapshot.approvalState,'Pending');
r.c.zoho.loginuser='normal-cfo';decision={...decision,approvalId:result.snapshot.approvalBundle.rows[1].id,userAccessId:'12'};approved=r.run('handlePurchaseOrderApproval',decision);assert.equal(approved.success,true,JSON.stringify(approved));assert.equal(approved.snapshot.approvalState,'Approved');assert.equal(r.tables().Budget_Item[0].Revised_Final,33000);assert.equal(r.tables().Add_Budget[0].Modified_Final_Grand_Total,33000);financial=balances(r);assert.equal(financial.success,true,JSON.stringify(financial));assert.deepEqual(financial.balances[0].componentBalances.map(part=>part.modCents),['-500000','-900000','-2000000','3300000','0']);assert.deepEqual(financial.balances[0].componentBalances.map(part=>part.pendingReductionCents),['0','0','0','0','0']);

for(const [amount,deltas,type,net] of [['34000.00',['-5000.00','-9000.00','-20000.00','34000.00','0.00'],'Increase',0],['35000.00',['-5000.00','-9000.00','-20000.00','35000.00','0.00'],'Increase',1000]]){r=runtime();result=r.call(payload({amount,deltas}));assert.equal(result.success,true,JSON.stringify(result));mod=r.tables().Budget_Modification[0];assert.equal(mod.Modification_Type,type);assert.equal(mod.Amount,net);assert.equal(result.snapshot.approvalBundle.rows.length,2,'Zero-net gross changes retain the additional approver');}
r=runtime({createOnly:true});assert.equal(r.call(payload()).success,true,'Existing Create Purchase Orders permission covers its combined modification');
r=runtime();r.c.tables.User_Access.find(user=>user.ID===12).Edit_All_Budgets=false;r.c.tables.User_Access.find(user=>user.ID===12).Create_Purchase_Orders=false;const deniedBefore=r.tables();result=r.call(payload());assert.equal(result.writeState,'not-started');assert.match(result.error,/permission/);assertNoBusinessWrites(r,deniedBefore);
r=runtime();const capabilityWrites=r.c.writes;const capability=r.call({action:'Capabilities',budgetId:'61',userAccessId:'12'});assert.equal(capability.reallocationContract,'po-reallocation-v1');assert.equal(r.c.writes,capabilityWrites);

// Multiple cost codes still share the PO's single captured approval round.
r=runtime();r.c.tables.Budget_Item.push({...r.tables().Budget_Item[0],ID:72,Cost_Code:3246});p=payload();p.amount='66000.00';p.lines.push({...p.lines[0],key:'second-cost-code',budgetItemId:'72',costCode:'C_EP01-3246-4'});p.reallocation.items.push({...structuredClone(p.reallocation.items[0]),budgetItemId:'72'});p.expectedBalances['72']='3400000';p.expectedPendingModifications['72']='0';for(let e=1;e<=5;e++){p.expectedComponentBalances['72|'+e]=p.expectedComponentBalances['71|'+e];p.expectedComponentPendingModifications['72|'+e]='0';}result=r.call(p);assert.equal(result.success,true,JSON.stringify(result));assert.equal(r.tables().Budget_Modification.length,2);assert.equal(r.tables().Approval_Route_Snapshot.length,1);assert.equal(r.tables().Budget_Approvals.length,2);r.c.zoho.loginuser='vp';let groupedDecision={action:'Approve',id:result.snapshot.id,budgetId:'61',approvalId:result.snapshot.approvalBundle.rows[0].id,expectedRevision:p.token,note:'',userAccessId:'19'};assert.equal(r.run('handlePurchaseOrderApproval',groupedDecision).success,true);r.c.zoho.loginuser='normal-cfo';assert.equal(r.run('handlePurchaseOrderApproval',{...groupedDecision,approvalId:result.snapshot.approvalBundle.rows[1].id,userAccessId:'12'}).success,true);assert.deepEqual(r.tables().Budget_Modification.map(row=>row.Status),['Approved','Approved']);assert.equal(r.tables().Add_Budget[0].Modified_Final_Grand_Total,66000,'One final approval completes all cost-code modifications');

r=runtime();p=payload({action:'Save'});result=r.call(p);assert.equal(result.success,true,JSON.stringify(result));assert.equal(r.tables().Budget_Modification.length,0,'Draft never creates modifications or approvals');assert.equal(r.tables().Budget_Approvals.length,0);assert.deepEqual(r.call({action:'Get',budgetId:'61',userAccessId:'12',id:result.snapshot.id}).snapshot.reallocation,p.reallocation);assert.deepEqual(JSON.parse(r.tables().PO_Operation[0].Request_JSON).reallocation,p.reallocation);

for(const mutate of [
 p=>p.reallocation.contract='unknown',
 p=>p.reallocation.items.push(structuredClone(p.reallocation.items[0])),
 p=>p.reallocation.items[0].budgetItemId='72',
 p=>delete p.reallocation.items[0].components['5'],
 p=>p.reallocation.items[0].components['1']='-5000.001',
 p=>p.reallocation.items[0].components['1']=-5000,
 p=>p.reallocation.items[0].reason='',
 p=>p.reallocation.items[0].components['4']='32999.99',
 p=>p.reallocation.items[0].components['4']='33000.01',
 p=>p.reallocation.items[0].components['1']='-5000.01',
 p=>p.reallocation.items[0].components['5']='1.00',
 p=>p.expectedComponentBalances['71|1']='500001'
]){r=runtime();const before=r.tables();p=payload();mutate(p);result=r.call(p);assert.equal(result.success,false,JSON.stringify(p));assert.equal(result.writeState,'not-started',JSON.stringify(result));assertNoBusinessWrites(r,before);}

// Pending positive funding cannot be borrowed for a donor reduction; a debit
// reserve remains gross even if another pending request would offset it.
r=runtime();vm.runInContext(`var realBalances=thisapp.poBudgetBalancesForItems;thisapp.poBudgetBalancesForItems=function(id,items){var out=realBalances(id,items);var part=out.get('balances')[0].get('componentBalances')[0];part.put('pendingModificationCents','1000000');part.put('pendingReductionCents','100000');return out;};`,r.c);p=payload();p.expectedComponentPendingModifications['71|1']='1000000';const beforeReserve=r.tables();result=r.call(p);assert.equal(result.success,false);assert.match(result.error,/reduction exceeds/);assertNoBusinessWrites(r,beforeReserve);

// Exact captured marker/type/components are required to read a saved custom mod.
for(const mutate of [m=>m.Component_Reallocation=false,m=>m.Modification_Type='Increase',m=>m.Subcontractor_Budget=-32999,m=>m.Reason='Changed after submit']){r=runtime();result=r.call(payload());mutate(r.c.tables.Budget_Modification[0]);assert.equal(r.run('poApprovalBundle',result.snapshot.id).success,false);}
for(const mutate of [intended=>delete intended.components,intended=>delete intended.reason,intended=>intended.reason='Different captured reason']){
 r=runtime();result=r.call(payload());const context=JSON.parse(r.c.tables.Approval_Route_Snapshot[0].Context_JSON);mutate(context.modifications[0]);r.c.tables.Approval_Route_Snapshot[0].Context_JSON=JSON.stringify(context);
 const rejectedBundle=r.run('poApprovalBundle',result.snapshot.id);assert.equal(rejectedBundle.success,false);assert.match(rejectedBundle.error,/reason or component contract differs/,'Nested native-safe guard rejects a custom record before reading incomplete component evidence');
}
for(const mutate of [c=>c.reallocation.items=[],c=>c.reallocation.items.push(structuredClone(c.reallocation.items[0])),c=>c.reallocation.items[0].components['4']='33001.00',c=>c.reallocation.items[0].reason='Changed reviewed reason',c=>delete c.reallocationContract]){r=runtime();result=r.call(payload());const context=JSON.parse(r.c.tables.Approval_Route_Snapshot[0].Context_JSON);mutate(context);r.c.tables.Approval_Route_Snapshot[0].Context_JSON=JSON.stringify(context);assert.equal(r.run('poApprovalBundle',result.snapshot.id).success,false,'Captured signed plan and exact native records must agree');}
for(const omitZero of [false,true]){r=runtime();Object.assign(r.c.tables.Budget_Item[0],{Budget_Ttl:34100,Subcontractor_Budget:100});p=payload({amount:'100.00',deltas:['0.00','0.00','0.00','0.00','0.00']});p.expectedBalances['71']='3410000';p.expectedComponentBalances['71|4']='10000';if(omitZero)p.reallocation.items=[];result=r.call(p);assert.equal(result.success,true,JSON.stringify(result));assert.equal(result.snapshot.approvalBundle.modifications.length,0,'Zero-only plan items are omitted from native modification records');assert.equal(result.snapshot.approvalBundle.rows.length,2,'An unchanged plan still requires VP then CFO');}

for(const kind of ['legacyPO','legacyModification']){
 r=runtime();p=payload();
 if(kind==='legacyPO'){r.c.tables.Payment_Request.push({ID:301,Budget:61,Request_Type:'Purchase Order',Budget_Item:71,Request_Amount:1000,Element:null,PO_Revision:''});p.expectedBalances['71']='3300000';}
 else {r.c.tables.Budget_Modification.push({ID:301,Budget:61,Budget_Item:71,Status:'Approved',Modification_Type:'Increase',Amount:1000,Reference_Number:'LEGACY'});p.expectedBalances['71']='3500000';}
 const before=r.tables();result=r.call(p);assert.equal(result.success,false);assert.match(result.error,/Unallocated historical/);assertNoBusinessWrites(r,before);
}
r=runtime();r.c.tables.Budget_Modification.push({ID:301,Budget:61,Budget_Item:71,Status:'Approved',Modification_Type:'Increase',Amount:1000,Reference_Number:'LEGACY-I'},{ID:302,Budget:61,Budget_Item:71,Status:'Approved',Modification_Type:'Decrease',Amount:1000,Reference_Number:'LEGACY-D'});financial=balances(r);assert.equal(financial.balances[0].unallocatedModificationCents,'0');assert.equal(financial.balances[0].unallocatedModificationCount,2);const beforeCancelledUnknown=r.tables();result=r.call(payload());assert.equal(result.success,false);assert.match(result.error,/Unallocated historical/);assertNoBusinessWrites(r,beforeCancelledUnknown);
r=runtime();Object.assign(r.c.tables.Budget_Item[0],{Budget_Ttl:50,Labor_Budget:300,Materials_Budget:0,Equipment_Budget:0});p=payload({amount:'100.00',deltas:['-200.00','0.00','0.00','100.00','0.00']});p.expectedBalances['71']='5000';Object.assign(p.expectedComponentBalances,{'71|1':'30000','71|2':'0','71|3':'0'});const beforeMismatch=r.tables();result=r.call(p);assert.equal(result.success,false);assert.match(result.error,/item underfunded/);assertNoBusinessWrites(r,beforeMismatch);

// A rejected revision may be saved without discarding its new reviewed plan.
// Its prior PO reservation/pending debit is removed once when resubmitting.
r=runtime();p=payload();result=r.call(p);const rejectedId=result.snapshot.id;
r.c.zoho.loginuser='vp';let rejection=r.run('handlePurchaseOrderApproval',{action:'Reject',id:rejectedId,budgetId:'61',approvalId:result.snapshot.approvalBundle.rows[0].id,expectedRevision:p.token,note:'Revise offsets',userAccessId:'19'});assert.equal(rejection.success,true,JSON.stringify(rejection));assert.equal(rejection.snapshot.approvalState,'Rejected');assert.equal(r.tables().Budget_Modification[0].Status,'Rejected');
r.c.zoho.loginuser='normal-cfo';let revision=payload({action:'Save',deltas:['-4000.00','-9000.00','-20000.00','33000.00','0.00'],token:'reallocation-rejected-save-000001'});Object.assign(revision,{id:rejectedId,expectedRevision:p.token});revision.reallocation.items[0].reason='Retain one thousand labor budget';result=r.call(revision);assert.equal(result.success,true,JSON.stringify(result));assert.deepEqual(result.snapshot.reallocation,revision.reallocation);assert.deepEqual(r.call({action:'Get',budgetId:'61',userAccessId:'12',id:rejectedId}).snapshot.reallocation,revision.reallocation);assert.equal(r.tables().Budget_Modification[0].Status,'Rejected','Saving a revision does not submit its modifications');
const next={...revision,action:'Submit',expectedRevision:revision.token,token:'reallocation-rejected-submit-000001'};result=r.call(next);assert.equal(result.success,true,JSON.stringify(result));assert.equal(result.snapshot.approvalBundle.modifications.length,1);assert.equal(result.snapshot.approvalBundle.modifications[0].amount,'0.00');assert.equal(result.snapshot.approvalBundle.rows[0].status,'Pending');assert.equal(result.snapshot.approvalBundle.rows[1].status,'Not Sent');assert.equal(r.tables().Budget_Modification.length,1,'Same-item rejected modification identity is reused for the reviewed new round');

// Approved/Rejected/Pending custom records use existing exact deletion preview.
for(const state of ['Pending','Rejected','Approved']){
 r=runtime();p=payload({amount:'34000.00',deltas:['-5000.00','-9000.00','-20000.00','34000.00','0.00']});result=r.call(p);const id=result.snapshot.id;
 if(state==='Rejected'){r.c.zoho.loginuser='vp';assert.equal(r.run('handlePurchaseOrderApproval',{action:'Reject',id,budgetId:'61',approvalId:result.snapshot.approvalBundle.rows[0].id,expectedRevision:p.token,note:'',userAccessId:'19'}).success,true);r.c.zoho.loginuser='normal-cfo';}
 if(state==='Approved'){r.c.zoho.loginuser='vp';assert.equal(r.run('handlePurchaseOrderApproval',{action:'Approve',id,budgetId:'61',approvalId:result.snapshot.approvalBundle.rows[0].id,expectedRevision:p.token,note:'',userAccessId:'19'}).success,true);r.c.zoho.loginuser='normal-cfo';assert.equal(r.run('handlePurchaseOrderApproval',{action:'Approve',id,budgetId:'61',approvalId:result.snapshot.approvalBundle.rows[1].id,expectedRevision:p.token,note:'',userAccessId:'12'}).success,true);r.c.zoho.loginuser='normal-cfo';}
 const preview=r.call({action:'PreviewDelete',id,budgetId:'61',userAccessId:'12',expectedRevision:p.token});assert.equal(preview.success,true,JSON.stringify(preview));assert.equal(preview.deletePlan.modifications.length,1);const removed=r.call({action:'Delete',id,budgetId:'61',userAccessId:'12',expectedRevision:p.token,token:'delete-reallocation-operation-000001',deletePlan:preview.deletePlan});assert.equal(removed.success,true,JSON.stringify(removed));assert.equal(r.tables().Payment_Request.length,0);assert.equal(r.tables().Budget_Modification.length,0);assert.equal(r.tables().Budget_Item[0].Revised_Final,34000,'Deletion restores approved net rollups without changing Final');
}
console.log('PO reallocation native: signed net decrease/zero/increase, one-per-item grouped approval, exact snapshots/draft receipts, Create PO access, gross debit reserves, no-write guards and immutable captured vectors passed.');
export {runtime,payload,balances};

// All cost codes contribute to the one PO net; no per-element or per-item cap.
for(const nets of [[9999,9999,9999,9999,9999],[15000,-9000]]){
 const r=runtime(),p=payload();p.lines=[];p.reallocation.items=[];p.amount='0.00';let total=0;
 nets.forEach((net,index)=>{
  const id=String(71+index),amount=(34000+net).toFixed(2);total+=34000+net;
  if(index)r.c.tables.Budget_Item.push({...r.tables().Budget_Item[0],ID:Number(id),Cost_Code:3245+index});
  p.lines.push({...payload().lines[0],key:'line-'+id,budgetItemId:id,costCode:'C_EP01-'+(3245+index)+'-4',finalAmount:amount});
  p.reallocation.items.push({budgetItemId:id,components:components(['-5000.00','-9000.00','-20000.00',amount,'0.00']),reason:'Review combined budget changes'});
  p.expectedBalances[id]='3400000';p.expectedPendingModifications[id]='0';
  for(let e=1;e<=5;e++){p.expectedComponentBalances[id+'|'+e]=p.expectedComponentBalances['71|'+e];p.expectedComponentPendingModifications[id+'|'+e]='0';}
 });
 p.amount=total.toFixed(2);const out=r.call(p);assert.equal(out.success,true,JSON.stringify(out));
 const net=nets.reduce((a,b)=>a+b,0);assert.equal(JSON.parse(r.tables().Approval_Route_Snapshot[0].Context_JSON).netBudgetChange,net.toFixed(2));
 assert.deepEqual(out.snapshot.approvalBundle.rows.map(row=>row.role),net>=10000?['VP','CFO','COO']:['VP','CFO']);
}

for(const net of ['9999.00','9999.99','10000.00','10000.01']){const r=runtime(),amount=(34000+Number(net)).toFixed(2),p=payload({amount,deltas:['-5000.00','-9000.00','-20000.00',amount,'0.00']});const out=r.call(p);assert.equal(out.success,true,JSON.stringify(out));const capture=JSON.parse(r.tables().Approval_Route_Snapshot[0].Context_JSON);assert.equal(capture.netBudgetChange,net);assert.deepEqual(out.snapshot.approvalBundle.rows.map(row=>row.role),Number(net)>=10000?['VP','CFO','COO']:['VP','CFO']);}
