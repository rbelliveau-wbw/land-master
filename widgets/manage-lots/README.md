# Manage Lots

Select Open and Contracted subdivision lots, create Builder Takedowns, and review existing takedowns without editing them. Archived lots and lots already linked to a takedown remain unavailable. Sold and Scheduled lots remain visible and read-only. Eligibility is re-read immediately before takedown submission. Takedowns cannot mix subdivisions. Import Lots belongs entirely to Land & Projects.

## Live receipt — production 0.10.1

The creation dialog groups details, taxes/fees, interest periods and additional
items beside a sticky live receipt. Custom dropdowns/date calendars replace
native controls. Active templates match subdivision and builder; additions and
deductions are cloned without source child IDs. Future and unused interest
periods stay hidden, later starts match prior ends, and Add/Remove retain the
existing twelve fixed Creator field slots. No object-model changes.

The receipt includes all closing components and per-lot/wire detail. Fresh
preflight rejects changed prices or tax inputs. Saved financial inputs, rates,
dates, day settings, additional items and exclusive lot claims must verify
before completion; ambiguous saves cannot replay. See the
[workflow audit](../../knowledge/modules/takedown-logic-audit.md) for preserved
formulas and the prepared existing date-validator correction. That Creator
publication and native Development verification are pending. Frontend 0.10.1
is promoted to production by explicit user authorization. Mixed blank/nonzero additional tax blocks the preview because of
the documented backend carry-forward issue.

Checks: `node scripts/test-takedown-model.mjs`, the existing SDK2/widget tests,
and `node scripts/test-manage-lots-editor-browser.mjs` with Playwright plus
Chrome (or LM_BROWSER_CHANNEL). Browser calls are inert fixtures, not live
writes. Full repository validation and Pages build are required. Rollback:
prior production 0.9.20; repaired SDK1 fallback 0.9.15.

## SDK2 migration candidate (0.9.17)

The current source uses Creator SDK2 and the shared counted reader. Startup requires a recognized native environment and actor; a five-second handshake deadline rejects without demo data, and Refresh can perform a fresh handshake. Core subdivisions/builders/takedowns publish together only after complete counted reads. Subdivision lot scopes still read both existing lot reports, preserve string IDs and leading-zero labels, and retain Sold whenever either report identifies a lot as Sold. Conflicting availability stays unavailable.

Creating a takedown captures one subdivision, the exact selected lot IDs, builder and every existing form value. Fresh complete lot and takedown reads verify every selection immediately before one native create call. The existing Builder_Takedown form workflows remain authoritative. Progress opens immediately, locks draft/navigation/close controls while native work is pending, and marks destinations verified only after fresh exact takedown and reverse lot-claim readback. Ambiguous or conflicting responses retain the draft and block another insert; a unique returned ID permits an explicit read-only Recheck. A missing or competing ID requires Creator review. Display pacing never creates success.

The native SDK1 Development repair gate for 0.9.15 passed: Connected with 37 subdivisions, 13 builders and 24 takedowns in six groups; the exercised first subdivision retained 155 exact tiles, 131 available and 24 unavailable. SDK2 0.9.16 Development subsequently retained all 37 choices, the 155 exact tiles and 30 takedown-table rows against that baseline; its form loaded 13 builders and all 36 rate/date controls without committing Create. Production 0.9.14 still has the preexisting removed-importer startup failure. Independent actual-app fixtures then exposed competing/duplicate reverse relationships being accepted by 0.9.16; successor 0.9.17 requires exactly one matching fresh direct claim, retains unresolved draft/selection and blocks replay until read-only Recheck proves that exclusive relationship. No native 0.9.17 gate, create/rate/date write, forced failure or Production SDK2 pass is claimed. The source fixture compares all twelve rates and twenty-four dates against immutable 0.9.15's payload function; the immutable SDK1 boot/clipboard/denial/retry fixture remains separate.

