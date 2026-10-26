import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const widget=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const ui=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8').replace(/\r\n/g,'\n');
function helper(source,name){
  const match=new RegExp('(?:async )?function '+name+'\\(').exec(source);
  assert.ok(match,name);
  const start=match.index,lineEnd=source.indexOf('\n',start),line=source.slice(start,lineEnd);
  if(line.trimEnd().endsWith('}'))return line;
  if(source===ui){const next=/\n    (?:async )?function /.exec(source.slice(lineEnd));assert.ok(next,name+' end');return source.slice(start,lineEnd+next.index);}
  return source.slice(start,source.indexOf('\n}',start)+2);
}
const budget={ID:'90071992547409931',Budget_Owner:['90071992547409932']};
const c=vm.createContext({S:{myAccessId:'90071992547409933',edBudget:budget},
  accessTruthy:v=>v===true||v==='true',applyHardcodedPerms(){},auditLog(){},$:()=>null,
  userOwnsBudget:b=>(b.Budget_Owner||[]).includes(c.S.myAccessId),cleanVal:v=>String(v??'').trim()
});
for(const name of ['applyPermsFromFlags','perms','canEditBudget','canCreatePurchaseOrder','canStartBudgetRequest','canEditPurchaseOrderRequest','canAdminMods','canDeleteBudgetRequest','canSubmitMod','canEditBudgetOwners','canCreateBudget','canActApproval'])vm.runInContext(helper(widget,name),c);
c.applyPermsFromFlags({hasRow:true,myId:c.S.myAccessId,poCreate:true},'create-only');
assert.equal(c.S.perms.poCreate,true);
assert.equal(c.S.perms.anyEdit,false);
assert.equal(c.S.perms.readOnly,true,'PO creation is separate from Budget editing');
assert.equal(c.canEditBudget(budget),false);
for(const name of ['canSubmitMod','canDeleteBudgetRequest','canActApproval'])assert.equal(c[name](budget),false,name);
assert.equal(c.canEditBudgetOwners(),false);
assert.equal(c.canCreateBudget(),false);
for(const kind of ['modification','check','wire'])assert.equal(c.canStartBudgetRequest(kind,budget),false,kind);
assert.equal(c.canStartBudgetRequest('purchase-order',budget),true);
const own={PO_Status:'Draft',PO_Approval_State:'Not Configured',_poCanEditDraft:true};
assert.equal(c.canEditPurchaseOrderRequest(budget,own),true,'Native ownership capability reopens own Draft');
for(const change of [{_poCanEditDraft:false},{_poCanEditDraft:'true'},{_poCanEditDraft:undefined},...['Pending','Rejected','Approved'].map(state=>({PO_Status:'Submitted',PO_Approval_State:state,_poCanEditInFlight:true}))])assert.equal(c.canEditPurchaseOrderRequest(budget,{...own,...change}),false,'A create-only grant cannot edit another Draft or submitted PO');
c.S.myAccessId='';assert.equal(c.canCreatePurchaseOrder(budget),false,'A grant without an authenticated User Access identity stays denied');c.S.myAccessId='90071992547409933';
c.applyPermsFromFlags({hasRow:true,myId:c.S.myAccessId,Create_Purchase_Orders:'true'},'native-field');assert.equal(c.S.perms.poCreate,true);
c.applyPermsFromFlags({hasRow:true,myId:c.S.myAccessId},'old-response');assert.equal(c.S.perms.poCreate,false,'An older access response fails closed for the additive grant');
assert.equal(c.canEditPurchaseOrderRequest(budget,own),false,'Revoking the grant invalidates a stale Draft pencil');
c.budgetSdkCode=()=>'';
for(const name of ['parseLeanBudgetAccessResponse','validLeanBudgetAccess'])vm.runInContext(helper(widget,name),c);
const access={found:true,hasRow:true,myId:c.S.myAccessId,users:[{id:c.S.myAccessId,label:'Demo Construction',email:'demo'}]};
for(const flag of ['editAll','editOwned','apprAll','apprOwned','send','editOwners','viewImports','editImports','modAdmin','budgetDeleteArchive'])access[flag]=false;
assert.equal(c.validLeanBudgetAccess(access),true,'Legacy access responses remain compatible');
for(const flag of [true,false])assert.equal(c.validLeanBudgetAccess({...access,poCreate:flag}),true);
for(const flag of ['true',1,null,{},[]])assert.equal(c.validLeanBudgetAccess({...access,poCreate:flag}),false,'New lean permission requires a native boolean');
const envelope={code:3000,result:{...access,poCreate:true},response:JSON.stringify({...access,poCreate:false})};
assert.throws(()=>c.parseLeanBudgetAccessResponse(envelope),/conflicting or failed lean access/,'Repeated envelopes cannot disagree on PO creation');
assert.equal(c.parseLeanBudgetAccessResponse({...envelope,response:JSON.stringify(envelope.result)}).poCreate,true);
for(const permission of ['editAll','editOwned']){
  c.applyPermsFromFlags({hasRow:true,myId:budget.Budget_Owner[0],[permission]:true},'legacy-editor');
  assert.equal(c.canCreatePurchaseOrder(budget),true,permission+' retains creation without the new flag');
  assert.equal(c.canEditPurchaseOrderRequest(budget,{...own,_poCanEditDraft:false}),true,permission+' retains existing Draft editing');
  assert.equal(c.canEditPurchaseOrderRequest(budget,{...own,PO_Status:'Submitted',PO_Approval_State:'Rejected'}),true,permission+' retains rejected resubmission');
}
c.applyPermsFromFlags({hasRow:true,myId:'90071992547409933',editOwned:true},'other-budget');
assert.equal(c.canCreatePurchaseOrder(budget),false,'Edit Owned still observes Budget ownership');

