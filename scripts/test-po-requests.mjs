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
const managedPO={id:poId,amount:'55.00',status:'Draft',revision:'draft-revision',vendorId};
const managedResponse={contract:'po-v1',success:true,rows:[managedPO]},vendorResponse={contract:'po-v1',success:true,vendors:[{ID:vendorId,Vendor_Name:'2-C Equipment, LLC'}]};
let scope='production-session',nav=1,editable=true,response=[{ID:poId,checkbox:'false'}],opens=[],reads=[],apiReads=[],renders=[],apiFailure='';
const c=vm.createContext({S:{myAccessId:'900000000000000007',edBudget:{ID:budgetId},edPhaseIdx:0,globalMode:'modifications',checkWireRequestState:{},checkWireRequestsByBudget:{}},CFG:{reports:{checkWireRequests:'All_Wire_Requests'}},
  Promise,Set,Error,JSON,Number,cleanVal:value=>String(value??'').trim(),firstRaw:(row,keys)=>row[keys[0]],lookupId:value=>String(value?.ID||value||''),lookupName:value=>value?.display_value||'',lookupMatchesId:(value,id)=>value?.ID===id||value===id,
  esc:value=>String(value??''),escAttr:value=>String(value??''),findItemById:()=>null,fmt:value=>'$'+value,v:value=>Number(value),modBadge:status=>'<span>'+status+'</span>',poDevelopment:()=>true,canEditBudget:()=>editable,
  budgetNavigationToken:()=>nav,budgetNavigationCurrent:(token,view,id)=>token===nav&&c.S.edBudget?.ID===id,budgetCreateScope:()=>scope,renderModPhasePanel:budget=>renders.push(budget.ID),auditLog(){},toastShow(){},requireBudgetRequestDetail:()=>true,
  sdkGetAllRecords:(report,criteria,options)=>{reads.push({report,criteria,options});return typeof response==='function'?response():Promise.resolve(response);},
  unwrapBudgetManageResponse:value=>value,
  sdkRunBudgetFunction:async(name,args)=>{assert.equal(name,'managePurchaseOrder');const payload=JSON.parse(args.payload);assert.equal(payload.budgetId,budgetId);assert.equal(payload.userAccessId,c.S.myAccessId);apiReads.push(payload);if(payload.action===apiFailure)throw new Error('PO read unavailable');return JSON.parse(JSON.stringify(payload.action==='List'?managedResponse:vendorResponse));},
  getPurchaseOrderUI:()=>({open:async(budget,trigger,id)=>opens.push({budget,trigger,id})})
});c.window=c;
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),c);
for(const name of ['loadCheckWireRequests','mergeManagedPurchaseOrderRequests','savedPurchaseOrderRequest','openSavedPurchaseOrder','requestDateParts','fmtDateUS','poRequestCardDate','poApprovalRoleLabel','poApproverCircles','poApprovalDetailsHtml','renderCheckWireRequestColumn'])vm.runInContext(block(widget,name),c);
for(const [input,output]of [['2026-10-12','10/12/2026'],['1/2/2026','01/02/2026'],['2024-02-29','02/29/2024'],['2026-02-29','—'],['','—'],['bad-date','—']])assert.equal(c.poRequestCardDate(input),output);
await c.loadCheckWireRequests(budgetId);
assert.equal(c.S.checkWireRequestState[budgetId],'loaded');
assert.match(reads[0].criteria,new RegExp('Budget == '+budgetId));
assert.equal(reads[0].options.fields,undefined,'A native report with zero exposed columns uses all fields');
assert.deepEqual(apiReads.map(read=>read.action),['List','Vendors'],'Managed PO metadata and vendors read once per phase, without per-row Get');
assert.equal(c.S.checkWireRequestsByBudget[budgetId].length,1,'The blank native row and its managed PO merge once');
let html=c.renderCheckWireRequestColumn(c.S.edBudget);
assert.match(html,/2-C Equipment, LLC/);assert.match(html,/Draft/);assert.match(html,new RegExp("data-request-po-open='"+poId+"'"));assert.match(html,/aria-label='Edit PO'/);
assert.doesNotMatch(html,/mpc-meta|Request · Budget item/,'Managed rows without native dates do not show fabricated dashes or blank duplicates');
assert.equal(c.mergeManagedPurchaseOrderRequests([],managedResponse,vendorResponse,budgetId).length,1,'List POs missing from report layout still appear');
const complete=c.mergeManagedPurchaseOrderRequests([draft],managedResponse,vendorResponse,budgetId);assert.equal(complete[0].Request_Date,draft.Request_Date,'Native generic dates are retained when available');
managedPO.requestDate='2026-10-12';managedPO.dateNeeded='2026-10-20';
const dated=c.mergeManagedPurchaseOrderRequests([],managedResponse,vendorResponse,budgetId);assert.equal(dated[0].Request_Date,'2026-10-12','API-only profiles receive header dates without a per-row Get');assert.equal(dated[0].Date_Needed,'2026-10-20');
assert.equal(c.mergeManagedPurchaseOrderRequests([draft],managedResponse,vendorResponse,budgetId)[0].Request_Date,'2026-10-12','Managed header dates override stale generic metadata');
c.S.checkWireRequestsByBudget[budgetId]=dated;assert.match(c.renderCheckWireRequestColumn(c.S.edBudget),/10\/12\/2026/);
managedPO.status='Submitted';managedPO.approvalState='Approved';const approved=c.mergeManagedPurchaseOrderRequests([],managedResponse,vendorResponse,budgetId);assert.equal(approved[0].PO_Approval_State,'Approved');c.S.checkWireRequestsByBudget[budgetId]=approved;assert.match(c.renderCheckWireRequestColumn(c.S.edBudget),/>Approved<\/span>/,'API-only profiles show final approval status instead of Submitted');managedPO.status='Draft';managedPO.approvalState='Not Configured';c.S.checkWireRequestsByBudget[budgetId]=dated;
assert.equal(complete[0].Request_Amount,managedPO.amount,'Authoritative managed amount overrides same-ID generic metadata');
const check={ID:'900000000000000008',Budget:{ID:budgetId},Request_Type:'Check',Request_Amount:'10.00'};
assert.equal(c.mergeManagedPurchaseOrderRequests([check,draft],managedResponse,vendorResponse,budgetId).length,2,'Other payment requests remain in the list');
const trigger={id:'edit-po'};await c.openSavedPurchaseOrder(poId,trigger);
assert.equal(opens[0].id,poId);assert.equal(opens[0].budget.ID,budgetId);assert.equal(opens[0].trigger,trigger);
editable=false;assert.match(c.renderCheckWireRequestColumn(c.S.edBudget),/aria-label='Preview PO'/);editable=true;
for(const approval of ['Pending','Approved']){c.S.checkWireRequestsByBudget[budgetId]=[{...draft,PO_Status:'Submitted',PO_Approval_State:approval}];assert.match(c.renderCheckWireRequestColumn(c.S.edBudget),/aria-label='Preview PO'/);}
c.S.checkWireRequestsByBudget[budgetId]=[{...draft,PO_Status:'Submitted',PO_Approval_State:'Rejected'}];assert.match(c.renderCheckWireRequestColumn(c.S.edBudget),/aria-label='Edit PO'/);
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
response=()=>fresh.promise;managedPO.amount='60.00';const second=c.loadCheckWireRequests(budgetId,true);fresh.resolve([{...draft,Request_Amount:'50.00'}]);await second;
old.resolve([draft]);await first;assert.equal(c.S.checkWireRequestsByBudget[budgetId][0].Request_Amount,'60.00');assert.equal(reads.at(-1).options.fresh,true);
for(const invalid of [[{...draft,Budget:{ID:'elsewhere'}}],[{...draft,Budget:null}],[draft,draft],[{...draft,ID:Number(poId)}]]){response=invalid;await c.loadCheckWireRequests(budgetId,true);assert.equal(c.S.checkWireRequestState[budgetId],'unavailable');}
for(const changed of [{id:Number(poId)},{revision:''},{status:'Unknown'},{vendorId:Number(vendorId)},{vendorId:'900000000000000099'},{amount:55},{amount:'0.00'},{amount:'55.001'},{budgetId:'900000000000000099'}])assert.throws(()=>c.mergeManagedPurchaseOrderRequests([{ID:poId}],{...managedResponse,rows:[{...managedPO,...changed}]},vendorResponse,budgetId));
assert.throws(()=>c.mergeManagedPurchaseOrderRequests([{ID:poId}],{...managedResponse,rows:[managedPO,managedPO]},vendorResponse,budgetId),/identities/);
for(const vendors of [vendorResponse.vendors.concat(vendorResponse.vendors),[{ID:Number(vendorId),Vendor_Name:'Rounded'}],[{ID:vendorId,Vendor_Name:''}]])assert.throws(()=>c.mergeManagedPurchaseOrderRequests([{ID:poId}],managedResponse,{...vendorResponse,vendors},budgetId),/vendor identities/);
response=[{ID:poId}];for(const action of ['List','Vendors']){apiFailure=action;await c.loadCheckWireRequests(budgetId,true);assert.equal(c.S.checkWireRequestState[budgetId],'unavailable','Partial managed reads fail closed');}apiFailure='';
response=()=>Promise.reject(new Error('Report denied'));await c.loadCheckWireRequests(budgetId,true);assert.equal(c.S.checkWireRequestState[budgetId],'unavailable');
response=()=>Promise.reject(Object.assign(new Error('Profile cannot view Check/Wire requests'),{permissionDenied:true}));
await c.loadCheckWireRequests(budgetId,true);
assert.equal(c.S.checkWireRequestState[budgetId],'loaded','An authorized PO API result survives a denied independent Check/Wire report');
assert.equal(c.S.checkWireRequestsByBudget[budgetId][0].ID,poId);
assert.match(c.renderCheckWireRequestColumn(c.S.edBudget),/Check \/ wire requests unavailable for this profile/);
assert.match(c.renderCheckWireRequestColumn(c.S.edBudget),/Edit PO/);
apiFailure='List';await c.loadCheckWireRequests(budgetId,true);assert.equal(c.S.checkWireRequestState[budgetId],'unavailable','Report denial never conceals a failed PO authorization');apiFailure='';
const changed=deferred();response=()=>changed.promise;const pending=c.loadCheckWireRequests(budgetId,true);scope='another-session';changed.resolve([draft]);await pending;assert.equal(c.S.checkWireRequestState[budgetId],'loading','A stale session cannot publish requests');scope='production-session';

