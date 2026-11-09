# Budget Actual Elements

This change makes the existing Budget Import Item component columns independent
of their source. The native source discriminator remains `Data_Source`:
`HeavyJob Budget` for Construction budget amounts, `HeavyJob` for HCSS actuals,
and `Great Plains` for GP actuals. GP Development and GP Construction remain
separate Analytics inputs; both roll up into the existing GP total and five GP
element amounts on their matched Budget Item.

The user's November 3 rule treats the five source element amounts and the
original actual total as independent values. Their sum does not need to equal
the total, and neither value is derived from the other. HCSS Other is Misc 1;
Trucking, Supplies, Misc 2 and Misc 3 are ignored. No residual is allocated and
no source data or precision setting is changed.

## Native Components

Use [schema.json](schema.json) and
[promotion-manifest.json](promotion-manifest.json) as the component checklist.
The five Import fields are **link-name renames of existing native fields**:
`Labor_Budget` → `Labor`, `Materials_Budget` → `Materials`,
`Equipment_Budget` → `Equipment`, `Subcontractor_Budget` → `Subcontractor`, and
`Other_Budget` → `Other`. Preserve their existing field IDs, stored amounts,
four-place precision, display labels and report bindings. Do not delete and
recreate fields or run a financial data-copy migration. Every Budget Item Final
and Preliminary `_Budget` field keeps its existing name and lifecycle.

Add only the ten optional blank USD16/4 fields on `Budget_Item` listed in the
schema. The fragments in [planned/](planned/) are merge instructions for the
existing form/reports, not replacement definitions. Add the ten fields once to
`All_Budget_Items` list, quickview, detailview and full-field API/export layouts;
verify the existing five renamed fields in `All_Budget_Item_Imports` remain
included. Preserve all current permissions, actions, filters and other fields.

`snapshotBudgetItemComponents` and `budgetElementExportRows` read the renamed
Import columns only on `HeavyJob Budget` rows. Frozen Final values, Preliminary
allocations, approval routing and modification amounts retain their existing
contracts. `budgetElementExportRows` reads measured actual fields and never
attributes actual totals to an element from the item's department. A missing
or partial measured split stays unknown in the element export;
the independent native parent total remains visible.

## Actual Import Schedules

The native Properties dialog for an existing fixed-date schedule exposes its
date, time zone and frequency; it does not expose a form/date-field trigger
conversion. Keep the three original fixed-date actual schedules as disabled
rollback components. Create three distinctly named Settings schedules anchored
to `Next_Workflow_Run`, with the same three existing `workflowExportEnqueue`
route keys in their action payloads. The saved native names are
`Budgets_HCSS_Actuals_Batc`, `Budgets_GP_Construction_A` and
`Budgets_GP_Development_Ac`. These are new physical schedule wrappers, not new
importer/API routes. The manifest records their actual names and display labels.
Artifact filenames retain the original queue route keys; their `.ds`
declarations use the new native schedule names.

The original schedules' disabled states and the new wrappers must be promoted
together. Never leave both the fixed-date and anchored versions active. The
existing timer alone advances `Current_Batch`; each new wrapper captures the
selected group through the existing queue. Preserve the original native
definitions under `native-before/`; no schedule deletion is needed.

## Existing Native Batch

Update the **existing** `Budgets_Apply_Cost_to_Bud` execute and failure actions.
Keep its daily schedule identity/time, `Budget_Item[Template_Item == false]`
scope and batch size **100**. Do not create a second application schedule.
The existing import-to-item linking batch remains independent.

The new private read-only `budgetImportedActualElements` helper checks each
matched `Great Plains` and `HeavyJob` source collection before any fields on the
item change. All five present element amounts are summed by source; source
rows with all five blank retain their old total but make the entire measured
split unavailable. Partial or nonnumeric populated rows fail before the item's
first write. Explicit zero allocations remain complete, and signed source
amounts retain their signs. The five elements and original source total are
saved independently at their native precision. No equality or residual-amount
gate applies to HCSS or GP actuals, including GP Construction's existing
cent-rounded total. The GP unsupported `Cost_Element` count remains a separate
classification guard. Exports read complete saved measured allocations directly.

The batch preserves `PROJ_Actual`, `HCSS_Actuals`, Cost to Complete, Percent
Complete and the existing approved/unapproved Construction budget behavior.
It writes the ten measured fields from the validated source maps. It never
changes frozen Final/Preliminary component values or approval state.

The [November 9 runtime/logging repair](../../budget-batch-optimization-2026-11-09/README.md)
supersedes the original helper's fetched-record aggregation and the original
two-request failure logging described below. It retains this exact 100-record
batch scope and all amount/approval rules, with native zero/null parity and
one combined actual-field update. The new terminal-create logger contract,
verification, accepted environment clock difference and rollback instructions
are in that release record.

## Error Handling

