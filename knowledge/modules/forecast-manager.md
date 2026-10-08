# Forecast Manager widget contract

## Evidence and live deployment

The initial implementation was audited against `creator/exports/Land_Master_2026-08-06.ds`. On October 8, 2026, the supported in-app browser connected successfully and the current Development editor, native workflow, schema, summary and audience were inspected. The downloaded Development export confirmed the FEB–JAN guards, unique parent name, bidirectional child lookup, required year picklists and mass-create fields. The live mass-create workflow includes both Contracted and Scheduled lots in `Total_Contracted_Lots`; `forecastManagerWidget` was corrected to preserve that behavior. The live `buildForecastManagerSummary` matched the committed function apart from Creator formatting and is reused unchanged. See [deployment evidence](../releases/forecast-manager-backend-2026-10-08.md).

The 1.1.0 candidate redesign follows the actual Legal and Pro Forma widgets: shared navy/blue palette, compact white topbar, custom searchable filters, one subdivision/metrics strip, navy pill views, dense builder rows and a mounted creation dialog. It moves the existing schedule summary below the grid and keeps the missing-year action visible on mobile. Presentation changes touch widget.html, forecast.css and forecast-app.js; the February mapping, field-change save behavior, native window/date guards, server function and API contracts remain unchanged from 1.0.1. The inert browser runner captures desktop, mobile, empty, picker and creation progress/result renders for visual review.

The user selected Compact cards from the three summary mockups. Release 1.2.0 implements a visible complete native snapshot above the matrix, using the unchanged Deluge summary as the calculation authority. `forecast-summary.js` passively extracts native text and allowlisted bar widths/colors, builds trusted DOM, retains every schedule and all-phase contract section, and falls back to the sandboxed native iframe if structure is unsupported. It does not join by Builder name or recalculate business values. The shared structured-model helper proposed in [the audit](forecast-summary-data.md) remains a future backend refactor, not an installed dependency. Standard report pickers add keyboard navigation, selection counts, centered SVG markers and immediate filter clearing. Inline field-change saves and creation guards remain unchanged.

Development and production Pages mappings select 1.2.1; the loader uses the authenticated Creator environment even through the permanent production registration URL. Stage hosting remains unmapped. The Default String function with one String `payload` argument compiled in Development, persisted code was reopened, and the read-only catalog ran first. The exact DEV and unsuffixed Production APIs are enabled with POST, OAuth2, application/json, Key and Value, Standard response, and the audited selective native audience. Creator publication followed Development → Stage → Production. Native manager forms and workflows remain available. Missing API/session information still fails closed with disabled controls.

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

WFY is the starting year: February YYYY through January YYYY+1. The raw export's required parent picklist supports 2019–2050 and the required child picklist supports 2018–2046. Creation therefore supports their intersection, 2019–2046; the year filter retains 2018–2050 and All years includes existing years. Verify both current live picklists before expanding creation. Copy the native collection insert: Status Builder; Subdivision1/Builder1; canonical unique Forecast_Name `code - builder - FCyear`; Subdivision_Code; Full_Year_Forecast=0; native fiscal Sold count and Contracted + Scheduled count; Added_User from the login. Insert all 12 `Forecast_Year.Forecast_Months()` rows with month, fiscal year, date, builder and subdivision in the parent insert. Native blank monthly values stay blank.

Existing complete combinations are read-only no-ops. Do not adopt Planning parents or repair an incomplete existing year automatically. The unique Forecast_Name and combination check protect normal duplicate attempts; concurrent creation and Creator transaction behavior must be verified in development. Creation follows the native mass-create path, which can create blank records while forecasting is closed; that does not allow locked counts to be edited.

Success requires a persisted parent and exactly one linked, correctly scoped child for each of February–January with the correct start date and unique record ID. Release 1.5 removes the creation progress/result modal at the user's explicit request: show an inline pending status and reveal the matrix row only after that predicate passes. Top Add Forecast retains its Builder/WFY selection modal, which closes on commit. After an ambiguous response, Check status fetches a snapshot and never resends ensure/save; creation, edits and filters stay blocked until verified. A saved month also requires subdivision unforecasted to match the independently computed native result before recovery is marked verified.

## Affected objects

