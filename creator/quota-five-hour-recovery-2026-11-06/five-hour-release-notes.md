# Five-Hour Shared Workflow Cycle

The whole shared Settings cycle advances every five hours instead of three. This includes all seven active jobs attached to `Settings.Next_Workflow_Run`, including the combined starter's six import routes. Imports continue to capture the existing Settings batch number and rotate through 0–4 once per cycle.

**Release:** Creator Stage and Production **V9.162** are published. Fresh Development, Stage and Production native exports each pass **41/41 checks** against the five-hour action. Settings Manager **1.6.8** is the immutable frontend release, with Development, Stage and Production mappings included in this change. The pending Production next-run date was moved forward two hours to adopt the new interval, preserving the saved batch cursor. The first normally scheduled five-hour cycle remains a separate post-release observation. The earlier idle-recovery release, **V9.161**, remains in place; see [its release notes](release-notes.md).

## Scope

The native clock owner is `Next_Workflow_Run_Next_Ba` (**Next Workflow Run/Next Batch**). Its action advances the captured cycle date by five hours while preserving the existing batch transition and durable starter-frame handoff. It does not reset the current cursor or derive the previous batch from an already advanced Settings record.

The seven active shared-clock jobs are:

| Native name | Display name |
| --- | --- |
| `Next_Workflow_Run_Next_Ba` | Next Workflow Run/Next Batch |
| `Set_Close_Date_Lots1` | Set Close Date - Lots |
| `Update_Sold_Contracted_Fo1` | Update Sold/Contracted - Forecast Year |
| `Update_Actual_Lots_Foreca1` | Update Actual Lots - Forecast |
| `Check_for_Stuck_Budget_Ap` | Check for Stuck Budget Approvals |
| `Update_Budgets_w_Projects1` | Update Budgets w/ Projects Info - Budget |
| `Recalc_Budget_Modificatio` | Recalc Budget Modification Final - Budgets |

The combined starter still hands off all six import routes. The five redundant standalone wrappers remain disabled. Settings Manager **1.6.8** updates the schedule and batch help and lists the seven active native definitions in its affected-job disclosure. Permanent Creator widget URLs are preserved.

No business importer, source scope, route offset, monetary calculation, validation, write cap, export deadline or import deadline changes are part of this cadence package. Recovery continues its existing half-hour checks while work or unresolved startup intent exists and may park while idle. A five-hour business cycle does not imply a five-hour recovery interval.

## Expected Effect and Freshness

Five hours means an average of **4.8 cycles per day**, rather than eight: **40% fewer shared cycles**. Depending on the starting phase, an individual day contains four or five starts. The seven fixed scheduled-start components change from **56 to 33.6 per day on average**, saving **22.4 starts per day**, or **672 per 30 days**.

Selected continuation work also runs 40% less often only when per-cycle row counts and change density remain comparable. Less frequent runs may accumulate more changed rows. Unrelated jobs remain, and active recovery checks remain necessary. Total Developer API calls, external calls and account-wide schedules therefore do not automatically fall by 40%.

The cursor still cycles through five batches. A full 0–4 sweep changes from approximately **15 hours to 25 hours**. That is an accepted freshness change, distinct from preserving the batch values and each import's business behavior.

Let `C` be schedules attributable to one selected shared cycle, `F` daily schedules outside that cycle and `R` recovery checks actually required after idle parking. At comparable workload, the conditional five-hour total is **`4.8 × C + F + R`**. Against a three-hour cycle with continuous half-hour recovery, the conditional saving is **`3.2 × C + (48 − R)`**. These are workload formulas, not a measured total or a guaranteed daily ceiling. Do not apply the 40% reduction to the whole account and then subtract the same recovery saving again.

## Validation and Publication Gates

Completed checks include the actual anchor-body regression for every batch value and rollover, startup-failure and concurrent-advance cases, the native verifier's negative cases, focused Settings SDK/disclosure/read-only tests, design-document checks, **`npm run validate`**, and **`npm run build:pages`**. [Native parity evidence](five-hour-native-verification.json) records all three five-hour environments; [prechange evidence](five-hour-prechange-verification.json) records the unchanged three-hour baseline before installation.

Affected native components are the existing `Next_Workflow_Run_Next_Ba` workflow and `Settings.Next_Workflow_Run`. `Settings.Current_Batch` retains its existing ownership and rotation; its live value was not changed during adoption. No function body, Custom API, form definition or field definition changed in this cadence package. Frontend changes are confined to Settings source/version/release, registry/environment mappings, regression checks and documentation. Creator publication is complete; repository CI/Pages deployment and the live Settings version must also be checked for the associated main commit.

- Verify the native anchor advances its captured cycle date by five hours through all cursor values, including rollover, without changing the batch capture or startup recovery contract.
- Compare fresh Development, Stage and Production native exports with the reviewed action, unchanged seven-active/five-disabled group, existing Settings fields and unchanged recovery/import functions.
- Validate and build the Settings widget, create its immutable release, verify the Development mapping, then promote the approved Stage/Production mappings without changing permanent widget URLs.
- Verify the live Settings help and disclosure, actual next-run time and cursor value. Preserve the current cursor; do not manually replay an import to demonstrate the change.
- Observe the first normally scheduled five-hour cycle and compare complete-day usage only after publication. A correct source diff or successful earlier three-hour cycle is not evidence of five-hour timer delivery.

## Rollback

Restore the previous three-hour anchor action and the previously mapped Settings Manager release as one coordinated rollback. Preserve the current `Current_Batch`, all durable frames, audit records and claims. Do not reset the cursor, delete startup holds, or replay a claimed import. Retain V9.161 idle recovery and unrelated releases; rollback of that separate recovery package is outside this cadence rollback.

The recurring cadence contract and measurement method are documented in [Shared Workflow Cadence](../../knowledge/architecture/shared-workflow-cadence.md).