// Opening a saved PO cannot save a blank new draft before its exact Get completes.
const u=vm.createContext({Promise,Set,Error,Date,JSON});vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),u);u.root=u;u.gridBinding=null;
u.model={budgetId,editable:true,approvalBundle:{canApprove:true},approvalNote:'Old note'};u.generation=1;u.loadGeneration=0;u.current=()=>true;u.render=()=>{};u.refresh=()=>{};u.error=message=>{u.model.error=message;};
vm.runInContext(block(ui,'readOnly','picker'),u);vm.runInContext(block(ui,'get','click'),u);
const snapshot={id:poId,budgetId,vendorId,amount:'55.00',requestDate:'2026-10-11',dateNeeded:'2026-10-20',revision:'saved-revision',status:'Draft',commitmentState:'None',approvalState:'Not Configured',lines:[{ID:'900000000000000004',key:'line-one',budgetItemId:'900000000000000005',description:'PO test',uom:'EA',costElement:'5',pricingMode:'Calculated',quantity:'1',unitPrice:'55.00',finalAmount:'55.00'}]};
let getReply=deferred(),vendorsReady=deferred(),getCalls=0;u.call=()=>{getCalls++;return getReply.promise;};const loading=u.get(poId,vendorsReady.promise);assert.equal(getCalls,1,'Get starts while the independent vendor read is pending');
assert.equal(u.readOnly(),true);assert.equal(u.model.approvalBundle,null);assert.equal(u.model.approvalNote,'');
getReply.resolve({contract:'po-v1',success:true,snapshot});await new Promise(resolve=>setImmediate(resolve));assert.equal(u.model.loadState,'loading','A fast snapshot cannot reveal an empty vendor picker');vendorsReady.resolve();await loading;
assert.equal(u.readOnly(),false);assert.equal(u.model.id,poId);assert.equal(u.model.revision,'saved-revision');
for(const bad of [{...snapshot,id:'another-po'},{...snapshot,budgetId:'another-budget'}]){u.call=async()=>({contract:'po-v1',success:true,snapshot:bad});await u.get(poId);assert.equal(u.model.loadState,'unavailable');assert.equal(u.readOnly(),true);}
const before=deferred(),after=deferred();u.call=payload=>payload.id===poId?before.promise:after.promise;const earlier=u.get(poId),later=u.get('900000000000000006');
after.resolve({contract:'po-v1',success:true,snapshot:{...snapshot,id:'900000000000000006'}});await later;before.resolve({contract:'po-v1',success:true,snapshot});await earlier;
assert.equal(u.model.id,'900000000000000006','A late saved PO reply cannot replace the latest selection');
assert.match(ui,/loadState:purchaseOrderId\?'loading':'loaded'/,'Direct saved-PO entry starts locked while vendors load');
assert.match(ui,/data-po-reload/,'Failed loads offer a read-only retry');
console.log('PO Requests: blank native report, scoped List/Vendors merge, exact draft editing, fresh reads, malformed/foreign identities and guarded Get recovery passed.');