See [SDK2 contract and verification](SDK2.md). Run `node scripts/test-manage-lots-sdk-v2.mjs`, `node scripts/test-manage-lots-widget.mjs`, `node scripts/test-manage-lots-sdk1-repair.mjs`, `npm run validate` and `npm run build:pages`. This is a frontend change with no new forms, fields, functions, Custom APIs, permissions or Creator deployment. Promotion and native SDK2 gates remain pending. Rollback is the repaired SDK1 release 0.9.15; keep permanent URLs unchanged.

## Historical implementation notes

## Complete subdivision loading (0.8.1, production)

Loads each selected subdivision using criteria on All_Lots_All_Fields and All_Active_Lots_List_View, then merges by string record ID. The second report is the all-status list shown in Creator and supplies sold rows and block details. Counts are unknown until the scope loads; incomplete reads and permission failures are displayed rather than treated as zero lots. Completed scopes are cached until Refresh. The previous application-wide lot read could silently stop after 10,000 records; pagination now fails explicitly at its limit.

## Spreadsheet import (0.9.3, candidate)

Import Lots opens Spreadsheet → Review → Import. Select subdivisions, upload CSV or XLSX, and stage rows through Ingest_Plat. Every worksheet is read, and original source row/cell values are retained. AI returns column mappings only; the frontend copies the lot/block/width cells, checks source references and selected subdivision IDs, and flags phase/project conflicts and possible omitted rows. No numeric sequences are generated.

Review rows are editable. Lot codes use the existing left-pad rule. Width is whole feet, not area. City and County must be verified picklist values. Duplicate codes, missing subdivisions, invalid fields, and unacknowledged AI flags block selected rows. Uncheck a row to exclude it. All affected subdivision lots are re-read before import; a failed read stops all inserts. Individual failures stay staged for retry. Successful records remain marked Imported and cannot be imported again. Writes use the Lots form, one record at a time, after an in-widget confirmation.

Settings Manager 1.3.0 repurposes Plat_Review_Criteria and provides a starter button. The function reads it at every request and appends the fixed response schema. No new field, API name, or credential is required. The openai connection and existing PF Review provider/model remain authoritative.

Limits: CSV/XLSX only, 10 MB, 5,000 nonempty rows, 100,000 cells. AI batches contain at most 60 source rows, bounded by payload size. Cancel stops after the current request. Oversized or malformed data raises an explicit error.

## Publication and rollback

See creator/handoffs/spreadsheet-lot-import.md. Backend publication is required before promoting manage-lots 0.9.3 and settings-manager 1.3.0. The current production manage-lots 0.8.1 remains functional with the earlier API. The updated backend retains legacy tile mode for rollback.

Tests: npm run validate, npm run build:pages, scripts/test-spreadsheet-lot-import.mjs and scripts/test-manage-lots-widget.mjs. Local browser QA uses mocked Creator responses, including the provided 97-row sample, a 42-lot/41-sold scope, phase mismatch, explicit confirmation, partial failures/retry, and the old API compatibility gate. Live Creator/model execution requires the user's publication and authenticated session.

## Lots and Takedowns polish (0.8.0)

Subdivision options keep the name and availability/sold badges on one line. The
popover expands on desktop and truncates long names on narrow screens, with the
full name in its title. Selection updates retain the option nodes, keyboard focus,
search and scroll. Counts, sorted subdivisions and lot lookups are indexed once
per fetched collection; filter changes render only the active tab.

Block headers use a block-number mark, title, lot/available counts and a compact
Select available action. Lot tiles use Legal's green Available, orange contract
claim, indigo Contracted, amber Scheduled, slate Sold and red On Hold palette,
plus an orange In takedown state and a neutral unavailable/archived state. A
counted legend tracks the visible tiles and selection. Held Open lots and Open
lots on contracts retain the existing takedown eligibility rules; colors convey
record context rather than adding a new restriction.

