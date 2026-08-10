
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

External Mapping deletion uses `ZOHO.CREATOR.API.deleteRecord` with the `All_External_System_Mappings` report and an `(ID == <record ID>)` criteria expression. Do not pass `id` as a delete configuration property; Creator rejects that request as invalid configuration.

Existing subdivision editors intentionally hide the report subtitle and do not show a success message after External Mapping saves. The Milestones, Forecasts, Takedown Schedules, and Builder Takedowns tabs are read-only summaries and do not render an Actions column or Open buttons.

Zoho Creator 403/code `2899` means the requesting user lacks permission to add records to the target form. For External Mapping creates, retain the staged draft and email the complete error report, but keep detailed permission guidance out of the user-facing editor. The permission itself must be changed by a Creator administrator; client code must not bypass it.

Subdivision Development Company (`Company1`) is a mandatory Creator lookup. Do not offer Clear selection for this field in either lookup editor mode, and reject empty lookup choices before sending an update. Land Company and other optional entity lookups may still be cleared.
