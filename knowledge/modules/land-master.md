
# Land Master Module

## AI lot import leaves Notes alone (8.14.7)

AI lot import omits `Notes` entirely from every `Lots` create payload. Filename, sheet and source row provenance, plus AI review warnings, remain available in the import review UI. Imported lot codes, subdivision, phase, block, lot number, width, city/county and default flags retain their existing behavior. Existing lot codes are still skipped; this release does not alter previously saved Notes.

Changed files: spreadsheet import JS, mounted creation/close regression, widget HTML version markers/config, widget manifest, import instructions/handoff, this module guide, immutable Land Master 8.14.7 release and Production Land mapping. Affected form/field: `Lots.Notes` is no longer supplied by import. Frontend function: spreadsheet `create()`. No Creator fields, backend functions or Custom APIs change, and no Creator publication is required. `Plat_AI_Ingest` / `Ingest_Plat` continue staging source mappings only.

Regression: actual selected-lot create payloads omit Notes while preserving other imported fields, optional width, duplicate checks, source provenance, excluded rows, partial failures and close safeguards. Focused spreadsheet/host checks, full `npm run validate` (including prevalidation), and `npm run build:pages` pass. No live lots were inserted for verification. Rollback: restore Production Land mapping to 8.14.6. Main and Production promotion was authorized October 5, 2026.

## Lot Import Soft rows and clear discard scope (8.14.6)

Populate Subdivision uses the selected Soft rows treatment: rounded white lot rows, blue source disclosure pills, restrained state edges, and mint Created badges. Its source provenance, validation, editable columns, pinned summary, and creation flow remain intact.

After a creation attempt, Close warns only when a selected lot remains unsaved. Creating 133 selected lots from 134 found rows with one intentionally unchecked lot closes without a false discard warning. Selected failed or unprocessed rows still warn, and staged drafts retain their confirmation before creation. The warning names every unsaved lot affected by closing: "Discard 1 unsaved lot?" / "Your 133 saved lots are safe." Its action says "Discard lot" or "Discard N lots"; before any saved lots, it says "This lot hasn't been saved yet." or "These lots haven't been saved yet." Discarding only dismisses local drafts and never deletes saved Lots.

Changed: spreadsheet import JS/CSS, focused mounted close regression, widget version/config/manifest, validation wiring, style/module notes, immutable release, and Production Land mapping. No Creator forms, fields, functions, Custom APIs, permissions, or backend deployment change. Regression: actual 133/134 creation with an exclusion, selected failed/unprocessed lots, singular/plural saved/unsaved counts, Cancel, precreation unchecked drafts, active scan/write blocking, forced close, Escape, source disclosure, sticky scrolling, and centered Created checks. Rollback: Production Land mapping to 8.14.5.


## Project workspace and Territory migration (8.14.1)

Production 8.14.4 makes Territory read-only when editing an existing Project; new Project creation retains the required single Territory choice from live app variables. The October 3 migration populated and read back 94 blank Project Territories; one Project with conflicting subdivision Territories remains unresolved. Private original/source/result JSON evidence is retained outside the repository. Native Creator publishes 9.36 (All_Projects exposes Project.Territory) and 9.37 (Project accepts the ten global Territory values) support the migration. The Production GET Get_Land_Master_Choices API was enabled against the existing Production getLandMasterChoices function using OAuth2 and the existing API contract. Older notes below describing the missing Production API are historical. No profile audit was performed, following the user's instruction to skip it. Native form required/read-only validation is separate; this release enforces those rules in the widget. Regression: full validation/build plus actual Production migration read-back and Project editor inspection. UI rollback: 8.14.2; do not roll back data without reviewing the private results.

Version 8.14.3 captures the runtime actor/environment and data generation before
Territory preview. It rechecks that context around every asynchronous preflight,
write and persisted read-back. A changed context stops later targets and stale
publication. An open preview, running operation or retained result blocks refresh
and record editing until dismissed. The existing fill-only and conflict rules
are preserved. Regression: `scripts/test-project-territory-context.mjs` exercises
the actual mounted handlers and widget guards; rollback UI is 8.14.2.

