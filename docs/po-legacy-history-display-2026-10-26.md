# Legacy PO approval history display — October 26, 2026

The critical report names `purchaseOrderRequestChildren`. Both authenticated Get calls succeeded, but their older Development PO snapshots are Submitted / Reserved / Not Configured and contain no captured approval bundle. The helper previously required every submitted PO to have a modern Pending, Approved or Rejected captured bundle, so it incorrectly logged the two historical reads as critical failures. This is missing historical data, not a profile permission failure.

Exact audited records:

| PO | Budget | Revision | Historical modification pointer |
| --- | --- | --- | --- |
| 4410926000005121026 | 4410926000005121010 | codex-po-native-submit-20261008-001 | null |
| 4410926000005121122 | 4410926000005121010 | codex-po-linked-submit-20261008-001 | 4410926000005121116 |

The smallest patch separates verified missing legacy history from malformed modern history. A successful `po-v1` response must still match the exact PO, budget and current request revision and have Submitted status. Only Reserved + Not Configured + absent/null bundle returns the display-only legacy sentinel. The loader shows a neutral notice, without logging a critical error or suggesting a retry that cannot recover history. It does not use the old modification pointer to infer a relationship or repair any record. Modern Pending/Approved/Rejected bundle, revision and child validation remains unchanged; denied API replies and identity mismatches still log errors and expose Retry.

No Creator form, field, function or Custom API change is required. This patch writes no records, changes no reservations or approvals, and grants no permission. It reuses the existing passive Request rail notice, row motion and actor/phase cancellation guards.

## Exact replacement code

In `widgets/budget-manager/src/app/widget.html`, replace only these three function definitions with the complete definitions below:

```javascript
function purchaseOrderRequestChildren(request,response,budgetId) {
  var snapshot=response&&response.snapshot,bundle=snapshot&&snapshot.approvalBundle;
  if(!response||response.contract!=="po-v1"||response.success!==true||!snapshot||snapshot.id!==request.ID||snapshot.budgetId!==budgetId||snapshot.revision!==request.PO_Revision||snapshot.status!=="Submitted")throw new Error("Attached PO budget modifications could not be verified.");
  // Older reserved POs have no captured route; reading them must not invent children.
  if(snapshot.commitmentState==="Reserved"&&snapshot.approvalState==="Not Configured"&&bundle==null)return null;
  if(!["Pending","Approved","Rejected"].includes(snapshot.approvalState)||!bundle||typeof bundle.revision!=="string"||!bundle.revision||snapshot.approvalState!=="Rejected"&&bundle.revision!==snapshot.revision||!Array.isArray(bundle.modifications))throw new Error("Attached PO budget modifications could not be verified.");
  var ids=new Set(),items=new Set(),reference="PO:"+request.ID+":"+bundle.revision,wanted=snapshot.approvalState==="Pending"?"Submitted":snapshot.approvalState;
  var children=bundle.modifications.map(function(mod){
    if(!mod||typeof mod.id!=="string"||!/^\d+$/.test(mod.id)||ids.has(mod.id)||typeof mod.budgetItemId!=="string"||!/^\d+$/.test(mod.budgetItemId)||items.has(mod.budgetItemId)||typeof mod.amount!=="string"||!window.LMPO||LMPO.money(mod.amount)<=0n||mod.reference!==reference||mod.status!==wanted)throw new Error("Attached PO budget modification identities are unavailable.");
    ids.add(mod.id);items.add(mod.budgetItemId);
    return {ID:mod.id,Budget:{ID:budgetId},Budget_Item:{ID:mod.budgetItemId},Amount:mod.amount,Modification_Type:"Increase",Reference_Number:mod.reference,Status:mod.status};
  });
  if(snapshot.budgetModificationId!=null&&!ids.has(snapshot.budgetModificationId))throw new Error("The linked PO budget modification is missing.");
  return children;
}
```

```javascript
async function loadPurchaseOrderRequestChildren(rows,budgetId,read,current) {
  // Report View without View All can omit children created by another profile.
  // Use the same authenticated read as the PO modal; keep these display-only.
  var submitted=rows.filter(function(row){return savedPurchaseOrderRequest(row,budgetId)&&row.PO_Status==="Submitted";}),next=0;
  async function worker(){
    for(;next<submitted.length&&current();){
      var request=submitted[next++];
      try{
        var response=await read("Get",request.ID);if(!current())return;
        request._poModifications=purchaseOrderRequestChildren(request,response,budgetId);request._poModificationsState=request._poModifications===null?"legacy-unavailable":"loaded";
      }catch(error){if(!current())return;request._poModificationsState="unavailable";auditLog("error","Attached PO budget modifications unavailable",{budgetId:budgetId,id:request.ID,error:error});}
    }
  }
  await Promise.all(Array.from({length:Math.min(3,submitted.length)},worker));
}
```

