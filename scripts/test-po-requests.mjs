import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const widget=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const ui=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8').replace(/\r\n/g,'\n');
function block(source,name,next){
  let start=source.indexOf('function '+name+'(');
  if(source.slice(start-6,start)==='async ')start-=6;
  const end=next?source.indexOf('function '+next+'(',start):source.indexOf('\n}',start)+2;
  assert.ok(start>=0&&end>start,name);return source.slice(start,end);
}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
const budgetId='900000000000000001',poId='900000000000000002',vendorId='900000000000000003';
const draft={ID:poId,Budget:{ID:budgetId},Request_Type:'Purchase Order',Request_Amount:'55.00',Request_Date:'11-Oct-2026',Date_Needed:'20-Oct-2026',Vendor:{ID:vendorId,display_value:'2-C Equipment, LLC'},PO_Status:'Draft',PO_Approval_State:'Not Configured',PO_Revision:'draft-revision',PO_Line_Count:'1'};
let scope='production-session',nav=1,editable=true,response=[draft],opens=[],reads=[],renders=[];
const c=vm.createContext({S:{edBudget:{ID:budgetId},edPhaseIdx:0,globalMode:'modifications',checkWireRequestState:{},checkWireRequestsByBudget:{}},CFG:{reports:{checkWireRequests:'All_Wire_Requests'}},
  Promise,Set,Error,JSON,Number,cleanVal:value=>String(value??'').trim(),firstRaw:(row,keys)=>row[keys[0]],lookupId:value=>String(value?.ID||value||''),lookupName:value=>value?.display_value||'',lookupMatchesId:(value,id)=>value?.ID===id||value===id,
  esc:value=>String(value??''),escAttr:value=>String(value??''),findItemById:()=>null,fmt:value=>'$'+value,v:value=>Number(value),modBadge:status=>'<span>'+status+'</span>',poDevelopment:()=>true,canEditBudget:()=>editable,
  budgetNavigationToken:()=>nav,budgetNavigationCurrent:(token,view,id)=>token===nav&&c.S.edBudget?.ID===id,budgetCreateScope:()=>scope,renderModPhasePanel:budget=>renders.push(budget.ID),auditLog(){},toastShow(){},requireBudgetRequestDetail:()=>true,
  sdkGetAllRecords:(report,criteria,options)=>{reads.push({report,criteria,options});return typeof response==='function'?response():Promise.resolve(response);},
  getPurchaseOrderUI:()=>({open:async(budget,trigger,id)=>opens.push({budget,trigger,id})})
});c.window=c;
for(const name of ['loadCheckWireRequests','savedPurchaseOrderRequest','openSavedPurchaseOrder','renderCheckWireRequestColumn'])vm.runInContext(block(widget,name),c);
await c.loadCheckWireRequests(budgetId);
assert.equal(c.S.checkWireRequestState[budgetId],'loaded');
assert.match(reads[0].criteria,new RegExp('Budget == '+budgetId));
for(const field of ['Vendor','PO_Status','PO_Approval_State','PO_Revision','PO_Line_Count'])assert.ok(reads[0].options.fields.includes(field),'Explicit PO projection includes '+field);
let html=c.renderCheckWireRequestColumn(c.S.edBudget);
assert.match(html,/2-C Equipment, LLC/);assert.match(html,/Draft/);assert.match(html,new RegExp("data-request-po-open='"+poId+"'"));assert.match(html,/>Edit PO<\/button>/);
const trigger={id:'edit-po'};await c.openSavedPurchaseOrder(poId,trigger);
assert.equal(opens[0].id,poId);assert.equal(opens[0].budget.ID,budgetId);assert.equal(opens[0].trigger,trigger);
editable=false;assert.match(c.renderCheckWireRequestColumn(c.S.edBudget),/>View PO<\/button>/);editable=true;
for(const approval of ['Pending','Approved']){c.S.checkWireRequestsByBudget[budgetId]=[{...draft,PO_Status:'Submitted',PO_Approval_State:approval}];assert.match(c.renderCheckWireRequestColumn(c.S.edBudget),/>View PO<\/button>/);}
c.S.checkWireRequestsByBudget[budgetId]=[{...draft,PO_Status:'Submitted',PO_Approval_State:'Rejected'}];assert.match(c.renderCheckWireRequestColumn(c.S.edBudget),/>Edit PO<\/button>/);
for(const changed of [{Request_Type:'Check'},{PO_Revision:''},{ID:Number(poId)},{Budget:{ID:'another-budget'}}]){c.S.checkWireRequestsByBudget[budgetId]=[{...draft,...changed}];assert.doesNotMatch(c.renderCheckWireRequestColumn(c.S.edBudget),/data-request-po-open/);await c.openSavedPurchaseOrder(poId,trigger);}
assert.equal(opens.length,1,'Foreign, legacy and rounded identities never open an editor');
c.S.checkWireRequestsByBudget[budgetId]=[draft];c.S.edPhaseIdx='all';await c.openSavedPurchaseOrder(poId,trigger);assert.equal(opens.length,1);c.S.edPhaseIdx=0;
c.S.checkWireRequestState[budgetId]='loading';await c.openSavedPurchaseOrder(poId,trigger);assert.equal(opens.length,1,'Unverified lists cannot open a saved PO');
assert.match(widget,/savedPO\.dataset\.requestPoOpen,savedPO/,'Requests action dispatches the exact PO ID and focus trigger');

