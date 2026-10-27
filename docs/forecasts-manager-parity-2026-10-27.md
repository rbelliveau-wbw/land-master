# Forecast Manager/dashboard parity and faster Hide Empty

## Release

Data Insights (`lot-sales-explorer`) **1.6.6**, rollback **1.6.5**. PMP promotes
the immutable frontend release to Development and Production. Stage and permanent
Creator widget URLs stay unchanged. No Creator deployment/promotion is required.
Forecast Manager 1.7.19 and its native API remain unchanged.

## Root cause and data source audit

Both screens already read the same native Forecast_Year and Forecast records.
`forecastManagerWidget.dg` loads Builder-status years, follows Forecast_Year2 to
their children, and excludes Delete_me records. The dashboard adapter reads those
same reports/fields with complete counted reads and no persistent report TTL.
This was a dashboard aggregation error, not a separate data source or stale cache.

The dashboard previously set an entire monthly value to null when any selected
builder had a blank forecast or missing year, discarding the available saved
subtotal. It also included builders from years outside the selected WFY range.
Group, footer and annual totals repeated the same suppression. Forecast Manager
instead sums available displayed values and shows missing years separately.

The corrected model tracks known contributions separately from missing entries,
displays saved subtotals, and propagates them through every aggregation and CSV.
Known zero remains zero; all-unknown remains null, with missing metadata retained.
Builder membership now uses the selected WFY range, matching Manager visibleMatrix.
Tooltips expose Sold/Forecast subtotals and missing builder-month counts; the
existing missing-forecast warning remains available. Date semantics stay the same:
completed months use Actual_Lots in Sold + Forecast, current/future months use
Forecasted_Lots, and Forecast-only uses saved forecasts throughout.

Read-only live baseline verification selected Arroyo Ranch Phase 05 in Forecast
Manager, the same 2026/2027 WFY range and Sold + Forecast view. Its current/future
counts were present while the old dashboard showed dashes. No forecasts were edited.

## Hide Empty performance

Hide Empty now plans all numeric and visibility changes first, captures every old
number in one read phase, applies visibility/markup changes, then runs the shared
numeric transition. It uses precomputed empty masks/counts and skips unchanged
hidden states, subtotal spans and Collapse button text. This removes repeated
read/write layouts across groups without bypassing scope/access checks or changing
the approved row and number motion.

The 346-row fixture improved from 38–83 ms switch handlers to about 12–18 ms;
hiding rendered in 36–48 ms, and restoring the full matrix retained the normal
roughly 260–303 ms row/layout settlement. No model rebuild or data read occurs.
Rows, header/footer identities, focus, bounded scroll and collapsed state remain.

## Changed files and native surface

- `widgets/lot-sales-explorer/src/app/forecast-insights-model.js`: selected-year
  builder membership, known counts and matching available-value aggregation.
- `forecast-insights-app.js`: batched display updates, cached masks/counts and
  truthful missing-data tooltips/classes.
- `scripts/test-forecast-dashboard-parity.mjs`: compares the actual shared
  ForecastModel matrix/displayValue/totals with dashboard native-shaped fixtures.
- `scripts/test-insights-forecasts.mjs`, browser fixture and `package.json`:
  corrected partial-value expectations, actual UI/CSV checks and permanent parity
  coverage in validation.
- Design guides, widget config/manifest, versioned HTML, immutable release and
  environment mappings.

Affected native reads remain Forecast_Year, Forecast, Builder, Subdivision and
Project. No form, field, function, Custom API, permission or SDK contract changes.
The separate Forecasts Dashboard grant, actor reset, complete-read and error
guards remain intact; no native writes are used for verification.

## Verification and rollback

- Native-shaped parity: complete and disjoint years, historical-only builders,
  one blank plus another saved value, explicit zero with a missing year,
  all-unknown months, both view bases, builder filters, all groupings, monthly,
  annual, group/footer and Hide Empty.
- Actual browser fixture: partial current-month count and future-year count
  remain visible; their annual values and CSV match. Missing-data warnings
  remain present. Existing filters, header picker, loading/error, routing,
  independent grants/revocation, rollover and Lot Sales regressions pass.
- Large repeated-switch and disclosure tests retain mounted identity, focus,
  scroll, zero extra builds/reads and the bounded transition behavior above.
- `npm run validate` and `npm run build:pages` pass, including the new permanent
  parity suite. Postdeployment comparison of all 24 Arroyo monthly values and
  both annual totals is part of this PMP.

Local evidence lives in `tmp/forecast-parity-browser.log` and
`tmp/forecast-browser/`. Rollback Production to **1.6.5**, rebuild and redeploy
Pages. No data or Creator rollback is needed.