An item exception creates and finishes the existing durable `workflowRunLog`
entry with workflow name, source, exact item ID, batch size 100, failed count
and actual error. The existing log's independent API transaction prevents the
failing batch transaction from rolling back that log entry. Native `on failure`
also records an entry in the same `Workflow_Run_Log` report surfaced by Settings,
covering failures that cannot reach the item catch, including native runtime
or statement limits. That native failure entry identifies the workflow and
scope; Creator's failed execution retains the native batch number and raw
runtime diagnostic. Successful items do not each create a log entry.

Existing Settings failure notifications remain governed by the log's normal
finalization workflow. No new log form, connection, permission or Custom API is
created, and no failure automatically replays an unknown write.

## Installation and Verification

Development now has the five in-place Import renames, ten new Budget Item
fields, the verified quick/detail report bindings and all 14 verified function
bodies. The existing Budget Item batch's execute and failure actions were saved,
closed and reopened with exact whitespace-normalized candidate matches; its
original form, criteria, daily start and batch size 100 were verified unchanged.
The three new anchored schedules were independently closed and reopened with
their expected enqueue routes and Settings date field, Run Always, Daily,
America/Chicago and no end date verified. Each has one compiled action and an
enabled state; their original fixed-date schedules remain disabled and retained.
The Timeout action was also closed/reopened with an exact normalized source
match. The revised `budgetActualImportRun` and
`budgetImportedActualElements` bodies for independent elements and totals were
also saved, compiled and independently reopened with exact whitespace-normalized
candidate matches; the old amount gates are absent. Native Development
installation is complete. No financial job was manually executed, and Creator
Production promotion remains with the user.

Complete Analytics comparisons preserve every original parent group, total and
import key in all three sources. The historical HCSS audit found 409 groups whose
selected elements differ from the total. These are informational under the
user's independent-value rule and must not block the revised import or rollup.
The original total and selected elements remain exactly their own source values.
See the
[source audit evidence](analytics/source-audit-evidence.json). The scheduled
financial write path and Production batch performance have not been exercised.

Keep scheduled Development executions suspended while changing field names and
their compiled callers. Preserve the actual native prechange copies, then follow
the manifest dependency order: in-place renames, ten new fields and report
layouts, helpers and queue functions, source query/import changes, new anchored
schedule wrappers with the original schedules disabled, and the existing
batch's execute/failure actions. Reopen each saved field/report/function/workflow to
verify the canonical native component. Deluge callers use native field
references; they compile only after the prerequisite field names exist.

The Production widget release supports the old and renamed Import response
fields so PMP can ship before the user promotes Creator. Native field/caller
changes must be selected together during the user's Creator promotion. PMP
does not authorize Creator Stage/Production publication. Record real native
installation/compilation and read-only results in
[native-install-progress.json](native-install-progress.json); prepared files and
offline tests are not evidence of native installation or a live financial write.

Focused checks:

```text
node scripts/test-budget-actual-elements-backend.mjs
node scripts/test-budget-element-lifecycle.mjs
node scripts/test-budget-element-exports.mjs
```

The focused runtime executes the checked-in preflight and batch source with
native-shaped records. It covers long IDs, source isolation, legacy unknown
versus explicit zero, signed amounts, independent totals and four-place elements
with cent-rounded GP Construction totals, invalid later-source rejection before writes, durable
failure log calls and additive schema. The lifecycle/export suites retain
Construction snapshot behavior, frozen budget values, measured actual exports,
parent totals and unknown allocations. Native compilation, report responses
and scheduled execution require separate verification. Full repository
validation and Pages build remain required for the accompanying widget release.

## Rollback

Suspend the affected scheduled workflows first. Restore the saved query/import
and batch bodies with their matching field contract. Reverse the five Import
link-name renames **in place**, preserving the same native field IDs and values,
and restore the snapshot/export helpers from the prechange native copies (the
repository `rollback/` files are review baselines from the November 2 catalog
and prechange HEAD). Reopen/compile all restored callers before resuming.

This independent-value policy revision changes backend functions and
documentation only. It requires no frontend release, mapping change or frontend
rollback; preserve concurrent widget releases. The original actuals frontend
feature was published in `c7bc9193` with successful CI and Pages runs.

Keep the ten additive actual fields and any measured values when rolling back
the complete original feature;
do not delete fields or financial data. Revert the companion widget Production
mappings to Budget Manager `122.29.90` and Settings Manager `1.6.4`; these preserve
the unrelated features present before that feature release. Its published
frontend versions were Budget Manager `122.29.91` and Settings Manager `1.6.6`;
these are historical feature versions, not current/latest mappings. Restore
the matching native failure action too; do not leave both old and replacement
application schedules active. Disable the new anchored wrappers before
re-enabling the preserved original fixed-date schedules. No record deletion or automatic financial replay
is part of rollback.
