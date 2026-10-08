# Currency presentation — October 8, 2026

Pro Forma 1.80.93, Budget 122.28.33 and Data Insights 1.5.47 change dollar
presentation only. The user explicitly authorized pushing to main and Production.

## Display behavior

- Pro Forma and Budget omit trailing `.00`, including `$0`, project/phase totals,
  category/item amounts, per-unit costs, modification and request balances, and
  Pro Forma budget-transfer totals/rates/metrics. Nonzero fractional values remain
  visible outside the whole-dollar dashboard surfaces.
- The Pro Forma dashboard rounds monetary cards, assumptions, cash snapshots,
  scenario comparisons/deltas, sensitivity amounts, monthly/whole-schedule tables,
  and timeline detail cards to the nearest dollar. Counts, acreage, percentages
  and editable scenario controls retain their existing precision.
- Data Insights rounds all Sales/Budget money displays, including per-front-foot
  measures, matrix totals, subdivision cards and lot/category detail rows.
  The existing hidden Budget navigation stays hidden.

## Data and dependencies

No Creator form, field, report, function, Custom API or saved data changes.
No Creator application deployment is required. Currency inputs keep nonzero
fractional precision; omitting an all-zero suffix is presentation only. Model
calculations, save payloads, persisted verification, permissions, workflow and
approval routing are unchanged. Numeric CSV/Excel exports retain source values.
Aggregate values are formatted after calculation, so displayed rounded rows can
differ from the displayed total when added manually.

## Changed files

- `widgets/proforma-manager/src/app/widget.html`, `budget-transfer-ui.js`, widget
  config and immutable release 1.80.93.
- `widgets/budget-manager/src/app/widget.html`, widget config and immutable release
  122.28.33.
- `widgets/lot-sales-explorer/src/app/sales-app.js`, `budget-app.js`, `widget.html`,
  widget config and immutable release 1.5.47.
- Existing regression assertions for dashboard/timeline/scenarios, phase sales,
  Budget deferred requests, currency editing and Insights displays; the shared
  style guide, affected module documents and Production environment mapping.

## Verification and rollback

The complete `npm run validate` suite and `npm run build:pages` passed locally.
Focused regression
coverage executes actual currency renderers and verifies positive/negative/zero
amounts, half-dollar rounding, full-precision input/save boundaries, raw monthly
aggregation and unchanged dashboard models after rendering. Existing native-shaped
save/readback suites verify fractions and reject cent loss. No live financial
write is necessary for this presentation change.

Rollback by restoring only the three Production mapping entries to Pro Forma
1.80.92, Budget 122.28.32 and Data Insights 1.5.46, then redeploying Pages. Preserve
the permanent Creator widget URLs and immutable release contents.
