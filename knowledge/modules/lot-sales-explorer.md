# Land Master Insights

## Whole-dollar presentation (1.5.47)

All monetary displays round to the nearest dollar, including per-front-foot
measures, matrix totals, subdivision cards and lot/category details. Raw report
values, aggregates, numeric exports and permissions remain unchanged. No Creator
deployment is required. Regression and rollback to 1.5.46:
[currency display release](../../docs/currency-display-2026-10-08.md).

Read-only standalone module for monthly lot sales grouped by Project, Territory, or Builder, then subdivision, with project and builder filtering, financial metrics, lot counts, underlying lot drilldown, and CSV export.

Source: `widgets/lot-sales-explorer/src/app/`. Detailed contract, installation, testing, and rollback: `widgets/lot-sales-explorer/README.md`.

Uses existing `Lots → Subdivision → Project` relationships and Builder lookup. No Pro Forma model changes or Creator schema changes. Financial measures use Base_Price and Lot_Size (front footage). Data retrieval follows the signed-in user's Creator permissions; no unauthenticated business data is included in hosted assets.

## Insights 1.5.20 — Scheduled lots

Lot Status offers Sold and Scheduled. Choosing Scheduled forces Purchase Date and hides Close Date until Scheduled is cleared. Choosing both statuses combines their lots into one subdivision row, monthly values, totals, drilldowns, and CSV row; averages are recalculated over the combined eligible lots. The widget treats a lot with Close Date as Sold and one with Purchase Date but no Close Date as Scheduled, even while Creator Production still stores its previous status. The subdivision snapshot shows Total, Sold, Scheduled, Contracted, and Open from complete history. Its progress bar has Sold (green), Scheduled (gold), and Contracted (blue) segments, with the remaining track representing Open. Hover or focus shows counts by builder for every status. The snapshot header shows Territory and, for Builder grouping, Builder, without repeating Project. No new Creator field, function, report, or Custom API is used by this widget. Creator Production still needs the saved Development status workflows for record persistence and forecasts. Regression: Sold only, Scheduled only, combined rows and CSV, Purchase Date enforcement, stale stored status with dates, status breakdown by builder, sold-out badge, incomplete history, and keyboard focus on the progress bar. Widget rollback: `1.5.18`.

## Insights 1.5.21 — populated subdivision inventory

The card header starts with the subdivision name; the progress breakdown by builder is always visible below the bar. The top filter row has a default-off **Hide Empty** switch beside All filters. With it off, the table shows every subdivision with at least one lot in the current location, builder, and search scope, including undated Contracted/Open inventory and subdivisions with no Sold/Scheduled lots in the selected period. The complete Lots history must load before the default view appears, because the recent-date slice omits undated lots. The Unassigned/Other/Placeholder exclusion is off by default so those subdivisions are included. Turning Hide Empty on restores rows with selected Sold/Scheduled lots in the period. An empty row has no numeric values; its card still shows all-history counts and offers View All Lots. The bottom totals and CSV calculations still use only selected status/date lots. No Creator form, field, function, report, or Custom API change. Regression: full-history loading/failure, undated and out-of-period inventory, switch/reset, all three groupings, scope filters, empty-row card and detail, totals, CSV, mobile filter layout. Widget rollback: `1.5.20`.

## Insights 1.5.22 — compact subdivision card

The subdivision card omits the visible “All Lots” and “Complete History” heading above its status counts. The counts, builder breakdown, selected view, and drilldown behavior are unchanged. No Creator form, field, function, report, or Custom API change. Regression: subdivision card rendering and status counts. Widget rollback: `1.5.21`.

## Insights 1.5.23 — concise builder breakdown

The card's builder breakdown lists Sold, Scheduled, and Contracted only. Open remains in the count tiles and unfilled progress track, but its empty builder group is omitted. The requested builder-column layout is a design mockup for review and is not part of this widget release. No Creator form, field, function, report, or Custom API change. Regression: status counts and visible breakdown groups. Widget rollback: `1.5.22`.

## Insights 1.5.24 — builder status matrix

The subdivision card now shows builders as columns and Sold, Scheduled, and Contracted as rows. The footer of each builder column totals those three statuses. The status column stays visible when more than four builders require horizontal scrolling. The all-lot count tiles, progress bar, Open count, and selected-view calculations are unchanged. No Creator form, field, function, report, or Custom API change. Regression: builder ordering, sparse statuses, totals, Open-only inventory, narrow card, and many-builder overflow. Widget rollback: `1.5.23`.

## Insights 1.5.25 — builder rows

The subdivision card now shows builders as rows and Total, Sold, Scheduled, and Contracted as columns in that order. Total is each builder's Sold + Scheduled + Contracted lots. The builder name column stays visible when the card is too narrow for the table. The Open count remains in the status tiles, with no Open breakdown column. No Creator form, field, function, report, or Custom API change. Regression: column order, builder totals, long names, and narrow-card scrolling. Widget rollback: `1.5.24`.

## Insights 1.5.26 — drill-through counts and Zoho project status

Lot detail shows counts beside each builder and selected-date header, calculated across the full drill-through result so page boundaries do not change the number. The top toolbar gains a searchable, multiple-choice Zoho Project Status filter using the existing Subdivision.`Projects_Status` field; blank values appear as No status. The filter applies to the matrix, totals, subdivision rows, and their detail views and combines with existing scope filters. The search control gives up some width. No Creator form, Deluge function, report, or Custom API was changed; the widget's `All_Subdivisions` SDK read now requests `Projects_Status`, so viewers need read access to that field. Regression: multi-status and blank-status selection, counts under both date bases and across detail pages, reset, CSV scope, and responsive toolbar. Widget rollback: `1.5.25`.

