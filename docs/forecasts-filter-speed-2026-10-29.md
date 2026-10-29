# Forecasts default and filtering — Insights 1.6.16

Forecasts now opens with Hide Empty on. Reset restores it. Switching it off still
restores every scoped phase, including zero and missing-only rows. Lot Sales and
other modules retain their defaults.

Filter changes previously repeated annual/period scans, column construction,
group aggregation and markup formatting. They also assigned the existing scroll
offsets after every render, forcing a synchronous layout of the wide table.
The controller now caches six recent filter combinations within the current
authorized snapshot, reuses column values, group totals and unchanged markup,
and lets the mounted scroller preserve its position. Aggregation uses one pass
per month instead of a temporary array and five reductions. Group total markup
tracks the actual mounted state when a filtered chunk is reused.

Caches are bounded or weakly held. A complete refresh and access/actor reset
discard report caches; no records or permissions are cached across sessions.
The existing complete-read/count guards, missing-value semantics, Manager parity,
CSV scope, nested disclosures and numeric/movement transitions remain intact.
Filters and navigation do not introduce additional native reads.

## Scope

- Changed frontend: forecast-insights-app.js, forecast-insights-model.js and
  versioned widget.html; widget config/manifest, immutable release, Development
  and Production mappings, documentation and desktop regression fixture.
- Native forms/fields: existing Forecast, Forecast_Year, Builder, Subdivision
  and Project reads are unchanged.
- Functions and Custom APIs: unchanged. Creator deployment is not required.
- Production rollback: map lot-sales-explorer to 1.6.15 and rebuild Pages.
  Permanent Insights URLs remain unchanged.

## Verification

Native-shaped model and Manager-parity checks cover all groupings, partial and
unknown months, Sold + Forecast versus Forecast, selected-year membership,
annual/period/group/footer totals and builder filters.

The desktop browser check uses 346 phases and a four-year matrix. With Hide Empty
off, repeated Project Status changes took 46–50 ms after initial preparation;
an earlier implementation measured 140–170 ms in the same fixture. The first
new combination took about 127 ms. Hide Empty handlers took 13–15 ms. Repeated
filters reused the same two report builds and five initial reads. These are
local handler measurements, not a guarantee for network or paint time.

Desktop checks also cover the checked initial/reset state, full-row restoration,
Project/Territory/Builder grouping, nested builder detail and sums, annual
visibility, empty search/export disabling and retained scrolling. The permanent
browser suite explicitly checks the default and cached-filter/scroll behavior.
Required repository validation and Pages build run before publication.
