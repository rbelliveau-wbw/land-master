
# Land Master Module

## Scope

Projects, subdivisions, properties, companies, builders, lots, milestones, forecasts, takedown schedules, related records, search, filters, and edit dialogs.

## Current UI rules

- Product name is **Land Master**, not Land Registry or Workbench.
- Subdivision and Company tabs have no pagination in this baseline.
- Subdivision Name, Code, and Status are read-only in the editor.
- Use `Projects_Status` for the displayed project status when requested.
- Facility IDs are strings; leading zeroes are significant.
- External System Mapping rows are added, edited, and marked for removal inline in the subdivision workspace. These changes remain staged until the user presses Save changes; no per-field or per-row inline save is allowed. The parent Subdivision is implicit and immutable, so only External System and External Code are shown.
- The mapping editor uses the compact `+ Add` action and displays staged deletions as `Removed`; explanatory footer copy is intentionally omitted.

## Performance

Production can load more than 2,000 records. Prefer indexed maps, cached derived values, incremental DOM updates, debounced searches, and batched Creator requests. Avoid rerendering every row for a one-record edit.

External Mapping saves update the already-loaded mapping collection and must not call the full `loadData()` pipeline. Record-editor saves update the modal immediately and refresh the background list only after the modal closes.
