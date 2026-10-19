import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
function functionSource(name){
  const match=new RegExp('(?:async )?function '+name+'\\(').exec(source);
  assert.ok(match,'Actual request helper exists: '+name);
  const start=match.index,lineEnd=source.indexOf('\n',start),line=source.slice(start,lineEnd);
  if(line.trimEnd().endsWith('}'))return line;
  const end=source.indexOf('\n}',start)+2;
  assert.ok(end>start,'Complete actual request helper: '+name);return source.slice(start,end);
}
const bid='900000000000000001',poId='900000000000000002',itemId='900000000000000003';
const budget={ID:bid},request=(id,type,date,name)=>({ID:id,Budget:{ID:bid},Budget_Item:{ID:itemId,display_value:'Plan Review'},Request_Type:type,Request_Date:date,Request_Amount:'15000.00',Date_Needed:'2026-10-25',Vendor:{ID:'900000000000000004',display_value:name},PO_Status:'Draft',PO_Revision:'revision-one',PO_Approval_State:'Not Configured',Description:'Request details'});
const po=request(poId,'Purchase Order','14-Oct-2026','Parent PO vendor');
const wire=request('900000000000000010','Wire','2026-10-16','Wire vendor');
const check=request('900000000000000011','Check','10/13/2026','Check vendor');
const oldPO=request('900000000000000012','Purchase Order','10-Oct-2026','Older PO vendor');
const mod=(id,date,ref,extra={})=>({ID:id,Budget:{ID:bid},Budget_Item:{ID:itemId,display_value:'Plan Review'},Amount:'5000.00',Modification_Type:'Increase',Status:'Submitted',Effective_Date:date,Reference_Number:ref,Reason:'Increase for permit review',...extra});
const child=mod('900000000000000020','2026-10-20','PO:'+poId+':revision-one');
const standalone=mod('900000000000000021','2026-10-15','CO-15',{Status:'Approved',Amount:'1000.00'});
const orphan=mod('900000000000000022','2026-10-09','PO:900000000000000099:revision-one');
const stale=mod('900000000000000023','2026-10-08','PO:'+poId+':different-revision');
const foreignParent=request('900000000000000030','Purchase Order','2026-10-17','Foreign parent');foreignParent.Budget={ID:'other-budget'};
const foreignLinked=mod('900000000000000024','2026-10-07','PO:'+foreignParent.ID+':revision-one');
const malformed=mod('900000000000000025','2026-10-06','prefix PO:'+poId+':revision-one');
const unknownDate=mod('900000000000000026','','UN-DATED');
const wrongBudgetChild=mod('900000000000000027','2026-10-21','PO:'+poId+':revision-one',{Budget:{ID:'other-budget'}});
let editable=true,maySubmit=true,admin=false,waitingOnMe=false,writes=0;
const panel={innerHTML:''};
const c=vm.createContext({prepareRequestAttachmentBadges(){},attachmentLinksReady:()=>false,attachmentLinkStates:{},S:{edBudget:budget,edPhaseIdx:0,globalMode:'modifications',checkWireRequestState:{[bid]:'loaded'},checkWireRequestsByBudget:{[bid]:[oldPO,check,po,wire]},modifications:[child,standalone,orphan,stale,foreignLinked,malformed,unknownDate,wrongBudgetChild],items:{[bid]:[{ID:itemId,Item_Name:'Plan Review',Budget_Code:'CB01-4130',Budget_Ttl:'10000'}]},approvals:[]},
  cleanVal:v=>String(v??'').trim(),v:v=>Number(v)||0,isObj:v=>v!==null&&typeof v==='object'&&!Array.isArray(v),rawPath:(row,key)=>row?.[key],fmt:v=>'$'+Number(v).toLocaleString('en-US'),
  poDevelopment:()=>true,canEditBudget:()=>editable,canDeleteBudgetRequest:()=>editable,canSubmitMod:()=>maySubmit,canAdminMods:()=>admin,budgetModsReady:()=>true,budgetDetailReady:()=>true,budgetFeatureStateHtml:()=>'<p>Requests unavailable</p>',
  findItemById:id=>id===itemId?c.S.items[bid][0]:null,userOwnsApproval:()=>waitingOnMe,maybeRepairModChains(){},
  document:{getElementById:id=>id==='modPhasePanel'?panel:null},openModDetail(){},
  sdkRunBudgetFunction(){writes++;throw Error('List presentation must not execute native writes');},sdkAddRecord(){writes++;throw Error('List presentation must not create records');},sdkUpdateRecord(){writes++;throw Error('List presentation must not update records');},sdkDeleteRecord(){writes++;throw Error('List presentation must not delete records');}
});c.window=c;
for(const name of ['esc','escAttr','firstRaw','lookupId','lookupName','lookupMatchesId','requestDateParts','fmtDateUS','poRequestCardDate','savedPurchaseOrderRequest','poApprovalRoleLabel','poApproverCircles','modSignedAmount','modStatusOf','modsForBudget','modAgg','modChainRows','modWithInfo','canUseModificationTool','fmtModAmount','modBadge','requestRailDateValue','requestRailDateRank','requestRailGroups','requestRailIcon','requestRailIdentity','requestAttachmentButton','renderRequestRailPayment','requestRailModIdentity','requestRailModChain','renderRequestRailModification','renderRequestRailList','renderCheckWireRequestColumn','renderModPhasePanel'])vm.runInContext(functionSource(name),c);