const routeRows=[{id:'901',order:1,role:'VP',email:'vp@example.com',userAccessId:'11',name:'Vera Person',status:'Approved',sentDate:'2026-10-10',respondedDate:'2026-10-11'},{id:'902',order:2,role:'CFO',email:'cfo@example.com',userAccessId:'12',name:'Robby Belliveau',status:'Pending',sentDate:'2026-10-12',respondedDate:null},{id:'903',order:3,role:'COO',email:'coo@example.com',userAccessId:'13',name:'Chris Officer',status:'Rejected',sentDate:null,respondedDate:'2026-10-13'}];
const circleHtml=c.poApproverCircles({...draft,_poApprovals:routeRows});for(const status of ['Approved','Pending','Rejected'])assert.match(circleHtml,new RegExp("data-status='"+status+"'"));assert.match(circleHtml,/>CFO<\/span>/);assert.match(circleHtml,/data-request-po-approvals/);assert.equal(c.poApprovalRoleLabel({role:'VP',name:'Émile Ng'}),'VP');assert.equal(c.poApprovalRoleLabel({role:''}),'?');assert.doesNotMatch(c.poApproverCircles({...draft,_poApprovals:[]}),/data-request-po-approvals/);
const detail=c.poApprovalDetailsHtml(routeRows);assert.match(detail,/Robby Belliveau/);assert.match(detail,/10\/12\/2026/);assert.match(detail,/10\/13\/2026/);assert.match(detail,/Pending/);console.log('PO approver circles: captured roles, all recorded states, no invented draft chain and succinct dated details passed.');

