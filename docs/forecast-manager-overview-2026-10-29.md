# Forecast Manager overview — 1.7.22

## Behavior and scope

- Territory is a searchable multi-select before Subdivision. An excluded current
  subdivision clears without selecting or reading another. Clear resets All
  Territories; an explicit empty selection says 0 Territories. Save guards remain.
- All Years with Forecasts uses existing Builder forecast-year parents for the
  subdivision, including sparse years, without adding an empty current year.
  Initial current/next-year choices and manual year selection remain available.
- Total after Builder and its Selected total footer sum displayed months across
  selected years using each active tab's established basis. Both pin while scrolling.
- The blue bar is subdivision-wide and independent of matrix builder/year filters.
  Sold + Forecast retains its combined basis on every tab, as confirmed by the
  user. It reuses ForecastModel.visibleMatrix and existing completed-month actual /
  current-and-future forecast rules over all saved Builder years. Corrupt or
  incomplete saved years make the combined quantity unavailable.
- First Sold/Forecast prefers the first dated sale, otherwise the first positive
  forecast month. A centered green SVG marks an actual first sale. Last Sold is
  the latest dated sale. Final Sold/Forecast uses the latest actual sale when
  sold out, otherwise the final positive forecast month. Missing dates stay unknown.
- Projects Lots uses `Subdivision.Lot_Total_Residential`, the existing residential
  count synchronized from Budget by `syncBudgetMetricToProjects`. LM Lots uses
  the existing live all-date subdivision inventory, retaining model/archived
  records. Differences are source count minus combined Sold + Forecast. A real
  zero LM count displays No LM lots without a difference; missing differs from zero.

## Creator contract and deployment

**Publication completed:** the native function was saved, reopened and published
through Stage and Production 9.131, followed by read-only production verification.
See the [October 29 publication record](forecast-manager-native-publication-2026-10-29.md).
The original implementation handoff below records its required deployment step.

`forecastManagerWidget` adds `catalog.subdivisions[].territory` and optional
snapshot `overview` version 1 with projectStatus, territory, projectsLots, lmLots,
soldOut, firstSoldDate, lastSoldDate, firstForecastDate and finalForecastDate.
Actual dates reuse existing all-date Close_Date precedence, without a new today
cutoff. Forecast bounds reuse existing Builder-parent/linked-month reads,
exclude Delete_me and foreign subdivision/builder/year relationships.

Existing forms/fields affected (read only): Subdivision.Territory,
Projects_Status, Lot_Total_Residential; Lots.Subdivision, Close_Date and existing
inventory/status fields; Forecast_Year and Forecast existing links/counts/dates.
No fields, forms, reports or queries are added; existing writes are unchanged.

**Creator promotion required:** promote the saved source
`creator/functions/forecastManagerWidget.dg` through its existing
`Forecast_Manager_Widget` Custom API binding. PMP publishes repository frontend
assets only; Creator promotion/native compilation are left to the user. Do not
create another API or replace the existing binding. Old responses retain working
matrix/combined totals, available native metadata and safe unknown extra dates.
Territory stays disabled until its catalog metadata is present.

## Changed files

- `creator/functions/forecastManagerWidget.dg`: additive read-only metadata.
- `widgets/forecast-manager/src/app/forecast-app.js`: filters and period totals.
- `forecast-overview.js`: shared-model all-year combined total and differences.
- `forecast-summary.js`, `forecast-header.css`: expanded native summary header.
- `forecast-enhancements.css`: pinned totals and filter styling.
- `widget.html`, widget config and widget manifest: assets and version stamps.
- Backend/model/header/browser checks, validation entry, design/module guides,
  immutable release and Development/Production environment mappings.

## Verification

Native-shaped offline execution covers exact fields/scope, all-date actuals,
positive forecast bounds, deleted/foreign rows, zero/null, sold out and no writes.
Pure-model checks cover sparse/noncontiguous years, existing outlook math,
constant cross-tab basis, signed differences, unknown/zero/no-LM, old inventory,
corrupt years and source immutability.

Desktop header checks at 1280/1440/2308 pixels cover fit, centered actual-sale
SVG, No LM lots, old backend fallbacks and disclosure continuity. Existing
compact-summary browser checks retain exact native fact/schedule/date/progress,
disclosure and security parity. The full Manager browser suite covers new
Territory/year controls, all four tabs, totals/alignment/stable numeric keys,
header dates/scope, saves/conflicts/unknown recovery, creation, notes, numbered
placeholders and assignment. Required `npm run validate` and
`npm run build:pages` run before publication.

These checks do not establish native Creator compilation or verify the new
function in live Creator. That remains part of user promotion.

## Rollback

Restore Production `forecast-manager` to immutable release 1.7.21 in
`deploy/environments.json` and publish Pages, retaining the latest complete
Development mapping. Additive backend metadata is compatible with the prior
frontend. If needed restore only `forecastManagerWidget.dg` from commit
2dda89c2, preserving numbered placeholders and saved data.
