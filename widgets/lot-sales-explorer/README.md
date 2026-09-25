# Land Master Insights 1.5.8

Read-only dashboard workspace with a left menu for Lot Sales. Budgets is temporarily hidden and its scripts and background requests are disabled. The Lot Sales report is a monthly matrix grouped by Project, Territory, or Builder, then subdivision. Switch between mean $/FF, weighted $/FF, lot count, average base price, and total base price. Filter by territory, project, builder, Sold/Contracted status, date basis, period, and search; click a cell to inspect its underlying lots. Export the whole selected period or drilldown lots to CSV.

## Creator installation

Register an externally hosted widget and put it on the desired Creator page:

`https://rbelliveau-wbw.github.io/land-master/prod/insights/`

Use this permanent URL, without a release version. It uses the repository's standard cache-busting loader and retains the parent Creator context. Outside Creator it displays an installation empty state; it never displays business records publicly or substitutes mock data for failed live requests.

No new Creator forms, fields, functions, or Custom APIs are required. The dormant Budgets module, when enabled, reads `All_Budgets`, `All_Budget_Categories`, `All_Budget_Items`, and `All_Budget_Modifications`. Users need existing read access to `All_Lots_All_Fields`, `All_Subdivisions`, `All_Projects`, and `All_Builders`, including the requested fields. Widget registration/page placement is the only new Creator setup. No Pro Forma changes are part of this release.

## Data rules and controls

- Initial view uses the supplied reference: Sold, Close Date, current and previous calendar year, excluding builders with blank names or exact case-insensitive names Other / Placeholder. These are visible, editable filters, not permanent record exclusions.
- Mean $/FF averages each eligible lot's `Base_Price / Lot_Size`. Weighted $/FF divides eligible base-price sum by eligible frontage sum. Both are available in Measure. Zero prices remain zero; missing/negative price and nonpositive frontage are excluded from $/FF and reported in the data-quality count. Lot count still includes those lots.
- Base-price measures exclude tax, interest, fees, and escalators. Price/FF uses Base_Price + Interest1 for each lot, then averages the eligible lots' price per front foot. A blank Interest1 counts as zero when Base_Price is present. Escalator is displayed as its stored percentage and is not added again. No inferred closing proceeds are displayed.
- The lot-count matrix displays blank cells where the count is zero. The full-history subdivision tooltip shows Total, Sold, Contracted, and Open, where Open includes every status other than Sold or Contracted. These counts ignore the report's date, status, builder, and search filters. A green check appears only when every lot in the subdivision is Sold; counts and checks wait for complete history.
- Sold and Contracted can both be selected, with separate summary, territory/subdivision groups, drilldowns, totals and CSV rows. Their financial totals are never blended. The date basis remains explicit and user-controlled (Close Date or Purchase Date); no contract-date meaning is inferred. Records without the selected date are excluded from month buckets and counted in the footer.
- First lot sale is the earliest Sold Close Date across all dates within the territory/project/builder/search scope. Average front ft uses positive widths in the selected status and date range. Both column headers label their different scopes.
- Archived lots remain included in historical reporting. Every selected month remains available through horizontal table scrolling; totals cover the entire selected period. Exports include every month in the period.
- A missing subdivision lookup is labeled Unknown/Unassigned; it is never matched by display name. Creator IDs are strings throughout.

## Progressive loading (1.1.0)

The initial Lots request filters for either Close_Date or Purchase_Date within January 1 of the previous calendar year through December 31 of the current year. Both count and record requests carry the same criteria in the Creator application’s MM/dd/yyyy date format. Relationship reports load alongside that slice. Once recent sales render, a complete Lots snapshot loads in the background. Budget reports do not load while the dashboard is hidden.

The recent slice supports either date basis, status, project, builder, territory, search, metrics, and drilldowns. All History and ranges outside that window wait visibly for the complete snapshot. First-sale dates remain labeled Loading (or Unavailable after failure), missing-date counts remain withheld, and CSV export waits for full history. This prevents partial history being presented as complete. On completion, filter selections, matrix scroll position, and an open drilldown snapshot remain stable. A failed background load leaves recent sales available and exposes Retry history. Refresh invalidates older requests before further pages are fetched or results applied.

## Budgets dashboard (temporarily hidden in 1.2.0)

