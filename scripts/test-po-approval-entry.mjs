import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ui=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8');
const widget=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
function body(name){
  const match=new RegExp('^    (?:async )?function '+name+'\\(','m').exec(ui);
  assert.ok(match,name);
  const start=match.index;
  const next=/^    (?:(?:async )?function |return \{open:)/gm;next.lastIndex=start+5;
  const end=next.exec(ui);
  return ui.slice(start,end?end.index:ui.length);
}
const clone=value=>JSON.parse(JSON.stringify(value));
const snapshot={id:'4410926000005902006',budgetId:'4410926000002289002',department:'Development',vendorId:'4410926000005077036',amount:'100.00',description:'',requestDate:'2026-11-09',dateNeeded:'2026-11-11',revision:'saved-pending-revision',status:'Submitted',commitmentState:'Reserved',approvalState:'Pending',canEditInFlight:true,
  lines:[{ID:'4410926000005902042',key:'line-one',budgetItemId:'4410926000002289050',description:'Curb & gutter',costElement:'4',uom:'LF',costCode:'C_EP01-3240-4',pricingMode:'Calculated',quantity:'10',unitPrice:'10.00',finalAmount:'100.00'}],
  approvalBundle:{modifications:[],rows:[{id:'4410926000005902100',order:1,role:'CFO',userAccessId:'4410926000003608012',status:'Pending',notes:''}],active:{id:'4410926000005902100',userAccessId:'4410926000003608012',notes:''},canApprove:true,canRetryEmail:true,emailSent:true}};

function fixture(change={}){
  const nodes=new Map(),reads=[],decisions=[];
  const node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',dataset:{},hidden:false,insertAdjacentHTML(position,html){this.innerHTML=position==='afterbegin'?html+this.innerHTML:this.innerHTML+html;}});return nodes.get(key);};
  const c=vm.createContext({console,Map,Set,Promise,Date,JSON,Error,clearTimeout,document:{activeElement:null}});c.root=c;
  vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),c);
  const saved={...clone(snapshot),...clone(change)};
  Object.assign(c,{model:null,overlay:null,card:null,trigger:null,generation:0,loadGeneration:0,balanceGeneration:0,visualBusy:false,progress:false,deleteReview:false,gridBinding:null,reallocationUI:null,unresolved:{},controller:null,
    current:()=>!!c.model,localDate:()=> '2026-11-09',lineNew:()=>({key:'new-line',budgetItemId:'',description:'',uom:'',costElement:'',pricingMode:'Calculated',quantity:null,unitPrice:null,finalAmount:null}),esc:v=>String(v??''),chevron:'',duplicateIcon:'',x:'',trash:'',
    setDeleteReview(){},closePopover(){},patchBalances(){},patchTotal(){},patchReallocationGate(){},captureRecovery(){},onState(){},mountProgress(){},refresh(){},renderLoadState(){node('footer').innerHTML='Loading';},error:message=>{c.model.error=message;},
    itemRows:()=>[{id:snapshot.lines[0].budgetItemId,name:'Curb & Gutter',label:'C_EP01-3240-4'}],lineCode:()=> 'C_EP01-3240-4',
    readBalances:async()=>({state:'loaded',balances:[]}),useBalances:r=>{c.model.balanceState=r.state;c.model.balances=r.balances;},
    loadVendors:async()=>{c.model.vendors=[{ID:snapshot.vendorId,Vendor_Name:'Fixture vendor'}];},
    call:async request=>{reads.push(clone(request));assert.equal(request.action,'Get');return {contract:'po-v1',success:true,snapshot:clone(saved)};},
    options:{scope:()=> 'Production:assigned-cfo',phaseName:()=> 'Eagle Prairie - Phase 01',canEdit:()=>true,canCreate:()=>true,canEditInFlight:()=>true,canDelete:()=>false,userAccessId:()=> '4410926000003608012'},
    mount(){c.card={querySelector:node,querySelectorAll:()=>[]};c.overlay={querySelector:node};}});
  c.LMPOController={create:()=>({decide:async payload=>{decisions.push(clone(payload));}})};
  for(const name of ['canAmend','canCompose','readOnly','canDelete','canCreateVendor','recoveryEligible','recoveryReady','picker','numericField','field','dateField','render','get','decide','open'])vm.runInContext(body(name),c);
  return {c,nodes,reads,decisions,open:intent=>c.open({ID:snapshot.budgetId},null,snapshot.id,intent),footer:()=>node('footer').innerHTML};
}