The former Subdivisions tab is Projects. Groups use exact Project lookup IDs, show Project Territory, and provide a pencil that opens the existing Project editor. Projects without subdivisions remain visible; equal names do not merge different Project records. Subdivision rows and their existing inline edits remain underneath. New Projects require Territory in the widget, populated through the existing global-variable Get_Land_Master_Choices API.

Fill Project territories first reads complete current All_Projects/All_Subdivisions records and live global choices. It fills only blank Project.Territory when all nonblank linked Subdivision.Territory values agree and match a global choice. Existing values, conflicts, missing sources and missing report fields are preserved and listed. Each target's Project and linked subdivisions are refreshed immediately before writing only Territory; a persisted Project read-back is required for Verified. An ambiguous write is reconciled by read-back, never blindly replayed; an unverified target stops later writes. Creator's by-ID update has no compare-and-set guarantee, so avoid concurrent Territory editing during this operation.

The migration review/result dialog follows the transfer progress guide, traps focus, blocks duplicate writes and dismissal while running, respects reduced motion, and exports a local JSON record of original values, sources and outcomes. Migration evidence must remain private rather than being committed to this public repository. After migration, a successor release makes existing Project Territory read-only; creation retains the required single choice. Native Creator Territory validation is separate from these widget rules.

Changed files: Land widget HTML, project-territory.js/css, widget config/manifest, immutable release, focused migration tests and module documentation. Existing form is Project (native label Add Project); reports All_Projects/All_Subdivisions, Project.Territory and Subdivision.Project/Territory. No new forms, fields, functions or Custom APIs. Get_Land_Master_Choices and the live global Territory variable are reused. No Creator deployment is needed for the first widget release. Regression: parent editing, zero-subdivision Projects, duplicate names, required new Territory, conflicting/blank/out-of-choice/missing sources, changed preflight data, read-back, lost acknowledgement and unknown-result stop. Rollback UI: production 8.13.11; data rollback must review the private per-record results before clearing any migrated values.

## Native lookup labels (8.13.10 candidate)

Production `8.13.7` grouped all 348 Subdivisions under Unlinked even though the native editor retained the exact Project ID and selected the correct loaded Project. SDK2 report lookups use `zc_display_value`; Land's legacy label helpers accepted only `display_value` or `name`. The full-field transport preserved the relationships, but the grouping renderer discarded their labels.

Candidate `8.13.10` resolves Project labels from the exact string lookup ID against the already-loaded `All_Projects.Project_Name`, then falls back to native or legacy lookup display text. Other lookup and multi-lookup display consumers accept `zc_display_value` without modifying the stored objects. Empty Project associations remain Unlinked. Property Projects summaries/search, Subdivision groups and company display labels use the corrected helpers. No relationships, fields, permissions, workflows or Creator APIs change, and no backend deployment is required.

The actual controller/renderer fixture performs counted SDK2 full-field reads of 348 synthetic Subdivisions, verifies nonempty Project groups and a genuine empty association, renders all 348 rows, and checks exact IDs, label fallback, property search, totals and unchanged deferred inventory. Existing SDK2, lazy-load, create/mixed-response, mapping and import regressions remain required. Native Development/Production group and row-ID gates are parent-owned and pending. Rollback: the prior Production mapping; immutable `8.13.9` is unchanged and still has the label defect.

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

## New menu recovery (8.12.2)