Hover waits 320 ms for the first card, then swaps immediately between tiles.
Keyboard focus shows the same card, including on unavailable lots. Cards show
code, subdivision, block, lot, status, width, buyer, price, address and notes when
returned, with linked contract/takedown context. Drag, scroll, resize, Escape and
repaint dismiss them. Text is escaped and the card stays inside the viewport.

`All_Contracts1` loads after required data so Legal context does not delay the
grid. `All_Lots_All_Fields` omits `Lot_Size` in the committed quick view, so the
first hover needing width reads `All_Active_Lots_Contracts_View` for that
subdivision and caches the result until Refresh. These optional reads honor
existing Creator report permissions; failures are logged and omit extra context.
There are no permission changes, new fields, functions or Custom APIs, and no
Creator backend publication is needed. Existing `Builder_Takedown`/`Lots` create
payloads and the final fresh eligibility check are unchanged.

Regression evidence: Node checks cover cache reuse/invalidation, exact string
IDs, state precedence (including Scheduled), rejected/archived contract release,
held-lot eligibility and deduplicated width reads. Browser checks cover dropdown
alignment and stable focus, mobile layout, colors, unavailable-lot keyboard
details, drag selection, read-only takedowns and rejection of a stale selection.
In a local 9,600-lot/120-subdivision fixture, median option-click handler time fell
from roughly 55–66 ms to 3–4 ms; this measures local rendering, not Creator
network latency. Live Creator writes were not exercised during these checks.

Rollback: restore `deploy/environments.json` production `manage-lots` to `0.7.3`
and redeploy Pages. The permanent Production widget URL remains unchanged.

## Import progress (0.9.3)

The import modal stays open throughout sequential creation, with a prominent progress bar, completed/total count, current lot code, and created/not-created totals. Progress advances only after each record resolves or is explicitly skipped. Editing, duplicate submission, and closing are disabled during creation. Failed rows stay staged for review and retry. The production-only 0.8.2 patch renames the existing button to Import Lots; its earlier creation progress modal is retained.

## Creator empty-result regression (0.8.3)

Creator getAllRecords can reject the promise with code 3100 when a filtered scope or final page is empty. The reader now handles that empty result on both resolved and rejected responses, preserving rows already fetched. All other errors continue to block loading and imports. Production also includes the Import Lots label. Regression tests cover rejected empty first/final pages and permission errors.

## Optional takedown filters (0.8.5)

Builder Takedowns defaults to all records, newest first within subdivision groups. Its subdivision filter is independent of the Lots tab; clearing it restores all takedowns. Changing this optional filter does not fetch lots or clear the staged Lots selection. Production 0.8.5 includes the rejected-empty-response correction and Import Lots label; spreadsheet 0.9.3 includes these corrections and creation progress.

## Optional takedown filters (0.8.5)

Builder Takedowns defaults to all records, newest first within subdivision groups. Its subdivision filter is independent of the Lots tab; clearing it restores all takedowns. Changing this optional filter does not fetch lots or clear the staged Lots selection. Production 0.8.5 includes the rejected-empty-response correction and Import Lots label; spreadsheet 0.9.3 includes these corrections and creation progress.

## Loading diagnostics and import wording (0.8.6 / 0.9.4)

Every report page logs its report name, exact criteria, page size, build version, response type/keys, decoded code and code path, row count, elapsed time, and a bounded error preview. Subdivision merges log each report count and sold totals. Opening Audit Log adds current filter/cache state and subdivision names/codes. Empty-result handling supports JSON strings and nested result/responseText/message envelopes; other errors remain blocking. Build-loaded entries identify stale widgets. Logs omit successful record contents and URL query parameters. The close button uses a centered SVG. Production modal copy uses Import lots, File, Review, Import, and Existing lots; unknown counts show a dash.