// Saving reloads the Requests report instead of leaving its cache at truthy "idle".
c.purchaseOrderUI=null;c.LMPOUI={create:options=>{c.poOptions=options;return {};}};c.canEditBudget=()=>true;c.phaseName=()=>'';c.closeRequestDatePicker=()=>{};
vm.runInContext(block(widget,'getPurchaseOrderUI','openCheckWireRequest'),c);c.getPurchaseOrderUI();
let refresh;
c.loadCheckWireRequests=(id,fresh)=>{refresh={id,fresh};};c.S.checkWireRequestState[budgetId]='loaded';c.poOptions.saved({budgetId});
assert.deepEqual(refresh,{id:budgetId,fresh:true});assert.equal(c.S.checkWireRequestState[budgetId],undefined);
vm.runInContext(block(widget,'loadCheckWireRequests'),c);

// Fresh reads supersede older replies; errors or foreign rows stay unavailable.
const old=deferred(),fresh=deferred();response=()=>old.promise;const first=c.loadCheckWireRequests(budgetId);
assert.equal(c.loadCheckWireRequests(budgetId),first,'Concurrent request reads deduplicate');
response=()=>fresh.promise;const second=c.loadCheckWireRequests(budgetId,true);fresh.resolve([{...draft,Request_Amount:'60.00'}]);await second;
old.resolve([draft]);await first;assert.equal(c.S.checkWireRequestsByBudget[budgetId][0].Request_Amount,'60.00');assert.equal(reads.at(-1).options.fresh,true);
for(const invalid of [[{...draft,Budget:{ID:'elsewhere'}}],[draft,draft],[{...draft,ID:Number(poId)}]]){response=invalid;await c.loadCheckWireRequests(budgetId,true);assert.equal(c.S.checkWireRequestState[budgetId],'unavailable');}
response=()=>Promise.reject(new Error('Report denied'));await c.loadCheckWireRequests(budgetId,true);assert.equal(c.S.checkWireRequestState[budgetId],'unavailable');
const changed=deferred();response=()=>changed.promise;const pending=c.loadCheckWireRequests(budgetId,true);scope='another-session';changed.resolve([draft]);await pending;assert.equal(c.S.checkWireRequestState[budgetId],'loading','A stale session cannot publish requests');scope='production-session';

// Opening a saved PO cannot save a blank new draft before its exact Get completes.
const u=vm.createContext({Promise,Set,Error,Date,JSON});vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),u);u.root=u;
u.model={budgetId,editable:true,approvalBundle:{canApprove:true},approvalNote:'Old note'};u.generation=1;u.loadGeneration=0;u.current=()=>true;u.render=()=>{};u.refresh=()=>{};u.error=message=>{u.model.error=message;};
vm.runInContext(block(ui,'readOnly','picker'),u);vm.runInContext(block(ui,'get','click'),u);
const snapshot={id:poId,budgetId,vendorId,amount:'55.00',requestDate:'2026-10-11',dateNeeded:'2026-10-20',revision:'saved-revision',status:'Draft',commitmentState:'None',approvalState:'Not Configured',lines:[{ID:'900000000000000004',key:'line-one',budgetItemId:'900000000000000005',description:'PO test',uom:'EA',costElement:'5',pricingMode:'Calculated',quantity:'1',unitPrice:'55.00',finalAmount:'55.00'}]};
let getReply=deferred();u.call=()=>getReply.promise;const loading=u.get(poId);
assert.equal(u.readOnly(),true);assert.equal(u.model.approvalBundle,null);assert.equal(u.model.approvalNote,'');
getReply.resolve({contract:'po-v1',success:true,snapshot});await loading;
assert.equal(u.readOnly(),false);assert.equal(u.model.id,poId);assert.equal(u.model.revision,'saved-revision');
for(const bad of [{...snapshot,id:'another-po'},{...snapshot,budgetId:'another-budget'}]){u.call=async()=>({contract:'po-v1',success:true,snapshot:bad});await u.get(poId);assert.equal(u.model.loadState,'unavailable');assert.equal(u.readOnly(),true);}
const before=deferred(),after=deferred();u.call=payload=>payload.id===poId?before.promise:after.promise;const earlier=u.get(poId),later=u.get('900000000000000006');
after.resolve({contract:'po-v1',success:true,snapshot:{...snapshot,id:'900000000000000006'}});await later;before.resolve({contract:'po-v1',success:true,snapshot});await earlier;
assert.equal(u.model.id,'900000000000000006','A late saved PO reply cannot replace the latest selection');
assert.match(ui,/loadState:purchaseOrderId\?'loading':'loaded'/,'Direct saved-PO entry starts locked while vendors load');
assert.match(ui,/data-po-reload/,'Failed loads offer a read-only retry');
console.log('PO Requests: exact saved draft editing, permission/status labels, explicit projection, fresh saved-list reloads and guarded Get recovery passed.');
