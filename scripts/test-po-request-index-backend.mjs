// Execute the checked-in read-only Deluge index against native-shaped records.
// Native Creator compilation/publication remains a separate release gate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {poTestRuntime} from './test-po-test-cfo-backend.mjs';

const actor={ID:19,User:'request-reader',Full_Name:'Request Reader',Edit_All_Budgets:false,Edit_Owned_Budgets:true,Create_Purchase_Orders:true};
const draft=(ID,Budget,Vendor=91)=>({ID,Budget,Vendor,Request_Type:'Purchase Order',PO_Revision:'r'+ID,PO_Status:'Draft',PO_Commitment_State:'None',PO_Approval_State:'Not Configured',PO_Amount_Exact:'55.00',PO_Description:'Work '+ID,Request_Date:'2026-11-09',Date_Needed:'2026-11-10',PO_Budget_Modification:null,PO_Client_Key:'creation-'+ID});
const pending={...draft(52,62,92),PO_Status:'Submitted',PO_Commitment_State:'Reserved',PO_Approval_State:'Pending',PO_Budget_Modification:81};
const context={workflow:'Purchase Order',budgetId:'62',recordId:'52',submissionRevision:'r52',submitterId:'12',modifications:[{id:'81',budgetItemId:'71',amount:'10.00',reference:'PO:52:r52'}]};
function fixture({user=actor,environment='Production',login=user.User,tables={}}={}){
  const r=poTestRuntime({login,environment,users:[user,{ID:12,User:'cfo',Full_Name:'CFO'}],extraTables:{
    Add_Budget:[{ID:61,Archived:false,Budget_Owner:[{ID:19}]},{ID:62,Archived:false,Budget_Owner:[{ID:12}]},{ID:63,Archived:true,Budget_Owner:[{ID:19}]},{ID:64,Archived:false,Budget_Owner:[]}],
    Vendors:[{ID:91,Vendor_Name:'Used Vendor One'},{ID:92,Vendor_Name:'Used Vendor Two'},{ID:93,Vendor_Name:'Unrelated Vendor'}],
    Payment_Request:[draft(51,61),pending,draft(53,63),draft(54,62),{...draft(55,61),PO_Status:'Submitted',PO_Commitment_State:'Reserved'},draft(56,64),{...draft(57,61),Request_Type:'Check'},{...draft(58,61),PO_Revision:''}],
    PO_Operation:[{ID:101,Token:'creation-54',Purchase_Order:54,Budget:62,Actor:19,Status:'Complete'}],
    Budget_Modification:[{ID:81,Budget:62,Budget_Item:71,Amount:10,Modification_Type:'Increase',Reference_Number:'PO:52:r52',Status:'Submitted',Component_Reallocation:false}],
    Budget_Approvals:[{ID:111,Budget:62,Type1:'Purchase Order',Sort_Order:1,Title:'CFO',Approver:'cfo@example.com',Status:'Pending',Sent_Date:null,Responded_Date:null,Approval_Notes:''}],
    Approval_Route_Snapshot:[{ID:121,Workflow:'Purchase Order',Record_ID:'52',Submission_Revision:'r52',Context_JSON:JSON.stringify(context),Route_JSON:JSON.stringify({route:[{order:1,role:'CFO',email:'cfo@example.com',userAccessId:'12',reason:'Always',poTestCFO:null}]}),Execution_JSON:'["111"]'}],
    ...tables
  }});
  vm.runInContext('Array.prototype.subList=function(start,end){return this.slice(start,end);};var indexQueries=[]; var originalIndexQuery=query;query=function(form,predicate,sort){indexQueries.push(form);return originalIndexQuery(form,predicate,sort);};',r.c);
  return r;
}
const request={action:'ListRequests',budgetId:'61',userAccessId:'19',budgetIds:['61','62','63']};
function call(r,p=request){r.c.indexPayload=JSON.stringify(p);return JSON.parse(vm.runInContext('managePurchaseOrder(indexPayload)',r.c));}
function queryCount(r,form){return Array.from(r.c.indexQueries).filter(name=>name===form).length;}
let r=fixture(),before=r.tables(),reply=call(r);
assert.equal(reply.success,true,JSON.stringify(reply));
assert.equal(reply.contract,'po-v1');assert.equal(reply.requestIndexContract,'po-request-index-v1');
assert.deepEqual(reply.budgetIds,request.budgetIds);
assert.deepEqual(reply.rows.map(row=>row.id),['51','52','53','54','55'],'Only managed POs in the captured phase scope are returned');
assert.equal(queryCount(r,'Payment_Request'),2,'One batch selection plus the existing approval-bundle identity read; no phase scan');
assert.equal(queryCount(r,'Vendors'),1,'Only used vendors are hydrated once for the whole index');
assert.equal(reply.rows[0].vendorName,'Used Vendor One');assert.equal(reply.rows[1].vendorName,'Used Vendor Two');
assert.equal(reply.rows[0].budgetId,'61');assert.equal(reply.rows[0].description,'Work 51');
assert.equal(reply.rows[0].requestDate,'2026-11-09');assert.equal(reply.rows[0].dateNeeded,'2026-11-10');
assert.deepEqual(reply.rows.map(row=>row.canEditDraft),[true,false,false,true,false],'Owned phase, archived phase and immutable creation ownership retain existing List semantics');
assert.ok(reply.rows.every(row=>row.canEditInFlight===false));
assert.equal(reply.rows[1].budgetModificationId,'81');assert.equal(reply.rows[1].commitmentState,'Reserved');
assert.equal(reply.rows[1].approvalSummaryAvailable,true);
assert.equal(reply.rows[1].approvalBundle.revision,'r52');
assert.equal(reply.rows[1].approvalBundle.modifications[0].id,'81','Existing verified helper supplies the captured child without an API Get');
assert.equal(reply.rows[1].approvals[0].userAccessId,'12');
assert.equal(reply.rows[4].approvalBundle,null,'Legacy reserved POs do not acquire an invented route');
assert.deepEqual(r.tables(),before);assert.equal(r.c.writes,0);assert.equal(r.c.rollups,0);assert.equal(r.c.mails.length,0);