New record modals no longer depend on the location API being available. The widget prefers live City, County, and Territory app variables, and uses the committed app-variable snapshot when the API is missing, inaccessible, or malformed. It logs the fallback without raising the load-failed banner. Production reported code 9350 for Get_Land_Master_Choices on October 1; this confirms that API was unavailable despite the earlier setup confirmation. The snapshot is a recovery source, not a live variable read, and future variable changes require the Production API or a refreshed snapshot. Search placeholders use field names in title case without Edit or Search and edit prefixes. Regression: all New types open after missing API, snapshot geography remains selectable, successful API replaces fallback, and phase Territory inheritance remains intact. No new Creator fields/functions/APIs required. Rollback: 8.12.1 (restores the reported modal failure).

## Consistent dropdowns (8.12.3)

Report editors, modal pickers, lookup popovers, and filters share the report-filter dropdown styling and outlined soft red SVG close controls. Picker JS and CSS URLs carry the release version so cached old assets cannot retain Search edit labels. A successful location snapshot fallback remains visible in the audit trail with its original API reason but is explicitly classified as recovered, without setting the audit error badge. Production Get_Land_Master_Choices is still unavailable (9350); live variable changes require repairing that existing API. No new Creator fields, functions, or API contracts. Regression: compare report/modal/filter dropdowns, search labels, centered close buttons, cache-version URLs, New modals after API failure, and single/multi-select saving. Rollback: 8.12.2. Changed files: widget HTML/JS/CSS, config/manifests, regression test, documentation, release, Production mapping.

Phase removal is reduced to a 23px border-box button with a centered 12px SVG and a lighter 1.5px stroke. Root AGENTS.md now requires actual-size visual verification of centered X buttons.

## Four-core startup (8.13.4 candidate)

After the SDK v2 transport gate verified all fourteen Production reports in `8.13.3`, candidate `8.13.4` loads Properties, Projects, Subdivisions and Companies plus location choices before the first table render. Milestones load before the Subdivisions table, preserving complete Next milestone search and sorting. Other related reports load before their dependent editor or lookup mounts. Collection states distinguish unloaded/error counts from a complete zero-row report; failed core reads retain the previous complete snapshot, and deferred failures leave the dependent UI unavailable and retryable. Data generations and navigation tokens reject stale completions without replacing dirty, saving, closed or newer panels. Existing search debounce, string IDs, full fields, staged mapping reconciliation and fresh counted import reads remain in place. See [the dependency and regression contract](../../docs/land-master-lazy-data.md). Rollback: restore the Land mapping to `8.13.3`, with no backend rollback.

## Bulk retry preservation (8.13.5 candidate)

The normal authenticated Development UI gate for `8.13.4` verified core counts, deferred Subdivision counts, cached editor reopening, and a persisted Property Notes write/restore. A further review found that changing the bulk field during saving could replace its value input with a loading placeholder that survived a partial failure. `8.13.5` locks the field/value controls while saving and rejects reentrant Apply calls. A defensive field-change handler restores the active field without rerendering the value. Partial failures keep the exact submitted value and enable explicit retry. The regression test executes the actual bulk functions through partial failure and retry with a leading-zero Facility_ID. The new async-rendering failure was specific to Land; the other six widget save paths do not use it. No backend or immutable `8.13.4` files are changed. Rollback: verified transport `8.13.3`.

## Refresh and inline write exclusion (8.13.6 candidate)

An in-progress core refresh previously left the old table editable. A new inline write could capture an old record object, then finish after the read replaced the collection, showing Saved while the visible snapshot still held the prior value. Candidate `8.13.6` immediately makes the table and bulk bar inert during core refresh and guards the callable inline, project, lookup, bulk and panel-save paths. Pending inline/project/lookup writes and unblurred inline/project drafts prevent a refresh from starting. Successful callbacks resolve the current record by its string ID and captured type, and refuse a Saved claim if the data generation changed. The lock lasts through rendering and releases only for the matching refresh, including failure; an older read cannot unlock a newer one.