- Reads: Settings.Open_Forecasting_Window; Subdivision (ID, Subdivision_Name, Subdivision_Code, Builders, Phase, Unforecasted_Lots); Builder (ID, Builder_Name); Forecast_Year and Forecast; Lots (Subdivision, Builder1, Phase, Model, Status, Purchase_Date, Close_Date); summary dependencies of the unchanged buildForecastManagerSummary.
- Updates: Forecast.Forecasted_Lots and Subdivision.Unforecasted_Lots only.
- Creates: Forecast_Year (Status, Subdivision1, Builder1, Forecast_Year, Forecast_Name, Subdivision_Code, Forecast_Months, Full_Year_Forecast, Total_Sold_Lots, Total_Contracted_Lots, Added_User) and Forecast child rows (Forecast_Month, Forecast_Year, Forecast_Start_Date, Builder1, Subdivision1, native Forecast_Year2 linkage).
- Installed function/API: forecastManagerWidget; enabled Forecast_Manager_Widget_DEV and Forecast_Manager_Widget. Forecast_Manager_Widget_STAGE remains proposed and unconfigured.
- Existing form Forecast_Manager, workflows, scheduled tasks, summary function and other widgets remain unchanged.

## Deployment and regression gates

### Missing Development Custom API

Creator error 9350 means the requested API linkname is missing or incorrect. The
permanent production registration URL still calls `Forecast_Manager_Widget_DEV`
when the authenticated Creator environment is Development. Publishing Pages does
not create this binding. Release 1.2.1 accepts the native SDK response
`{code:3000,details:{output:<function JSON string>}}` as well as existing legacy
wrappers and identifies the exact missing binding with controls disabled.

1. In Land Master Development, Workflows → Functions, create `forecastManagerWidget`
   in the Default namespace, returning String, with one String argument `payload`.
   Use [the saved function](../../creator/functions/forecastManagerWidget.dg),
   Save/compile, then reopen it to verify persisted code. Retain the existing
   `buildForecastManagerSummary` function it calls.
2. In Microservices → Custom API, create/enable the exact API linkname
   `Forecast_Manager_Widget_DEV`. Request: POST, OAuth2, `application/json`,
   Argument Type **Key and Value**. Scope access to the existing Forecast Manager
   permitted audience; verify those users before enabling. Response: Standard.
3. Actions: Land Master → DEVELOPMENT → Default → `forecastManagerWidget`.
   Confirm the request argument `payload:string`. The function receives the
   inner action JSON; **Entire JSON** would pass the wrong outer wrapper.
4. First execute only the read-only function argument `{"action":"catalog"}`.
   Confirm the choices, server date and window flag, then reload the widget.
   Continue the live gates below before any save/create test.

Production requires the published function and a separate unsuffixed
`Forecast_Manager_Widget` binding pointed at Production. Do not point the DEV
binding at Production. Stage uses `Forecast_Manager_Widget_STAGE` when requested.

