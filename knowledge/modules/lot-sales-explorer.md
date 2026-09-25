# Land Master Insights

Read-only standalone module for monthly lot sales grouped by Project, Territory, or Builder, then subdivision, with project and builder filtering, financial metrics, lot counts, underlying lot drilldown, and CSV export.

Source: `widgets/lot-sales-explorer/src/app/`. Detailed contract, installation, testing, and rollback: `widgets/lot-sales-explorer/README.md`.

Uses existing `Lots → Subdivision → Project` relationships and Builder lookup. No Pro Forma model changes or Creator schema changes. Financial measures use Base_Price and Lot_Size (front footage). Sold and Contracted remain distinct. Data retrieval follows the signed-in user's Creator permissions; no unauthenticated business data is included in hosted assets.

Insights 1.4.0 adds Price/FF as the mean of `(Base_Price + Interest1) / Lot_Size` for eligible lots. `Escalator` is shown as a percentage, not added separately to price. Drilldown and CSV expose the recorded Interest, Escalator and Notes. Subdivision Total/Sold/Contracted/Open counts use all lots after complete history loads; Open means a status other than Sold or Contracted. Sold out requires every lot to have status Sold. The prior Base/FF calculation and default filters are unchanged. No Creator backend deployment is needed; rollback release is 1.3.0.

Insights 1.5.0 defaults Group By to Project; Builder partitions each subdivision's selected lots by builder. Clicking a subdivision opens a card with all-history counts and selected-view metrics. Contracted selection switches Date Basis to Purchase Date; users may then choose another basis. Lot detail groups builders alphabetically and sorts each builder's lots by Purchase Date newest first. Existing Creator read fields and financial definitions are unchanged. Rollback release is 1.4.0.

Insights 1.5.1 presents the subdivision details on hover or keyboard focus in a compact Land Master styled card. Touch and keyboard activation remain available; moving from the name into the card keeps its View Lots action usable. Counts and financial definitions are unchanged. Rollback release is 1.5.0.

The pure model, SDK adapter, and UI are separate. Future Pro Forma embedding should reuse the model and project scope rather than copying financial formulas.

## Insights 1.1.0

Adds a compact dashboard sidebar, a green Lot Sales heading, and the Budget dashboard. Lot Sales loads current/previous calendar years before a complete historical snapshot; incomplete history is explicitly gated and retryable without losing recent results. Budget scope and Final/Revised Final basis are selected explicitly on first use. GP actuals, HCSS actuals, approved modifications, pending modifications, and independent approval tracks remain distinct. Financial definitions and source fields are documented in the widget README. Existing report reads only; no Creator schema/functions/API changes. Rollback: 1.0.1.

1.1.1: add version queries to all local scripts/styles after live Creator reused the prior sales controller beneath the new HTML. The permanent widget URL is unchanged.
