# Current Bud Mod In PO Approval Packets

The approval email's Budget Element Details and the workbook's Budget Elements
tab now place **Current Bud Mod** between Available and This PO. Remaining is
**Available + Current Bud Mod − This PO**. Available continues to mean approved
Modified Budget less Existing POs; it does not absorb proposed changes.

The shared `poElementExportRows` reader uses this PO's verified captured
`poApprovalBundle`, rather than all pending modifications in the phase. It
retains signed element transfers and the Decrease normalization used by the
existing readers. Approved modifications remain in Approved Mods and contribute
zero to Current Bud Mod, preventing double counting. Rejected and unconfigured
POs also add zero. A missing captured component split or unverified bundle keeps
Current Bud Mod and Remaining unavailable. Donor items in the current captured
bundle are included even without PO lines. Own reserved PO amounts are excluded
from Existing POs exactly once, then subtracted in This PO.

## Changed Components

- `creator/functions/poElementExportRows.dg`: shared read-only element values.
- `creator/functions/poExcelWorkbook.dg`: third-tab heading and column widths.
- `creator/functions/sendPurchaseOrderEmail.dg`: matching heading, calculation
  explanation, readable 14px element tables and wider detail container.
- Existing element, capacity, email and XLSX round-trip regression scripts.
- Budget module documentation and approval design guidance.

Native reads use existing Payment_Request PO identity/revision/state,
PO_Item item/element/exact amount, Budget_Modification captured status/type and
component fields, and the existing budget balance helpers. No forms, fields,
reports, Custom API names, permissions or approval routing are added or changed.
Manage_Purchase_Order Download retains its existing read-only behavior.

## Verification And Installation

Focused checks execute the actual checked-in Deluge bodies for signed positive,
zero and negative net transfers, automatic shortfalls, unavailable allocations,
captured-bundle refusal, settled/no-bundle behavior, current-revision scope and
own reservation arithmetic. The production widget download handler converts
the workbook to XLSX and reopens it to verify column order and Remaining math.
Email tests preserve recipients, delivery stamps, activity claims and duplicate
send protection. Full `npm run validate` and `npm run build:pages` passed using
the bundled Python runtime; the build emitted 35 environment paths.

Installation updates the three existing functions in Creator Development via
the agent-owned in-app browser. The live workbook's first-tab layout differs
from the repository baseline (Vendor and seven columns instead of Item Name,
ELEM and eight columns). Its current first tab is preserved; only the Budget
Elements section is patched. The repository's unrelated first-tab source is
retained. A later full-source workbook installation must reconcile that native
layout first. Local tests validate the shared calculation and third-tab
contract; they do not imply that the two first-tab layouts are identical.

This is a Creator backend change only. There is no new widget release or
environment mapping; the current Production widget releases stay in place.
PMP committed the implementation to main as `0c65c606`; CI passed. The owner
subsequently explicitly authorized Creator promotion. The three functions were
published together, since the shared row adds one value and both consumers need
the matching heading. Previously delivered emails and
downloaded files are unchanged. Verification does not submit POs, approve
financial changes, or send test approval emails.

## Creator Publication — 9.179

On November 10, 2026, **PO Current Bud Mod And Remaining** was published as
Creator **9.179** through Stage and then Production. The package contained
exactly `poElementExportRows`, `poExcelWorkbook` and
`sendPurchaseOrderEmail`. The final Environments page showed both environments
at 9.179 and No changes available. The native first-tab layout was retained.

A read-only Production Manage_Purchase_Order Download call on an existing
Rejected PO returned success, the `po-v1` contract, exact string identities and
a complete workbook containing Current Bud Mod. Its 15 element rows were
converted to XLSX and reopened locally; every Remaining value equals Available
+ Current Bud Mod − This PO, and the settled PO adds zero Current Bud Mod.
Positive/negative pending changes remain covered by the earlier source tests;
no live financial submission or approval email was performed.

The browser download action still displayed **PO Excel File Unavailable** even
though the native response was successful and the returned workbook parsed
correctly. Browser download completion is therefore not verified. No extra
native or widget changes were made based on that client failure. Exact response,
local workbook, verification JSON and deployment screenshot remain in local
task artifacts; private record data is not included in the repository.

## Rollback

Restore the three prior function bodies from commit `39f9d973` together,
retaining the live first-tab workbook layout. Keep PO records, captured routes,
decisions and modifications. Widget mappings remain Budget Manager 122.29.130
and Settings Manager 1.6.12; no frontend rollback is necessary.