// The list uses real dates, not report row order; a linked child follows its parent.
const original=JSON.stringify({requests:c.S.checkWireRequestsByBudget[bid],mods:c.S.modifications});
const scopedMods=c.modsForBudget(bid),groups=c.requestRailGroups(budget,c.S.checkWireRequestsByBudget[bid],scopedMods);
assert.deepEqual(Array.from(groups,g=>g.record.ID),[wire.ID,standalone.ID,po.ID,check.ID,oldPO.ID,orphan.ID,stale.ID,foreignLinked.ID,malformed.ID,unknownDate.ID],'One chronology across request types, with unknown dates last');
const parent=groups.find(g=>g.record.ID===poId);
assert.deepEqual(Array.from(parent.children,row=>row.ID),[child.ID],'Only the exact budget, PO identity and captured revision are nested');
assert.equal(groups.some(g=>g.record.ID===child.ID),false,'A nested modification is not repeated as a standalone request');
assert.equal(groups.flatMap(g=>[g.record,...g.children]).filter(row=>row.ID===child.ID).length,1,'Every child appears exactly once');
const duplicateInput=c.requestRailGroups(budget,[po,po],[child,child]);
assert.equal(duplicateInput.length,1);assert.equal(duplicateInput[0].children.length,1,'Duplicate report identities cannot repeat a parent or child');
assert.ok(c.requestRailDateRank('2026-10-16')>c.requestRailDateRank('2026-10-15'));
assert.equal(c.requestRailDateRank('14-Oct-2026'),c.requestRailDateRank('10/14/2026'));
assert.equal(c.requestRailDateRank('2026-10-14'),c.requestRailDateRank('10/14/2026'));
assert.ok(c.requestRailDateRank('2026-02-30')<c.requestRailDateRank('2026-01-01'),'An impossible date does not get a valid chronological position');

// No relationship is inferred from a numeric/foreign/legacy parent or fuzzy reference.
for(const patch of [{Budget:{ID:'other-budget'}},{ID:Number(poId)},{Request_Type:'Check'},{PO_Revision:''}]){
  const changed=c.requestRailGroups(budget,[{...po,...patch}],[child]);
  assert.equal(changed.some(g=>g.children.some(row=>row.ID===child.ID)),false,'Invalid/foreign parent cannot acquire a child');
  assert.equal(changed.filter(g=>g.record.ID===child.ID).length,1,'Unmatched current-budget modification remains visible');
}
assert.equal(c.requestRailGroups(budget,[po],[wrongBudgetChild]).some(g=>g.children.length),false,'A child from another budget is never grouped here');
const agg=c.modAgg(scopedMods);assert.equal(agg.approved,1000);assert.equal(agg.pending,30000);assert.equal(agg.count,7,'Grouping never adds a child amount/count twice to budget totals');

