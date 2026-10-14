# Insights compact toolbar and Forecast production badge

Insights 1.5.48 opens on Lot Count and Reset restores it. Active filter pills
share the navy report bar with the timeframe; the redundant range chip is gone.
Branding, connection status, Refresh and Diagnostics move into the sidebar so the
report uses the previous shell-header height. Expand All / Collapse All occupies
the former filter-pill area and acts on visible groups, including separate Sold
and Scheduled groups. Individual group toggles keep its next-action label current.
The report and lot-detail scrollers no longer reserve blank horizontal gutters;
the lot-detail table has no side margins.

Forecast Manager 1.5.5 hides the Production badge. Development and Stage labels
remain visible after connection.

Changed sources: Insights widget.html, sales-app.js, insights-redesign.css;
Forecast widget.html and forecast-app.js; widget configs, widget manifest,
design guides, regression script and immutable releases.

Forms/fields, functions and Custom APIs: unchanged. Creator deployment: none.
Production mappings: lot-sales-explorer 1.5.48 and forecast-manager 1.5.5.
Rollback: restore production mappings to Insights 1.5.47 and Forecast 1.5.4.

Regression: initial/reset measure, visible-group collapse/expand and partial
collapse, filter/date/status/group changes, permission gates, complete-history
loading, metric drilldowns/export, full-width independently scrolling detail,
sidebar refresh/diagnostics and production/development environment labels.

Validation: `npm run validate`, `npm run build:pages`, design documentation
checks, Insights startup/toggle/reset regressions, Forecast model/browser
fixtures, and desktop Insights layout checks passed. The detail scroller has
zero side margins and only its 1px modal border separates it from either edge.
An inert Production Forecast fixture confirmed the environment badge is hidden.
