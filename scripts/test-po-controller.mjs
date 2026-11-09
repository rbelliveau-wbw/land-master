import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const c=vm.createContext({setTimeout,clearTimeout});for(const file of ['po-domain.js','po-controller.js'])vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/'+file,'utf8'),c);
const payload={action:'Submit',token:'test-operation-123456789',budgetId:'1',vendorId:'2',amount:'2.01',requestDate:'2026-10-08',dateNeeded:'2026-10-09',userAccessId:'3',lines:[{key:'first',budgetItemId:'4',description:'One',costElement:'1',pricingMode:'Calculated',quantity:'1',unitPrice:'1.01',finalAmount:'1.01'},{key:'second',budgetItemId:'4',description:'Two',costElement:'5',pricingMode:'Manual',quantity:null,unitPrice:null,finalAmount:'1.00'}]};
payload.lines.forEach(line=>{line.uom='EA';line.costCode='C_SH01-3225-'+line.costElement;});
const snapshot={...payload,id:'5',revision:payload.token,status:'Submitted',commitmentState:'Reserved',approvalState:'Pending',lines:payload.lines.map((line,i)=>({...line,ID:String(i+6)}))};
const receipt={success:true,contract:'po-v1',writeState:'verified',snapshot};
let calls=[],resolve;const events=[];const ctrl=c.LMPOController.create({timeoutMs:15,call:p=>{calls.push(p);return new Promise(r=>resolve=r);},onState:(r,stage)=>events.push(stage)});
const pending=ctrl.begin(payload);assert.equal(events[0],'prepared');assert.equal(events[1],'saving');await assert.rejects(()=>ctrl.begin(payload),/active/);
await pending;assert.equal(ctrl.state().unknown,true);assert.equal(calls.length,1);await assert.rejects(()=>ctrl.begin(payload),/unresolved/);
const check=ctrl.check();await new Promise(r=>setImmediate(r));assert.equal(calls[1].action,'Check');assert.equal(calls[1].lines,undefined,'recovery sends no business write payload');resolve(receipt);await check;assert.equal(ctrl.state().unknown,false);assert.equal(ctrl.state().snapshot.id,'5');
for(const [field,value] of [['budgetId','9'],['status','Draft'],['commitmentState','None'],['revision','old'],['id',5]])assert.throws(()=>c.LMPOController.verify({...snapshot,[field]:value},payload),/verified|returned/);
for(const field of ['key','budgetItemId','description','costElement','uom','costCode','pricingMode','quantity','unitPrice','finalAmount']){const s=structuredClone(snapshot);s.lines[0][field]='wrong';assert.equal(c.LMPOController.verify(s,payload),s,'Automatic line field comparisons are removed');assert.throws(()=>c.LMPOController.verify(s,payload,true),/verified/);}
const dupe=structuredClone(snapshot);dupe.lines[1].ID=dupe.lines[0].ID;assert.throws(()=>c.LMPOController.verify(dupe,payload),/Unique/);
const rejected=c.LMPOController.create({call:async()=>({contract:'po-v1',success:false,writeState:'not-started',error:'Insufficient budget'}),onState(){}});await rejected.begin(payload);assert.equal(rejected.state().unknown,false);assert.equal(rejected.state().rejected,true);
console.log('PO duplicate guards, lost-response read-only recovery, persisted header/line verification and exact state checks passed.');

for(const [field,value]of [["vendorId","9"],["amount","2.00"],["requestDate","2026-10-07"]])assert.equal(c.LMPOController.verify({...snapshot,[field]:value},payload)[field],value);
for(const [field,value]of [["vendorId","9"],["amount","2.00"],["requestDate","2026-10-07"]])assert.throws(()=>c.LMPOController.verify({...snapshot,[field]:value},payload,true),/verified/);

