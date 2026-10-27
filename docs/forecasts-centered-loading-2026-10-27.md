# Centered Forecasts loading — Insights 1.6.2

The yellow Loading Forecasts notice is replaced by a compact, centered navy
spinner and Loading forecasts label in the matrix viewport. The indeterminate
ring follows the existing Land & Projects importer spinner pattern. It animates
only while the actual authorized read is pending, with no minimum display delay
or invented progress percentage. Reduced motion keeps a static ring and label.

The existing data read owns start, success, failure and cancellation. Loading
updates the table's aria-busy state and a separate polite status label. Existing
authorized rows remain mounted during refresh. Completion, errors and permission
resets hide the indicator. Real failures retain their error notice and existing
retry behavior; empty/unavailable states are centered in the same report viewport.
No data definitions, API requests, permissions, cursor/count completeness gates,
CSV or financial values change.

Changed files: Forecasts HTML, forecast-insights-app.js, forecast-insights.css,
Insights config/widget manifest, existing desktop browser fixture, design/module
notes, immutable release and Development/Production mappings. Forms/fields,
Creator functions and Custom APIs: none changed. Creator deployment is not
required. Permanent widget URLs remain unchanged.

Desktop verification uses held native-shaped SDK reads at 1366px and 1920px:
the loader is centered within 1px, the yellow notice and old empty label stay
hidden, the ring animates only when pending, reduced motion stops its animation,
Export is locked, and successful completion clears aria-busy. A held refresh
preserves the same authorized row nodes. Failed refreshes clear the loader and
show the actual error; failed initial reads expose Retry. Existing forecast
controls, CSV, independent permissions/revocation, partial-read denial and
346-phase disclosure performance are also covered. Fixtures do not write live
records. Full repository validation and Pages build passed.

Rollback: restore Production `lot-sales-explorer` to **1.6.1** and rebuild Pages,
retaining the permanent Insights URLs. No native rollback is required.