// Download uses one read-only call, exact scope and the established Blob helper.
c.poDownloads=new Set();c.Blob=Blob;let blobs=[],downloadCalls=0; c.triggerBlobDownload=(blob,filename)=>blobs.push({blob,filename});
vm.runInContext(block(widget,'downloadSavedPurchaseOrder'),c); c.S.edBudget={ID:budgetId};c.S.edPhaseIdx=0;c.S.checkWireRequestState[budgetId]='loaded';c.S.checkWireRequestsByBudget[budgetId]=[draft];
const downloadButton=()=>({innerHTML:'download-icon',disabled:false,isConnected:true,setAttribute(){},removeAttribute(){}});
const file={contract:'po-v1',success:true,id:poId,budgetId,filename:'Purchase_Order_'+poId+'.xls',content:"<?xml version='1.0'?><Workbook></Workbook>"};
let waiting=deferred();c.sdkRunBudgetFunction=(name,args)=>{const p=JSON.parse(args.payload);assert.equal(name,'managePurchaseOrder');assert.equal(p.action,'Download');assert.equal(p.id,poId);assert.equal(p.budgetId,budgetId);downloadCalls++;return waiting.promise;};
let button=downloadButton(),firstDownload=c.downloadSavedPurchaseOrder(poId,button);assert.equal(button.disabled,true);await c.downloadSavedPurchaseOrder(poId,downloadButton());assert.equal(downloadCalls,1);waiting.resolve(file);await firstDownload;assert.equal(blobs.length,1);assert.equal(blobs[0].filename,file.filename);assert.equal(await blobs[0].blob.text(),file.content);assert.equal(button.disabled,false);
waiting=deferred();button=downloadButton();const staleDownload=c.downloadSavedPurchaseOrder(poId,button);scope='changed-download-actor';waiting.resolve(file);await staleDownload;assert.equal(blobs.length,1,'Stale actor/phase cannot download');scope='production-session';
for(const changed of [{id:'another-po'},{budgetId:'another-budget'},{filename:'wrong.xls'},{content:'not Excel'},{success:false}]){c.sdkRunBudgetFunction=async()=>({...file,...changed});await c.downloadSavedPurchaseOrder(poId,downloadButton());assert.equal(blobs.length,1,'Invalid downloaded PO cannot reach Blob helper');}
console.log('PO download: one read-only request, duplicate exclusion, exact identity/filename/format, stale actor rejection and button restoration passed.');