Regression evidence: plain/string/nested empty SDK responses, full pagination guard, permission errors, report criteria and code-path logging, independent takedown filters, browser audit drawer, modal copy and geometric close-icon centering. Backend publication is still required for the prepared spreadsheet importer. Settings wording deploys independently without modifying stored instructions. Rollback: manage-lots 0.8.5 and settings-manager 1.2.0.

## Spreadsheet production activation (2026-09-30)

At the user’s explicit request, production now uses manage-lots 0.9.4 and accepts CSV/XLSX instead of decoding uploads as plat images. Local file parsing is available independently; AI staging checks spreadsheet_schema 2 and gives a publication error if Creator still has the older function. No Lots writes can occur before a valid AI response, reviewer confirmation, and duplicate revalidation. Settings 1.3.1 remains live. Rollback: manage-lots 0.8.6.

## Import flow simplification (0.9.5)

Import now selects one subdivision from a searchable dropdown, keeps the selected filename visible through repaint and Back, and labels its steps Attach, Review, Create. Next opens checked-row progress without batch terminology; progress advances only after each source group has been read and validated, then checks existing codes. City and County are informational and copied directly from the selected Subdivision. Both database confirmation actions say Create Lots. Existing provenance, phase conflict, duplicate recheck, sequential creation progress and partial-failure retry safeguards remain.

Release QA: changed widget.html, spreadsheet-import.js/css, widget.config.json, manifests/widgets.json, deploy/environments.json and module instructions/documentation, with immutable release 0.9.5. Reads Subdivisions City/County; writes the same Lots fields as 0.9.4 (including City/County) only after confirmation. Plat_AI_Ingest and Ingest_Plat/Ingest_Plat_DEV contracts and permissions are unchanged; no additional Creator backend deployment is needed for this UI update. Browser QA used the real 97-lot sample, paused AI calls to verify row progress, checked single selection and filename persistence, confirmed read-only locations and saved subdivision values, and exercised cancellation, phase mismatch, partial failure/retry and narrow layout. AI/Creator calls were mocked; no production lot records were created during QA. Rollback: manage-lots 0.9.4.

## Lot selection cues and standard dropdown (0.9.6)

Sold and other unavailable lots use darker slate gray; Contracted and selected states use deeper blue. Unavailable tiles carry a diagonal texture and a centered SVG lock. Cues follow existing eligibility: Open and Contracted remain selectable here; archived, Sold, Scheduled and existing-takedown lots remain locked. Status legends and hover chips match the updated colors. The spreadsheet subdivision picker now uses the system floating searchable popover, with focused search, selected checkmark, keyboard navigation, viewport positioning, scroll tracking, Escape and outside-click dismissal.

Release QA: changes in widget.html, lots-grid.css, spreadsheet-import.js/css, widget.config.json, manifests/widgets.json, deploy/environments.json, style guide and module documentation; immutable release 0.9.6. No Creator form, field, function, Custom API, permissions or backend deployment changes. Frontend promotion only. Browser regression checked locked/Contracted selection, hover, darker colors, dropdown search and keyboard, mobile bounds, real CSV staging, confirmation, partial failure/retry and legacy backend guard; calls were mocked and no production records were created. Rollback: 0.9.5.

## Active spreadsheet checks (0.9.7 candidate; published with 0.9.8)

Preparing lot review now shows a continuous spinner, moving indeterminate track and Working text throughout AI interpretation and the final existing-lot lookup. Phase text changes from Identifying lot and block details to Checking for lots already in the system. The scan no longer displays percentages or source-row counts: project metadata, headers and blank lines are not lot totals. Attach reports Spreadsheet ready for review; review and creation retain actual lot counts. Reduced-motion preferences disable animation while retaining Working and phase text.

Release QA: spreadsheet-import.js/css, widget.html version, widget.config.json, manifests/widgets.json, deploy/environments.json and this documentation, plus immutable 0.9.7. Frontend deployment only; no Creator forms, fields, functions, Custom APIs, permissions or backend deployment changes. Regression covers pending AI and existing-lot reads, continuous animation, reduced motion, no misleading row/percentage display, the real CSV with 100 source rows and 97 staged lots, and existing confirmation/retry protections. Browser calls are mocked; no production lots are created during QA. Rollback: 0.9.6.