// Existing handlers remain the authority for each action; presentation adds no writes.
c.renderModPhasePanel(budget);const html=panel.innerHTML;
assert.ok(html.indexOf('Wire vendor')<html.indexOf('Parent PO vendor'));
assert.ok(html.indexOf('Parent PO vendor')<html.indexOf('Check vendor'));
const childMarker="aria-label='Budget modification linked to PO "+poId+"'";
assert.ok(html.indexOf(childMarker)>=0,'The linked modification is visibly rendered');
assert.ok(html.indexOf(childMarker)>html.indexOf('Parent PO vendor')&&html.indexOf(childMarker)<html.indexOf('Check vendor'),'Linked child details stay immediately with their PO group');
assert.equal(html.split(childMarker).length-1,1,'The rendered child is present once');
for(const label of ['Preview PO','Edit PO','Download PO Excel','Delete PO'])assert.match(html,new RegExp("aria-label='"+label+"'"));
assert.doesNotMatch(html,/Total Modifications|Approved Delta|Payment Requests|requests-grid/,'The Requests page is one connected list');
assert.equal(JSON.stringify({requests:c.S.checkWireRequestsByBudget[bid],mods:c.S.modifications}),original,'Sorting/grouping does not mutate saved records or report caches');
assert.equal(writes,0,'Rendering the list is read-only');
editable=false;let rowHtml=c.renderRequestRailPayment(budget,po);assert.match(rowHtml,/aria-label='Preview PO'/);assert.match(rowHtml,/aria-label='Download PO Excel'/);assert.doesNotMatch(rowHtml,/aria-label='Edit PO'|aria-label='Delete PO'/);
editable=true;for(const status of ['Pending','Approved']){rowHtml=c.renderRequestRailPayment(budget,{...po,PO_Status:'Submitted',PO_Approval_State:status});assert.doesNotMatch(rowHtml,/aria-label='Edit PO'/);assert.match(rowHtml,/aria-label='Delete PO'/);}
assert.match(c.renderRequestRailPayment(budget,{...po,PO_Status:'Submitted',PO_Approval_State:'Rejected'}),/aria-label='Edit PO'/);
const escaped=c.renderRequestRailPayment(budget,{...po,Vendor:{ID:'900000000000000004',display_value:'<Vendor & Company>'},PO_Description:'<script>unsafe()</script>'});assert.match(escaped,/&lt;Vendor &amp; Company&gt;/);assert.match(escaped,/&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);assert.doesNotMatch(escaped,/<script>/,'Vendor and high-level description render as text');
assert.match(c.renderRequestRailModification(budget,{...child,Status:'Approved'},{...po,PO_Status:'Submitted',PO_Approval_State:'Pending'}),/>Pending<\/span>/,'Linked child displays its governing PO approval status');
const draftMod={...standalone,ID:'900000000000000041',Status:'Draft'};assert.match(c.renderRequestRailModification(budget,draftMod,null),/data-modsubmit/);maySubmit=false;assert.doesNotMatch(c.renderRequestRailModification(budget,draftMod,null),/data-modsubmit/);
maySubmit=true;assert.match(c.renderRequestRailModification(budget,{...draftMod,Status:'Rejected'},null),/data-modreopen/);
c.S.approvals=[{ID:'900000000000000045',Type1:'Modification',Budget_Modification:{ID:standalone.ID},Sort_Order:1,Status:'Pending',Title:'CFO'}];
const submitted={...standalone,Status:'Submitted'};assert.doesNotMatch(c.renderRequestRailModification(budget,submitted,null),/data-modapprove|data-modresend|data-modedit|data-moddelete/);
waitingOnMe=true;assert.match(c.renderRequestRailModification(budget,submitted,null),/data-modresend/);assert.doesNotMatch(c.renderRequestRailModification(budget,submitted,null),/data-modapprove|data-modedit|data-moddelete/);
waitingOnMe=false;admin=true;const toolRow=c.renderRequestRailModification(budget,submitted,null);assert.deepEqual([...toolRow.matchAll(/aria-label=['"]([^'"]+)['"]/g)].map(m=>m[1]).filter(s=>/Preview budget modification|View request attachments|Resend budget modification email|Edit budget modification|Delete budget modification/.test(s)),['Preview budget modification','View request attachments','Resend budget modification email','Edit budget modification','Delete budget modification']);assert.doesNotMatch(toolRow,/data-modapprove/);
for(const action of ['edit','delete','resend']){assert.equal(c.canUseModificationTool({...submitted,Budget:{ID:'foreign'}},budget,action),false);assert.equal(c.canUseModificationTool(child,budget,action),false);}
admin=false;
assert.doesNotMatch(c.renderRequestRailModification(budget,child,po),/data-modapprove|data-modsubmit|data-modreopen/,'PO child lifecycle stays controlled by the PO');
assert.match(c.renderRequestRailModification(budget,child,po),new RegExp("data-request-po-open='"+poId+"' data-request-po-intent='view'"),'The child preview targets its exact PO without a new action pathway');
assert.equal(writes,0);
console.log('Connected request rail: one newest-first chronology, exact scoped PO children without duplicates, orphan visibility, immutable report caches, unchanged totals, retained action permissions and read-only rendering passed.');

