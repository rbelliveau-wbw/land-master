# PO Reallocation — Budget Manager 122.29.111

The PO has a Reallocation pane immediately to the right of Summary. One reviewed
Bud Mod belongs to each selected cost code, with five independently signed
element changes. The PO, its lines and all linked modifications use one captured
approval round. Existing automatic increases remain available without opting
into reallocation.

Julie's example is one Decrease record with Amount 1000: actual Labor −5000,
Materials −9000, Equipment −20000, Subcontractor +33000, Other 0. Raw Final stays
34000; after approval the revised budget is 33000. A net-zero transfer also
creates one visible modification when its gross changes are nonzero.

## Protection And Permissions

- Required increases exactly match current PO item/element shortfalls. The UI
  recalculates them after line changes and native refreshes, retaining offsets
  and reasons for review. Unknown historical allocations cannot fund offsets.
- Reductions cannot use existing commitments, this PO's allocation or other
  pending gross reductions. Opposing pending increases cannot disguise a debit.
- Submission checks fresh scoped item/component balances under the existing
  phase lock. The final custom approval checks funding again before writing a
  decision or applying changes. No automatic retries replay an unknown write.
- Existing Create Purchase Orders access supports the same own-draft workflow.
  No general Budget edit, standalone modification grant, API scope or new
  approver role is required. A user cannot change custom plans during approval;
  rejection permits revision and a new round. Legacy authorized amendments
  keep their established path.

## Changed Files And Native Contract

Frontend source: new `po-reallocation.js` and `po-reallocation-ui.js`;
`po-domain.js`, `po-controller.js`, `po-ui.js`, `purchase-orders.css` and
`widget.html`. Shared number/motion registries and their synchronized source
copies register the new numeric and keyed-row surfaces. Release configuration,
environment mapping, module/design documentation and focused fixtures/tests
are updated. Immutable 122.29.110 is an unpromoted candidate; 122.29.111 adds
Refresh and permits removing a plan when its source data becomes unavailable.

Affected forms: existing `Payment_Request`, `PO_Item`, `PO_Operation`,
`Approval_Route_Snapshot`, `Budget_Approvals`, `Budget_Item` and
`Budget_Modification`. The **only new native field** is the boolean
`Budget_Modification.Component_Reallocation`. Existing Amount,
Modification_Type and five component currency fields are reused. The marker
distinguishes normalized signed allocations from historical nonnegative parts;
existing aggregate Type × Amount rollups retain their meaning.

Changed functions: `managePurchaseOrder`, `poValidatePayload`, `poSnapshot`,
`poApprovalBundle`, `poBudgetBalances`, `handlePurchaseOrderApproval`,
`sendPurchaseOrderEmail`, `poExcelWorkbook`, `budgetElementExportRows` and
`exportBudgetSnapshot`. Existing `Manage_Purchase_Order` Custom API and
environment bindings remain; no new endpoint is introduced. The extracted PO
functions were brought forward from the authoritative November 2 catalog
before adding reallocation, preserving native component handling absent from
the older extracted copies.

**Creator deployment is required and remains user-owned.** The new field,
matching existing report/field visibility and ordered function publication are
listed in the [Creator handoff](po-reallocation-creator-handoff-2026-11-09.md).
The frontend enables custom plans only after the native capability is present.
An older native version clearly shows the update requirement while retaining
ordinary automatic PO entry. Repository PMP never publishes Creator metadata.

## Regression And Rollback

Focused actual-source checks cover positive/negative/zero net changes, repeated
lines, multiple cost codes with one approval round, exact increases, gross debit
reserves, prior approved funds, malformed/stale/foreign plans, missing legacy
allocation counts, create-only/revoked access, draft persistence, rejection and
resubmission, pending locks, deletion, signed readers/email/workbook, final
approval funding changes and lost-reply recovery. Desktop IAB verification uses
a local fixture with no real Creator writes or notifications. Both `npm run validate` and `npm run build:pages` passed before promotion.
The local desktop browser checked the three panels, Julie's −1000 net plan,
overdraw blocking, refresh retaining offsets/reason, centered SVG close geometry,
locked submitted changes and automatic submission availability on an older backend.

Native compilation, signed USD/zero Amount storage, profile field visibility and
live end-to-end approval require the user-published Creator update. Local Deluge
execution fixtures cannot establish those native gates. No real Eagle Prairie
PO was submitted as part of regression testing.

Rollback Production to **122.29.109** through the environment mapping, retaining
the permanent widget URL. After signed records exist, retain the new boolean
and compatible signed-aware native readers even during frontend rollback. Do
not clear the marker, rewrite amounts or delete financial records to roll back.
