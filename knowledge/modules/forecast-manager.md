# Forecast Manager widget contract

## Evidence and pending live audit

The implementation was audited against `creator/exports/Land_Master_2026-08-06.ds`, all 12 `FEB_Edit_Forecast_Manager` through `JAN_Edit_Forecast_Manager` input workflows, native manager search/loading, `Create_Forecasts_Mass_Cre`, the parent/child forms and existing refresh schedules. The current committed `buildForecastManagerSummary.dg` is reused without changes. The export predates the requested October 7, 2026 live audit; current development workflows remain unverified because the Codex browser runtime fails before connecting to Zoho. Offline execution is not Creator compilation.

## Read and write contract

The deliberately new function `forecastManagerWidget(string payload)` handles four actions:

| Action | Inputs | Behavior |
| --- | --- | --- |
| `catalog` | none | Subdivision and Builder choices, Creator current date and window state |
| `snapshot` | subdivisionId | Builder-status parents, linked active children, scoped summary and persisted/expected subdivision unforecasted totals |
| `save` | subdivisionId, forecastId, expected, value | Verify scope, relationships, duplicates, window/date and expected old value; write only Forecasted_Lots and the native subdivision total; return persisted verification |
| `ensure` | subdivisionId, builderId, year | Return an already complete Builder year unchanged, or create one missing parent with 12 child months; reject duplicates, planning parents, incomplete existing parents and orphan children |

All IDs cross JSON as strings. Blank forecast counts are null, zero is zero. Counts accept whole numbers from 0 to 99,999, matching the number-field length. No request-supplied actor or environment is trusted. The Creator login must be authenticated. OAuth2 API audience must match the existing Forecast Manager's permitted team; that audience is a live deployment check, not an invented User_Access flag.

## Exact native edit logic

Read the first `Settings[ID != 0].Open_Forecasting_Window.getAll()` result, with missing Settings treated as closed. A save requires that value to be true. Reject when `Forecast_Start_Date.addDay(28) < zoho.currentdate`. Thus start + 28 remains editable; start + 29 locks. February 1 plus 28 days can be March 1 in a non-leap year. Do not replace this with calendar month-end, and do not borrow the `Unlock_All_Forecasts` override from the separate Forecast_Year form editor.

The widget displays the same server date/window guards, and the endpoint rechecks them for every save. Null/invalid dates, mismatched parent/child scope and duplicate months additionally fail closed. Expected-value comparison prevents ordinary stale-value replacement; Creator field assignment is not a demonstrated atomic compare-and-swap and simultaneous native-editor races still require live review.

After a save, retain the native calculation:

`Subdivision.Unforecasted_Lots = count of non-model lots matching subdivision and phase - count of purchased non-model lots matching subdivision and phase - all subdivision forecasts from the current calendar month's first day onward`.

The future forecast sum intentionally has the native criteria, including its lack of status/model/deletion filters. Parent summary fields are not written during a manager edit. Existing schedules continue refreshing Actual_Lots and Scheduled_Lots. Matrix totals are calculated from saved children. Warnings about negative unforecasted counts do not become a new hard stop.

## Missing-year creation

WFY is the starting year: February YYYY through January YYYY+1. The raw export's required parent picklist supports 2019–2050 and the required child picklist supports 2018–2046. Creation therefore supports their intersection, 2019–2046; the year filter retains 2018–2050 and All years includes existing years. Verify both current live picklists before expanding creation. Copy the native collection insert: Status Builder; Subdivision1/Builder1; canonical unique Forecast_Name `code - builder - FCyear`; Subdivision_Code; Full_Year_Forecast=0; current native sold/contracted counts; Added_User from the login. Insert all 12 `Forecast_Year.Forecast_Months()` rows with month, fiscal year, date, builder and subdivision in the parent insert. Native blank monthly values stay blank.

Existing complete combinations are read-only no-ops. Do not adopt Planning parents or repair an incomplete existing year automatically. The unique Forecast_Name and combination check protect normal duplicate attempts; concurrent creation and Creator transaction behavior must be verified in development. Creation follows the native mass-create path, which can create blank records while forecasting is closed; that does not allow locked counts to be edited.

Success requires a persisted parent and exactly one linked, correctly scoped child for each of February–January with the correct start date and unique record ID. The modal only confirms 13 records after that predicate passes. After an ambiguous response, Check status fetches a snapshot and never resends ensure/save. A saved month also requires subdivision unforecasted to match the independently computed native result before recovery is marked verified.

## Affected objects

- Reads: Settings.Open_Forecasting_Window; Subdivision (ID, Subdivision_Name, Subdivision_Code, Builders, Phase, Unforecasted_Lots); Builder (ID, Builder_Name); Forecast_Year and Forecast; Lots (Subdivision, Builder1, Phase, Model, Status, Purchase_Date, Close_Date); summary dependencies of the unchanged buildForecastManagerSummary.
- Updates: Forecast.Forecasted_Lots and Subdivision.Unforecasted_Lots only.
- Creates: Forecast_Year (Status, Subdivision1, Builder1, Forecast_Year, Forecast_Name, Subdivision_Code, Forecast_Months, Full_Year_Forecast, Total_Sold_Lots, Total_Contracted_Lots, Added_User) and Forecast child rows (Forecast_Month, Forecast_Year, Forecast_Start_Date, Builder1, Subdivision1, native Forecast_Year2 linkage).
- New function/API: forecastManagerWidget; Forecast_Manager_Widget_DEV, Forecast_Manager_Widget_STAGE, Forecast_Manager_Widget. These are proposed new contracts, not claimed existing bindings.
- Existing form Forecast_Manager, workflows, scheduled tasks, summary function and other widgets remain unchanged.

## Deployment and regression gates

1. Reconnect the development editor and inspect current FEB–JAN input logic, filter/load logic, mass creation, validation/success workflows, parent/child schema and permissions against this audit. Reconcile any differences first.
2. Save/compile the new function in Creator development. Verify native subform collection insertion, criteria/null handling and date formatting in Creator itself. Configure the OAuth2 POST development binding to this function with payload:string and the existing permitted audience.
3. Embed the permanent loader in a development Creator Page. Verify SDK environment/user, all filters, one row per builder, summary rendering, January mapping, past-date lock and open/closed window. Read-only cases require no edits. Use only a specifically designated development record for actual save/create tests; never probe the native production subform.
4. Verify blank/zero counts, ordinary field-change saves and native subtotal side effects. Close the window after loading and confirm the server rejects a stale UI. Check day +28 and +29, duplicate/stale/mismatched relationships, repeat ensure without duplicates, 12 children, concurrent ensure, lost response recovery without replay and permissions for permitted/disallowed users.
5. Run `node scripts/test-forecast-manager.mjs`, the inert browser fixture runner with Playwright available, `npm run validate`, and `npm run build:pages`. Inspect desktop/mobile renders and the progress result.
6. Create an immutable frontend release, promote the appropriate environment mappings, deploy Pages and verify the published bootstrap and assets. Publish Creator components/APIs through the normal environment workflow only after the development gates pass. The final production URL is a delivery item after verification, not evidence that the backend is ready.

## Rollback

This is the first candidate; no previous forecast-manager widget release exists. Keep the native Forecast_Manager registration available. Roll back by removing the new Page/widget entry and disabling the new API bindings; restore prior environment mappings if promoted. Do not delete forecast data during rollback. Persisted edits are real data, and newly created forecast parents/children require explicit reviewed data remediation if necessary.