// Execute the shipped composer permission and save paths. Save/Submit are the
// only writes this fixture accepts; no Budget, Vendor or other-request API runs.
let creation=true,editor=false,vendorCreates=0;
const calls=[];
const u=vm.createContext({model:{budgetId:budget.ID,editable:false,loadState:'loaded',status:'Draft',approvalState:'Not Configured',
  vendorId:'90071992547409934',vendors:[{ID:'90071992547409934',Vendor_Name:'Existing Vendor'}],requestDate:'2026-10-26',dateNeeded:'2026-11-01',
  revision:'',reservedLines:[],lines:[{key:'one',budgetItemId:'90071992547409935',description:'Survey',uom:'EA',costElement:'5',pricingMode:'Manual',quantity:null,unitPrice:null,finalAmount:'15.25'}],
  balanceState:'loaded',balances:[{budgetItemId:'90071992547409935',availableCents:'2000',pendingModificationCents:'0'}]},
  options:{canCreate:()=>creation,canEdit:()=>editor,canDelete:()=>editor,canEditInFlight:()=>editor,canCreateVendor:()=>editor,userAccessId:()=>c.S.myAccessId,createVendor:()=>{vendorCreates++;}},
  current:()=>true,progress:false,visualBusy:false,uid:()=> 'local-test-token',mountProgress(){},lineCode:()=> 'C_CB01-3130-5',error:m=>{throw Error(m);},
  allocationRows:()=>[{budgetItemId:'90071992547409935',verified:true,available:2000n,pending:0n}],controller:{begin:async p=>{calls.push(p);}}
});u.root=u;
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),u);
for(const name of ['canAmend','canCompose','readOnly','canDelete','canCreateVendor','dateValid','totals','save'])vm.runInContext(helper(ui,name),u);
assert.equal(u.readOnly(),false,'Create-only user can compose a new PO');
assert.equal(u.canCreateVendor(),false,'PO creation does not grant Vendor creation');
assert.equal(u.canDelete(),false);
await u.save('Save');await u.save('Submit');
assert.deepEqual(calls.map(p=>p.action),['Save','Submit']);
assert.equal(calls[0].amount,'15.25');
assert.equal(calls[1].automaticModifications,true,'Existing PO approval/overage routing is preserved');
assert.equal(calls[1].budgetModificationId,null,'Creation does not grant linking/editing a standalone modification');
Object.assign(u.model,{id:'90071992547409936',revision:'native-draft',canEditDraft:true});
assert.equal(u.readOnly(),false,'Own Draft has the authoritative capability');await u.save('Save');
u.model.canEditDraft=false;assert.equal(u.readOnly(),true);await u.save('Save');assert.equal(calls.length,3,'Another person\'s Draft cannot save');
u.model.canEditDraft=true;creation=false;assert.equal(u.readOnly(),true);await u.save('Submit');assert.equal(calls.length,3,'Revocation blocks stale composer Submit');creation=true;
for(const state of ['Pending','Rejected','Approved']){Object.assign(u.model,{status:'Submitted',approvalState:state,canEditInFlight:true});assert.equal(u.readOnly(),true);await u.save('Save');}
assert.equal(calls.length,3,'Submitted POs remain read-only for create-only users');
editor=true;assert.equal(u.canCreateVendor(),true,'Existing Budget editors retain Vendor creation');
assert.equal(vendorCreates,0,'Capability checks make no native write');
editor=false;Object.assign(u.model,{status:'Draft',approvalState:'Not Configured',commitmentState:'None',canEditDraft:true});
Object.assign(u,{generation:1,loadGeneration:0,balanceGeneration:0,render(){},captureRecovery(){},readBalances:async()=>({state:'loaded',balances:[]}),useBalances(){}});
const oldSnapshot=JSON.parse(JSON.stringify(u.model));delete oldSnapshot.canEditDraft;delete oldSnapshot.canEditInFlight;
oldSnapshot.amount='15.25';u.call=async()=>({contract:'po-v1',success:true,snapshot:oldSnapshot});
vm.runInContext(helper(ui,'get'),u);await u.get(u.model.id);
assert.equal(u.model.canEditDraft,false,'An older snapshot cannot inherit the previous PO ownership capability');
assert.equal(u.readOnly(),true);