The regression fixture executes the actual load and write functions in both action orders, checks drafts and bulk actions during a held read, verifies failure without automatic replay, and verifies old-generation cancellation. Deferred report dependencies, complete counts, location-choice fallback, strict SDK v2 responses, import safeguards and bulk retry values are unchanged. No Creator forms, fields, functions or Custom APIs change; no Creator backend deployment is required. Native Development and Production gates are still required before promotion. Rollback: verified `8.13.5`.

## Centered checkmarks (8.12.4)

Picker selections use a centered 11px SVG check instead of a font glyph. Lookup and Project inline save indicators also use geometric checkmarks; input-save and toast SVG paths are centered within their viewBox. Changed files: widget HTML/JS/CSS, config/manifests, regression URL expectations, AGENTS/style/module docs, release and Production mapping. No Creator fields, functions, APIs, or backend deployment change. Regression: selected single/multi pickers, clear/reselect, saved lookup/Project indicators, and actual-size icon/path geometry. Rollback: 8.12.3.


## Startup/report refinement — 2026-10-04

Land 8.14.5 removes Fill Project territories: button, module assets, migration locks, bulk planner and write wiring. Normal Project/Territory editing and inheritance remain as in 8.14.4, including its current read-only field treatment. Full core and unsaved-draft/save guards remain. No Creator deployment; rollback 8.14.4.

Evidence and further improvements: [startup refinements](../../docs/startup-refinements-2026-10-04.md).
## Exact typed create recovery (2026-10-05)

Read-only recovery of an ambiguously acknowledged create now compares native
fields by their existing Creator/editor types. Currency, decimal, number and
percentage values use exact decimal strings: currency symbols, comma grouping
and trailing zeroes may differ, but no amount is rounded and a two-cent loss
still fails. ISO, Creator slash dates and day-month-name dates compare as the
same validated calendar date. Checkbox representations and unordered lookup ID
sets compare by their native meaning. Record/lookup IDs remain decimal strings;
duplicate, blank or numeric lookup IDs do not authorize recovery. Missing fields,
malformed values and real persisted differences keep the create quarantined.

The shared create recovery applies to Property, Project, Subdivision, Company,
Milestones, Forecast, Forecast_Year, Takedown_Schedule, Builder_Takedown, Builder,
Lots, Additional_Items and External_System_Mapping. The type contract combines
the committed generated field metadata with the widget's existing descriptors
for fields absent from that export. Facility IDs, Account Numbers, external codes
and other identifier text stay exact, preserving significant leading zeroes.
Forecast.Forecast_Year stays text; Forecast_Year.Forecast_Year uses its existing
numeric editor type. Field types are scoped by form rather than guessed from a
numeric-looking value.

No payload, calculation, native workflow, function, form, field or Custom API is
changed. Recovery reads the captured record ID and never repeats its insert.
`scripts/test-land-master-create-safety.mjs` covers an actual ambiguous create
with native formatted amounts/dates, retained quarantine for lost cents and
changed identifiers, exact lookup/string IDs, schema type coverage, and the
existing panel, staged-phase, mapping and import no-replay behavior. Native
Production end-to-end validation is separate from these synthetic SDK checks.
Widget rollback is the prior Production Land Master release; no Creator
deployment or data migration is required for this comparison repair.

## Currency summaries (2026-10-05)

Related Builder Takedown totals, Additional Items Amount/Total, and Lot Base Price
now display two decimal places. `moneyText` handles Creator's dollar signs and
comma grouping, avoiding the former `parseFloat` display of only the leading
digits. The generic `fmt` count formatter, money inputs, numeric payloads and
Creator behavior are unchanged. `scripts/test-systemic-currency-display.mjs`
covers native grouped amounts, negative values, cents and unchanged counts.
Credit amounts accept `-$`, `$-`, accounting parentheses and Unicode minus in
both summaries and exact create recovery. The same strict currency parser
rejects malformed grouping, conflicting signs and genuine lost cents; recovery
never turns these rejected values into permission to repeat an insert.
Rollback is the prior Production widget; no Creator promotion is required.
