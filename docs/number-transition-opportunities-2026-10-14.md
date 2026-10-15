# Input-driven number transition inventory

Audit date: October 14, 2026. This covers all ten current widget source trees.
Each entry represents a repeated numeric field family, including every row,
phase, category, month or grouped copy of that family. Forecast Manager is
implemented in 1.6.2; the remaining entries are implementation opportunities.

Use the [Sliding push contract](../knowledge/design/number-transitions.md): 420ms,
16px, real final values immediately, stable field/record/scope identity, no
animation on first load/equal/unknown values and reduced-motion support. Preserve
each widget's existing draft-versus-persisted semantics. Animate derived draft
displays when they already recalculate locally; persisted displays update after
the widget's existing acknowledgement/refresh. Do not add new write requests.

## Forecast Manager — implemented

Source: [forecast-app.js](../widgets/forecast-manager/src/app/forecast-app.js)
`render`/`patch`, [forecast-summary.js](../widgets/forecast-manager/src/app/forecast-summary.js)
`render`, [number-transitions.js](../widgets/forecast-manager/src/app/number-transitions.js).

| Display | Input or update |
| --- | --- |
| Each builder's WFY forecast/Sold/Scheduled total | Forecast save, native refresh, filters |
| Selected-builder totals for each month and WFY | Forecast save, creation, selection/filter changes |
| Read-only Sold/Scheduled monthly values | Native refresh in the same view |
| Matrix builder/year counts | Forecast creation, assignment, selected scope |
| Subdivision Unforecasted Lots and other numeric native facts | Saved snapshot refresh |
| Builder schedule Unforecasted Lots | Forecast save and native schedule refresh |
| All-date Total/Sold/Scheduled/Contracted/Open counts and builder breakdown | Native lot-status refresh |
| Schedule completion percentages, Sold/Scheduled/Expected counts | Native snapshot refresh |
| Current-month sold/forecast ratio | Forecast save and native actual-sales refresh |
| Numeric closing lots/day terms and whole-contract obligation | Native refreshed terms, with conservative ordered identity matching |
| Recent sales counts, including whole-contract recent sales | Native refreshed snapshot |

## Proforma Manager — highest-value adoption

Source: [widget.html](../widgets/proforma-manager/src/app/widget.html)
`computeProforma`, `finalizeTotals`, `refreshComputedInputs`, `refreshFinancialRowGuidance`,
`renderBalanceChecks`, `rerenderGridValues`, `renderDashboard`, `renderDealRoom`,
`loiRecalcSummary`; [budget-transfer-ui.js](../widgets/proforma-manager/src/app/budget-transfer-ui.js).

| Display | Input or update |
| --- | --- |
| Dashboard/deal-room income, expenses, profit, margin, ROI, IRR and XIRR | Assumptions, pricing, costs, financing, timing or scenario edits |
| Gross Sales, MUD Revenue, reimbursements, reimbursed fees and Total Income | Lot mix, price, phase sales and reimbursement assumptions |
| Entitlement/engineering/construction costs, overhead, interest, profit share and Total Expenses | Rates, units, fees, timing, financing and additional-cost changes |
| Lot mix total lots, weighted lot size, price per front foot and average lot price | Lot mix quantity, width and pricing edits |
| Lots per acre, street feet per lot and computed land cost | Acreage, lot count, street length and acquisition inputs |
| Phase lot counts, lot-price pills, phase income/cost/profit and remaining allocations | Phase rows, sales methods, pricing and allocation edits |
| Monthly sales, revenue, costs, interest, cash flow and running cash balance | Monthly allocations, phase timing, curves, overrides and scenario inputs |
| Category/row totals, unit-cost extensions and per-lot/per-foot amounts | Quantity, unit basis, price/rate and additional-cost edits |
| Allocation/curve totals, dollar balance checks, percentage sums and differences | Month/phase distribution edits and explicit Rescale actions |
| Comparison/scenario deltas and financial summaries | Scenario switches and assumption changes; key each comparison side separately |
| LOI acreage, total price and price-per-acre summary | Property selection, acreage and price inputs |
| Budget-transfer phase/category amounts, counts and destination totals | Transfer selection and reviewed allocation changes |
| Saved list-row financials, phase/record counts and approval totals | Save, duplicate, creation and acknowledged approval refresh |

Read-only computed inputs need a presentation wrapper or adjacent display;
editable input value/caret formatting must remain unchanged. Financial units and
rounding remain owned by the existing Pro Forma calculation/display functions.

## Budget Manager — highest-value adoption

Source: [widget.html](../widgets/budget-manager/src/app/widget.html)
`updateCatSubtotal`, `updateProjectMatrixLive`, `renderSummaryMatrices`,
`renderProjectKpis`, `renderProjectComparison`, `renderBudgetMetrics`,
`renderRequestBalance`, `refreshPreview`; [po-ui.js](../widgets/budget-manager/src/app/po-ui.js)
`patchTotal`/`patchContext`/`patchBalances`; [po-grid.js](../widgets/budget-manager/src/app/po-grid.js).