// The approval preview follows the PO composer grant, independently of Budget
// edit access. Execute the real debounce/response path for new and own Drafts.
const previewTimers=new Map(),previewCalls=[];let previewTimerId=0;
const previewNode={innerHTML:''};
const forecastBody={innerHTML:''},forecastCaption={textContent:''},forecastBox={hidden:true,querySelector:selector=>selector==='[data-po-preview-body]'?forecastBody:forecastCaption};
const p=vm.createContext({model:{budgetId:budget.ID,editable:false,loadState:'loaded',status:'Draft',approvalState:'Not Configured',
  amount:'0.01',lines:[{budgetItemId:'90071992547409935'}],balanceState:'loaded'},
  options:{canCreate:()=>creation,canEdit:()=>editor},current:()=>true,generation:1,previewGeneration:0,previewTimer:null,progress:false,
  card:{querySelector:()=>previewNode},allocationRows:()=>[{verified:true,available:100n,shortfall:0n,remaining:99n,pending:0n}],
  overlay:{querySelector:()=>forecastBox},deleteReview:false,esc:value=>String(value??''),money:v=>v,root:{LMPO:u.LMPO},
  setTimeout:fn=>{const id=++previewTimerId;previewTimers.set(id,fn);return id;},clearTimeout:id=>previewTimers.delete(id),
  call:async payload=>{previewCalls.push(payload);return {contract:'po-v1',success:true,approvalPreview:{roles:[{role:'CFO',order:1,name:'Test CFO',email:'cfo@example.com'}]}};}
});
for(const name of ['canAmend','canCompose','readOnly','patchContext','patchApprovers','bundleHtml'])vm.runInContext(helper(ui,name),p);
editor=false;creation=true;p.patchContext();
assert.equal(previewTimers.size,1,'A PO-only creator schedules approval lookup without Budget edit access');
assert.equal(forecastBox.hidden,false,'An authorized new PO still shows its real pending forecast');assert.match(forecastBody.innerHTML,/Checking approvers/);
await previewTimers.get(p.previewTimer)();previewTimers.clear();
assert.equal(previewCalls.length,1);assert.equal(previewCalls[0].action,'PreviewApprovals');assert.equal(previewCalls[0].amount,'0.01');
assert.equal(p.model.previewState,'loaded');assert.equal(p.model.previewRoles[0].email,'cfo@example.com');
assert.equal(forecastBox.hidden,false);assert.match(forecastBody.innerHTML,/Test CFO/);assert.doesNotMatch(forecastBody.innerHTML,/Checking approvers/);
p.patchContext();assert.equal(previewTimers.size,0,'Unchanged preview context does not duplicate a completed lookup');
Object.assign(p.model,{id:'90071992547409936',canEditDraft:true,previewKey:''});p.patchContext();
assert.equal(previewTimers.size,1,'An authoritative own Draft can preview its approvers after reopening');
assert.equal(forecastBox.hidden,false,'An owned editable Draft retains the forecast panel');
await previewTimers.get(p.previewTimer)();previewTimers.clear();assert.equal(previewCalls.length,2);
p.model.canEditDraft=false;p.model.previewKey='';p.patchContext();assert.equal(previewTimers.size,0,'Another actor\'s Draft cannot schedule the creation preview');
assert.equal(forecastBox.hidden,true,'Another actor\'s read-only Draft never displays a forecast with no request');
p.model.previewState='loading';p.patchApprovers(true,0n);assert.equal(forecastBox.hidden,true,'A stale Checking approvers state cannot remain visible after composition access is denied');
editor=true;p.patchContext();assert.equal(previewTimers.size,1,'Existing Budget editors retain approval preview');
previewTimers.clear();editor=false;
Object.assign(p.model,{status:'Submitted',commitmentState:'Reserved',approvalState:'Not Configured',approvalBundle:null,previewKey:'',previewState:'idle'});
const legacyPreviewCalls=previewCalls.length;p.patchContext();
assert.equal(forecastBox.hidden,true,'A legacy read-only Submitted PO never shows Checking approvers or a fabricated future route');
assert.equal(previewTimers.size,0);assert.equal(previewCalls.length,legacyPreviewCalls,'The render correction makes no extra request');
const capturedBundle={rows:[{order:1,role:'CFO',status:'Pending',notes:''}],modifications:[],canApprove:false};
Object.assign(p.model,{approvalState:'Pending',approvalBundle:capturedBundle});const capturedBefore=JSON.stringify(capturedBundle);p.patchContext();
assert.equal(forecastBox.hidden,true,'A captured modern chain stays separate from the forecast panel');
assert.match(p.bundleHtml(),/Approval chain/);assert.match(p.bundleHtml(),/CFO/);assert.match(p.bundleHtml(),/Pending/);
assert.equal(JSON.stringify(capturedBundle),capturedBefore);assert.equal(previewTimers.size,0);
console.log('PO read-only forecast: legacy and foreign Draft panels stay hidden without requests; new/own Draft forecasts and captured modern chains remain intact.');