- First use asks the viewer to choose budget scope and comparison basis; no financial defaults are assumed while the user’s clarification answers are pending. Choices persist for the current browser tab/session and Creator environment.
- Scope choices: latest approved per subdivision, latest per subdivision including drafts, or all budgets. Approved requires both Development and Construction approval-status fields to equal Approved. Latest means newest creation date, with string-safe record ID order as the tie breaker. Unlinked budgets remain separate; display names are never used to merge records. All-budgets mode visibly warns about overlapping versions.
- Original Final sums Budget_Category.Budget_Total, matching Budget Manager’s phase/category totals. Revised Final adds signed Approved Budget_Modification amounts. Submitted/Pending modifications are displayed separately and never included. Decrease amounts subtract. GP Actuals sums Budget_Item.PROJ_Actual. HCSS_Actuals can be shown in its own column and is never added to GP.
- Remaining = selected basis minus GP actuals. Over-budget amount sums only negative remaining amounts as positive overruns; it does not net overruns against another budget’s unused dollars. Budget use measures spending, not physical progress or forecast completion. Blank currency amounts follow Budget Manager’s zero convention. Budgets with no category detail are identified and excluded from financial totals.
- Four totals, spend-by-project bars, approval/pending-change signals, filters, overruns-only view, sorting, CSV export, and category drilldowns provide the first budget view. Financial cards cover the selected portfolio; the overruns-only switch filters the detail table/export. No budget records are changed.
- Budget requests use the same cursor/count reconciliation as Lots. Failure is isolated to the budget panel. Shared project/subdivision data is reused after sales load; opening Budgets can load those relationships independently if sales fails.

## Extensibility

`sales-model.js` is a pure, independent normalization/filtering/aggregation module. Its metric registry and `report(lots, filters)` output support future views and embedding. `creator-adapter.js` owns SDK requests and completeness checks; `sales-app.js` owns the standalone UI. A `projectId` query parameter preselects a project using the same model. Unknown project IDs return no records rather than widening the filter.

Creator SDK v2 requests explicit fields using `field_config: custom`; Lot Size is absent from the existing report's quick-view columns. Cursor pagination and report-count reconciliation prevent silent truncation. Source: [Zoho Get Records](https://www.zoho.com/creator/help/js-api/v2/get-records.html), [SDK setup](https://help.zoho.com/portal/en/kb/creator/developer-guide/application-settings/widgets/articles/js-api-documentation).

Required fields: Lots (`ID`, `Subdivision`, `Status`, `Close_Date`, `Purchase_Date`, `Base_Price`, `Lot_Size`, `Builder1`; additional detail fields `Interest1`, `Escalator`, `Notes`; optional display fields `Lot_Code`, `Block`, `Lot_Number`, `Archived`); Subdivision (`ID`, `Project`, `Subdivision_Name`, `Territory`); Project (`ID`, `Project_Name`); Builder (`ID`, `Builder_Name`, `Type1`). No data writes are performed.

## Verification and rollback

Run `node scripts/test-lot-sales-explorer.mjs`, `node scripts/test-insights-budgets.mjs`, `npm run validate`, and `npm run build:pages`. The dedicated test covers dates, mixed widths, missing values, scope isolation, IDs, CSV formula escaping, cursor pagination, duplicate-page failures and count mismatches. `node scripts/preview-lot-sales.mjs` serves synthetic local fixtures for browser checks; fixtures are outside widget source and never published.

Browser regression: filters, measure selection, drilldown, individual group collapse/expand, horizontal month scrolling, missing-date/empty states, CSV export, reset, refresh, keyboard focus and 390px layout. The expanded loader and budget queries still require verification in the registered Creator widget. Local fixtures simulate delayed and interrupted historical requests.

Release 1.0.1 renames the shell to Land Master Insights and publishes `/prod/insights/` as the primary URL. The original `/prod/lot-sales-explorer/` remains a compatibility path. Both paths use the same promoted release and in-document loader, preserving Creator context and query parameters. Source and release identifiers remain `lot-sales-explorer`. To roll back 1.1.0, map production `lot-sales-explorer` to `1.0.1`; both URLs remain available. No forms, fields, functions, or Custom APIs change.

1.1.0 verification: recent/full-snapshot criteria and reconciliation; retry/cancellation; preserved project filter; complete-history gating; budget approval scopes, GP/HCSS separation, signed approved/pending modifications, empty/zero data; browser drilldowns and 390px page-overflow checks. Changed source includes shell, styling, report adapters/models/controllers, tests and fixtures. Creator publication is not required for users who already have read access to the existing reports.

