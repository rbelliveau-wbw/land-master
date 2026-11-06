# Forecast Manager Contract Review — 1.9.0

Implements the approved card layout. Builder Forecasts, Contract Review and
Legacy Cards share a centered Budget-style pill slider in the top bar. Contract
Review puts counts, search, review scope and centered Territory / Project /
Builder grouping inside its navy title card. Each group retains subdivision
sections and sorts builders by name; subdivision names are not repeated beneath
builder names.

## Scope and Data

- Default review years: WFY 2026, 2027 and 2028. Explicit choices span 2018–2045.
  All Builder-status forecast parents are read; supported years are filtered
  locally. Blank/zero forecasts and duplicate parents remain visible.
- Legacy Cards is a separate page. The user explicitly chose schedules without
  an exact Builder/Subdivision forecast in the fixed 2026–2028 window.
  Selecting other years does not redefine Legacy. A pair with only an older or
  later forecast can therefore appear in Legacy and in an explicitly selected
  historical/future Contract Review year.
- Archived contracts remain matched and visible with a neutral Archived badge.
  Archive alone no longer adds a review issue.
- Groups use actual Subdivision.Project and Project IDs, following the existing
  Insights native adapter. Equal display names never merge different IDs.
- Expanded lines lazily mount distinct takedown and contract cards. Saved
  schedule obligation, initial/second/subsequent terms, end/last dates,
  sold/expected quantities and four recent-sales periods remain whole-record
  values. Shared schedules list all their subdivisions. No phase allocation or
  new business calculation is introduced.
- Current-month pace repeats the existing summary's exact Builder/Subdivision
  calculation: sum native Forecast.Forecasted_Lots in the Creator server month;
  count Sold Lots with Close_Date in that same month. Repeated schedule cards
  show the same phase meter, rather than allocating it between contracts.
  The Creator catalog date supplies the month, including January/December.
- Contract cards use Number_of_Lots, Initial_Takedown, Initial_Takedown_Days,
  Second_Closing_Lots, Second_Closing_Days, Subsequent_Takedown_Lots,
  Subsequent_Takedown_Days, Completion_Date, Total_Contract_Price and
  Earnest_Money. Blank remains blank/—; omitted optional detail fields show
  Unavailable. Status, Archive and exact matching identities remain required.
- CSV exports the filtered current tab only, independent of collapsed groups.

## Native Reads and Creator Impact

Reuses LMData complete counted/cursor-paged reads and the editor's staged
searchable pickers. All reads remain authenticated and actor/environment scoped.
Permission failures clear the report and disable export; a denied report cannot
become an empty match. Same-actor complete rows remain mounted during Refresh.

Existing reports/forms: All_Forecast_Years / Forecast_Year, All_Contracts1 /
Contract, All_Takedown_Schedules / Takedown_Schedule, All_Subdivisions /
Subdivision, All_Projects / Project, All_Forecasts / Forecast and
All_Lots_All_Fields / Lots. Additional fields are read-only. No form, field,
function, Custom API, permission or backend workflow is modified.
No Creator publication is required; the permanent widget loader selects the
new immutable release from the authenticated environment mapping.

## Motion and Verification

Uses the shared interaction engine for top-level and grouping sliders,
review-scope selection, keyed group/record/disclosure rows, refresh and meters.
Counts and card quantities use ForecastNumbers with actor/page/record/display
keys. Reduced motion retains immediate actual values. Grouping and filtering
reuse the loaded data and mounted record/card nodes, restore focus, and never
send writes. Large lists keep the shared engine's bounded refresh fallback.

Model regressions cover native lookup shapes and string IDs, archived healthy
records, fixed legacy membership, 2028 and 2045 selection, same-name distinct
project/builder IDs, exact monthly phase identities, month/year boundaries,
optional unknown links, missing required fields, blank/zero, duplicate parents,
shared schedules, and formula-safe CSV.
Desktop in-app-browser checks exercised the actual widget with native-shaped
SDK fixtures: all three grouping modes, centered header navigation, 2026–2028
defaults, 2045 selection, separate Legacy page, expanded schedule/contract
cards, blank second tiers, explicit zero delay, monthly and recent sales,
permission denial/disabled export, retry and retained Builder Forecasts.
Deployment and native verification evidence is recorded below after release.

## Regression and Rollback

Preserve existing Builder Forecasts matrix selection, saved-month views,
field-change saves, missing-year creation, notes, reassignment and unknown-write
recovery. Review stays read-only. Check filters and disclosure focus, CSV scope,
year choices, shared schedules and actor/permission reset.

Rollback: restore Development and/or Production forecast-manager mapping to
immutable 1.8.2 and rebuild Pages. Keep permanent Creator registration URLs.
No data rollback or Creator publication is needed.

Local required checks passed: npm run validate (complete suite) and npm run build:pages.
The bundled Python runtime was used because the system Python command is an
uninstalled Store alias; normal child-process permissions were required by the
release helper regression. No repository checks were skipped.

## Changed Files

- widgets/forecast-manager/src/app/forecast-contract-review.js and
  forecast-contract-review.css: cards, title controls, groups, separate legacy
  view, year options, native reads and CSV scope.
- widgets/forecast-manager/src/app/forecast-review-model.js: all supported years,
  fixed legacy window, native Project grouping, archive policy and month values.
- widgets/forecast-manager/src/app/forecast-app.js and widget.html: centered
  navigation and three-page routing; editor write behavior is preserved.
- shared/interaction-surfaces.js and its ten synchronized widget copies:
  review-scope selection registration.
- scripts/test-forecast-contract-review.mjs and
  scripts/serve-forecast-review-fixture.mjs: native shapes and desktop fixtures.
- Forecast widget config/dependency inventory, manifests/widgets.json,
  manifests/widget-dependencies.json, deploy/environments.json and immutable
  releases/forecast-manager/1.9.0/: versioned release and environment routing.
- Forecast README, module/design guides and this delivery record: current
  behavior, verification and rollback.

## Native Development Verification

PR #140 merged as 8064914ed064ebdc2d7714a85cc892103926d588 after CI passed.
Main CI and the Development Pages deployment passed. The signed-in native
Forecast_Manager1 page loaded 1.9.0 through its permanent widget registration.

The complete live read showed 12 Builder/Subdivision records, six distinct
schedule cards and eight legacy cards. All three grouping modes used native
Project/Territory/Builder names. Expansion showed the saved AAA01 schedule and
both matching contracts, including their actual closing terms, completion
dates and recent-sales quantities; blank financials remained blank.
The archived Complete contract had no review issue and disappeared in Needs
Review. Selecting WFY 2045 showed one real record/one schedule; Legacy stayed at
eight records/eight schedules. Restoring 2026–2028 and Refresh returned 12/six
without an error. The existing Builder Forecasts view loaded AAA Springs Phase
01 and its three native schedule cards without an error. No records were
created or changed.
