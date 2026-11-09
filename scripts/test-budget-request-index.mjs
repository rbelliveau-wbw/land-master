import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
function source(name){const start=html.indexOf('function '+name+'(');assert.ok(start>=0,name);return html.slice(start,html.indexOf('\n}',start)+2);}
const bid='90071992547409931',poId='90071992547409932',vendorId='90071992547409933',actor='90071992547409934',modId='90071992547409935',itemId='90071992547409936';
const budgets=Array.from({length:102},(_,i)=>({ID:i?String(10000+i):bid}));
const po={id:poId,budgetId:bid,vendorId,vendorName:'Native Vendor',description:'Native Description',amount:'25.00',revision:'r1',status:'Submitted',approvalState:'Pending',commitmentState:'Reserved',budgetModificationId:modId,requestDate:'2026-11-09',approvals:[],approvalBundle:{revision:'r1',modifications:[{id:modId,budgetItemId:itemId,amount:'5.00',reference:'PO:'+poId+':r1',status:'Submitted'}]}};
let scope='actor-one',reads=[],apiReads=[],mods=0,report=[],reply,reportError=null,apiError=null,modError=null,gate=null;
const c=vm.createContext({console,Map,Set,Number,Date,Promise,Error,JSON,S:{budgets,myAccessId:actor,modifications:[]},CFG:{reports:{checkWireRequests:'All_Wire_Requests'}},
 allRequestsScope:()=>scope,allRequestsIndex:null,shortErr:e=>e.message,cleanVal:v=>String(v??'').trim(),lookupId:v=>String(v?.ID||v||''),lookupMatchesId:(v,id)=>v?.ID===id||v===id,auditLog(){},
 ensureBudgetModifications:async()=>{mods++;if(modError)throw modError;},
 sdkGetAllRecords:async(name,criteria,options)=>{reads.push({name,criteria,options});if(reportError)throw reportError;return report;},
 sdkRunBudgetFunction:async(name,args)=>{apiReads.push({name,payload:JSON.parse(args.payload)});if(gate)await gate;if(apiError)throw apiError;return reply;},unwrapBudgetManageResponse:v=>v});c.window=c;
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),c);
for(const name of ['mergeManagedPurchaseOrderRequests','purchaseOrderRequestChildren','loadAllRequestsIndex'])vm.runInContext(source(name),c);
function reset(){reads=[];apiReads=[];mods=0;report=[];reportError=null;apiError=null;modError=null;gate=null;reply={contract:'po-v1',requestIndexContract:'po-request-index-v1',success:true,budgetIds:budgets.map(b=>b.ID),rows:[structuredClone(po)]};}
reset();report=[{ID:poId,checkbox:'false'},{ID:'90071992547409937',Budget:{ID:bid},Request_Type:'Wire',Request_Amount:'50.00'}];
let result=await c.loadAllRequestsIndex(false);
assert.equal(apiReads.length,1,'102 phases require one custom API read');assert.equal(reads.length,1,'One complete report snapshot replaces per-phase count and record reads');assert.equal(reads[0].criteria,'');assert.equal(mods,1);
assert.deepEqual(apiReads[0].payload,{action:'ListRequests',budgetId:bid,budgetIds:budgets.map(b=>b.ID),userAccessId:actor});assert.equal(result.loaded.length,102);
let rows=c.allRequestsIndex.rowsByBudget[bid];assert.equal(rows.length,2);assert.equal(rows[0].Vendor.display_value,'Native Vendor');assert.equal(rows[0].PO_Description,'Native Description');assert.equal(rows[0]._poModifications[0].ID,modId);assert.equal(c.S.modifications.length,0,'Supplemental children never enter financial caches');assert.equal(c.S.checkWireRequestState,undefined,'The index cannot mark phase detail/action caches ready');
reset();reportError={permissionDenied:true};result=await c.loadAllRequestsIndex(true);assert.equal(result.reportDenied,true);assert.equal(c.allRequestsIndex.rowsByBudget[bid][0].ID,poId,'Authorized POs remain available when the generic report is denied');assert.equal(apiReads.length,1);
reset();modError=Error('Mod report denied');result=await c.loadAllRequestsIndex(true);assert.equal(result.mods,false);assert.equal(result.error,'Mod report denied');assert.equal(c.allRequestsIndex.rowsByBudget[bid][0]._poModifications[0].ID,modId);
for(const corrupt of [r=>r.budgetIds.pop(),r=>r.budgetIds.push(r.budgetIds[0]),r=>r.budgetIds[0]=Number(bid),r=>r.rows[0].budgetId='999',r=>r.rows.push({...r.rows[0]}),r=>r.rows[0].vendorId=Number(vendorId),r=>r.rows[0].amount='bad',r=>delete r.requestIndexContract]){
 reset();const old=c.allRequestsIndex;corrupt(reply);await assert.rejects(c.loadAllRequestsIndex(true));assert.equal(c.allRequestsIndex,old,'An invalid response cannot replace a complete index');assert.equal(apiReads.length,1,'No per-phase fallback after a bad/old backend reply');
}
reset();apiError={code:2955,description:'Minute API limit reached'};await assert.rejects(c.loadAllRequestsIndex(true),e=>e.code===2955);assert.equal(apiReads.length,1,'Quota failure is preserved and never triggers remaining phase calls');
reset();apiError=Error('Unsupported PO action.');await assert.rejects(c.loadAllRequestsIndex(true),e=>e.requestsUpdatePending===true);assert.equal(apiReads.length,1,'An old Creator function requires publication, never a phase-scan fallback');
reset();let resolve;gate=new Promise(r=>resolve=r);const old=c.allRequestsIndex,loading=c.loadAllRequestsIndex(true);scope='actor-two';resolve();await loading;assert.equal(c.allRequestsIndex,old,'A stale actor result cannot publish');
Object.assign(c,{allRequestsIndexRevision:0,budgetNavigationToken:()=>1,budgetCreateScope:()=>scope,budgetNavigationCurrent:()=>false,attachmentLinksReady:()=>false,loadCheckWireRequests:async()=>{},refreshBudgetWorkflowState:async()=>{}});c.S.checkWireRequestState={};c.S.edBudget={ID:bid};
vm.runInContext(source('invalidateAllRequestsIndex'),c);
vm.runInContext(source('refreshPurchaseOrderRequestState'),c);await c.refreshPurchaseOrderRequestState({budgetId:bid,status:'Draft'});assert.equal(c.allRequestsIndexRevision,1,'A saved draft invalidates the global index before returning to Requests');
vm.runInContext(source('refreshModSurfaces'),c);c.S.view='vBudgets';c.refreshModSurfaces();assert.equal(c.allRequestsIndexRevision,2,'Standalone modification changes invalidate the same index');
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/budget-requests-workspace.js','utf8'),c);
let finishOld;const oldIndex=new Promise(r=>finishOld=r),host={innerHTML:'',replaceChildren(){this.innerHTML='';},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){}};c.document={activeElement:null,addEventListener(){}};let indexReads=0;c.S.view='vRequests';
c.allRequestsWorkspace=c.LMBudgetRequests.create({host,scope:()=>String(c.allRequestsIndexRevision),budgets:()=>[{ID:bid}],visible:()=>true,entries:()=>[],newRequestKinds:()=>[],loadIndex:()=>++indexReads===1?oldIndex:Promise.resolve({loaded:[bid],failed:[],mods:true})});
const initial=c.allRequestsWorkspace.open();c.invalidateAllRequestsIndex();await c.allRequestsWorkspace.open();finishOld({loaded:[bid],failed:[],mods:true});await initial;assert.equal(c.allRequestsWorkspace.state().status,'loaded');assert.equal(indexReads,2,'A background invalidation restarts the visible load exactly once and stale completion cannot leave Loading stuck');
assert.doesNotMatch(source('loadAllRequestsIndex'),/loadCheckWireRequests|loadPurchaseOrderRequestChildren|poRead|action:\s*['"]Vendors/,'No per-phase, vendor catalog, file or per-PO Get fanout');
console.log('Request index: 102 phases use one API + one report; exact native IDs, embedded children, permission denial, old backend, quota and actor cancellation passed.');
