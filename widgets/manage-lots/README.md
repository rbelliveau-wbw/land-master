# Manage Lots

Select Open and Contracted subdivision lots, create Builder Takedowns, and review staged CSV/XLSX lot imports. Archived lots and lots already linked to a takedown remain unavailable. Sold and Scheduled lots remain visible and read-only. Eligibility is re-read immediately before takedown submission. Takedowns cannot mix subdivisions.

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
