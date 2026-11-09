# Apply Cost To Budget Lines — Runtime And Failure Logging Repair

## Plain-English Result

The job takes imported Great Plains and HeavyJob costs and copies the correct totals and cost categories onto budget lines. Previously it pulled import records into loops and saved fourteen fields separately. It now asks Creator's database for the totals and saves those fourteen fields together. Blank values, signs, source checks and approval rules retain their original meaning. Each batch still contains 100 budget lines.

When work failed, the old error handler made two separate logging requests. If that logging stalled, its timeout could hide the useful original error. The repair saves a complete failure in one request, includes the item and source, and prevents a logging problem from replacing the original diagnostic. It also avoids scheduling a future timeout check for a failure already known to be finished. The generic native failure summary explicitly says when the total row counts are unknown.

The live Development test processed 100 lines in 2.214 seconds, and 80 source comparisons matched the old calculation. That supports keeping the batch size at 100. It does not prove every Production block will finish: the next normal daily run is the remaining operational check. Batch Block quota stays the same for the same record count. Failure logging needs half as many requests per event; a precise daily/monthly quota reduction has not yet been measured.

## Problem And Scope

The November 9 Production execution reported one-minute timeouts for native blocks 1, 53, 54, 55 and 56. Creator exposes only the first five failed-block errors, so these are not a complete failure count. Line 50 in the installed batch action was the start of a separate failure-audit request; an audit failure could obscure the original item/source error. The Settings summary's zero row counts and short duration described the failure notification, not the entire batch.

This repair changes two existing functions, `budgetImportedActualElements` and `workflowRunLog`, and the existing execute/failure scripts of `Budgets_Apply_Cost_to_Bud`. It adds no permanent functions, forms, fields, Custom APIs, credentials, permissions or repeating schedules. The batch remains **100 records**, daily, with `Budget_Item[Template_Item == false]` scope. The five-hour shared import cycle and Settings batch cursor are untouched.

The native release preview exposed an existing environment clock difference: Development's definition has **09:45:35**, while the previously published Stage definition has **08:02:35**. The user explicitly accepted the clock difference on November 9 before publication. The release uses the tested Development definition; this task did not independently edit the native Properties clock. Do not describe the two pre-release clocks as identical.

The fresh Production helper/logger sources matched Development and the repository before editing. The batch execute source was independently copied from its native Development editor; the deployed failure text matched the Production native failure log. Original sources are retained under `native-before/`.

## Implementation

- The helper's normal path uses direct form aggregate queries instead of fetching every import row, constructing maps and running nested Deluge loops. It avoids fetched-record aggregate methods, which Zoho's batch documentation restricts. This is a platform-safe replacement, not proof that this restriction alone caused the Production timeout. Flat AND criteria compare the legacy-row count and complete measured-row count against the full source count; no mixed AND/OR query depends on Creator preserving parentheses. Only an invalid group takes a bounded diagnostic scan to retain an import ID/code; an invalid row outside that bound still stops before writes with the exact Budget Item and source.
- A source with no imports returns the original native zero totals and unknown component allocation immediately. Native testing established that an empty fetched collection totals zero, while a nonempty all-null column returns null; direct aggregate queries return zero for the latter. Explicit count checks preserve that original null behavior for Cost and Cost to Complete.
- Fully blank legacy allocations remain unknown. Partially populated allocations and measured allocations without Cost still fail before either source is written. Parent totals and all five elements remain independent, signed native amounts; no rounding, residual allocation or equality gate is introduced.
- One native multi-field update replaces fourteen separate actual-field update statements. The Construction approval branch is preserved, including the approved/unapproved handling. Other departments' approval-owned field remains untouched.
- The existing logger accepts an explicit `terminal:true` only on a start request with Failed or Partial status. It saves a complete failure in one POST, retaining the existing environment routing, exact acknowledgement/no-replay protections, native finalization and configured notification rules. Default start/update/finish callers retain their behavior. Terminal creates suppress schedule triggers, avoiding a Running entry and an unnecessary timeout timer for an already-known failure.
- The item action emits the original item ID, source and error before auditing, catches recoverable audit failures, never retries an ambiguous audit write, and rethrows the original context. The native failure summary also uses one terminal POST and explicitly labels whole-run counts as unavailable and its timestamp/duration as notification timing. Native hard timeouts can still require Creator's native failed-block log.

## Affected Forms And Fields

`Budget_Import_Item` remains read-only: Budget Item lookup, Data Source, Cost, Cost to Complete, Percent Complete and Labor/Materials/Equipment/Subcontractor/Other.

`Budget_Item` uses the same existing destinations: `PROJ_Actual`, `HCSS_Actuals`, the five `GP_*_Actuals` and five `HCSS_*_Actuals`, `Cost_to_Complete`, `Percent_Complete`, and the existing Construction-only `Unapproved_Final_Budget_Ttl` branch. No frozen Final/Preliminary components, approval status, source identity or mapping changes.

`Workflow_Run_Log` uses existing status, stage, source reference, message/details, count, timestamp and notification fields. The existing finalization workflow and recipients are unchanged.