## Import review summary and one scroll area (0.9.8)

Review uses one modal-body scroll area; the table has no capped height or internal vertical scrolling, and its headings follow the body scroll. A compact subdivision header shows code, city/county and file name. Import totals show lots found, resolved block count, selected lots, ready lots, needs-review count and created lots after saving. Lots by block reports all staged candidates and selected counts, excluding unresolved subdivision/block assignments from block totals. Counts describe this import, not existing subdivision inventory; created rows remain in file totals but no longer count toward selected/needs review.

Selected Lot Code conflicts appear in a summary warning and retain row-level Already in Lots / Duplicate staged lot flags. Existing conflict validation, pre-insert re-read, sequential inserts and failure recovery remain unchanged. Frontend duplicate lookup is scoped to the selected subdivision; Creator unique Lot_Code remains the final cross-client protection.

Release QA: changes to spreadsheet-import.js/css, widget.html version, scripts/test-spreadsheet-lot-import.mjs, widget.config.json, manifests/widgets.json, deploy/environments.json, style guide and this documentation; immutable 0.9.8 includes active indicators from the unpromoted 0.9.7 candidate. No Creator forms, fields, functions, Custom APIs, permissions or backend deployment changes. Tests verify 100 source rows yield 97 staged lots, per-block counts, selected/unchecked/created/unresolved totals and existing/staged duplicate conflicts; browser QA covers the single vertical scroller, summary/mobile layout, progress during pending work, review and creation safeguards. No production records are created during QA. Rollback: 0.9.6.

## Populate Subdivision review (0.9.9)

The modal title is Populate Subdivision; redundant spreadsheet copy and block-report heading are removed. Import totals sit beside subdivision identity on desktop. The complete summary stays outside the single scrolling lot list, with sticky column headings and preserved scroll position after edits. Per-block cards scroll horizontally when needed to keep the summary compact. Each lot shows its verified subdivision as read-only text; unresolved mappings remain blocked and require correcting the attachment/selection. Width is labeled Lot Size (Ft).

Release QA: changed spreadsheet-import.js/css, widget.html, widget.config.json, manifests/widgets.json, deploy/environments.json, style guide, existing mismatch test wording and this documentation; immutable release 0.9.9. No Creator forms, fields, functions, Custom APIs, permission or backend deployment changes. Validation and Pages build pass. Mock browser QA checks fixed-summary geometry while scrolling, totals placement, edit scroll preservation, removed controls/copy, new labels, desktop/mobile layout, the real 97-lot CSV, duplicate and phase-conflict blocking, confirmation and partial failure/retry. No production records are created during QA. Rollback: production manage-lots 0.9.8; the permanent widget URL remains unchanged.

## Direct lot creation from review (0.9.10 candidate; published with 0.9.11)

Create Lots on the reviewed list starts creation immediately; the redundant confirmation listing only eight codes is removed. The footer names that database action. Progress appears before the fresh existing-code read, then records are inserted sequentially. Creation locks editing, closing and repeated submissions. Conflicts and invalid selected rows still block submission, and failed inserts remain staged for retry without duplicating successful lots. The separate discard-staged-rows dialog is retained.

Release QA: changed spreadsheet-import.js, widget.html version, widget.config.json, manifests/widgets.json, deploy/environments.json, module instructions and this documentation, plus immutable 0.9.10. No affected Creator forms/fields, functions, Custom API contracts, permissions or backend deployment changes; existing Lots payload is unchanged. Validation and Pages build pass. Mock browser QA covers no secondary create dialog, immediate progress, fresh duplicate reads before writes, repeated-submit protection, phase/conflict blocking, fixed summary and scroll preservation, the real CSV, partial failure/retry and mobile layout. No production records were created during QA. Rollback: production manage-lots 0.9.9.