const plan={id:'5',budgetId:'1',revision:'draft-revision',proof:'native-preview-proof',rollupItems:[],items:['6','7'],operations:['8'],snapshots:[],approvals:[],modifications:[]};
const deletion={action:'Delete',id:'5',budgetId:'1',expectedRevision:'draft-revision',deletePlan:plan,token:'delete-test-token-000001',userAccessId:'3'};
let deleteCalls=[],deleteResolve;const deleter=c.LMPOController.create({timeoutMs:15,call:p=>{deleteCalls.push(structuredClone(p));return new Promise(resolve=>deleteResolve=resolve);},onState(){}});
await deleter.remove(deletion);assert.equal(deleter.state().unknown,true);assert.equal(deleteCalls.length,1);await assert.rejects(()=>deleter.remove(deletion),/unresolved/);await assert.rejects(()=>deleter.begin(payload),/unresolved/);
const checkDelete=deleter.check();await new Promise(resolve=>setImmediate(resolve));assert.equal(deleteCalls[1].action,'CheckDelete');assert.equal(deleteCalls[1].lines,undefined);assert.deepEqual(deleteCalls[1].deletePlan,plan);deleteResolve({success:true,contract:'po-v1',writeState:'verified',deleted:plan,remaining:0});await checkDelete;assert.equal(deleter.state().unknown,false);assert.equal(deleter.state().deleted.id,'5');
for(const altered of [{...plan,id:'9'},{...plan,items:['6','6']},{...plan,items:[6]},{...plan,revision:'stale'}])assert.throws(()=>c.LMPOController.validateDeletePlan(altered,deletion),/verified/);
assert.throws(()=>c.LMPOController.verifyDeleted({deleted:plan,remaining:1},deletion),/verified/);assert.throws(()=>c.LMPOController.verifyDeleted({deleted:{...plan,items:['6']},remaining:0},deletion),/verified/);
console.log('PO deletion: exact previews, duplicate-send blocking, captured read-only recovery and full associated-record verification passed.');

const withModification={...payload,automaticModifications:true,expectedBalances:{'4':'101'},expectedPendingModifications:{'4':'0'}};
const vpSnapshot={...snapshot,budgetModificationId:'9',approvalBundle:{modifications:[{id:'9',budgetItemId:'4',amount:'1.00',status:'Submitted'}],rows:[{role:'CFO',status:'Pending'},{role:'VP',status:'Not Sent'}]}};
assert.equal(c.LMPOController.verify(vpSnapshot,withModification),vpSnapshot,'Any configured additional role satisfies the modification route');assert.throws(()=>c.LMPOController.verify({...vpSnapshot,approvalBundle:{...vpSnapshot.approvalBundle,rows:[{role:'CFO',status:'Pending'}]}},withModification),/approver/);

// Native component baselines can need a modification even when the whole item
// has spare money. Verify the native plan from the exact submitted expectations.
const componentPayload={...payload,automaticModifications:true,expectedBalances:{'4':'10000'},expectedPendingModifications:{'4':'0'},expectedComponentBalances:{'4|1':'0','4|5':'1000'},expectedComponentPendingModifications:{'4|1':'0','4|5':'0'}};
const componentSnapshot={...vpSnapshot,approvalBundle:{...vpSnapshot.approvalBundle,modifications:[{id:'9',budgetItemId:'4',amount:'1.01',status:'Submitted'}]}};
assert.equal(c.LMPOController.verify(componentSnapshot,componentPayload),componentSnapshot,'Labor shortfall is retained despite item-level surplus');
const componentController=c.LMPOController.create({call:async()=>({contract:'po-v1',success:true,writeState:'verified',snapshot:componentSnapshot}),onState(){}});
await componentController.begin(componentPayload);assert.equal(componentController.state().unknown,false,'Successful native component submission must not enter unknown recovery');assert.equal(componentController.state().snapshot.id,'5');

