# Shared Workflow Cadence

The entire Settings workflow group uses a **five-hour cycle in America/Chicago**, installed in Creator Stage and Production V9.162 and matched by fresh native source checks. The [cadence release record](../../creator/quota-five-hour-recovery-2026-11-06/five-hour-release-notes.md) distinguishes source/publication proof from observation of the first normally scheduled five-hour cycle. Historical three-hour release notes remain evidence of their original releases.

## Clock and Batch Ownership

`Settings.Next_Workflow_Run` is the shared clock. **Next Workflow Run/Next Batch** (`Next_Workflow_Run_Next_Ba`) owns its advance and `Settings.Current_Batch`. The anchor captures the cycle date and batch before the update, freezes the durable starter intent, and advances the captured date by five hours. Preserve the established error handling and atomic cursor/date transition.

The Settings batch field remains the same whole-number cursor, **0–4**, including the existing rollover. Import workers capture it once for the cycle and do not independently advance it. Changing cadence must not reset, normalize or silently replace the saved cursor. The full five-batch rotation takes approximately **25 hours** at the approved cadence, compared with 15 hours at three hours.

Seven native schedule definitions remain active: the anchor, the combined six-import starter, Set Close Date - Lots, Update Sold/Contracted - Forecast Year, Update Actual Lots - Forecast, Check for Stuck Budget Approvals and Recalc Budget Modification Final - Budgets. The other five queue-only wrappers remain inactive. Their disabled state does not remove their import work; the combined starter retains all six route handoffs.

The definitions use the proven record-based `Next_Workflow_Run` scheduling pattern. The `frequency = daily` serialization in a native definition is not a reason to replace that pattern with a new independent repeating timer. The anchor's saved next date drives the shared cadence.

## Preserved Runtime Contract

Five-hour cadence changes business freshness for the whole selected group. It preserves the import sources, route offsets, batch capture, validation, monetary rules, write limits, fixed deadlines and independent durable handoffs. Existing runs keep their captured source and policy; a cadence change does not authorize rewriting an in-flight run or replaying a claimed operation.

Recovery is independent of the business cadence. Under the V9.161 protocol it checks at the existing half-hour cadence while protected work exists, parks only when it can prove that Running jobs and unresolved startup intents are absent, and rearms before accepting new work. Do not stretch recovery to five hours or remove startup ownership to make a quota calculation smaller. Startup holds add coordination at frame, unframed-audit and Budget-successor creation, not at every import chunk.

Settings Manager's help must state the same five-hour interval for **Next Workflow Run** and **Current Batch**. Its affected-job disclosure must list the seven active native jobs, with the combined starter described as launching six imports. Preserve the existing native date/time and batch fields and all save/access behavior.

## Counting Savings

The fixed start component is **seven jobs × 4.8 cycles/day = 33.6 scheduled starts/day on average**. Compared with seven jobs × eight cycles/day, that saves **22.4 starts/day**, or **672 starts per 30 days**. Those figures count starts, not every scheduled callback generated inside a job.

The frequency of selected job work is 40% lower. Its scheduled continuation and request savings depend on comparable work per cycle. Growing sources, a larger number of changed rows, export waits, retries, other applications and independently scheduled jobs can change account totals. Never claim a blanket 40% reduction in API, external-call or schedule counters from frequency alone.

For planning, define `C` as measured schedules per shared cycle, `F` as other daily schedules, and `R` as recovery checks needed while work is active. The conditional new total is **`4.8 × C + F + R`**. Continuous half-hour recovery formerly contributed a nominal 48 daily checks; idle parking saves **`48 − R`**, not necessarily all 48. Keep this recovery saving separate from the selected cycle-frequency saving.

Measure whole cycles and comparable complete days. Retain the observation times and distinguish daily counters from monthly counters; inspect reset boundaries before subtracting daily readings. Confirm successful job completion alongside lower consumption. A billing delta covering one batch plus background work is an account interval, not an exact per-batch cost.

## Regression and Rollback

Verify anchor advance, every batch transition, frozen source/batch identity, route ownership, unchanged active/disabled definitions, deadline handling and current Settings copy. Native source parity is required in each promoted environment; separately observe timer delivery and completed work after publication.

To roll back cadence, restore the previous three-hour anchor and previous Settings widget mapping. Keep the saved cursor and all audit, claim, frame and startup history. Restore only the cadence components, preserving the separate idle-recovery release and unrelated changes.