// The old standalone modification repair never treats PO-controlled children as broken.
c.S.startupReady=true;c.S.modRepairTried={};c.S.approvals=[];c.S.modifications=[child];
const repairs=[];c.auditLog=()=>{};c.refreshBudgetWorkflowState=async()=>{};c.refreshModSurfaces=()=>{};c.shortErr=error=>String(error);
c.sdkRunBudgetFunction=(name,args)=>{repairs.push({name,args});return Promise.resolve({result:'Repaired'});};
vm.runInContext(functionSource('maybeRepairModChains'),c);c.maybeRepairModChains(budget);
assert.equal(repairs.length,0,'An absent independent chain on a PO-created modification must not start repair');
assert.equal(c.S.modRepairTried[bid],undefined,'A PO child does not consume the standalone repair attempt');
c.S.modifications=[child,{...standalone,Status:'Submitted'}];c.maybeRepairModChains(budget);await new Promise(resolve=>setImmediate(resolve));
assert.equal(repairs.length,1,'A submitted standalone modification without its chain retains the existing recovery');
assert.equal(repairs[0].name,'modificationAdmin');assert.equal(repairs[0].args.action,'repair');assert.equal(repairs[0].args.budgetId,bid);c.maybeRepairModChains(budget);assert.equal(repairs.length,1,'Repair remains once per budget/session');
console.log('Connected request rail: PO children excluded from automatic standalone-chain repair; existing standalone repair preserved.');
// After a PO submission, both request headers and modification records must be
// fresh before the final repaint; either independent read can finish first.
function railDeferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
let saveNav=1,saveScope='actor-one',modsReady=true,saveReads=[],saveRefreshes=[],saveErrors=[];
c.S.view='vEditor';c.budgetNavigationToken=()=>saveNav;c.budgetCreateScope=()=>saveScope;c.budgetNavigationCurrent=(token,view,id)=>token===saveNav&&c.S.view===view&&String(c.S.edBudget?.ID)===id;
c.budgetModsReady=()=>modsReady;c.budgetFeatureStateHtml=()=>'<p data-budget-feature-retry="modifications">Requests refresh unavailable</p>';c.auditLog=(level,message,error)=>saveErrors.push({level,message,error});c.maybeRepairModChains=()=>{};
vm.runInContext(functionSource('refreshPurchaseOrderRequestState'),c);
for(const first of ['requests','mods']){
 c.S.edBudget=budget;c.S.globalMode='modifications';c.S.checkWireRequestState[bid]='loaded';c.S.checkWireRequestsByBudget[bid]=[];c.S.modifications=[];modsReady=true;saveReads=[];saveRefreshes=[];
 const headers=railDeferred(),modified=railDeferred();
 c.loadCheckWireRequests=(id,fresh)=>{saveReads.push({id,fresh});c.S.checkWireRequestState[id]='loading';return headers.promise.then(rows=>{c.S.checkWireRequestsByBudget[id]=rows;c.S.checkWireRequestState[id]='loaded';c.renderModPhasePanel(budget);});};
 c.refreshBudgetWorkflowState=(id,options)=>{saveRefreshes.push({id,options});modsReady=false;return modified.promise.then(rows=>{c.S.modifications=rows;modsReady=true;});};
 const freshening=c.refreshPurchaseOrderRequestState({id:poId,budgetId:bid,status:'Submitted',approvalBundle:{modifications:[{id:child.ID}]}});
 assert.deepEqual(saveReads,[{id:bid,fresh:true}]);assert.deepEqual(JSON.parse(JSON.stringify(saveRefreshes)),[{id:bid,options:{requireModifications:true}}]);
 if(first==='requests'){headers.resolve([po]);await new Promise(resolve=>setImmediate(resolve));assert.doesNotMatch(panel.innerHTML,new RegExp(childMarker));modified.resolve([child]);}
 else {modified.resolve([child]);await new Promise(resolve=>setImmediate(resolve));headers.resolve([po]);}
 await freshening;assert.match(panel.innerHTML,new RegExp(childMarker),'New attached budget modification appears after save without reloading or reopening');assert.equal(panel.innerHTML.split(childMarker).length-1,1);
}
// Draft saves do not read unchanged modification/approval/financial reports.
saveReads=[];saveRefreshes=[];c.loadCheckWireRequests=async(id,fresh)=>saveReads.push({id,fresh});c.refreshBudgetWorkflowState=async(id,options)=>saveRefreshes.push({id,options});await c.refreshPurchaseOrderRequestState({budgetId:bid,status:'Draft'});assert.equal(saveReads.length,1);assert.equal(saveRefreshes.length,0);
// Approval decisions and deletion use the same fresh modification-aware callback.
for(const snapshot of [{budgetId:bid,status:'Submitted',approvalState:'Approved'},{budgetId:bid,deleted:true}]){saveRefreshes=[];await c.refreshPurchaseOrderRequestState(snapshot);assert.equal(saveRefreshes.length,1);assert.equal(saveRefreshes[0].options.requireModifications,true);}
// A failed display read must not turn an acknowledged PO save into another write.
modsReady=false;saveErrors=[];c.refreshBudgetWorkflowState=async()=>{throw Error('Report denied');};await c.refreshPurchaseOrderRequestState({budgetId:bid,status:'Submitted'});assert.match(panel.innerHTML,/Requests refresh unavailable/);assert.equal(saveErrors.length,1);assert.equal(writes,0);
// A late callback cannot repaint another budget, navigation or user session.
const renderRail=c.renderModPhasePanel;for(const change of [()=>saveNav++,()=>saveScope='new-actor',()=>c.S.edBudget={ID:'other-budget'}]){c.S.edBudget=budget;saveScope='actor-one';modsReady=true;let paints=0;c.renderModPhasePanel=()=>paints++;const late=railDeferred();c.loadCheckWireRequests=()=>late.promise;c.refreshBudgetWorkflowState=()=>late.promise;const pendingSave=c.refreshPurchaseOrderRequestState({budgetId:bid,status:'Submitted'});change();late.resolve();await pendingSave;assert.equal(paints,0);}c.renderModPhasePanel=renderRail;
// Available icons form one compact group; no placeholder stands in for a pencil.
editable=true;const pendingIcons=c.renderRequestRailPayment(budget,{...po,PO_Status:'Submitted',PO_Approval_State:'Pending'});assert.equal((pendingIcons.match(/class='attachment-action request-rail-action /g)||[]).length,3);assert.doesNotMatch(pendingIcons,/request-rail-action-space|aria-label='Edit PO'/);assert.equal((c.renderRequestRailModification(budget,child,po).match(/class='attachment-action request-rail-action /g)||[]).length,1);assert.doesNotMatch(c.renderRequestRailModification(budget,child,po),/request-rail-action-space/);
console.log('PO saved requests refresh: new children appear in either read order, draft avoids broad reads, decisions/deletion refresh modifications, failed/stale reads remain honest and available action icons have no gaps.');
// Profile-independent child projection and the shared curved branch stay present
// when the native modification report exposes only a subset of the phase.
c.S.edBudget=budget;c.S.edPhaseIdx=0;c.S.globalMode='modifications';c.S.checkWireRequestState[bid]='loaded';c.S.modifications=[standalone];modsReady=true;
const projectedParent={...po,PO_Status:'Submitted',PO_Approval_State:'Pending',_poModificationsState:'loaded',_poModifications:[{...child,Effective_Date:''}]};c.S.checkWireRequestsByBudget[bid]=[projectedParent];const reportStateBefore=JSON.stringify(c.S.modifications);c.renderModPhasePanel(budget);assert.match(panel.innerHTML,new RegExp(childMarker));assert.match(panel.innerHTML,/With PO Approval/);assert.match(panel.innerHTML,/class='request-rail-branch'/);assert.match(panel.innerHTML,/stroke-width='2' stroke-linecap='round'/);assert.match(panel.innerHTML,/M2 1v6q0 9 9 9h6/);assert.equal(JSON.stringify(c.S.modifications),reportStateBefore);assert.equal(c.S.modifications.length,1);
const loadedReportAndSnapshot=c.requestRailGroups(budget,[projectedParent],[child,standalone]);assert.equal(loadedReportAndSnapshot.flatMap(g=>[g.record,...g.children]).filter(row=>row.ID===child.ID).length,1,'Own/all-record profiles do not duplicate a child already in the report');
c.S.checkWireRequestsByBudget[bid]=[{...po,_poModificationsState:'unavailable'}];c.renderModPhasePanel(budget);assert.match(panel.innerHTML,/Attached budget modifications unavailable/);assert.match(panel.innerHTML,/data-request-po-children-retry/);assert.doesNotMatch(source,/\.request-rail-child:before\{/,'The old disconnected one-pixel elbow is removed');assert.match(source,/request-rail-children>li:last-child:before\{bottom:calc\(50% \+ 9px\)\}/,'The trunk reaches the rounded elbow for any last-child height');
console.log('Connected rail CFO display: report subset supplemented once, real item labels/statuses, explicit failed-read Retry, untouched financial cache and bold curved SVG connectors passed.');