## Insights 1.5.27 — compact builder names

The subdivision card omits the visible Builder breakdown heading. Builder names in the status matrix show no more than 23 characters before `...`, matching the requested `JNC Development (Sarato...` example; CSS clipping prevents overlap with Total at narrow widths. The full name remains available in the hover title and accessible row label. Zoho Project Status offers only populated Subdivision values, with no No status option; clearing the filter still includes blank statuses. Frontend only: no Creator form, Deluge function, report, or Custom API change. Regression: long names, narrow card and horizontal scroll, blank status exclusion from choices, cleared status filter, and builder totals. Widget rollback: `1.5.26`.

## Insights 1.5.28 — builder matrix visual regression fix

The green progress fill applies only to segments of the progress track, so the builder name text has the card's normal background. The matrix uses percentage column widths and no minimum table width, fitting the card without a horizontal scrollbar. Truncated builder names keep their full hover and accessible labels. Frontend styling only; no Creator form, Deluge function, report, or Custom API change. Regression: Sold and Contracted progress segments, long builder names, 390px card, header wrapping, and absence of horizontal scroll. Widget rollback: `1.5.27`.

Insights 1.4.0 adds Price/FF as the mean of `(Base_Price + Interest1) / Lot_Size` for eligible lots. `Escalator` is shown as a percentage, not added separately to price. Drilldown and CSV expose the recorded Interest, Escalator and Notes. Subdivision Total/Sold/Contracted/Open counts use all lots after complete history loads; Open means a status other than Sold or Contracted. Sold out requires every lot to have status Sold. The prior Base/FF calculation and default filters are unchanged. No Creator backend deployment is needed; rollback release is 1.3.0.

Insights 1.5.0 defaults Group By to Project; Builder partitions each subdivision's selected lots by builder. Clicking a subdivision opens a card with all-history counts and selected-view metrics. Contracted selection switches Date Basis to Purchase Date; users may then choose another basis. Lot detail groups builders alphabetically and sorts each builder's lots by Purchase Date newest first. Existing Creator read fields and financial definitions are unchanged. Rollback release is 1.4.0.

Insights 1.5.1 presents the subdivision details on hover or keyboard focus in a compact Land Master styled card. Touch and keyboard activation remain available; moving from the name into the card keeps its View Lots action usable. Counts and financial definitions are unchanged. Rollback release is 1.5.0.

Insights 1.5.2 closes the card after the pointer leaves its trigger and card, with a short crossing delay. Group By and Sort use compact custom single-select menus without checkbox marks. Data and financial rules are unchanged. Rollback release is 1.5.1.

The pure model, SDK adapter, and UI are separate. Future Pro Forma embedding should reuse the model and project scope rather than copying financial formulas.

## Insights 1.1.0

Adds a compact dashboard sidebar, a green Lot Sales heading, and the Budget dashboard. Lot Sales loads current/previous calendar years before a complete historical snapshot; incomplete history is explicitly gated and retryable without losing recent results. Budget scope and Final/Revised Final basis are selected explicitly on first use. GP actuals, HCSS actuals, approved modifications, pending modifications, and independent approval tracks remain distinct. Financial definitions and source fields are documented in the widget README. Existing report reads only; no Creator schema/functions/API changes. Rollback: 1.0.1.

1.1.1: add version queries to all local scripts/styles after live Creator reused the prior sales controller beneath the new HTML. The permanent widget URL is unchanged.


## Startup/report refinement — 2026-10-04

Insights 1.5.42 displays the complete current-and-previous-year window while full lot history loads, including with Hide Empty off. Recent subdivision inventory is labeled as recent; historical first-sale/inventory/export details remain unavailable until the complete read finishes. Selected-year totals match after completion; failure keeps recent results and Retry. On October 5 the user authorized read-only Production testing instead of the unavailable authorized Dev graph gate. Production 1.5.42 passed: first usable at 3,289 ms with history incomplete, then all 25,527 lots complete at 7,903 ms; both the two-year and all-history rows/totals matched the 1.5.40 baseline exactly. No user permission was changed. Rollback remains 1.5.40. See [final decisions](../../docs/final-refactor-decisions-2026-10-05.md).

Evidence and further improvements: [startup refinements](../../docs/startup-refinements-2026-10-04.md).

## Currency display and native representations — 2026-10-05

Sales and Budget Insights display currency totals with cents. The shared report
numeric model recognizes grouped USD, signed-dollar/accounting credits and
Unicode minus, preserving credit signs in downstream Budget aggregates. Malformed
grouping stays unavailable. This changes formatting/representation handling only;
date bases, financial metric definitions, negative-price exclusions, permission
checks and read-only access remain unchanged. Insights has no monetary write or
save-readback comparator. No Creator promotion is required for these frontend
changes. `scripts/test-manage-insights-currency.mjs` covers actual currency helpers
and Budget normalization; the existing Sales/Budget model regressions remain
required. Rollback to 1.5.42.

## Routine success feedback — October 6, 2026

CSV export preparation and successful manual report refreshes add contextual black confirmations. Lot-sales refresh confirmation waits for complete history; automatic startup, filtering, partial data and errors never claim a successful full refresh. See [the shared design guide](../design/success-feedback.md) for sizing, wording, inline preservation and reuse. This rollout is frontend only and adds no forms, fields, backend functions, Custom APIs or verification requests.
## Complete report first paint (1.5.46)

The October 6 request supersedes recent-year first paint: every selected period
waits for complete counted history and references before publishing a report.
Loading or failed history leaves the report empty and exports disabled. Retry and
stale-generation behavior remain safe; financial metrics and date bases are unchanged.
No Creator deployment. Regression and rollback: [release notes](../../docs/contracts-review-and-insights-2026-10-06.md).