// Supplements have an internal request ID but retain their original business PO identity.
r=fixture({tables:{Payment_Request:[draft(51,61),{...draft(59,61),PO_Kind:'Supplemental',PO_Original:51,PO_Supplement_Number:2}]}});reply=call(r);
assert.equal(reply.rows[0].originalPoId,'');assert.equal(reply.rows[1].id,'59');assert.equal(reply.rows[1].originalPoId,'51');assert.equal(reply.rows[1].supplementNumber,2);assert.equal(r.c.writes,0);

// Creator's native list text format is not a JSON array. The live 102-phase
// payload must never cross a list-to-text-to-JSON round trip or wrapper regex.
const manyPhases=Array.from({length:102},(_,i)=>({ID:61+i,Archived:false,Budget_Owner:[]}));
r=fixture({tables:{Add_Budget:manyPhases,Payment_Request:[]}});
vm.runInContext('Array.prototype.toString=function(){throw Error("Native list serialization must not be used for type validation");};',r.c);
const manyIds=manyPhases.map(budget=>String(budget.ID));
reply=call(r,{...request,budgetIds:manyIds});assert.equal(reply.success,true,JSON.stringify(reply));assert.deepEqual(reply.budgetIds,manyIds);assert.deepEqual(reply.rows,[]);assert.equal(queryCount(r,'Payment_Request'),1);assert.equal(r.c.writes,0);

// Original List remains phase-scoped with its established response shape.
r=fixture();const single=call(r,{action:'List',budgetId:'61',userAccessId:'19'});
assert.equal(single.success,true);assert.deepEqual(single.rows.map(row=>row.id),['51','55']);
assert.equal(single.requestIndexContract,undefined);assert.equal(single.budgetIds,undefined);
for(const row of single.rows)for(const key of ['budgetId','vendorName','description','commitmentState','budgetModificationId','approvalBundle'])assert.equal(Object.hasOwn(row,key),false,key);
assert.equal(single.rows[0].canEditDraft,true);assert.equal(queryCount(r,'Vendors'),0);

// Validate the entire request before reading/returning any PO or vendor rows.
for(const patch of [{budgetIds:null},{budgetIds:'["61"]'},{budgetIds:'61'},{budgetIds:{0:'61'}},{budgetIds:{phase:'61'}},{budgetIds:61},{budgetIds:true},{budgetIds:[]},{budgetIds:[61]},{budgetIds:[null]},{budgetIds:[['61']]},{budgetIds:[{ID:'61'}]},{budgetIds:['61','61']},{budgetIds:['061']},{budgetIds:['62']},{budgetIds:['61','999']},{budgetIds:Array.from({length:501},(_,i)=>String(i+1))},{userAccessId:'12'},{userAccessId:19}]){
  r=fixture();before=r.tables();const invalid=call(r,{...request,...patch});assert.equal(invalid.success,false,JSON.stringify(patch));
  assert.equal(invalid.rows,undefined);assert.equal(queryCount(r,'Payment_Request'),0);assert.equal(queryCount(r,'Vendors'),0);
  assert.deepEqual(r.tables(),before);assert.equal(r.c.writes,0);
}
// Missing captured approval evidence stays explicitly unavailable; no child is invented.
r=fixture({tables:{Approval_Route_Snapshot:[]}});reply=call(r);assert.equal(reply.success,true);assert.equal(reply.rows[1].approvalSummaryAvailable,false);assert.equal(reply.rows[1].approvalBundle,null);
// A foreign linked modification cannot be promoted to an index identity.
r=fixture({tables:{Budget_Modification:[{ID:81,Budget:61}]}});reply=call(r);assert.equal(reply.success,false);assert.equal(reply.rows,undefined);assert.equal(r.c.writes,0);
r=fixture({user:{...actor,Edit_All_Budgets:true}});reply=call(r);assert.equal(reply.rows[1].canEditInFlight,true);assert.equal(reply.rows[2].canEditDraft,false);

const source=fs.readFileSync('creator/functions/managePurchaseOrder.dg','utf8');
const index=source.slice(source.indexOf('if(action == "List" || action == "ListRequests")'),source.indexOf('if(action == "Check")'));
assert.doesNotMatch(index,/insert into|delete from|sendmail|invokeurl|thisapp\.managePurchaseOrder\(|thisapp\.poSnapshot\(/,'The index cannot recurse, replay writes or build full PO line snapshots');
assert.doesNotMatch(index,/typedBudgetIds|budgetIds[^;]*\.toString\(\)[^;]*\.toJSONList\(/,'Native collections are validated with list operations, never serialized type regexes');
console.log('PO Requests bulk backend: authenticated exact phase scope, one batch selection/used-vendor read, native approval children, original List capabilities, denial and zero-write invariants passed.');
