# Lots columns, three-part view slider and Forecasts controls

## Releases and deployment

- Manage Lots **0.13.19**; rollback **0.13.18**.
- Data Insights (`lot-sales-explorer`) **1.6.3**; rollback **1.6.2**.
- PMP promotes both immutable releases to Development and Production through
  `deploy/environments.json`. Stage stays unchanged. Permanent Creator widget
  URLs stay unchanged. No Creator deployment or promotion is required.
- Permissions, native fields, functions and Custom APIs are unchanged.

## Changes

Each inventory block previously sized its own table from its contents. Every
block and subdivision now receives the same explicit column layout, determined
only by the currently visible columns. Headers and cells keep identical
boundaries in List and Edit. Long codes and read-only values truncate within
their columns and retain complete hover titles. Block and Lot stay bold.
Horizontal scrolling is synchronized across inventory blocks, including a block
reopened after scrolling. Row height and the mounted report position stay stable
when changing List/Edit. The simple read-only takedown detail tables are outside
the new inventory-only layout rules.

List, Edit and Grid are three matching, mutually exclusive button segments in
the existing centered slider. List opens the read-only list, Edit enables its
existing inline editors, and Grid remains read-only. The shared interaction
motion registry moves the one selection pill through all three segments.
Arrow keys, Home and End select and focus the corresponding segment. Existing
draft, pending write, note, unknown-result and actor/scope locks apply to all
three. Changing modes issues no native writes or reads.

Forecasts uses the existing searchable single picker for a clearly labeled
View by dropdown (Project, Territory, Builder). It calls the existing grouping
renderer with the same grouping values. Hide Empty, Annual Totals and Subtotals
are consecutive switches in one group; the Sold/Forecast legend immediately
follows them. The separate Monthly Lot Count/count/legend row is removed; its
count remains an accessible status. Controls retain one compact horizontal row
with local scrolling at tighter desktop widths. The centered pending loader,
missing-forecast warning beside CSV, immediate mounted-row disclosures and
existing errors remain intact.

## Files and native surface

- `widgets/manage-lots/src/app/{lots-list.js,lots-list.css,widget.html}`.
- `widgets/lot-sales-explorer/src/app/{forecast-insights-app.js,forecast-insights.css,widget.html}`.
- `shared/interaction-surfaces.js` and its synchronized widget source copies.
  Only the Manage Lots mode selector registration changes; other
  widgets' behavior is unchanged.
- Widget configs, `manifests/widgets.json`, environment mappings and immutable
  release directories for the two versions above.
- Desktop regressions: `scripts/test-lots-list-browser.mjs`,
  `scripts/test-lots-mode-performance-browser.mjs`,
  `scripts/test-lots-filters-browser.mjs`,
  `scripts/test-insights-forecasts-browser.mjs`.
- Reusable design rules: `knowledge/design/lot-lists.md` and `style-guide.md`.

Existing native Lots, Builder, Builder_Takedown, Contract and Subdivision paths
are reused unchanged. Forecasts still reads Subdivision, Project, Builder,
Forecast_Year and Forecast through its existing adapter. No native form,
report, field, function, API contract or access rule changes.

## Verification

- Full Lots desktop browser suite: subdivision/filter continuity, actual native
  lookup shapes, status/relationship separation, notes, precise inline saves,
  bulk updates, rejected and unknown saves, read-only recovery, takedown detail,
  selection, collapsed blocks, Grid, keyboard navigation and zero-write mode
  changes pass.
- Column geometry is measured for every header and row in uneven 4/8-lot blocks
  at 1366, 1920 and 3346 px, with sparse dates, leading-zero Block labels, long
  builder names/codes, zero/blank values and large exact decimal strings. All
  column starts and widths agree within one pixel. Read-only/Edit boundaries
  match exactly. Scrolled/reopened blocks and optional columns also pass.
- 312-lot/253-builder mode switches retain report/row/field/date nodes,
  selection and vertical scroll: 41–73 ms synchronous handlers in the final
  suite; pointer changes 144–154 ms. No native writes.
- Forecasts desktop fixture passes dropdown grouping, switch adjacency, legend
  position, one-row geometry at 1366/1920 px, matching Lot Sales switch tracks,
  centered/reduced-motion loading, filters, totals, territory cards, CSV,
  independent permissions, access revocation and denied/failed reads.
- Forecasts' 346-phase disclosure benchmark preserves mounted rows/head/foot and
  focus, with no extra model builds or data reads; handlers 5–27 ms.
- `npm run validate` and `npm run build:pages` pass. All 24 Manage Lots and 30
  Data Insights immutable release assets match their source files byte-for-byte.
  CI and Pages must succeed before this PMP is reported deployed.

Screenshots and test logs are local under `tmp/lots-list-preview/` and
`tmp/forecast-browser/`. Native Creator UI was not exercised for this
presentation-only change, following the repository's desktop fixture policy.

## Rollback

Set Production `manage-lots` to `0.13.18` and `lot-sales-explorer` to `1.6.2`,
then rebuild and deploy Pages. Keep Development on each latest complete release
unless a new corrective release replaces it. No data or Creator rollback is
needed.
