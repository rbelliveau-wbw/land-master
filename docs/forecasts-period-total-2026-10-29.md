# Forecasts selected-period total — 1.6.14

The Total column follows Builder and sums every month in the selected fiscal
years, including past and future. It follows Lot Status, grouping and filters,
remains visible when Annual Totals is off, and pins beside the phase identity
while scrolling. CSV includes Selected Period Total after Builder.

The existing annual aggregate is factored into a reusable total function, so
period and annual totals share the same known, missing, Sold and Forecast math.
No new calculation basis, data read, native field or backend operation is added.
Builder disclosure rows are presentation only and never contribute twice.

## Changed files

- `widgets/lot-sales-explorer/src/app/forecast-insights-model.js`: shared total.
- `widgets/lot-sales-explorer/src/app/forecast-insights-app.js`: grid and CSV.
- `widgets/lot-sales-explorer/src/app/forecast-insights.css`: pinned total style.
- `widgets/lot-sales-explorer/src/app/widget.html`, widget config and widgets
  manifest: version and cache stamps.
- Forecasts model/browser checks, this note, module and matrix design guides.
- Immutable release `releases/lot-sales-explorer/1.6.14/` and environment mapping.

## Regression verification

- Native-shaped fixtures cover both display modes, all groupings, one/multiple
  and noncontiguous fiscal years, past/current/future months, builder details,
  partial-known totals, all unknown and explicit zero.
- Forecast Manager/dashboard parity covers monthly and unchanged annual math.
- Desktop browser checks cover position, pinned header/body/footer alignment,
  builder totals, filters, Hide Empty, independent Annual Totals, CSV parity,
  disclosures, permissions, refresh errors, rollover and retained fast switches.
- Required repository validation and Pages build run before publication.

## Deployment and rollback

Frontend only. Affected Creator forms/fields: none. Affected functions and Custom
APIs: none. Creator deployment: not required. Live native Creator verification
is not part of this presentation-only change; browser checks use inert fixtures.

Development and Production use `lot-sales-explorer` 1.6.14 at the existing stable
URLs. Roll back Production to immutable release 1.6.13 in
`deploy/environments.json` and publish Pages. Leave Development at the latest
complete release.