| Display | Input or update |
| --- | --- |
| Item preliminary/final extensions and per-unit/per-lot equivalents | Quantity, rate, unit basis and amount edits |
| Category, department, phase, all-phase and project subtotals/footers | Item edits, transfers and row changes |
| Preliminary, Final, approved-modification, Revised Final, GP and HCSS summaries | Draft recalculation or authoritative save/approval/actuals refresh |
| Project/list/comparison financial totals and deltas | Phase selection, comparison choices, save and filter changes |
| Budget metric read-only values and cost-per-lot/acre/foot summaries | Budget facts, lot/acreage/unit inputs and refresh |
| Modification item extensions, category/phase totals and preview impact | Modification quantities, prices, selected items and phases |
| PO line calculated amounts, PO total and summary total | Quantity, unit cost, manual final amount and line edits |
| PO Available, This PO, After This PO and proposed modification amounts | Cost-code selection, line edits and refreshed existing commitments |
| Check/wire/payment request total, PO balance and remaining available amount | Selected PO, request amount, method and reviewed request changes |
| Request/approval queue counts, phase-list financials and financial badges | Acknowledged requests, approvals, modifications and refresh |

## Manage Lots — highest-value adoption

Source: [takedown-editor.js](../widgets/manage-lots/src/app/takedown-editor.js)
`refresh`/`readItems`, [takedown-model.js](../widgets/manage-lots/src/app/takedown-model.js)
`receipt`, [widget.html](../widgets/manage-lots/src/app/widget.html)
`renderLots`/`renderTakedowns`/`syncSelection`, [lots-list.js](../widgets/manage-lots/src/app/lots-list.js)
`patchSavedRow`, [subdivision-counts.js](../widgets/manage-lots/src/app/subdivision-counts.js).

| Display | Input or update |
| --- | --- |
| Live receipt Base price, Earnest money, Fees and Interest | Selected lots, purchase date, base/fee defaults, interest periods/rates |
| Total tax, WBW share, Builder share and applied tax adjustment | Tax method, tax status, appraisal inputs and proration date |
| Lots subtotal, Additional items net and Total due | Any receipt amount/selection input |
| Each additional item extension and receipt line | Item quantity, amount and deduction/addition type |
| Per-lot receipt amounts for every financial column | Changes to the same receipt inputs |
| Interest-period day counts | Period from/to dates and subtract-day choices; keep dates static |
| Selected lot count, block counts, displayed/selected totals | Lot selection, removal and filters |
| Subdivision Total/Sold/Scheduled/Contracted/Open counts and builder counts | Saved lot edits, holds/releases, takedowns and authoritative refresh |
| Lot numeric displays and takedown-list/detail financial totals | Acknowledged cell/record save or takedown creation/refresh |

Keep incomplete receipts as unavailable rather than animating from or to fake zero.

## Legal / Contract Management

Source: [widget.html](../widgets/contract-management/src/app/widget.html)
`statsFor`, `lotClosingSummaryHTML`, `contractParentSummary`, `ncLotSummary`,
`maRefreshBar`, `renderHome`, `renderTable`, `renderBoard`, `renderDetail`,
`refreshReviewCount`, `contractAttachmentRefresh`.

| Display | Input or update |
| --- | --- |
| Home/module totals and list/board/status-bucket counts | Scope/search/filter changes, new contracts/tasks and saved status changes |
| Action complete/total, open/current/overdue counts and completion percentage | Completing/reopening actions and authoritative action refresh |
| Selected lot total, size mix, phase counts and contract-total difference | Lot/subdivision/phase selection and stated lot-count edits |
| Initial/second/subsequent closing lot/day summaries and obligation totals | Closing-term, lot-size or phase edits; leave actual dates static |
| Parent/amendment counts and numeric contract summaries | Amendments, linked record edits and refreshed parent data |
| Bulk-action selected/eligible/skipped counts | Record and action selection |
| Construction/LOI review queue counts and approval/action counts | Acknowledged review decisions, template-created actions and refresh |
| Lot-completion confirmed record/count summaries | Real per-destination acknowledgements only; never invent progress |
| Attachment/comment counts and applicable numeric detail values | Successful uploads/deletes/comments and exact record refresh |

## Data Insights / Lot Sales Explorer

Source: [sales-app.js](../widgets/lot-sales-explorer/src/app/sales-app.js)
`render`/`renderBuilderMatrix`, [budget-app.js](../widgets/lot-sales-explorer/src/app/budget-app.js)
`render`/`openDetail`, [sales-model.js](../widgets/lot-sales-explorer/src/app/sales-model.js),
[budget-model.js](../widgets/lot-sales-explorer/src/app/budget-model.js).

