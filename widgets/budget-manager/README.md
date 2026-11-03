
# Budget Manager

## 122.29.91 — Source Actual Elements

Element detail reads the five saved `HCSS_*_Actuals` and five `GP_*_Actuals`
fields on Budget Item. The native import and rollup save the five source elements
and original parent total independently, following the user's November 3 rule.
The elements need not sum to that total. HCSS Other uses Misc 1; Trucking,
Supplies, Misc 2 and Misc 3 are ignored. Complete saved amounts retain four
decimals, while missing, partial or invalid detail stays unavailable for every
department. No residual is allocated or implied element calculated. The revised
functions were saved, compiled and independently reopened in Development;
Creator Production promotion remains with the user. The actuals handoff records
the verified current bodies.
Offsetting element amounts keep a line visible under
Hide Empty. Existing disclosure and keyed number-transition surfaces are reused.
This section records the original published feature version. The later
independent-value backend revision requires no frontend release or mapping
change; preserve concurrent widget releases.

Budget Import Item components use `Labor`, `Materials`, `Equipment`,
`Subcontractor` and `Other`; `Data_Source` supplies their meaning. The Budget
widget prefers those keys and reads legacy `*_Budget` keys only when the new key
is absent, keeping the Production widget compatible before Creator promotion.
HeavyJob Budget snapshots remain filtered by source and exact item assignment;
the rename does not affect frozen Budget Item or Modification `*_Budget` fields.
The actuals queries, imports, native rollup, renamed fields and additive report
columns require Creator installation/promotion. Insights retains its existing
aggregate GP/HCSS inputs and needs no source change.

Focused checks: `test-budget-elements.mjs`,
`test-budget-department-elements.mjs` and `test-budget-hide-empty.mjs` exercise
renamed/legacy import keys, source/assignment isolation, measured signed/zero
actuals, rounding, unknown detail and offsetting elements. Frontend rollback is
the previous Budget Manager release `122.29.90`; Creator rollback must restore
the matching field names and native callers together.

Release `122.29.85` pushes saved Lots, Acres and Equiv. LF through the authenticated
`Sync_Budget_Metric_to_Projects` Custom API, matching Subdivision Code to Projects
Project Code. Confirmed success says **Budget saved · Projects updated.** Creator
Development is installed; the owner must publish the function and register the
Production API. See [the handoff](../../creator/functions/BUDGET_PROJECTS_SYNC_HANDOFF.md).

Release `122.29.16` uses `Attachment` / `All_Attachments`, retaining the `Budget` parent
and `File_field1` upload field. Creator Development updates require the user's
promotion; see the [rename, regressions and rollback](../../docs/attachment-form-rename-2026-10-11.md).

## Multi-item purchase-order candidate (122.29.2)

Development-only multi-item PO editor with exact cents, calculated/manual lines,
grouped reservations and read-only unknown-write recovery. This candidate is
not promoted. Creator's required 19/2 Currency storage failed native boundary
readback; server Save/Submit source remains explicitly gated off. See the
[implementation and native handoff](../../creator/functions/PURCHASE_ORDER_HANDOFF.md)
for installed scaffolding, unresolved rules, native test gates and rollback.

## Native attachment upload receipts (122.28.31)

Accepts the documented SDK `data.filename/filepath` and REST root
`filename/filepath` acknowledgements, then verifies the exact saved child,
Budget parent and file path. Duplicate/malformed/failed receipts remain
unverified and cannot replay uploads. Existing inline spinner and read-only
Recheck stay in the attachment workspace. Frontend only; no Creator deployment.
See the [upload audit](../../docs/budget-attachment-upload-response-2026-10-07.md)
for regression evidence and rollback to 122.28.30.

Budget management, approvals, attachments, and pro forma comparison.

Current release: `122.29.16`. Compact project cards with every phase always visible and Pro Forma styling; searchable multi-select project, territory, and lifecycle filters with external clear controls; direct owner/mapping editing. Category and item sizing remains at the original dimensions. See `../../knowledge/modules/budget.md` for regression and rollback notes. The release includes `src/app/budget-layout.css` alongside the existing widget files.

## Baseline

- Version: `121.0.0`
- Original upload: `budget_widget_v121_compact_comparison_metrics.zip`
- Extracted source: `src/`
- Immutable original: `baseline/budget_widget_v121_compact_comparison_metrics.zip`
- Initial external release: `../../releases/budget-manager/121.0.0/`

The extracted source is intentionally preserved as a monolithic Creator widget baseline. Do not refactor it merely to make it look cleaner. Establish behavioral tests first, then make targeted changes.

## Entry points

- Creator package entry: `src/app/widget.html`
- External-hosting entry after release: `index.html`
- Creator package manifest: `src/plugin-manifest.json`

## Common commands

```bash
npm run validate
npm run package:creator -- budget-manager
npm run release -- budget-manager <new-version>
npm run build:pages
```

## Routine success feedback (122.28.24)

Uses the shared [success-feedback guide](../../knowledge/design/success-feedback.md). Existing inline green verification and progress/result dialogs remain. Routine confirmations describe the actual completed action; inline saves are grouped without delaying writes. Frontend only; no Creator deployment is required.

## Saved attachment reconciliation (122.28.32)

After a settled unrecognized/lost FILE reply, automatically verify the exact saved
child and parent/file before reporting failure. Never replay an upload from that
check. Contract uploads preserve the Email switch without requiring it to be on;
Budget phase rows omit the direct Approvals shortcut and reserve space for their
remaining controls. No Creator backend deployment is required. See
[regression evidence and rollback](../../docs/attachment-upload-reconciliation-2026-10-07.md).

## Grouped Import Ledger — 122.29.93, November 3, 2026

Budget Import Items requires one Subdivision and reads that scope only after the
tab opens. Exact mapped Budget Item IDs consolidate source records; unmatched
imports remain separate. Expand a line for all five Imported or stored Budget
Item elements and nested original source metadata. Construction Budget, HCSS
Actuals, GP Actuals, and their original totals retain independent meanings;
unknown values are not zeroes. Single-record assignment reuses the native save
and permission path. The separate Budget editor element snapshot is preserved.
Visible headings, labels and actions use Title Case. Keyed ledger motion and
amounts reuse the shared interaction and number registries. Frontend only; no
new Creator deployment. See the [Budget module guide](../../knowledge/modules/budget.md)
for scope, regression and rollback notes.
