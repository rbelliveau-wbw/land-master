# Forecasts fast display switches, colors and current month

## Release

Data Insights (`lot-sales-explorer`) **1.6.4**, rollback **1.6.3**. PMP publishes
the immutable release to Development and Production through the existing
environment mappings. Stage and permanent Creator widget URLs are unchanged.
This is frontend-only: no Creator promotion, native deployment or access changes.

## Result

Collapse All / Expand All and Reset align together at the far right of the
control row. The Sold/Forecast legend is 13px and bold with 12px color swatches,
immediately beside the three existing display switches. Monthly headings and
cells use pale blue for Sold and pale green for Forecast; group/footer fills
are slightly stronger, and annual totals keep their existing neutral treatment.

The exact current month/year uses Forecast Manager's lavender heading, concise
Current label and purple side rules through body and totals. It uses the existing
Creator application date, including fiscal January mapping and year rollover.
The current body cells retain their Sold/Forecast basis tint. No financial or
date-basis calculation changes.

The live Creator baseline contained 346 phases across 94 projects. All three
switches worked when clicked, but each rebuilt the whole matrix. Hide Empty
appeared unchanged because phases with missing forecasts remain unknown and
visible under the existing rule. That meaning is preserved.

The three switch handlers now patch the mounted report:

- Annual Totals toggles cached annual cells and year-heading spans together.
- Subtotals toggles existing cached group totals, respecting collapsed groups.
- Hide Empty uses cached known-zero row membership, hides only those rows and
  empty groups, and updates accessible counts/visible group controls. Unknown
  rows remain visible. CSV follows the same filtered scope and annual choice.

The cached all/nonempty reports share their totals: every excluded row contains
only known zeros, so removing it cannot change any amount or missing count.
No model rebuild, aggregation, data read or native write occurs on a switch.
Rows, headers, footer, focus, scroll and collapsed state remain mounted. Only
small changed count displays use the existing shared number transition.
Permission resets clear both cached reports and all private DOM content.

## Changed surface

- `widgets/lot-sales-explorer/src/app/forecast-insights-app.js`:
  cached display state, switch patches, current-month classes, and matching CSV.
- `widgets/lot-sales-explorer/src/app/forecast-insights.css` and `widget.html`:
  right actions, legend, basis fills, current month, mounted annual visibility.
- `scripts/test-insights-forecasts-browser.mjs`: desktop geometry, colors,
  rollover, CSV, native-shaped errors/access fixtures and switch performance.
- `knowledge/design/style-guide.md` and `forecast-matrices.md`: reusable rules
  and the requested full-cell dashboard exception to Forecast Manager's chips.
- Widget config/manifest, immutable release and environment mappings.

Existing read-only Subdivision, Project, Builder, Forecast_Year and Forecast
forms/reports are reused unchanged. No field, function, Custom API or permission
contract changes. The separate Forecasts Dashboard grant still fails closed.

## Verification and limitations

- Live Creator baseline: clicked each visible switch label on/off and observed
  native checked state, annual-column presence and subtotal visibility.
- Desktop fixture: 1366, 1920 and 3243 px; one control row, right actions when
  space permits, adjacent switches and legend, 13px bold text/12px swatches,
  actual rendered basis colors, neutral annual totals and current-month rails.
- January/February server-date rollover, exact current year and a selected
  range outside the current month; accessible counts restore after refresh.
- Filtered group index/disclosure behavior, preserved zero/unknown semantics,
  CSV without hidden zero rows/annual columns, and unknown rows retained.
- 346-phase repeated switches: unchanged row/header/footer identities, focus
  and scroll, zero extra model builds and zero reads. Actual pointer-label
  clicks in both directions also pass. Final fixture handlers take 16–26 ms,
  with the next measured frame in 26–207 ms. Disclosure performance stays bounded.
- Existing loading/reduced-motion, refresh failure, missing warning, territory
  cards, CSV, routing, grant revocation, denied reads and Lot Sales checks pass.
- `npm run validate` and `npm run build:pages` pass. Postdeployment live Creator
  switch checks are part of this PMP. No native writes are used for testing.

Local evidence: `tmp/forecast-colors-browser.log` and `tmp/forecast-browser/`.
The live page must reload after Pages publishes to receive the new assets.

## Rollback

Map Production `lot-sales-explorer` back to **1.6.3**, rebuild and deploy Pages.
Keep Development on the latest complete immutable release. No data or Creator
rollback is needed.
