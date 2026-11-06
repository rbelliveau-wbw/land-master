# Forecast Manager Contract Review — 1.8.2

Adds the approved Contract Review page with native records, a separate Legacy
Cards group, contract matching/status, takedown details and CSV export. Removes
the two explanatory footnotes rejected by the user; no replacement captions
are added. Existing Builder Forecasts editing is preserved.

## Data Contract

- All_Forecast_Years / Forecast_Year: ID, Subdivision1, Builder1, Forecast_Year,
  Status, Forecast_Name, Full_Year_Forecast. Read Builder-status 2026/2027 parents;
  blank/zero and duplicate records remain reviewable.
- All_Contracts1 / Contract: ID, Subdivision1, Builder, Contract_Type,
  Contract_Name, Status, Archive. Read Lot, Lot (Master), Lot (Amendment) without
  status/archive exclusions. Match exact native IDs only.
- All_Takedown_Schedules / Takedown_Schedule: ID, Builder1, Subdivisions,
  Add_Contract_Contract_Name, Takedown_Schedule_Code, Status,
  Total_Lot_Obligation, Initial_Closing_Date, Takedown_Start_Date,
  Initial_Takedown, Initial_Delay_Days, Second_Closing_Lots,
  Second_Closing_Days, Continued_Takedown, Continued_Takedown_Delay_Days,
  Takedown_End_Date, Last_Takedown_Date, Last_Takedown_Amount, Lots_Sold,
  Lots_Expected. Display saved values; do not calculate a next take or invent
  missing second-closing terms. The displayed Initial Closing date follows the
  existing summary's Takedown_Start_Date; CSV keeps both saved dates separately.

Legacy means no Builder parent for the exact Builder/Subdivision in either WFY
2026 or 2027. It does not mean obsolete, safe to delete, archived, or invalid.
Multiple schedules and a shared schedule spanning subdivisions are retained.
An unresolved assignment remains a separately identified review record.

## Implementation

- New forecast-review-model.js: native lookup normalization, exact grouping,
  matching, review issues, filters and formula-safe CSV.
- New forecast-contract-review.js/css: lazy native reads, complete-report
  lifecycle, page filters, expanded contracts/schedules, legacy disclosure and
  export. Reuses the editor's staged searchable picker and canonical LMData.
- forecast-app.js/widget.html: page navigation and refresh routing; retain
  editor DOM, selection and pending/unknown-write gates.
- shared/interaction-surfaces.js and synchronized copies: keyed review rows,
  including visibility filters and expanded detail rows. Numeric counts and
  saved schedule quantities reuse ForecastNumbers with actor/record keys.
- Shared data synchronization and its adoption check now include Forecast
  Manager. Source/release metadata and Development mapping use 1.8.2.

## Creator Impact

No Creator writes or schema changes. No new/modified functions or Custom APIs.
The existing forecastManagerWidget catalog still supplies authorized choices;
the review uses the signed-in user's existing native report read permissions.
A denied report is an actual error, never a synthetic empty contract list.
The native schedule report does not expose Add_Contract_Contract_Name. That
optional lookup cannot block the register or be treated as a known blank link.
Builder/Subdivision matches and schedule membership use their separately
verified identities. When the optional link is available, it supports link
review issues; CSV explicitly records whether it was available.
No Creator publication is required. Production mapping stays at 1.7.24 until
explicitly promoted.

## Verification

The focused model test covers native object/array/scalar lookup IDs, unsafe IDs,
same display names with distinct IDs, multiple contracts and schedules, shared
scope, all statuses/Archive, sparse years, blank/zero values, duplicate parents,
unassigned schedules, missing required fields, fixed legacy scope and CSV.

The browser fixture uses the actual widget, shared paginated reader and native
SDK-shaped count/page responses. Fixtures remain outside deployable source.
Desktop checks cover navigation, retained editor state, filters, disclosure,
pagination, CSV, failure/permission states and refresh. Required repository
  validation and Pages build are run before delivery.

Read-only signed-in Production inspection confirmed the existing Takedown
Schedule report exposes Initial/Second/Subsequent Closing terms, start/end and
last-takedown fields. This is metadata/UI evidence, not a claim that the new
widget's native SDK reads were exercised in Creator. That final integration
check remains for the candidate Development deployment.

## Regression and Rollback

Check existing Forecast/Sold/Scheduled views, staged filters, ordinary saves,
missing-year creation, notes, assignment and uncertain-result recovery.
Review introduces no additional writes and cannot alter saved records.

To roll back, restore the relevant environment's forecast-manager mapping to
immutable 1.7.24 and rebuild Pages. Keep the permanent Creator widget URL and
all data. No data rollback or Creator change is needed.