## Created lot status badges (0.9.11)

Lot Code / Review shows a compact green SVG checkmark and Created badge only after addRecord succeeds. Failed and unsaved lots retain their review/error details and never show a success badge. Version 0.9.11 includes direct creation from the reviewed list, without the secondary confirmation prepared in the unpromoted 0.9.10 candidate.

Release QA: adds spreadsheet-import.css to the files listed above; immutable 0.9.11 and matching widget/config/registry/production versions. Browser QA uses a failed insert and retry to verify success badges appear only on saved lots, along with progress, repeated-submit protection, conflict checks and desktop/mobile layout. No Creator backend or contract changes and no production records created during QA. Validation and Pages build pass. Rollback: production manage-lots 0.9.9.

## Subdivision dropdown counts (0.9.12)

Available, amber Scheduled and Sold badges populate without selecting subdivisions. After core data loads, a shared background read merges the two verified all-lot reports by string record ID and aggregates every subdivision. This runs independently of selected-scope loading and retains search, focus and option nodes when counts arrive. Refresh invalidates counts; generation checks discard stale results. Fresh scoped reads take precedence once loaded. Pending counts show an ellipsis, unavailable counts a dash with a tooltip and audit detail; confirmed empty subdivisions show zero.

The shared readers paginate sequentially per report with a 500-page guard (100,000 records at the existing 200-record page size); scoped readers retain their 50-page guard. Incomplete or failed shared reads never publish partial zero counts. Available retains Open/Contracted eligibility and takedown/archive exclusions. Scheduled and Sold count their explicit statuses. No report names, Creator permissions or API contracts change.

Release QA: changed widget.html, lots-grid.css, scripts/test-manage-lots-widget.mjs, widget.config.json, manifests/widgets.json, deploy/environments.json and this documentation, plus immutable 0.9.12. Existing Lots report fields are read; no affected form/field definitions, functions, Custom APIs or backend deployment. Validation and Pages build pass. Mock browser QA covers counts before any selection, merged report deduplication, known empty zeros, Scheduled color, search/focus/node retention, fresh selected-scope overrides and mobile bounds. Existing tests verify pagination failure and eligibility; import regression retains direct creation, success badges, conflict blocking and partial failure/retry. No production records created during QA. Rollback: production manage-lots 0.9.11.

## Fast subdivision counts (0.9.13)

The 0.9.12 background census downloaded two complete lot reports before publishing counts, causing a long delay. Counts now use the existing Creator v1 `getRecordCount` SDK method against `All_Active_Lots_List_View`. The first eight subdivisions warm automatically; opening, scrolling or searching the picker prioritizes visible options and a few upcoming options. Each Available, Scheduled and Sold badge updates independently. At most four count jobs run at once, and completed/in-flight requests are reused across picker openings. This avoids a request burst for all 347 subdivisions and eliminates unfiltered lot-report downloads from this path.

Scheduled and Sold start when the subdivision list arrives, without waiting for builders or takedowns. Available starts after the takedown index is ready. Its criteria retain Open/Contracted, nonarchived lots, an empty direct takedown relationship and every reverse lot claim, with IDs kept as strings. Oversized exclusions or unavailable count endpoints fall back to one report read filtered by subdivision and status. Available fallback keeps the server's empty-relationship predicate, then checks reverse claims locally; unsupported criteria/permission failures stay unknown. Neither missing lookup fields nor failed counts become zero. Audit entries identify each subdivision/metric request, criteria, fallback reason and elapsed time. Refresh stops queued work and discards stale completions. Fresh detailed scoped reads continue to supersede background counts.