// Both actual openers guard direct calls, not only disabled menu buttons.
let opened=0,denials=0;
Object.assign(c,{requireBudgetRequestDetail:()=>true,poDevelopment:()=>true,getPurchaseOrderUI:()=>({open:async()=>{opened++;}}),toastShow:()=>{denials++;}});
vm.runInContext(helper(widget,'openCheckWireRequest'),c);
c.applyPermsFromFlags({hasRow:true,myId:'90071992547409933',poCreate:true},'create-only');
for(const kind of ['Check','Wire'])c.openCheckWireRequest(kind);
c.openCheckWireRequest('Purchase Order');
assert.equal(opened,1);assert.equal(denials,2);assert.equal(c.S.modModal,undefined,'Check/Wire preview cannot open through a direct stale action');
c.applyPermsFromFlags({hasRow:true,myId:'90071992547409933'},'revoked');c.openCheckWireRequest('Purchase Order');assert.equal(opened,1);assert.equal(denials,3);
assert.match(widget,/data-request-kind='purchase-order'"\+\(canStartBudgetRequest\('purchase-order',b\)/);
assert.match(widget,/_poCanEditDraft:po\.canEditDraft===true/,'List capability is propagated without trusting strings');

// Budget and Project conversations retain viewing/current identity, while their
// host makes read-only posting, editing and deleting visibly unavailable.
const composer={hidden:false},commentInput={readOnly:false},send={disabled:false},status={textContent:''},actions={hidden:false},inline={readOnly:false},action={disabled:false};
const thread={querySelector:selector=>({'.pc-compose':composer,'.pc-input':commentInput,'[data-pc="send"]':send,'.pc-status':status})[selector],querySelectorAll:selector=>selector==='.pc-actions,.pc-inline-actions'?[actions]:selector==='[data-pc-edit-input]'?[inline]:[action]};
let commentWrites=0;
Object.assign(c,{$:id=>id==='budgetCommentThread'?thread:null,budgetCommentThreadField:'Budget',budgetCommentThreadParent:budget.ID,budgetCreateScope:()=> 'comment-scope',sdkAddRecord:()=>{commentWrites++;return Promise.resolve();},sdkUpdateRecord:()=>{commentWrites++;return Promise.resolve();}});
for(const name of ['budgetCommentCreateReview','canWriteBudgetComments','syncBudgetCommentCreateReview','addBudgetComment','updateBudgetComment'])vm.runInContext(helper(widget,name),c);
c.applyPermsFromFlags({hasRow:true,myId:'90071992547409933',poCreate:true},'const');c.syncBudgetCommentCreateReview();
assert.equal(composer.hidden,true);assert.equal(actions.hidden,true);assert.equal(commentInput.readOnly,true);assert.equal(inline.readOnly,true);assert.equal(send.disabled,true);assert.equal(action.disabled,true);
for(const field of ['Budget','Project'])await assert.rejects(()=>c.addBudgetComment({[field]:budget.ID,Comment:'Denied'}),/comments are read-only/);
await assert.rejects(()=>c.updateBudgetComment('90071992547409939',{Comment:'Denied'}),/comments are read-only/);
await assert.rejects(()=>c.updateBudgetComment('90071992547409939',{Deleted:true}),/comments are read-only/);
assert.equal(commentWrites,0,'Stale Post/keyboard/Edit/Delete cannot dispatch a native write');
c.applyPermsFromFlags({hasRow:true,myId:'90071992547409933',editAll:true},'existing-editor');c.syncBudgetCommentCreateReview();
assert.equal(composer.hidden,false);assert.equal(actions.hidden,false);assert.equal(commentInput.readOnly,false);assert.equal(inline.readOnly,false);
c.S.commentCreateReviews={'comment-scope':{status:'unknown'}};c.syncBudgetCommentCreateReview();assert.equal(commentInput.readOnly,true,'Existing ambiguous-create recovery remains locked');
assert.match(widget,/currentUser:function\(\)\{return S\.currentUser\|\|"";\}/,'Read-only conversation never rewrites the authenticated identity');
console.log('PO create-only UI: isolated access flag, unchanged Budget powers, own-Draft capability, legacy editors, revocation, Save/Submit, existing overage routing, Vendor isolation and guarded request entry passed.');