const mixedLine={...payload.lines[1],key:'legacy',budgetItemId:'8',costElement:'2',finalAmount:'3.00'};
const mixedPayload={...componentPayload,amount:'5.01',lines:[...payload.lines,mixedLine],expectedBalances:{'4':'10000','8':'100'},expectedPendingModifications:{'4':'0','8':'0'}};
const mixedSnapshot={...componentSnapshot,amount:mixedPayload.amount,lines:[...snapshot.lines,{...mixedLine,ID:'10'}],approvalBundle:{...componentSnapshot.approvalBundle,modifications:[...componentSnapshot.approvalBundle.modifications,{id:'11',budgetItemId:'8',amount:'2.00',status:'Submitted'}]}};
assert.equal(c.LMPOController.verify(mixedSnapshot,mixedPayload),mixedSnapshot,'Native component and legacy item plans coexist in one PO');
const repeatedPayload={...componentPayload,amount:'3.02',lines:[...payload.lines,{...payload.lines[0],key:'labor-copy'}]};
const repeatedSnapshot={...componentSnapshot,amount:repeatedPayload.amount,lines:[...snapshot.lines,{...payload.lines[0],key:'labor-copy',ID:'12'}],approvalBundle:{...componentSnapshot.approvalBundle,modifications:[{id:'9',budgetItemId:'4',amount:'2.02',status:'Submitted'}]}};
assert.equal(c.LMPOController.verify(repeatedSnapshot,repeatedPayload),repeatedSnapshot,'Repeated lines group before applying component availability once');

const fundedPayload={...componentPayload,expectedComponentBalances:{'4|1':'1','4|5':'0'},expectedComponentPendingModifications:{'4|1':'100','4|5':'100'}};
const fundedSnapshot={...snapshot,budgetModificationId:null,approvalBundle:{modifications:[],rows:[{role:'CFO',status:'Pending'}]}};
assert.equal(c.LMPOController.verify(fundedSnapshot,fundedPayload),fundedSnapshot,'Pending component credits fund only their own component without an extra modification');
assert.equal(c.LMPOController.verify({...fundedSnapshot,approvalBundle:{...fundedSnapshot.approvalBundle}}, {...fundedPayload,expectedComponentBalances:{'4|1':'101','4|5':'100'},expectedComponentPendingModifications:{'4|1':'0','4|5':'0'}}).id,'5','No shortfall needs no modification or additional approver');
assert.equal(c.LMPOController.verify(vpSnapshot,{...withModification,expectedComponentBalances:{},expectedComponentPendingModifications:{}}),vpSnapshot,'Legacy empty component maps preserve item-level verification');

for(const changed of [
  {expectedComponentBalances:{'4|1':'0'}},
  {expectedComponentPendingModifications:{'4|1':'0'}},
  {expectedComponentBalances:{'4|1':'0.00','4|5':'1000'}},
  {expectedComponentPendingModifications:{'4|1':'-1','4|5':'0'}}
])assert.throws(()=>c.LMPOController.verify(componentSnapshot,{...componentPayload,...changed}),/component balance/,'Incomplete or malformed component expectations cannot fall back to the item plan');
for(const changed of [{amount:'1.00'},{id:9},{budgetItemId:'8'},{status:'Approved'}])assert.throws(()=>c.LMPOController.verify({...componentSnapshot,approvalBundle:{...componentSnapshot.approvalBundle,modifications:[{...componentSnapshot.approvalBundle.modifications[0],...changed}]}},componentPayload),/modification/,'Existing exact modification identity, amount and state guards remain');
assert.throws(()=>c.LMPOController.verify({...componentSnapshot,approvalBundle:{...componentSnapshot.approvalBundle,modifications:[]}},componentPayload),/modification bundle/,'Every expected native modification is required');
assert.throws(()=>c.LMPOController.verify({...componentSnapshot,approvalBundle:{...componentSnapshot.approvalBundle,rows:[{role:'CFO',status:'Pending'}]}},componentPayload),/approver/,'Component overrun still requires an additional configured approver');
console.log('PO component verification: native element shortfalls, item surplus, mixed legacy items, repeated lines, pending credits, zero-modification plans, actual controller success and existing guards passed.');
