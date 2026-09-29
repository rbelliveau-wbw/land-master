
# Land Master Module

## Company EIN (8.11.10)

The Companies table labels the EIN column `MGMT Co. EIN`. The full Company editor exposes the existing user-added `EIN` single-line field. A nonblank entry must be exactly nine ASCII digits or `XX-XXXXXXX`; nine digits are normalized with the hyphen before the widget saves. Invalid entries stay in the editor with an error state. The field remains optional because the Creator field was not marked required in the available metadata. The source for a Creator `Company` form on-validate workflow is in `creator/workflows/Validate_Company_EIN.dg`; publishing it is needed to apply the same rule to native Creator form submissions and other API clients. `EIN` must also be visible in the `All_Companies` report's quick or detail view for the widget's existing `getAllRecords` call to load saved values. The local generated field metadata predates this user-added field and should be refreshed from a current Creator export.

Regression: confirm the `MGMT Co. EIN` heading, create a company, edit its EIN in the modal and inline table, try raw and formatted entries, reject misplaced punctuation and extra characters, clear an optional EIN, and verify unrelated Company edits. Rollback widget release: `8.11.9`; remove the Creator workflow separately if necessary.

## Lot Status (8.11.8 candidate)

The lot editor offers Open, Contracted, Scheduled, and Sold to match the Creator Add Lots form. Creator workflows derive the saved status from Close Date, Purchase Date, and real builder assignment. This widget release is a candidate; Production remains on 8.11.7. Regression: edit and reopen a Scheduled lot; verify the status picker retains all four choices. Rollback: 8.11.7.

## Scope

Projects, subdivisions, properties, companies, builders, lots, milestones, forecasts, takedown schedules, related records, search, filters, and edit dialogs.

## Current UI rules

- Product name is **Land Master**, not Land Registry or Workbench.
- Subdivision and Company tabs have no pagination in this baseline.
- Subdivision Name, Code, and Status are read-only in the editor.
- Use `Projects_Status` for the displayed project status when requested.
- Facility IDs are strings; leading zeroes are significant.
- Property rows and the full Property editor expose the existing `TerraVault_URL` field. Bare
  domains are normalized to canonical HTTPS URLs before saving, and stored URLs have a safe
  external-link action.
- External System Mapping rows are added, edited, and marked for removal inline in the subdivision workspace. These changes remain staged until the user presses Save changes; no per-field or per-row inline save is allowed. The parent Subdivision is implicit and immutable, so only External System and External Code are shown.
- The mapping editor uses the compact `+ Add` action and displays staged deletions as `Removed`; explanatory footer copy is intentionally omitted.

## Performance

Production can load more than 2,000 records. Prefer indexed maps, cached derived values, incremental DOM updates, debounced searches, and batched Creator requests. Avoid rerendering every row for a one-record edit.

External Mapping saves update the already-loaded mapping collection and must not call the full `loadData()` pipeline. Record-editor saves update the modal immediately and refresh the background list only after the modal closes.

External Mapping deletion uses `ZOHO.CREATOR.API.deleteRecord` with the `All_External_System_Mappings` report and an `(ID == <record ID>)` criteria expression. Do not pass `id` as a delete configuration property; Creator rejects that request as invalid configuration.

Existing subdivision editors intentionally hide the report subtitle and do not show a success message after External Mapping saves. The Milestones, Forecasts, Takedown Schedules, and Builder Takedowns tabs are read-only summaries and do not render an Actions column or Open buttons.

Zoho Creator 403/code `2899` means the requesting user lacks permission to add records to the target form. For External Mapping creates, retain the staged draft and email the complete error report, but keep detailed permission guidance out of the user-facing editor. The permission itself must be changed by a Creator administrator; client code must not bypass it.

Subdivision Development Company (`Company1`) is a mandatory Creator lookup. Do not offer Clear selection for this field in either lookup editor mode, and reject empty lookup choices before sending an update. Land Company and other optional entity lookups may still be cleared.

The Subdivisions table's `Projects_Status` pills mirror Budget Manager's phase-status color map, including aliases and its deterministic palette for unrecognized values. Normalize slash spacing so values such as `Road Prep / Pave` resolve to Budget Manager's `road prep/pave` color. Do not apply this phase palette to generic `Status` columns.