1.1.1 versions every local script and stylesheet URL. Live Creator verification exposed cached JavaScript surviving the stable HTML loader; asset version queries keep each release’s shell, adapter, model and UI together. Future releases must update those queries alongside the displayed version.

## 1.2.0 controls and layout

Territory, Project, Builder and Lot status use searchable multi-select popovers with Clear, Select visible and Done. Selections match any value within one filter and all filters together; clearing a filter means all values. Date basis, Period, Measure and Sort use the same searchable picker with single selection, preserving their existing meaning. From/To use a custom month/year grid with keyboard navigation and Escape. The Base segmented button selects Total base price: sum of eligible recorded Base_Price for the filtered lots, defaulting to Sold; Contracted stays separate when selected.

Short reports anchor at the top. Long tables scroll internally with sticky headers and totals, the report footer stays visible, and month pagination is centered above the summary/table. Narrow screens have a separately scrollable filter panel. AGENTS.md and the style guide now document these reusable patterns.

Verification: multi-value scope isolation, separate status aggregation and shared month ranges, totals and drilldown identity, existing loader/count/cancellation checks, custom picker search/keyboard/month navigation, Base sum, short/tall viewport alignment, footer visibility and 390px overflow checks. Run the full validation and Pages build before promotion. Changed assets are widget.html, sales-app/model.js, insights-shell.js, new insights-controls.js/css, release/config/deployment manifests, documentation and the sales regression script. Existing Lots/Subdivision/Project/Builder read fields and functions/Custom APIs are unchanged; no Creator deployment is required. Roll back by mapping production lot-sales-explorer to 1.1.1; the Insights URL remains unchanged.

## 1.2.1 Builder picker

The Builder dropdown only offers records with Type1 equal to Builder, sorted alphabetically. The adapter requests the existing Type1 field from All_Builders. All builder reference records remain available for historical lot labels; this changes picker options only, not the report’s default population or financial calculations. Regression: Builder entries appear alphabetically, Seller/City/County/Other types are absent, and selecting a builder still scopes the report. Changed source: creator-adapter.js, sales-app.js and versioned widget.html; fixture data adds a Seller for browser verification. No forms, fields, functions or Custom APIs change and no Creator deployment is required. Rollback: map production lot-sales-explorer to 1.2.0.

## 1.2.2 Dropdown chevrons

Replaces the font-dependent caret character with a fixed-size SVG chevron centered vertically and consistently inset on all eight dropdown triggers. Source changes: insights-controls.js/css and versioned widget.html/sales-app.js. Browser verification checks every dropdown’s center alignment and right inset. No data rules, forms, fields, functions or Custom APIs change; no Creator deployment is required. Rollback: production lot-sales-explorer to 1.2.1.

## 1.3.0 Budget-style UI

Insights now adopts the existing Budget Manager landing-combo and budget-layout.css patterns: white filter pills, a blue search icon and clear action, blue-gray card surfaces, navy actions, striped tables, compact typography and structured summary values. Every dropdown uses a geometrically centered SVG chevron with the Budget module’s rotation transition and menu fade. Selected multi-value filters have direct clear buttons; search focuses on open, selection preserves list scroll position, Escape returns focus, and menus stay within the viewport. Month controls use a geometric calendar icon. Reduced motion disables the new transitions.

Changed UI files: insights-controls.js, new insights-theme.css, versioned widget.html/sales-app.js, config/release/deployment manifests and style guide. The existing report model, Builder Type1 restriction, date semantics, Base totals, separate Sold/Contracted populations, background loading, pinned footer and pagination are preserved. Browser regression: all eight chevron center offsets, open rotation/menu animation, searchable multi-selection, direct filter/search clearing, Escape focus, month popover and visible footer. Full validation and Pages build are required. No forms, fields, functions or Custom APIs change; no Creator deployment is required. Rollback: map production lot-sales-explorer to 1.2.2.

## 1.4.0 Price detail and subdivision progress

Adds a Price/FF view based on the mean of each eligible lot's `(Base_Price + Interest1) / Lot_Size`, labels the previous view Base/FF, and shows Base, Interest, Escalator %, total price, per-front-foot amounts, and Notes in lot drilldown and its CSV. Zero count cells are blank in the matrix and CSV. Hover or focus a subdivision name for all-history Total/Sold/Contracted/Open counts; a green check marks subdivisions whose lots are all Sold. Historical counts and badges stay unavailable until the complete Lots snapshot loads successfully. The existing Sold and Contracted report populations and date filters remain separate.

