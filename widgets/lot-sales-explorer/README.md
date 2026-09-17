# Land Master Insights 1.0.1

Standalone, read-only monthly sales matrix grouped by territory and subdivision. Switch between mean $/FF, weighted $/FF, lot count, average base price, and total base price. Filter by territory, project, builder, Sold/Contracted status, date basis, period, and search; click a cell to inspect its underlying lots. Export the whole selected period or drilldown lots to CSV.

## Creator installation

Register an externally hosted widget and put it on the desired Creator page:

`https://rbelliveau-wbw.github.io/land-master/prod/insights/`

Use this permanent URL, without a release version. It uses the repository's standard cache-busting loader and retains the parent Creator context. Outside Creator it displays an installation empty state; it never displays business records publicly or substitutes mock data for failed live requests.

No new Creator forms, fields, functions, or Custom APIs are required. Users need existing read access to `All_Lots_All_Fields`, `All_Subdivisions`, `All_Projects`, and `All_Builders`, including the requested fields. Widget registration/page placement is the only new Creator setup. No Pro Forma changes are part of this release.

## Data rules and controls

- Initial view uses the supplied reference: Sold, Close Date, current month plus 12 prior months, excluding builders with blank names or exact case-insensitive names Other / Placeholder. These are visible, editable filters, not permanent record exclusions.
- Mean $/FF averages each eligible lot's `Base_Price / Lot_Size`. Weighted $/FF divides eligible base-price sum by eligible frontage sum. Both are available in Measure. Zero prices remain zero; missing/negative price and nonpositive frontage are excluded from $/FF and reported in the data-quality count. Lot count still includes those lots.
- Base-price measures exclude tax, interest, fees, and escalators. No inferred closing proceeds are displayed.
- Sold and Contracted are separate selections. The date basis remains explicit and user-controlled (Close Date or Purchase Date); no contract-date meaning is inferred. Records without the selected date are excluded from month buckets and counted in the footer.
- First lot sale is the earliest Sold Close Date across all dates within the territory/project/builder/search scope. Average front ft uses positive widths in the selected status and date range. Both column headers label their different scopes.
- Archived lots remain included in historical reporting. All-history month columns paginate 13 at a time; totals always cover the entire selected period. Exports include every month in the period, regardless of the visible window.
- A missing subdivision lookup is labeled Unknown/Unassigned; it is never matched by display name. Creator IDs are strings throughout.

## Extensibility

`sales-model.js` is a pure, independent normalization/filtering/aggregation module. Its metric registry and `report(lots, filters)` output support future views and embedding. `creator-adapter.js` owns SDK requests and completeness checks; `sales-app.js` owns the standalone UI. A `projectId` query parameter preselects a project using the same model. Unknown project IDs return no records rather than widening the filter.

Creator SDK v2 requests explicit fields using `field_config: custom`; Lot Size is absent from the existing report's quick-view columns. Cursor pagination and report-count reconciliation prevent silent truncation. Source: [Zoho Get Records](https://www.zoho.com/creator/help/js-api/v2/get-records.html), [SDK setup](https://help.zoho.com/portal/en/kb/creator/developer-guide/application-settings/widgets/articles/js-api-documentation).

Required fields: Lots (`ID`, `Subdivision`, `Status`, `Close_Date`, `Purchase_Date`, `Base_Price`, `Lot_Size`, `Builder1`; optional display fields `Lot_Code`, `Block`, `Lot_Number`, `Archived`); Subdivision (`ID`, `Project`, `Subdivision_Name`, `Territory`); Project (`ID`, `Project_Name`); Builder (`ID`, `Builder_Name`). No data writes are performed.

## Verification and rollback

Run `node scripts/test-lot-sales-explorer.mjs`, `npm run validate`, and `npm run build:pages`. The dedicated test covers dates, mixed widths, missing values, scope isolation, IDs, CSV formula escaping, cursor pagination, duplicate-page failures and count mismatches. `node scripts/preview-lot-sales.mjs` serves synthetic local fixtures for browser checks; fixtures are outside widget source and never published.

Browser regression: filters, metric switch, drilldown, collapse/expand, month paging, missing-date/empty states, CSV export, reset, refresh, keyboard focus and 390px layout. Live Creator data retrieval still requires the new widget to be placed on a Creator page.

Release 1.0.1 renames the shell to Land Master Insights and publishes `/prod/insights/` as the primary URL. The original `/prod/lot-sales-explorer/` remains a compatibility path. Both paths use the same promoted release and in-document loader, preserving Creator context and query parameters. Source and release identifiers remain `lot-sales-explorer`. To roll back, map production `lot-sales-explorer` to `1.0.0`; both URLs remain available. No forms, fields, functions, or Custom APIs change.