```javascript
function renderRequestRailList(b) {
  var bid=String(b.ID),state=S.checkWireRequestState[bid]||"loading",retained=state==="loading"&&S.checkWireRequestScopes&&S.checkWireRequestScopes[bid]===budgetCreateScope("requests",bid)&&Array.isArray(S.checkWireRequestsByBudget[bid]),requests=state==="loaded"||retained?S.checkWireRequestsByBudget[bid]||[]:[],mods=modsForBudget(bid),notice="";
  // Initial rows reveal as one complete list: never show an orphan mod before its PO.
  // A refresh may retain a previously complete list only in the same actor/phase scope.
  if(state==="loading"&&!retained)return "<div class='mod-page-empty' role='status' aria-busy='true'><h3>Loading requests…</h3></div>";
  if(S.checkWireReportDeniedByBudget&&S.checkWireReportDeniedByBudget[bid])notice+="<p class='request-rail-notice' role='status'>Check / wire requests unavailable for this profile.</p>";
  if(state!=="loaded")notice+="<p class='request-rail-notice' role='status'>"+(state==="loading"?"Refreshing requests…":"Payment requests unavailable.")+"</p>";
  var groups=requestRailGroups(b,requests,mods);
  if(!groups.length)return notice+(state==="loaded"?"<div class='mod-page-empty'><h3>No requests yet</h3></div>":"");
  return notice+"<div class='request-rail-scroll'><ol class='request-rail-list' aria-label='Requests, newest first'>"+groups.map(function(group){return "<li class='request-rail-group'>"+(group.kind==="payment"?renderRequestRailPayment(b,group.record,group.children):renderRequestRailModification(b,group.record,null))+(group.record._poModificationsState==="legacy-unavailable"?"<p class='request-rail-notice' role='status'>Approval history unavailable for this older PO.</p>":group.record._poModificationsState==="unavailable"?"<p class='request-rail-notice' role='status'>Attached budget modifications unavailable. <button class='btn' type='button' data-request-po-children-retry='"+escAttr(group.record.ID)+"'>Retry</button></p>":"")+(group.children.length?"<ol class='request-rail-children' aria-label='PO budget modifications'>"+group.children.map(function(mod){return "<li><svg class='request-rail-branch' viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' aria-hidden='true'><path d='M2 1v6q0 9 9 9h6'/></svg>"+renderRequestRailModification(b,mod,group.record)+"</li>";}).join("")+"</ol>":"")+"</li>";}).join("")+"</ol></div>";
}
```

## Regression checks

- `node scripts/test-po-legacy-history.mjs`: the two complete audited Get responses in `scripts/fixtures/po-legacy-history.json` produce the legacy display state with zero error audits; explicit null is also accepted. Bad contract/success, wrong or rounded PO ID, wrong budget/revision, Draft/non-Reserved state, modern missing or malformed bundle, child identity/amount/reference/status failures and stale actor replies remain rejected or unpublished. Frozen input replies stay byte-for-byte unchanged.
- `node scripts/test-request-connected-rail.mjs`: actual renderer shows the neutral accessible notice and read-only Preview PO, no repair/retry/edit action, and no inferred child relationship. Financial report cache and write count remain unchanged. All existing modern failure/Retry and child-visibility assertions remain.
- `node scripts/test-po-requests.mjs`: all existing identity, revision, child, failed-read, bounded-concurrency and actor/phase regression checks remain unchanged and pass.
- `node scripts/test-design-docs.mjs`: documentation links pass. Release integration runs full `npm run validate` and `npm run build:pages`.
- Native Development follow-up: reopen this same budget as Construction Budgeting, confirm both older PO rows show the neutral notice without a new critical report, and confirm the newly submitted Pending PO still shows its valid captured route. This read-only UI follow-up belongs to the release gate; the code tests do not claim native verification.

Rollback only the widget to Budget Manager 122.29.74. No data rollback or Creator deployment is required; the previous historical warning returns.
