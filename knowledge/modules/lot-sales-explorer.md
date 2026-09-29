# Land Master Insights

Read-only standalone module for monthly lot sales grouped by Project, Territory, or Builder, then subdivision, with project and builder filtering, financial metrics, lot counts, underlying lot drilldown, and CSV export.

Source: `widgets/lot-sales-explorer/src/app/`. Detailed contract, installation, testing, and rollback: `widgets/lot-sales-explorer/README.md`.

Uses existing `Lots → Subdivision → Project` relationships and Builder lookup. No Pro Forma model changes or Creator schema changes. Financial measures use Base_Price and Lot_Size (front footage). Data retrieval follows the signed-in user's Creator permissions; no unauthenticated business data is included in hosted assets.

## Insights 1.5.20 — Scheduled lots

Lot Status offers Sold and Scheduled. Choosing Scheduled forces Purchase Date and hides Close Date until Scheduled is cleared. Choosing both statuses combines their lots into one subdivision row, monthly values, totals, drilldowns, and CSV row; averages are recalculated over the combined eligible lots. The widget treats a lot with Close Date as Sold and one with Purchase Date but no Close Date as Scheduled, even while Creator Production still stores its previous status. The subdivision snapshot shows Total, Sold, Scheduled, Contracted, and Open from complete history. Its progress bar has Sold (green), Scheduled (gold), and Contracted (blue) segments, with the remaining track representing Open. Hover or focus shows counts by builder for every status. The snapshot header shows Territory and, for Builder grouping, Builder, without repeating Project. No new Creator field, function, report, or Custom API is used by this widget. Creator Production still needs the saved Development status workflows for record persistence and forecasts. Regression: Sold only, Scheduled only, combined rows and CSV, Purchase Date enforcement, stale stored status with dates, status breakdown by builder, sold-out badge, incomplete history, and keyboard focus on the progress bar. Widget rollback: `1.5.18`.

## Insights 1.5.21 — populated subdivision inventory

The card header starts with the subdivision name; the progress breakdown by builder is always visible below the bar. The top filter row has a default-off **Hide Empty** switch beside All filters. With it off, the table shows every subdivision with at least one lot in the current location, builder, and search scope, including undated Contracted/Open inventory and subdivisions with no Sold/Scheduled lots in the selected period. The complete Lots history must load before the default view appears, because the recent-date slice omits undated lots. The Unassigned/Other/Placeholder exclusion is off by default so those subdivisions are included. Turning Hide Empty on restores rows with selected Sold/Scheduled lots in the period. An empty row has no numeric values; its card still shows all-history counts and offers View All Lots. The bottom totals and CSV calculations still use only selected status/date lots. No Creator form, field, function, report, or Custom API change. Regression: full-history loading/failure, undated and out-of-period inventory, switch/reset, all three groupings, scope filters, empty-row card and detail, totals, CSV, mobile filter layout. Widget rollback: `1.5.20`.

## Insights 1.5.22 — compact subdivision card

The subdivision card omits the visible “All Lots” and “Complete History” heading above its status counts. The counts, builder breakdown, selected view, and drilldown behavior are unchanged. No Creator form, field, function, report, or Custom API change. Regression: subdivision card rendering and status counts. Widget rollback: `1.5.21`.

Insights 1.4.0 adds Price/FF as the mean of `(Base_Price + Interest1) / Lot_Size` for eligible lots. `Escalator` is shown as a percentage, not added separately to price. Drilldown and CSV expose the recorded Interest, Escalator and Notes. Subdivision Total/Sold/Contracted/Open counts use all lots after complete history loads; Open means a status other than Sold or Contracted. Sold out requires every lot to have status Sold. The prior Base/FF calculation and default filters are unchanged. No Creator backend deployment is needed; rollback release is 1.3.0.

Insights 1.5.0 defaults Group By to Project; Builder partitions each subdivision's selected lots by builder. Clicking a subdivision opens a card with all-history counts and selected-view metrics. Contracted selection switches Date Basis to Purchase Date; users may then choose another basis. Lot detail groups builders alphabetically and sorts each builder's lots by Purchase Date newest first. Existing Creator read fields and financial definitions are unchanged. Rollback release is 1.4.0.

Insights 1.5.1 presents the subdivision details on hover or keyboard focus in a compact Land Master styled card. Touch and keyboard activation remain available; moving from the name into the card keeps its View Lots action usable. Counts and financial definitions are unchanged. Rollback release is 1.5.0.

Insights 1.5.2 closes the card after the pointer leaves its trigger and card, with a short crossing delay. Group By and Sort use compact custom single-select menus without checkbox marks. Data and financial rules are unchanged. Rollback release is 1.5.1.

The pure model, SDK adapter, and UI are separate. Future Pro Forma embedding should reuse the model and project scope rather than copying financial formulas.

## Insights 1.1.0

Adds a compact dashboard sidebar, a green Lot Sales heading, and the Budget dashboard. Lot Sales loads current/previous calendar years before a complete historical snapshot; incomplete history is explicitly gated and retryable without losing recent results. Budget scope and Final/Revised Final basis are selected explicitly on first use. GP actuals, HCSS actuals, approved modifications, pending modifications, and independent approval tracks remain distinct. Financial definitions and source fields are documented in the widget README. Existing report reads only; no Creator schema/functions/API changes. Rollback: 1.0.1.

1.1.1: add version queries to all local scripts/styles after live Creator reused the prior sales controller beneath the new HTML. The permanent widget URL is unchanged.