Release QA: changed widget.html, new subdivision-counts.js, scripts/test-manage-lots-widget.mjs, widget.config.json, manifests/widgets.json, manifests/widget-dependencies.json, deploy/environments.json and this documentation, plus immutable 0.9.13. Reads affect existing Lots fields Subdivision, Status, Archived and Add_Builder_Takedown_Name, and existing Builder_Takedown.Lots relationships. No form/field definitions, functions, Custom APIs, permissions or Creator backend deployment changes. Unit tests cover independent publication during a stalled request, bounded concurrency, reprioritization, request sharing, stale discard, malformed/error counts, string IDs and exact fallback eligibility. Browser QA simulates 120 subdivisions, delayed core reports and a stalled count: visible counts load without selection or any whole-inventory read, while scroll/search preserve nodes/focus; scoped overrides, failures and mobile bounds pass. Existing import QA covers real 97-lot CSV staging, conflict blocking, creation progress, no second confirmation and partial failure/retry. No production records created during QA. Required validation and Pages build pass. Rollback: production manage-lots 0.9.12.

## Routine success feedback (0.10.4)

Uses the shared [success-feedback guide](../../knowledge/design/success-feedback.md). Existing inline green verification and progress/result dialogs remain. Routine confirmations describe the actual completed action; inline saves are grouped without delaying writes. Frontend only; no Creator deployment is required.

## Block list and mass updates (0.11.2)

Lots now defaults to List, grouped once by subdivision and block; Grid remains available. Click outlined values for a single-field editor or the row pencil for all editable fields. Columns exposes additional fields. Checkbox/lot-number Shift-click selects a visible range, with block and Select visible controls respecting search. The editing selection is independent of takedown eligibility.

Mass update supports Lot_Size, Base_Price, Earnest_Money, Appraised_Value, Additional_Tax, Address, Notes and On_Hold. Checked fields apply to the captured selection; unchecked fields stay unchanged. The editor previews current/mixed values and replacements. Save checks fresh captured values before sending, then verifies every destination. Unknown results expose read-only Check status, including after closing the result. No automatic replay. Archived or incomplete lots cannot be edited.

Existing Builder Takedowns remain read-only. Their complete lot detail is grouped by block, with full codes in tooltips rather than repeated on every row. Existing takedown creation retains all eligibility and financial verification.

Frontend only: existing Lots fields and All_Lots_All_Fields report updates through Creator SDK2 updateRecordById; no Creator deployment, new functions or Custom APIs. Tests: controller stale/partial/timeout/recovery cases, real-browser inert list and existing takedown creation, npm run validate and npm run build:pages. Rollback: production manage-lots mapping 0.10.4.

## Pinned inventory controls and Builder editing (0.12.0)

The lot report scrolls independently below the toolbar and a compact subdivision/status summary. Block pills jump to and expand the matching block; report positions survive edits. Builder follows Status and opens the shared searchable single picker, restricted to existing Builder records with Type1 == "Builder", alphabetized by name. Historical assignments remain readable. Chosen builders are read fresh before writes; Lots.Builder1 is verified by exact string lookup ID afterward. Builder is also available as an explicitly checked mass-update field.

On Hold is a one-click boolean checkbox using the existing guarded save flow. Its adjacent notes icon is yellow when notes exist and opens the Notes editor to add, edit or clear. Existing selection, exact decimal updates, unknown-result recovery and takedown creation remain intact.

Affected existing fields: Lots.Builder1, On_Hold and Notes; Builder.Type1 and Builder_Name are read through All_Builders. Source changes include widget.html, lots-list.js/css, lot-edit-controller.js, manage-lots-controller.js and the local searchable-pickers.js. No Creator forms, reports, workflows, functions, Custom APIs or permissions change; no backend deployment is required. QA covers an inert 186-lot report, independent scrolling and block jumps, mobile containment, searchable Builder-only options, boolean toggles, note colors/clearing, captured type checks and existing verified single/bulk/takedown saves. Required validation and Pages build remain release gates. Rollback: production manage-lots mapping 0.11.2; persisted edits remain in Creator.
