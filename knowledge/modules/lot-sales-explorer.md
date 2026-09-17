# Lot Sales Explorer

Read-only standalone module for monthly lot sales by territory and subdivision, with project and builder filtering, financial metrics, lot counts, underlying lot drilldown, and CSV export.

Source: `widgets/lot-sales-explorer/src/app/`. Detailed contract, installation, testing, and rollback: `widgets/lot-sales-explorer/README.md`.

Uses existing `Lots → Subdivision → Project` relationships and Builder lookup. No Pro Forma model changes or Creator schema changes. Financial measures use Base_Price and Lot_Size (front footage). Sold and Contracted remain distinct. Data retrieval follows the signed-in user's Creator permissions; no unauthenticated business data is included in hosted assets.

The pure model, SDK adapter, and UI are separate. Future Pro Forma embedding should reuse the model and project scope rather than copying financial formulas.