Frontend only: the existing `All_Lots_All_Fields` report now requests `Interest1`, `Escalator`, and `Notes`. No new Creator form, field, function, Custom API, or Creator deployment is required if viewers already have read access to these fields. Regression: zero-count cells/exports, missing or zero Base and Interest, invalid frontage, nonzero Escalator shown without double counting, escaped notes, all-history counts across filters and statuses, sold-out state before/after history, drilldown pagination and CSV, and 390px horizontal scrolling. Rollback: map production `lot-sales-explorer` to `1.3.0` and rebuild Pages.

## 1.5.0 Grouping and subdivision details

Group By is a single-select picker with Project as the default, plus Territory and Builder. Builder grouping partitions each subdivision's selected lots by builder, so one subdivision may appear in several builder sections; group totals and CSV rows remain distinct. Selecting Contracted in Lot Status sets Date Basis to Purchase Date, which can still be changed manually. Clicking a subdivision name opens a card with its Project and Territory, all-history Total/Sold/Contracted/Open counts, and selected-view lot count, builder count, frontage, base pricing, latest selected date, and first sale. The card offers View Lots. The green check tooltip reads Sold Out. Lot detail groups builders alphabetically and orders each builder's lots by Purchase Date, newest first. Filters and table field headings use title case; the lot-detail close icon is centered and turns red on hover.

Frontend and pure report-model changes only. Existing Creator forms, fields, functions, Custom APIs, and read permissions are unchanged; no Creator deployment is required. Regression: all three grouping choices, Builder subdivision duplication without duplicated totals, grouped CSV, Contracted date-basis switch, subdivision card before and after history, sold-out tooltip, lot-detail grouping and date order across pages, modal close hover, and narrow-screen scrolling. Rollback: map production `lot-sales-explorer` to `1.4.0` and rebuild Pages.

## 1.5.1 Subdivision hover card

Hovering or focusing a subdivision name opens a compact Land Master styled card beside the row. The card retains the 1.5.0 all-history and selected-view information, adds a sold-progress bar, and keeps View Lots accessible while the pointer moves into the card. Escape or leaving the card closes it; touch and keyboard activation can open it without hover. The card stays within the viewport, and scrolling the matrix closes it. No report data or Creator read contract changes. Regression: hover transfer from name to card, focus and Escape, touch activation, viewport edges, narrow screen, delayed history, and View Lots drilldown. Rollback: map production `lot-sales-explorer` to `1.5.0` and rebuild Pages.

## 1.5.2 Hover dismissal and single-select menus

The subdivision card closes after the pointer leaves both its row name and the card, while the brief crossing delay keeps View Lots reachable. Keyboard focus remains an independent way to open and use it. Group By and Sort retain the custom Land Master picker styling but show compact single-choice menus without checkboxes, search, or a Done button. Frontend only; no Creator fields, forms, functions, Custom APIs, or financial definitions change. Regression: hover-away dismissal, name-to-card transfer, focused control dismissal, keyboard access, Group By/Sort selection and sorting, and narrow viewport placement. Rollback: map production `lot-sales-explorer` to `1.5.1` and rebuild Pages.

## 1.5.3 Lot detail date groups

Lot Detail retains alphabetical Builder sections and adds a date heading within each Builder, using the selected Date Basis. Close Date or Purchase Date groups sort newest first; Purchase Date groups include lots that have no Close Date. Group headings repeat at page boundaries so each page remains readable. The report filters, totals, and CSV data do not change. Frontend and pure report-model changes only; no Creator form, field, function, Custom API, or Creator deployment is required. Regression: both date bases, purchase-only lots, builder ordering, page boundaries, and drilldown export. Rollback: map production `lot-sales-explorer` to `1.5.2` and rebuild Pages.

## 1.5.4 Lot Sales filter layout

The approved top filter bar puts search, Lot Status, and Period first. An expandable All filters section holds Location and Dates & Data, while active filters remain visible as chips. Table view holds Group By, Sort, and Collapse/Expand All. Single-value settings use the existing custom checkbox-free picker; Territory, Project, Builder, and Lot Status remain searchable multi-selects. The Shading checkbox is removed and its default table shading remains. Data definitions, queries, exports, pagination, and drilldowns do not change. This is a frontend-only release; no Creator forms, fields, functions, Custom APIs, or Creator deployment change. Regression: custom single and multi-select menus, preset and custom dates, filter summaries, reset, metrics, grouping, sorting, collapsing, CSV, and narrow layout. Rollback: map production `lot-sales-explorer` to `1.5.3` and rebuild Pages.

