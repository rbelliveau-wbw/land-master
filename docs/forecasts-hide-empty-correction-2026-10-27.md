# Forecasts Hide Empty correction and header picker

## Release and cause

Data Insights (`lot-sales-explorer`) **1.6.5**, rollback **1.6.4**. PMP promotes
the immutable release to Development and Production. Stage and permanent widget
URLs remain unchanged. No Creator deployment, promotion or permission change.

The previous empty-row rule excluded only completely known zero rows. It left
every missing-only row visible, so Hide Empty appeared ineffective on the user's
346-row report. Read-only DOM inspection found only 24 rows with a nonzero
displayed monthly value. The corrected rule hides any row with no such value,
including missing-only and mixed blank/zero rows. Any nonzero month retains a
partly missing row. Missing source values remain null/unknown.

The same model predicate drives the renderer's cached row membership. The two
visible scopes now cache separate group and footer totals during a real report
build; toggling applies the matching cached values, scope counts and CSV rows.
The missing-forecast warning still covers the complete matching scope, including
hidden empty phases. No reads or model rebuilds occur while switching. Rows,
headers, footer and controls stay mounted; scroll remains bounded by the shorter
filtered report. Count and total changes reuse the existing number transitions.

Lot Status moves from the filter row into the first table heading where requested.
The existing `InsightsControls.placePicker` path used by Lot Sales moves the same
picker/handlers; the grouping-column label remains available to assistive tools.

## Files and native surface

- `widgets/lot-sales-explorer/src/app/forecast-insights-model.js`: shared
  displayed-value predicate used by pure reports and mounted filtering.
- `forecast-insights-app.js`: cached scope totals, minimal mounted patches and
  first-header picker placement.
- `forecast-insights.css` and `widget.html`: header picker presentation and hidden
  backing control, following the existing Lot Sales pattern.
- `scripts/test-insights-forecasts.mjs` and
  `scripts/test-insights-forecasts-browser.mjs`: actual row disappearance,
  restoration, filtered totals/CSV, no-match state, header placement and speed.
- Style guide, widget config/manifest, environment mapping and immutable release.

Existing read-only Subdivision, Project, Builder, Forecast_Year, Forecast and
User_Access paths are unchanged. No fields, native functions or Custom API
contracts change. The separate Forecasts Dashboard permission remains intact.

## Verification

- Pure native-shape fixture: three rows become one populated row; missing-only,
  zero and mixed blank/zero rows are hidden without converting unknown values.
- Desktop browser: actual rows/groups disappear and return; totals switch from
  unknown to the visible row's value and back; CSV excludes both zero and
  missing-only rows. All-empty search produces No Matching Phases and disables
  export; turning Hide Empty off restores the row.
- Lot Status is inside the first heading, absent from the filter row, and still
  changes the report through the existing picker. Desktop sizes 1366/1920/3243 px.
- 346-row repeated switches retain row/header/footer identities, keyboard focus,
  bounded scroll and collapsed-group behavior, with no extra reads/model builds.
  Hide Empty handlers were 38–83 ms, including restoring the full report;
  the other display switches remained 12–14 ms.
- Existing colors/current month, fiscal rollover, loading/error, scope routing,
  territory cards, independent access/revocation and Lot Sales regressions pass.
- `npm run validate` and `npm run build:pages` pass. Postdeployment live Creator
  row-count verification is part of this PMP. No native writes are used.

Local evidence: `tmp/forecast-hide-empty-browser.log` and
`tmp/forecast-browser/`. Rollback maps Production back to 1.6.4 and redeploys
Pages; no data rollback is needed.
