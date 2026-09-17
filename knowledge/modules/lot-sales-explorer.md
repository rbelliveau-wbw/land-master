# Land Master Insights

Read-only standalone module for monthly lot sales by territory and subdivision, with project and builder filtering, financial metrics, lot counts, underlying lot drilldown, and CSV export.

Source: `widgets/lot-sales-explorer/src/app/`. Detailed contract, installation, testing, and rollback: `widgets/lot-sales-explorer/README.md`.

Uses existing `Lots → Subdivision → Project` relationships and Builder lookup. No Pro Forma model changes or Creator schema changes. Financial measures use Base_Price and Lot_Size (front footage). Sold and Contracted remain distinct. Data retrieval follows the signed-in user's Creator permissions; no unauthenticated business data is included in hosted assets.

The pure model, SDK adapter, and UI are separate. Future Pro Forma embedding should reuse the model and project scope rather than copying financial formulas.

## Insights 1.1.0

Adds a compact dashboard sidebar, a green Lot Sales heading, and the Budget dashboard. Lot Sales loads current/previous calendar years before a complete historical snapshot; incomplete history is explicitly gated and retryable without losing recent results. Budget scope and Final/Revised Final basis are selected explicitly on first use. GP actuals, HCSS actuals, approved modifications, pending modifications, and independent approval tracks remain distinct. Financial definitions and source fields are documented in the widget README. Existing report reads only; no Creator schema/functions/API changes. Rollback: 1.0.1.