## Verification

- The actual old/new helper bodies pass a 256-case presence/null/source matrix, including every five-field presence mask, missing Cost, legacy/measured mixtures, signed amounts, explicit zeroes and independent parent/component totals.
- Fault tests cover a second-source validation failure before any write, a failed native update, a lost failure-audit reply, preserved original error/source/ID, no audit/business replay, native failure-summary fallback, department/approval behavior and one combined update.
- Logger tests exercise Failed/Partial terminal creates in Development, Stage and Production routing, one POST, schedule-only suppression, bounded text, exact IDs, malformed acknowledgements and unknown replies. Existing canonical queue, recovery and ordinary logger tests pass. Range handling in the shared offline translator is opt-in for the new batch fixture; the existing 2,881-row full-export regression still produces 29 bounded pages without changed production export code.
- Real Development comparisons covered all **40** budget items with linked GP/HeavyJob imports: **80** source comparisons and **56** linked rows matched the original helper. A separate no-source comparison established the zero/null behavior before writes.
- A bounded native Development function ran the exact reviewed execute action for **100** eligible records: all 40 linked items plus 60 unlinked items. The final flat-query revision processed 100/100 in **2,214 ms** (the earlier equivalent revision took 1,059 ms). This is a live execution of the same action in a Development function, not a claim that the full scheduled Production batch has already passed.
- A fresh read after the final write confirmed stored parent totals, all ten element destinations and the nonempty all-null Cost to Complete behavior for linked and unlinked native records. Test-only comparisons do not add an application save gate.
- The saved action also executed successfully in Creator's own record-level batch-script runner in **0.053 seconds**.
- A native terminal failure test retained its original message, reached Failed with a Finished At timestamp and no Resume At, and completed in **477 ms**. Development had zero failure-email recipients; its existing finalizer recorded the expected missing-recipient notification error and sent no email. This does not establish Production email delivery.
- The temporary Development-only diagnostic is restored to its exact original source and excluded from publication. Synthetic diagnostic logs remain in Development; business records and audit history are not deleted.

Release status and native source parity are recorded under `verification/`. Focused backend/logger and queue regression tests passed; `npm run build:pages` passed locally. Windows full validation reached the missing Microsoft Store Python alias; the complete `npm run validate` and `npm run build:pages` subsequently passed in [Linux CI](https://github.com/rbelliveau-wbw/land-master/actions/runs/42666759664) for `4293591595bd8b0974fceb77373d831a6bd25277`. The next normal scheduled Production execution remains a separate observation; a short Development test is not a measurement of every Production block or account-wide quota reduction.

## Quota Effect

Keeping 100 records preserves the existing Batch Blocks consumption for the same eligible record count. The success path creates no per-item API log records. Each failure event now needs one audit request instead of two, and no Running-log timeout is created for that terminal failure. Native database totals and combined field updates reduce Deluge/runtime work; they are not a measured account-wide Developer API or External Calls saving. No extra recurring schedules were added.

## Published Release

Creator **V9.167**, **Budget Batch Runtime And Failure Logging Repair**, was published to Stage and then Production on November 9, 2026. The immutable package contains exactly three components: the existing native batch workflow and the two named functions. Fresh Stage and Production IDE copies of both functions match the reviewed candidates; all four Development function/action copies match. The batch's Production installation is established by the same three-component Creator package, not a separately captured Production action-editor hash. Unrelated access, dashboard and backfill changes, and the restored diagnostic helper, were excluded.

Implementation commit: `284383b5bfb34ec24d3776d4350b5554f074e09f`. Test-adapter correction and accepted clock documentation: `4293591595bd8b0974fceb77373d831a6bd25277`. The complete CI validation/build passed for the latter before Production promotion. This is a Creator backend release; no new widget release or Production hosting mapping change is required. Publication/source evidence is summarized in `verification/release.json`; raw screenshots, record IDs, sample financial values and native diagnostic outputs remain private.

No full Production batch was forced or blindly replayed. The **next normal daily Production execution** remains the operational check for all native blocks, including source groups larger than the Development data. Historical failures remain visible and are not evidence that the new version has failed. Development's synthetic logging test is explicitly marked as an intentional failure and remains in its audit history.

## Rollback

Publish the two original function bodies and both original scripts from `native-before/` together as one scoped Creator package. Do not revert the logger alone while terminal-create callers remain installed. Preserve the original native identity, daily time, 100-record block size, template exclusion and all business/audit data. Review failed blocks before any recovery; successful blocks can already have committed, and unknown writes must not be blindly replayed.

## Primary References

[Native batch limits and first-five-error reporting](https://help.zoho.com/portal/en/kb/creator/developer-guide/workflows/batch-workflows/articles/understand-batch-workflows), [fetched-record restrictions](https://help.zoho.com/portal/en/kb/creator/developer-guide/limitations/articles/workflows-limitations), [direct native sum](https://www.zoho.com/deluge/help/data-access/aggregate-records/sum.html), and [combined record updates](https://www.zoho.com/deluge/help/data-access/update-multiple-fields.html).
