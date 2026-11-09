# PO Reallocation And Failed-Submit Reopening

## Result

Creator **9.169 — PO Component Reallocation** was installed in Development and
published through Stage to Production. The native package had exactly 13 scoped
components. Production read-only verification returned 227 tagged balances with
the new contract, numeric unknown-allocation counts and gross pending-reduction
fields. The existing Eagle Prairie PO loaded as a Draft with five saved lines.
No Production financial write was used for verification.

These native observations are historical as of this 9.169 publication. The
later PO capacity repair and its Development-only installation retain their own
source and verification record; this release does not promote that native work.

Budget Manager **122.29.113** removed the Add Reallocation activation step.
**122.29.114** fixes saved PO reopening after an unknown submission result.
Previously, a retained failed operation took over Eye and Pencil for every PO
in the same phase. Saved-record actions now load the requested PO. While the
original operation remains unresolved, the record is read-only with Check Status.
That explicit action checks the original captured actor, budget and operation
token; it never repeats Submit. New-PO and delete entry retain the original
unresolved-operation protection.

The user's requested main-page chronological request list and append-only
existing-PO flow are design mockups only. This release does not implement PO
additions or change their approval policy.

## Changed Files And Native Components

Frontend behavior is in `po-ui.js`, `po-controller.js`,
`request-attachments.js`, and the existing attachment adapters in `widget.html`.
Configuration, environment mappings,
immutable release files, focused regressions and module/design documentation
accompany the widget changes. Request attachment guards preserve ordinary Budget
files, other payment identities and standalone modification access.

Native forms/reports: `Budget_Modification.Component_Reallocation` is a new
optional Decision box, initially false; `All_Budget_Modifications` includes it
in the Web field layout. The new Created or Edited / Load of the form workflow,
`Lock_PO_Reallocation_Mark`, disables the marker on ordinary native forms.
Existing five currency fields, `Modification_Type` and `Amount` are reused.

Affected existing functions: `poValidatePayload`, `poApprovalBundle`,
`poSnapshot`, `poBudgetBalances`, `managePurchaseOrder`,
`handlePurchaseOrderApproval`, `poExcelWorkbook`, `sendPurchaseOrderEmail`,
`budgetElementExportRows` and `exportBudgetSnapshot`.

The existing `Manage_Purchase_Order` Custom API is unchanged. No new Custom API,
profile grant, User Access field, API audience or ownership permission was added.
The native reallocation deployment is complete; the frontend reopening fix needs
no additional Creator promotion.

## Verification And Limits

Ten native functions compiled, were reopened, and matched the source or known
equivalent Creator formatting. Original and installed captures, hashes and the
native component manifest are in
[`creator/po-reallocation-install-2026-11-09/`](../creator/po-reallocation-install-2026-11-09/README.md).

The CFO Development test was stopped at the user's request before Save or
Submit. It created no PO, line, Bud Mod, approval route or approval row. Before
the stop, the existing two labeled Development QA items were initialized through
`snapshotBudgetItemComponents(initializeOnly=true, dryRun=false)` with their
existing $1,000 totals unchanged. A successful native signed financial submission,
email delivery and final approval are not claimed.

Regression coverage includes unknown submission followed by Eye/Pencil on the
same and another PO, exact fresh reads, failed reads, read-only fields and file
controls, retained original operation identity, explicit Check without replay,
late-response isolation, unchanged ordinary request/file access, and direct
reallocation editing. `npm run validate` and `npm run build:pages` both passed
for the final immutable 122.29.114 widget release. The independent code review
also checked that explicit Check retains queued files without uploading them,
while an ordinary acknowledged save still performs its existing upload handoff
once.

## Rollback

Map the widget to **122.29.113** to reverse only the reopening fix; it retains
the signed reallocation readers and direct-entry controls. **122.29.112** also
retains signed-aware readers but restores the Add Reallocation step. Use a
forward native fix after any marked records exist. Do not restore old unsigned
native readers, delete marked records, clear the marker or replay unknown writes.