// Exact incident combination: the current CFO also has global editing rights.
// A saved link must not silently choose amendment mode and hide decisions.
for(const intent of [undefined,'view','attachments']){
  const f=fixture();await f.open(intent);
  assert.equal(f.c.canAmend(),true,'The actor retains the existing explicit amendment capability');
  assert.equal(f.c.model.preview,true);assert.equal(f.c.readOnly(),true);
  assert.match(f.footer(),/data-po-decision="Approve"/);assert.match(f.footer(),/data-po-decision="Reject"/);
  assert.doesNotMatch(f.footer(),/data-po-save/,'Review cannot submit unseen field edits');
  assert.equal(f.decisions.length,0,'Opening an email/approval link never decides anything');
  f.c.model.approvalNote='Reviewed scope';await f.c.decide('Approve');
  assert.deepEqual(f.decisions,[{action:'Approve',id:snapshot.id,budgetId:snapshot.budgetId,approvalId:snapshot.approvalBundle.active.id,expectedRevision:snapshot.revision,note:'Reviewed scope',userAccessId:'4410926000003608012'}]);
}
let f=fixture();await f.open('edit');assert.equal(f.c.model.preview,false);assert.equal(f.c.readOnly(),false);assert.match(f.footer(),/Save changes/);assert.doesNotMatch(f.footer(),/data-po-decision/,'Explicit pencil edits keep decisions separate from unsaved changes');
f=fixture({approvalBundle:{...clone(snapshot.approvalBundle),canApprove:false,canRetryEmail:false}});await f.open();assert.doesNotMatch(f.footer(),/data-po-decision/);await f.c.decide('Approve');assert.equal(f.decisions.length,0,'An entry mode never grants approval authority');
for(const state of ['Approved','Rejected']){f=fixture({approvalState:state});await f.open();assert.doesNotMatch(f.footer(),/data-po-decision/,'Completed decisions do not reappear');}
f=fixture();await f.open();f.c.model.operationPending=true;f.c.render();assert.doesNotMatch(f.footer(),/data-po-decision/,'Unresolved writes remain quarantined');
f=fixture();await f.c.open({ID:snapshot.budgetId},null);assert.equal(f.c.model.preview,false);assert.match(f.footer(),/data-po-save="Save"/);assert.match(f.footer(),/data-po-save="Submit"/);assert.equal(f.reads.length,0,'New PO composition remains unchanged');

// Execute the actual email deep-link dispatcher, preserving its navigation guard.
const start=widget.indexOf('function applyDeepLink()');assert.ok(start>=0);
const dispatch=widget.slice(start,widget.indexOf('\n}',start)+2),opened=[];
let current=true;
const d=vm.createContext({Promise,cleanVal:v=>String(v??''),budgetNavigationToken:()=> 'nav',budgetNavigationCurrent:()=>current,
  readDeepLinkBudgetId:async()=>snapshot.budgetId,readDeepLinkPage:async()=>'',readDeepLinkModificationId:async()=>'',readDeepLinkPurchaseOrderId:async()=>snapshot.id,readDeepLinkParam:async()=>'',
  poDevelopment:()=>true,S:{edBudget:null},$:()=>null,openPhaseEditor:async id=>{d.S.edBudget={ID:id};},getPurchaseOrderUI:()=>({open:(...args)=>opened.push(args)}),auditLog(){},setMsg(){}});
vm.runInContext(dispatch,d);await d.applyDeepLink();assert.equal(opened.length,1);assert.deepEqual(clone(opened[0]),[{ID:snapshot.budgetId},null,snapshot.id,'view']);
current=false;await d.applyDeepLink();assert.equal(opened.length,1,'Stale navigation cannot reopen an approval');
console.log('PO approval entry: assigned CFO plus global edit grant, existing email/queue links, exact manual decision payload, explicit pencil editing, denied/completed/unresolved states, new drafts and stale navigation passed.');