| Display | Input or update |
| --- | --- |
| Monthly/period lot count, revenue, average price, price per front foot and total-price metrics | Metric, status, time, territory/project/subdivision/builder filters |
| Group, territory and selected-report totals | Grouping/filter changes and native refresh; retain keys across sort changes |
| Average front footage, eligible sample counts and missing-data counts | The same filters and underlying data refresh |
| Subdivision inventory and builder status breakdown | Native refresh and selected subdivision detail |
| Budget/GP/HCSS/Remaining/Over-budget amounts and Budget used percentages | Budget basis, inclusion scope, filters and refreshed financial records |
| Spend-by-project actual/budget amounts and approved/pending/over-budget counts | Budget filters, project selection and native refresh |
| Category Final, approved modifications, Revised Final, GP and HCSS detail | Updated selected budget/category data |

Do not visually morph a count into dollars or one metric into another. Metric and
unit are part of the key; transitions apply only to comparable quantities.

## Tax Center

Source: [widget.html](../widgets/tax-center/src/app/widget.html)
`renderSummaryStrip`, `renderSidebar`, `refreshFacetCounts`, `renderTable`,
`renderLotRow`, `renderBulkBar`, `renderPropBulkBar`, `renderFooter`, `refreshProductionCounts`.

| Display | Input or update |
| --- | --- |
| Portfolio appraised value, protest value and loaded/active counts | Saved values/statuses, selected year/scope and authoritative refresh |
| Untriaged, Paid, status/arbitration/year/company/county facet counts | Saved classifications, filter changes and server count refresh |
| Acreage, market/appraised value, offer, settlement and final values | Acknowledged row/detail/bulk saves and refreshed calculations |
| Numeric property/lot detail values and grouped financial summaries | Linked property or parcel-year refresh |
| Matching/visible/selected record counts and pagination result totals | Filters, search, selection, batch completion and refresh |
| Completed/failed/skipped batch quantities | Actual batch acknowledgements only |

Keep financial scope explicit: currently loaded portfolio values and server
matching-row counts are different measures and must not share a transition key.

## Land Master

Source: [widget.html](../widgets/land-master/src/app/widget.html)
`renderCounts`/`renderAll`/`renderTable`/`renderBulk`/`renderPanel`/`renderPager`,
[property-workspace.js](../widgets/land-master/src/app/property-workspace.js),
[spreadsheet-import.js](../widgets/land-master/src/app/spreadsheet-import.js) `paint`.

| Display | Input or update |
| --- | --- |
| Property/project/company totals and issue counts | Create/edit/duplicate operations and authoritative refresh |
| Matched, visible and selected report counts | Search, filters, selection and saved records |
| Read-only numeric property/subdivision/company fields | Save/refresh of acreage, lot counts, valuations and other existing numeric fields |
| Related subdivision/milestone/item record counts | Relationship edits and subform row changes |
| Import parsed/eligible/duplicate/error/destination quantities | Mapping, destination selection and validated preview changes |
| Import and bulk-edit confirmed/skipped/failed counts | Actual result ledger updates only |

Property IDs, Facility IDs, EINs, parcel IDs, subdivision codes, dates and bank
identifiers are identities, even when made of digits; they are not candidates.

## Milestone Gantt

Source: [widget.html](../widgets/milestone-gantt/src/app/widget.html)
`renderSummary`/`renderRow`/`renderUnscheduled`,
[gantt-controller.js](../widgets/milestone-gantt/src/app/gantt-controller.js).

| Display | Input or update |
| --- | --- |
| Milestone total, scheduled count and unsaved count | Add/remove/schedule/unschedule/date changes |
| Numeric duration/day labels | Date resizing/moving and date edits |
| Unscheduled/backlog counts | Scheduling changes and selected subdivision/filter refresh |
| Saved/failed destination counts | Actual native save ledger updates |

Keep the timeline's existing spatial/date animation. Use Sliding push only for
its numeric labels/counts; do not slide date text, bar positions or row order.

## Settings Manager

Source: [widget.html](../widgets/settings-manager/src/app/widget.html)
`groupCard`/`curveCard`/`render`,
[approval-admin.js](../widgets/settings-manager/src/app/approval-admin.js).

| Display | Input or update |
| --- | --- |
| Construction-curve percentage total pills | Curve/month percentage edits |
| Blank-default counts | Clearing/filling percentage defaults after existing save/draft updates |

This widget has fewer useful numeric outputs. Leave editable thresholds,
percentages, money, schedule times, sort/approval sequence identities and record
IDs unchanged. Approval step numbers are sequence identities, rather than quantity
totals. Do not add a dashboard or new derived quantities merely to animate.

## Shared opportunities and adoption order

Across widgets that expose them: attachment totals after upload/delete, comment
totals after post/delete, selected-record counts, approval queue counts and real
batch result counts can use the same transition. Preserve existing progress
modals and FLIP row animations; numeric motion complements those components.

Recommended next adoption: Pro Forma calculated financials, Budget live matrices
and PO balances, then Manage Lots live receipt. Follow with Legal action/lot
counts, Insights comparable report values, Tax summaries, Land Master counts,
Gantt counts and the few existing derived Settings displays. This is an audited
opportunity list, not a request to implement the remaining nine widgets.