References: [Zoho SDK2 custom API](https://www.zoho.com/creator/help/js-api/v2/custom-api.html),
[Creator API configuration](https://help.zoho.com/portal/en/kb/creator/developer-guide/microservices/custom-api/articles/create-and-manage-custom-apis),
[Creator status codes](https://help.zoho.com/portal/en/kb/creator/developer-guide/microservices/custom-api/articles/custom-api-status-codes).

### Live verification

1. Reconnect the development editor and inspect current FEB–JAN input logic, filter/load logic, mass creation, validation/success workflows, parent/child schema and permissions against this audit. Reconcile any differences first.
2. Save/compile the new function in Creator development. Verify native subform collection insertion, criteria/null handling and date formatting in Creator itself. Configure the OAuth2 POST development binding to this function with payload:string and the existing permitted audience.
3. Embed the permanent loader in a development Creator Page. Verify SDK environment/user, all filters, one row per builder, summary rendering, January mapping, past-date lock and open/closed window. Read-only cases require no edits. Use only a specifically designated development record for actual save/create tests; never probe the native production subform.
4. Verify blank/zero counts, ordinary field-change saves and native subtotal side effects. Close the window after loading and confirm the server rejects a stale UI. Check day +28 and +29, duplicate/stale/mismatched relationships, repeat ensure without duplicates, 12 children, concurrent ensure, lost response recovery without replay and permissions for permitted/disallowed users.
5. Run `node scripts/test-forecast-manager.mjs`, the inert browser fixture runner with Playwright available, `npm run validate`, and `npm run build:pages`. Inspect desktop/mobile renders and the progress result.
6. Create an immutable frontend release, promote the appropriate environment mappings, deploy Pages and verify the published bootstrap and assets. Publish Creator components/APIs through the normal environment workflow only after the development gates pass. The final production URL is a delivery item after verification, not evidence that the backend is ready.

Completed live results, retained Development test IDs, the selective audience, Production 9.57 publication, and limitations are recorded in [the October 8 deployment record](../releases/forecast-manager-backend-2026-10-08.md). Exact date boundaries and concurrent race cases must not be described as live verified when only offline fixtures covered them.

## Rollback

The prior immutable 1.1.0 candidate restores the pre-card frontend through environment mappings but keeps the same backend contract. Current frontend is 1.5.2; Creator backend 9.59 is published. The immediate presentation/interaction rollback is frontend 1.5.1. The pre-integration native manager is the operational rollback baseline. Keep the native Forecast_Manager registration available as the operational fallback. Roll back this new integration by removing its Page/widget entry and disabling any newly installed API bindings; restore prior mappings or remove forecast-manager mappings when withdrawing hosting. Do not delete forecast data during rollback. Persisted edits are real data, and newly created forecast parents/children require explicit reviewed data remediation if necessary.

## Version 1.3.0 presentation and inventory

The navy title card contains the native subdivision facts. The separate page
heading and Forecast scope KPI strip are removed. Subdivision changes load
automatically; failed/unknown entries block filter changes, and clearing the
subdivision hides the workspace. Native 320px schedule cards sit to the right of
the copied Data Insights all-date lot-status card, stacking on mobile.

`forecastManagerWidget` adds `inventory` to snapshots/save/ensure responses:
counts (Total, Sold, Scheduled, Contracted, Open), territory and the native Data
Insights builder matrix. Close Date means Sold; otherwise Purchase Date means
Scheduled; otherwise stored Sold/Scheduled/Contracted is used, with other values
counted Open. Archived/model lots are included, no matrix builder/year filtering
is applied, and builder rows exclude Open and group by trimmed display name to
match Data Insights. This is a read-only addition; summary HTML and existing
forecast guards/writes are unchanged. Missing inventory shows Unavailable, never
fabricated zeroes. Backend deployment must precede frontend promotion.

Rollback frontend mapping to immutable 1.2.1; the additive backend is backward
compatible with that release. No data rollback is needed for this presentation
and read-only response change.

## Version 1.4 interaction correction

Only button[data-view] triggers a view change. Month clicks retain the mounted
input and typing focus. Sold/Scheduled numeric zeroes display blank in the matrix
and totals; source values, forecast zeroes and exports remain unchanged.

Row-level Create Forecast bypasses builder/year selection and captures the row's
exact destination. Top-level Add Forecast opens the compact selector, restricted
to native Builder.Type1 == Builder and supported WFY 2019–2046. The catalog
adds type while retaining all legacy identities. Both routes call the existing
one-parent/twelve-child ensure action with unchanged verification and recovery.
The selected title is the compact light-statistics structure with navy coloring.
Rollback to frontend 1.3.0; the additive catalog type remains backward-compatible.

## Version 1.5.2 creation chooser

Top Add Forecast starts with no builder or WFY selected and Create disabled. A
read-only, full-subdivision snapshot refreshes existing Builder forecast parents
on each opening, independent of the matrix filters. Any matching parent blocks
Create (including incomplete or duplicate parents) and shows a subtle red message.
Pending or failed conflict checks also keep Create disabled; closing ignores late
responses. The native ensure preflight remains authoritative for concurrent writes
and non-Builder status conflicts. No backend change or new API is needed.

Put subdivision name/code in the navy modal header. Remove the route card and
calendar-range sentence; retain searchable Type1 Builder and WFY 2019–2046 pickers.
Add Forecast sits immediately after the fiscal-year filter; window status is 14px
(40% larger). Inline creation and read-only unknown-result reconciliation are
unchanged. Rollback frontend mapping to 1.5.1.
