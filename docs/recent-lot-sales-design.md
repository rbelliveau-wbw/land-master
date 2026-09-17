# Lot Sales Explorer — first release

Standalone reporting module requested on 2026-09-17. Implemented as `widgets/lot-sales-explorer/`; see its README for installation, field contracts, metric definitions, verification, and rollback. The supplied spreadsheet informs the monthly matrix layout.

## Architecture

- Creator adapter: paginated, read-only access to existing Lots, Subdivision, Project, and Builder reports. Keep Creator record IDs as strings. Report errors and incomplete reads explicitly; do not silently replace failed live reads with demo data.
- Report model: normalize records and join Lots.Subdivision → Subdivision.ID and Subdivision.Project → Project.ID using indexed maps. Keep source records immutable.
- Aggregation: pure functions for filtering, month buckets, subdivision rows, territory groups, and metric calculation. Keep metric definitions separate from the UI so price, count, and future measures share the same filtered population.
- Presentation: monthly matrix inspired by the supplied reference, with territory grouping and subdivision rows. Separate the report component from the standalone shell so another widget can supply a project scope later.
- Verification: test mixed lot widths, missing prices, zero widths, calendar boundaries, filters, duplicate IDs, and incomplete pagination. Verify the rendered report in the browser.

## Verified existing schema

Source: committed Creator export `creator/exports/Land_Master_2026-08-06.ds`, with current live metadata taking precedence when inspected.

- Lots: `Subdivision` lookup, `Status` values Open / Contracted / Sold, `Lot_Size` (front footage), `Base_Price`, `Close_Date`, `Purchase_Date`, `Builder1`, `Lot_Code`, `Block`, `Lot_Number`, `Archived`.
- Subdivision: `Project` lookup, `Subdivision_Name`, `Territory`.
- Project: `Project_Name`.
- Existing report names: `All_Lots_All_Fields`, `All_Subdivisions`, `All_Projects`, `All_Builders`.

Missing or zero footage must not produce Infinity, NaN, or divide-by-zero output. Missing prices remain distinct from a recorded zero price. Record the eligible sample size for any price metric.

## First-iteration behavior

The latest request authorizes a standalone first iteration and publication to main and production. No Pro Forma integration is included. Clarifying questions were asked about default population and price aggregation; no answers were received before implementation, so the UI exposes the alternatives explicitly rather than fixing a single irreversible business rule.

The initial filter preset follows the visual reference: Sold, Close Date, current month plus prior 12 months, and exclusion of unnamed/Other/Placeholder builders. Users can change every filter. Both mean and weighted $/FF are selectable and defined on screen. Contracted lots remain separate, with an explicit date-basis selector. First lot sale is labeled All dates; average frontage is labeled Selected period.

## Verification

Dedicated automated tests cover calculation and source-data edge cases, string IDs, month boundaries, scope isolation, CSV escaping, cursor pagination and record-count reconciliation. Repository validation and Pages build pass. Browser checks use synthetic local fixtures (never included in releases) and cover metric switching, underlying lots, project scope, all-history pagination, separate Contracted/Purchase Date reporting, collapse/expand, empty states, and a 390px viewport without page overflow. The browser emitted no console errors. CSV generation is unit-tested; the in-app browser did not expose a download event during the export check.

Existing development report UI and committed export confirm the relationships. Zoho SDK v2 custom field selection is used because the Lots quick view omits Lot_Size. Live SDK retrieval in the newly registered widget must be checked after Creator page placement; no new form, report, field, function, or API is being created.

Release and permanent URL details are in `widgets/lot-sales-explorer/README.md`.

## Released follow-up: Insights 1.1.0

User requested current/previous calendar years first, history in the background, a cleaner shared-widget style, and a left menu with a Budget dashboard. This supersedes the original 13-month default. Budget clarification questions were asked; first-use scope/basis selectors avoid assuming their answers. See widgets/lot-sales-explorer/README.md for the implemented load-state, financial, and rollback contracts.
