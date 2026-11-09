// Actual native final-decision body plus the actual signed planner, bundle,
// snapshots, balances and rollups. Policy/mail remain local fixture adapters.
import assert from 'node:assert/strict';
import {runtime,payload} from './test-po-reallocation-backend.mjs';

function submitted(options){const r=runtime(),p=payload(options),saved=r.call(p);assert.equal(saved.success,true,JSON.stringify(saved));return {r,p,saved};}
function approve(h,index=0){const {r,p,saved}=h,user=index===0?'normal-cfo':'vp',actor=index===0?'12':'19';r.c.zoho.loginuser=user;return r.run('handlePurchaseOrderApproval',{action:'Approve',id:saved.snapshot.id,budgetId:'61',approvalId:saved.snapshot.approvalBundle.rows[index].id,expectedRevision:p.token,note:'',userAccessId:actor});}
function business(r){return Object.fromEntries(['Payment_Request','PO_Item','Budget_Modification','Budget_Approvals','Approval_Route_Snapshot','Budget_Item','Budget_Category','Add_Budget'].map(name=>[name,r.tables()[name]]));}
function deniedFinal(h){const before=business(h.r),rollups=h.r.c.rollups,out=approve(h,1);assert.equal(out.success,false,JSON.stringify(out));assert.equal(out.writeState,'not-started');assert.match(out.error,/no longer funds|availability|unavailable/);assert.deepEqual(business(h.r),before,'failed financial preflight cannot record a decision or modify its captured financial records');assert.equal(h.r.c.rollups,rollups);assert.equal(h.r.tables().PO_Phase_Lock.length,0,'known prewrite refusal releases its own decision lock');return out;}

// A donor shift after submission must not be approved solely because the
// aggregate still funds the PO. The first approval still routes as before.
let h=submitted();h.r.c.tables.Budget_Item[0].Labor_Budget=4999;h.r.c.tables.Budget_Item[0].Materials_Budget=9001;
assert.equal(approve(h).success,true,'ordinary nonfinal approval does not impose the final financial gate');deniedFinal(h);
h.r.c.tables.Budget_Item[0].Labor_Budget=5000;h.r.c.tables.Budget_Item[0].Materials_Budget=9000;
assert.equal(approve(h,1).success,true,'restored native funding permits a fresh final approval without replaying the earlier step');
h=submitted({amount:'35000.00',deltas:['-5000.00','-9000.00','-20000.00','35000.00','0.00']});assert.equal(approve(h).success,true);assert.equal(approve(h,1).success,true,'valid net-increase funding reaches final approval through the same gate');assert.equal(h.r.tables().Budget_Item[0].Revised_Final,35000);

// A net-zero transfer still has gross donor changes to protect.
h=submitted({amount:'34000.00',deltas:['-5000.00','-9000.00','-20000.00','34000.00','0.00']});assert.equal(approve(h).success,true);h.r.c.tables.Budget_Item[0].Labor_Budget=4999;h.r.c.tables.Budget_Item[0].Materials_Budget=9001;deniedFinal(h);

// Positive pending credit attached to another PO is not approved donor money.
// Both native requests are valid when made, but the donor transfer waits until
// the other request's approved increase replaces its provisional credit.
h=submitted();const other=payload({amount:'10.00',deltas:['10.00','0.00','0.00','0.00','0.00'],token:'reallocation-second-po-000001'});
other.lines[0].costElement='1';other.lines[0].costCode='C_EP01-3245-1';other.expectedBalances['71']='100000';other.expectedPendingModifications['71']='-100000';Object.assign(other.expectedComponentPendingModifications,{'71|1':'-500000','71|2':'-900000','71|3':'-2000000','71|4':'3300000'});other.expectedComponentBalances['71|4']='-3300000';
const otherSaved=h.r.call(other);assert.equal(otherSaved.success,true,JSON.stringify(otherSaved));assert.equal(approve(h).success,true);deniedFinal(h);

// Aggregate funding is checked independently of any one component.
h=submitted();assert.equal(approve(h).success,true);h.r.c.tables.Budget_Item[0].Budget_Ttl=33999;deniedFinal(h);

// Notification retry remains available to its assigned approver without
// general budget editing, even when a later final approval would be refused.
h=submitted();assert.equal(approve(h).success,true);h.r.c.tables.Budget_Item[0].Labor_Budget=4999;h.r.c.tables.Budget_Item[0].Materials_Budget=9001;h.r.c.zoho.loginuser='vp';h.r.c.tables.Budget_Approvals[1].Sent_Date=null;
const retried=h.r.run('handlePurchaseOrderApproval',{action:'RetryEmail',id:h.saved.snapshot.id,budgetId:'61',approvalId:h.saved.snapshot.approvalBundle.rows[1].id,expectedRevision:h.p.token,note:'',userAccessId:'19'});assert.equal(retried.success,true,JSON.stringify(retried));assert.equal(retried.snapshot.approvalState,'Pending');assert.equal(h.r.tables().Budget_Modification[0].Status,'Submitted');

// An unrelated item's unknown historic element allocation is outside this
// final-decision scope; selected items and changed elements remain the gate.
h=submitted();h.r.c.tables.Budget_Item.push({ID:72,Budget:61,Budget_Category:81,Template_Item:false,Cost_Code:3246,Budget_Ttl:100,Revised_Final:100});h.r.c.tables.Payment_Request.push({ID:302,Budget:61,Request_Type:'Purchase Order',Budget_Item:72,Request_Amount:10,Element:null,PO_Revision:''});assert.equal(approve(h).success,true);assert.equal(approve(h,1).success,true);

console.log('PO final reallocation approval: actual native locked prewrite check, shifted donor budgets, gross zero-net transfers, pending-credit donor exclusion, aggregate funding, no partial decision/rollup/lock, scoped unrelated data and unchanged nonfinal/assigned notification behavior passed.');
