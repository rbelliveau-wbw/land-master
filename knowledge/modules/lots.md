# Lots status contract

The `Lots.Status` choices are **Open**, **Contracted**, **Scheduled**, and **Sold**. Derive status in this order:

1. `Close_Date` present: Sold.
2. `Purchase_Date` present and no `Close_Date`: Scheduled.
3. A real builder assigned and neither date present: Contracted.
4. Otherwise: Open. Creator's `Placeholder` builder represents an unassigned lot and remains Open.

The Builder Takedown purchase-date workflow assigns Scheduled, including when the date is in the future. The close-date schedule assigns Sold once the purchase date arrives, and also reconciles Scheduled lots that have no close date. Clearing a takedown's dates returns a lot to Contracted when it still has a real builder, or Open otherwise. Mass lot updates and completed Lot Contracts recalculate status with the same precedence.

Monthly `Forecast.Scheduled_Lots` counts Scheduled lots by Purchase Date. `Forecast_Year.Total_Contracted_Lots` has the Creator display name **Total Scheduled/Contracted Lots** and counts both unsold builder inventory states. Contract schedule assignment also covers Scheduled lots.

Manage Lots allows a lot into a new Builder Takedown only when it is Open, unarchived, and absent from another takedown. It displays Scheduled in existing takedown lot details. Land Master offers Scheduled in the lot editor. Contract Management shows Scheduled as a locked lot in its picker. The Data Insights tab still needs a separate status and filter update.

Creator Development workflows and forms changed for this status are listed in `creator/workflows/scheduled-lot-status.md`. Production has not received this Creator change. Before production promotion, reconcile existing lots with `Purchase_Date != null && Close_Date == null`, then review monthly and annual forecast counts. Development schedule execution is currently suspended, so scheduled reconciliation has not run there automatically.

## Forecast Manager summary — 2026-10-02

`buildForecastManagerSummary` reads Sold and Scheduled directly from `Lots.Status` whenever the summary refreshes. Subdivision counts use the selected `Subdivision`; builder labels also filter `Builder1`. The subdivision card shows Lots Scheduled immediately below Lots Sold. Builder labels append ` - N Lots Scheduled` only when N is positive. This is live at render time; an already-open summary needs a refresh after lot changes.

Unforecasted lots = obligation − Sold lots with a non-null `Close_Date` before the first day of this month − full `Forecasted_Lots` from this month forward. Forecastable capacity remains fixed at the start of the month, even when current-month closings exceed the month's forecast or there is no current-month forecast. On month rollover, those closings become prior-month Sold and that month's forecasts drop out of coverage. Purchase Date and Scheduled counts do not consume monthly actuals, and Scheduled lots are not deducted again from the balance. Negative balances remain visible when forecast coverage exceeds the start-of-month pool.

Single-phase obligations still come from `Takedown_Schedule.Total_Lot_Obligation`. Multi-phase obligations and prior-month sold deductions retain the selected-phase `Contract.Lots1` scope; subdivision totals deduplicate these contract lot IDs. Forecast coverage remains keyed by subdivision and builder, with one deduction per builder in the subdivision total. Progress uses live Sold and Scheduled across all subdivisions of the schedule; expected takedowns and recent-sales fields retain their existing schedule scope. Multiple schedules for the same builder continue to share the same builder forecast coverage; this change does not introduce contract-specific forecasts.

Schedule Progress stays blue through Sold, then extends in dark yellow (`#b8860b`) through Sold plus Scheduled. When Scheduled is positive and obligation is positive, the label shows current and projected percentages, e.g. `51% → 56%`; otherwise it keeps the single current percentage. Percentages retain the existing truncation and cap at 100%. The existing expected-sales label remains; its pink bar extension starts only beyond Sold plus Scheduled, so it cannot overwrite Scheduled coverage. Wildwood StyleCraft displays `51% → 56%` (42 Sold + 4 Scheduled / 82), and First Omega `52% → 55%` (19 + 1 / 36).

The audited Wildwood Phase 05 fixture has 147 sold and 5 scheduled. Unforecasted balances become DR Horton 10, C.A. Doose 0, StyleCraft 0, First Omega 0; subdivision total 10. Contract obligations remain 80/65/82/36 even though assigned lot totals are 79/65/83/36. Those assignment differences require separate reconciliation.

Only this HTML summary function changes; no lot, contract, schedule, or forecast records are written, and stored `Unforecasted_Lots` rollups elsewhere retain their previous calculation. Creator Development requires manual promotion by the user. There is no externally hosted widget change or applicable `deploy/environments.json` version mapping for this function. Regression coverage: `node scripts/test-forecast-summary.mjs` exercises the saved function with stale rollups, full/partial/excess month closings, Scheduled purchase dates, month boundaries, multi-phase isolation, the Scheduled segment, expected-sales overlap, capped progress, and empty selections. It also runs in `npm run validate`. The local runtime is an execution adapter, not a Creator compiler; Creator Save verifies compilation. `--preview` writes an HTML preview from the audited Wildwood fixtures under the workspace `tmp` directory.

Rollback: restore the pre-change live Development function from `creator/functions/baseline/buildForecastManagerSummary.2026-10-02.dg` in the Creator function editor and Save. The baseline includes the existing multi-phase logic that was ahead of the older repository export.

Development does not contain Wildwood Phase 05, so the Wildwood tie-out and positive Scheduled labels use regression fixtures rather than a live Development Wildwood card. The prior Development search rendered live totals on Cottonwood Creek Phase 01, with 17 sold / 0 scheduled. Cottonwood's Development test forecasts include a later 777-lot entry and several zero obligations; its negative balance reflects that separate test data. Creator removes redundant parentheses in query criteria on Save.

Final verification on 2026-10-02: the start-of-month calculation and Scheduled progress function saved and compiled in Creator Development; reload matched the intended source after Creator formatting. `npm run validate` and `npm run build:pages` passed. The generated Wildwood preview visually confirmed both gold segments and projected percentage labels. Creator production promotion is reserved for the user.
