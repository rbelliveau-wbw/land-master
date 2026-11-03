# Budget Elements — Creator Promotion Handoff

This is the single Creator component checklist for the Budget/PO element work.
The [machine-readable manifest](../creator/workflows/budget-preliminary-elements/promotion-manifest.json)
lists exact field names, settings, report layouts, function signatures, source
paths, prerequisites and install order. Repository publication does not install
or promote these Creator components.

## Fields and Reports

These optional USD fields are saved and verified in native **Development**:
**Max Digits 16, Decimal Places 4**, blank initial value, not mandatory. Exact
display/link names persisted through Done/reopen and form-preview input names.
The saved property panel was reopened for every field: the actual link name,
16/4 numeric settings and unchecked Mandatory control were verified again
without changes.

| Link Name | Display Name |
| --- | --- |
| `Prelim_Labor_Budget` | Prelim (1) Labor |
| `Prelim_Materials_Budget` | Prelim (2) Materials |
| `Prelim_Equipment_Budget` | Prelim (3) Equipment |
| `Prelim_Subcontractor_Budget` | Prelim (4) Subcontractor |
| `Prelim_Other_Budget` | Prelim (5) Other |

All five were added once to `All_Budget_Items` list/quick-view columns and
verified. Detail-view Configure Fields already auto-included all five; that
inclusion was verified. Existing report fields remain intact. An actual
full-field native SDK/API response and user save/reload still require checking.
The November 2 catalog lists only this report for `Budget_Item`.

Use [the merge fragments and progress record](../creator/workflows/budget-preliminary-elements/README.md)
to review the existing fields; do not recreate them or replace the form/report.
The existing `Labor_Budget` through `Other_Budget` remain frozen Final values.
Native function bodies have not been compiled/updated in this task, and
Production promotion and one-time data application remain pending. No Budget
Item data records or Production records were changed by the Development schema
and layout work.

## Compile and Promote in Dependency Order

After the fields/report are saved, compare the current native editors with each
listed source file and compile this dependency order:

1. `snapshotBudgetItemComponents` and `budgetElementExportRows`.
2. `budgetElementExportHtml` and `poElementExportRows`.
3. `applyBudgetTrackFinalState`, `handleApprovalAction`, `startApprovalChain`,
   `createBudgetModification`, and `modificationAdmin`.
4. `exportBudgetSnapshot`, `poExcelWorkbook`, `sendApprovalEmail`,
   `sendModificationEmail`, and `sendPurchaseOrderEmail`.

`snapshotBudgetItemComponents` already exists in the November 2 native export;
its extracted source is now captured and extended. The three export-row/HTML
helpers are private read-only functions. Existing callable/API signatures stay
unchanged. No new Custom API, authentication scope, report permission, scheduler
or recurring migration is added. `syncBudgetApprovalStatus` remains status-only
and needs no element-specific change.

The native `poBudgetBalances` function is an existing prerequisite, **not a
promotion target from its older extracted file**. The November 2 export has the
component-aware body; `creator/functions/poBudgetBalances.dg` is stale aggregate
source. Compare the actual native body/response before changing it. When optional
component balances are absent or unavailable, element Modified/Existing/
Available/Remaining stay unknown; canonical five rows and current PO allocations
remain readable beside the existing aggregate totals.

Promote only the reviewed fields, additive report layout changes and compiled
function set through the normal Creator process. PMP publishes the repository
widget and leaves Creator promotion to the user. No successful native compile,
publication, delivered approval email or live write is implied by local tests.

## Acceptance and One-Time Data

On a normal user-triggered Preliminary save, Development assigns the amount to
Other and Engineering to Labor, storing the separate Preliminary component
fields. Keep native edit permissions and approval locks. A future Dev/Eng
finalization freezes a complete Preliminary split; blank legacy splits use the
finalized amount and department default. Partial/mismatched splits fail a
whole-track read-only preflight before financial values change. Existing explicit
Final snapshots are preserved, and a new approval cycle clears only old Final
components. Construction retains its assigned HeavyJob source lifecycle.

Manual modifications send the existing `budget-components-v1` JSON string in
the existing `amount` argument. All five unsigned component values persist
before approval routing/mail, and Increase/Decrease supplies the sign. Existing
automatic PO modifications stay guarded by their `PO:` relationship. The
[manual modification handoff](budget-modification-elements-creator-handoff-2026-11-03.md)
records that compatibility and the unchanged API bindings.

Use the [separate one-time backfill handoff](budget-element-backfill-2026-11-03.md)
for existing records. Final and Preliminary plans are distinct, contain only
record ID plus their five target fields, preserve any explicit allocation, and
have local rollback preimages. The prepared Production export/plan is not an
applied-backfill claim. The native importer file-input interaction had not
completed when this handoff was written; no Production application is recorded
here. Do not replay an unknown import result without a read-only audit.

Verify user save/reload, report keys, named elements, manual modification details,
PO/budget exports and normal approval lifecycle in Development. After Creator
promotion, use existing read-only targeted approval checks to confirm binding;
do not create/send/repair an approval just to prove deployment.

Local checks include `test-budget-element-lifecycle.mjs`,
`test-budget-modification-elements-backend.mjs`, `test-budget-element-exports.mjs`,
`test-budget-element-backfill.mjs`, existing approval permission/progress suites,
repository validation and the Pages build. These fixtures do not replace native
Creator compilation and acceptance.

Rollback the widget through its previous immutable mapping. Retain new fields,
report columns and saved data. If native function rollback is necessary, use
saved prechange native bodies after reviewing later native changes. Never
overwrite a newer native prerequisite with stale extracted source. No recurring
automation needs to be removed.
