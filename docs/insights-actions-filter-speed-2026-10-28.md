# Insights actions, fiscal defaults and filter speed — 1.6.11

Refresh and Diagnostics move beneath the Insights branding and above navigation,
using centered16px SVG icons in the existing30px navy outline buttons. Refresh
reuses Forecast Manager's refresh geometry. The connection status stays available
to assistive technology without visible Connected text. Existing handlers,
diagnostics and access checks remain intact.

Forecasts starts and resets to WFY2026–2029 (February2026–January2030). The explicit
planning preset and all four preselected Choose Years values use the same fiscal
model. Missing future years remain unknown and retain their warning; this is not
forecast creation. Other period choices remain available.

Filter changes reconcile keyed row bundles and retain the unchanged header,
pickers and rows. The bounded per-model row pool allows filtered rows to return
without parsing their markup again. Clear the pool on new data or access reset.
Empty/missing numeric cells use plain static text, matching the existing rule
that unknown/blank values do not animate. Nonzero values retain the shared numeric
transition and exact scope keys. One Intl.NumberFormat instance replaces repeated
formatter allocation in the month-cell/title path. Search debounce drops from
160ms to50ms; selected filters still apply synchronously. Counts, warnings,
subtotals, fiscal columns, CSV scope and completeness/permission guards remain.

Desktop regressions cover actual SVG centering, default/Reset years, code and
Subdivision search, all existing controls/CSV/access cases, retained header/row
identity, and zero extra reads. On the346-phase48-month fixture, repeated filter
handlers measure about145–190ms rather than750–793ms before formatter reuse.
Repository validation and Pages build are required before promotion.

Changed files: Insights HTML/CSS, Forecasts app/model, existing model/browser
regressions, design/module notes, config/manifest, immutable release and
Development/Production mappings. Creator forms/fields/functions/APIs/permissions:
none changed. No Creator deployment is required. Rollback: map Production
lot-sales-explorer to1.6.10 and rebuild Pages; stable widget URLs remain unchanged.
