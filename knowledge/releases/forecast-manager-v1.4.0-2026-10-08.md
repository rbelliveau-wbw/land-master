# Forecast Manager v1.4.0 — October 8, 2026

## Changes

- Fixed input focus: delegated view switching now matches button[data-view] only.
  The table's data-view attribute previously made a month click rebuild the
  matrix, destroying the newly focused input. Actual click and typing now keep
  the mounted input; Tab moves to the next editable month and saves on change.
- Sold and Scheduled matrix zeroes display blank, including selected/year totals.
  Nonzero values, original data, forecast zeroes and CSV values are unchanged.
- Missing cells show **No forecast available.** and **Create Forecast**. A row
  button immediately starts creation for that exact captured Builder/WFY,
  skipping the selection dialog. Supported creation years stay 2019–2046.
- Top **Add Forecast** opens a compact 430px searchable Builder and WFY chooser.
  Builder choices include only native Builder.Type1 == Builder. Existing matrix
  and filter identities, including other types, are retained. Opening/cancelling
  the chooser sends no writes.
- User selected the compact light-statistics layout with navy coloring: a navy
  identity header, Company/County context, and a light three-column statistics
  grid. The title card is capped at 780px to match the compact-width preview;
  schedules and forecast matrix keep their available width. Native values and
  contract disclosures remain intact.

Both creation entry points retain the existing parent plus exactly twelve-month
verification, progress/terminal outcome, pending duplicate guard and read-only
uncertain-result recovery. Record creation business logic was not modified.

## Creator contract and deployment

The only backend source change adds type from **Builder.Type1** to the existing
catalog records. The current native .ds defines this required field and existing
lookups use Type1 == Builder. Saved Development Deluge compiled and its reopened
source visibly contained the new line. Execute catalog succeeded, returning
9 Builder choices and 4 Seller choices in Development. This is a read-only field
addition; no schema, permission or native forecast calculation changed.

Default forecastManagerWidget still returns String with payload:String. Enabled
Forecast_Manager_Widget_DEV and Forecast_Manager_Widget retain POST, OAuth2,
Key/Value payload and Standard response with the existing selective audience.
Creator 9.59 contains only the forecastManagerWidget change; unrelated pending
forms, approval components, functions and App Menu were excluded. Both Stage and Production visibly showed 9.59 before frontend promotion.

Frontend deployment required: immutable 1.4.0, mapped to Development/Production.
Permanent URL: https://rbelliveau-wbw.github.io/land-master/prod/forecast-manager/

## Regression evidence

- Required npm run validate passed. Focused native backend/model checks cover
  the first Settings window, exact +28-day guard, one builder row, scoped/idempotent
  creation, stale/conflicting records and native subtotal calculations. New
  catalog test retains non-Builder identities and exposes exact native types,
  with zero writes.
- Supported browser, inert local fixture using the actual source: a genuine
  mouse click retained input focus, typed 14 remained focused, Tab advanced to
  November, and a single inline save verified. No Creator connection exists in
  this fixture.
- Both read-only matrix modes showed blank zero month/total cells while retaining
  nonzero values. The exact missing-row labels were verified.
- Row creation skipped the selection dialog. A simulated lost creation response
  retained its result; Check status verified all twelve months using a snapshot.
  Visible log: Writes1; catalog,snapshot,ensure,snapshot. No ensure replay.
- Top chooser showed only DR Horton/StyleCraft, excluding a Placeholder-type
  fixture record; selected StyleCraft/WFY2027 created and verified all twelve
  months. The source browser regression covers the compact chooser, 28-year
  creation range, no-write cancel, focus, blank-zero/nonzero behavior and exact
  row destination. The CLI browser runner was not executed.
- Desktop title measured 780px. A true 390px iframe measured 380px client/scroll
  width and a 338px title/inventory card: responsive layout has no page overflow.
- Native live Development save/create evidence remains in the
  [backend release record](forecast-manager-backend-2026-10-08.md). No additional
  live forecast edits are needed for this frontend change. Production verification
  is read-only; no Production forecast or Settings data changes are authorized
  as tests. Individual role sessions and concurrent transport failures were not
  forced.

## Files, fields and rollback

Source scope: Forecast Manager app JS, summary renderer, CSS and HTML; config and
widget manifest; one catalog line in forecastManagerWidget.dg; focused tests;
API/dependency deployment metadata; design/module documentation; immutable release
and environment mapping. Existing Forecast, Forecast_Year, Subdivision and Settings
write fields/guards stay unchanged. Newly read field: Builder.Type1 only.

Rollback frontend mappings to **1.3.0**, build and deploy Pages. Creator 9.59's
additive catalog field remains compatible with 1.3.0. If withdrawing that field,
selectively restore the 9.58 function through normal Creator deployment. Do not
change forecast records as part of rollback.
