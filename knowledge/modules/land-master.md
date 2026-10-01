
# Land Master Module

## Project pickers (8.12.0 candidate)

The Land & Projects widget uses custom searchable single-select controls for record dropdowns and a searchable multi-select for Properties. The backing selections keep the existing Creator save and staged-change behavior. Project Details includes the user-added `Project.Territory` field, omits the Proforma input and the `Record fields` heading, and hides Territory from phase rows and Subdivision widget editors. New phase payloads copy the current Project City, County, and Territory. New or reparented Subdivisions created in the widget inherit the selected Project Territory; unrelated edits preserve existing Subdivision Territory.

`getLandMasterChoices` reads the app variables `City`, `County`, and `Territory` and returns JSON arrays. The widget calls GET `Get_Land_Master_Choices` through environment-aware API routing once per load. The enabled Development API is `Get_Land_Master_Choices_DEV` (OAuth2, All users, no arguments, Standard response). Location choices no longer use hardcoded geographic lists. The requested Development variable values are recorded in `creator/app-variables/location-choices.json`: 76 cities, 23 counties, and 10 territories. The original unused TEXT `City` variable was preserved as `City_Legacy`; the new `City` variable is a COLLECTION.

All UI changes are scoped to the widget. No native form workflow is required: the newly created `Location Choices - Project` workflow was deleted, and the temporary changes to the existing Subdivision on-load and Project-input workflows were restored. The user's existing Territory field was retained.

Backend promotion remains with the user. Publish the user-added Project Territory field and the variables/function, then create the Production GET `Get_Land_Master_Choices` API bound to the Production function with the same Development contract. Ensure `All_Projects` includes Territory in API-visible fields for reopening existing Projects. Only then promote widget release 8.12.0. Production mapping remains 8.11.10 until those dependencies are ready; do not bind the Production API to a Development function. Stage also needs its own `_STAGE` API before promoting this widget there.

Verification: shared-choice parsing and errors, location payload inheritance, string record IDs, legacy values, required City/County, single-select search, filtered Properties multi-selection/Clear/Select visible, Escape dismissing only the picker, staged phase creation, and inline save feedback. Local browser SDK fixtures verified Project and phase save payloads without writing live records. Rollback widget: 8.11.10. No form-workflow rollback is required.

Changed files: widget HTML, searchable picker JS/CSS, widget config and manifests, choices function and variable snapshot, regression test, and this module/style documentation. Immutable release files are under `releases/land-master/8.12.0/`.

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

## Project picker completion (8.12.1)

Property selections display and search Property_ID while saving string Creator record IDs. Phase removal uses an outlined soft red button with a centered SVG X. The shared location choices and Project/phase Territory behavior remain as in 8.12.0, including its Production backend prerequisites. Regression: search and select multiple Property_ID values, save/reopen their lookup associations, remove a staged phase, and verify the inherited Territory payload. Changed files: widget HTML/CSS, widget config, widget manifest, style/module documentation, and immutable release. No new fields, functions, or APIs are introduced by 8.12.1. Rollback Production: 8.11.10.

Production prerequisites were confirmed complete by the user on October 1, 2026; Production is promoted to 8.12.1.