## 1.5.5 Compact report controls and group rollups

Search, Lot Status, Period, and All filters share one desktop row. Report totals, month paging, and Table view share the next compact row. Group By now sits in the Subdivision column header, and the full Measure choice sits in the Period header; on narrow screens Measure moves into the visible report toolbar. The redundant metric pill switch and separate Measure field are removed. Collapsed Project, Territory, and Builder groups show their earliest complete-history sale date, average frontage, selected-period measure, and values for each visible month. Aggregates are recomputed from the group's filtered lots so averages and weighted measures retain their definitions and Sold/Contracted remain separate. No Creator forms, fields, functions, Custom APIs, or backend deployment change. Regression: all six measures, grouped monthly and period totals, mixed statuses, Builder partitioning, paging, keyboard selection, collapse/expand, and narrow layout. Rollback: map production `lot-sales-explorer` to `1.5.4` and rebuild Pages.

## 1.5.6 Report setup and compact matrix

Lot Status, Period, Group By, and Measure are visible together in a compact report setup row. Search, filter settings, table settings, and month navigation share the next row; the text-heavy summary strip is removed. Group and measure controls retain their custom single-choice menus, and the selected measure labels the report's period column. Collapsed group rows continue to show values recomputed from their filtered lots for the selected period and visible months, with Sold and Contracted kept separate. This is a frontend layout release; Creator forms, fields, functions, Custom APIs, and financial definitions are unchanged.

Verification: run `node scripts/test-lot-sales-explorer.mjs`, `npm run validate`, and `npm run build:pages`; check desktop and narrow layouts, filter and month navigation, all six measures, group rollups, keyboard selection, drilldowns, and CSV export. Rollback: map production `lot-sales-explorer` to `1.5.5` and rebuild Pages.

## 1.5.7 Header controls and simplified month range

Group By and Measure return to the first and fourth table column headers as custom single-choice dropdowns. Search, Lot Status, Period, All filters, and active filter chips share a horizontal top row on wide screens and wrap on narrow screens. A small range pill shows the first and last selected month and the month count. All selected months remain available by scrolling the matrix horizontally, without month-page controls. Table view, Sort, and Collapse All controls are removed; each group can still be collapsed or expanded individually, with its aggregate values visible when closed. The underlying report filters, measure definitions, grouped totals, CSV export, and Creator data contract are unchanged.

Verification: run `node scripts/test-lot-sales-explorer.mjs`, `npm run validate`, and `npm run build:pages`; check desktop and narrow layouts, custom header pickers, search/status/period filters, the full month range and horizontal scrolling, individual group rollups, drilldowns, and CSV export. No Creator forms, fields, functions, Custom APIs, or Creator deployment change. Rollback: map production `lot-sales-explorer` to `1.5.6` and rebuild Pages.

## 1.5.8 Navy and teal color refinement

Lot Sales uses a softer slate-blue canvas with stronger navy and teal accents in the title, matrix header, group bands, selected measure column, and totals. Filter and table layout, control placement, report calculations, and interactions are unchanged. This is a frontend-only visual release; no Creator forms, fields, functions, Custom APIs, or Creator deployment change.

Verification: run `npm run validate` and `npm run build:pages`; inspect desktop and narrow layouts for readable contrast, unchanged picker positions and grouping behavior, and no overflow. Rollback: map production `lot-sales-explorer` to `1.5.7` and rebuild Pages.

## 1.5.9 Matrix navigation and detail readability

The selected month-range pill is centered in the title bar with larger, bold text. On desktop, Group, First Lot Sale, Avg Front Ft, and Measure remain visible while month columns scroll; narrow screens keep Group pinned so month values have room. The Measure column is about 30% narrower, and month-cell spacing is tighter. Numeric drilldown values use a subtle dotted underline with clear hover and keyboard-focus states. The lot-detail dialog expands to the available desktop width so its columns fit without horizontal scrolling at standard desktop sizes. Report calculations, filters, and Creator contracts are unchanged.

Verification: run `npm run validate` and `npm run build:pages`; check pinned header/body/footer alignment and collapsed groups while scrolling, date-pill centering, metric selection, value drilldowns, and detail-dialog overflow at desktop and narrow widths. This is a frontend-only release with no Creator deployment. Rollback: map production `lot-sales-explorer` to `1.5.8` and rebuild Pages.
