# Land Master four-core loading (8.13.4 candidate)

The SDK v2 transport gate in `8.13.3` loaded all 14 reports inside authenticated Production, including 25,527 lots. `8.13.4` defers the ten related reports until a screen needs them. It retains complete, full-field, counted reads; no report is replaced by a preview, display-field projection, or fixed record cap.

## Dependency contract

`src/app/land-data.js` owns collection states (`idle`, `loading`, `ready`, `error`) and the data generation. Unloaded or failed counts are `null`; a successfully counted empty report is zero. Concurrent consumers share a read within a generation. Ready collections are reused until a refresh starts a new generation. Reads continue to use the shared three-request concurrency limit.

| Entry point | Reports required beyond the four core reports |
| --- | --- |
| Initial Properties table | None; location choices are also resolved before rendering. |
| Subdivisions table | Milestones, so Next milestone search and sorting are complete. |
| Companies table | None; usage counts use the full Properties and Subdivisions reports. |
| Property editor | Builders and Pro Formas. |
| Existing Subdivision editor | Builders, Milestones, Forecasts, Forecast Years, Takedown Schedules, Builder Takedowns, Additional Items, External System Mappings. |
| New Subdivision editor | Builders. |
| Monthly Forecast editor | Builders and Forecast Years, plus Forecasts for an existing record. |
| Forecast Year editor | Builders, plus Forecast Years and Forecasts for an existing record. |
| Takedown Schedule editor | Builders, plus Takedown Schedules for an existing record. |
| Builder Takedown editor | Builders and Lots, plus Builder Takedowns and Additional Items for an existing record. The Lots lookup requires the complete inventory. |
| Lot editor | Builders, Takedown Schedules and Builder Takedowns, plus Lots for an existing record. |
| Additional Item editor | Builder Takedowns, plus Additional Items for an existing record. |
| Existing Milestone, Builder or External Mapping editor | The report containing that record. |
| Bulk Seller field | Builders before enabling Apply. Other allowed bulk choices use the core or location choices. |

The four core reports are `All_Property`, `All_Projects`, `All_Subdivisions`, and `All_Companies`. All current Properties search columns, property filters, sort columns, issue counts and Company usage counts remain available from these complete reports. Saved Subdivision lot/sold summary fields remain their source; those counters do not require downloading every lot. Existing 160 ms search debounce and table pagination rules are unchanged.

## Failure and navigation behavior

Core records commit together only after all four reads and the location choices have completed. A denied, incomplete, or malformed core read shows a failure and retains the prior complete core snapshot. Related-report failures preserve that snapshot and show an unavailable editor or scope. Editors expose Retry; selecting an unavailable Subdivisions scope retries its milestones. A failed dependency never renders an empty lookup or a zero related-record count.

An editor mounts only after its fields, lookup choices and linked-tab reports are complete. While waiting, it exposes Close. Closing it, selecting another record or navigating to another scope invalidates the old navigation token, so late completions cannot reopen or replace the panel. Render failures also keep an explicit Retry state.

Refreshing is rejected while a panel is dirty or saving, or a bulk update is saving. Navigation uses the existing discard confirmation before clearing an unsaved draft. A new data generation cancels old read consumers, guards location-choice responses and delayed progress cleanup, and prevents older refreshes from changing the current data or status. Loading a background dependency emits metrics without rerendering a mounted editor.

Staged External Mapping saves continue to reconcile local rows and preserve failed drafts. The lot importer still performs fresh counted reads of both selected-subdivision reports before duplicate checks and writes one reviewed record at a time. This increment adds no Creator fields, functions, APIs or permissions, and keeps normal Creator workflows enabled.

## Validation and live gate

`node scripts/test-land-master-sdk-v2.mjs` includes the actual controller and widget entry-point tests in `test-land-master-lazy-data.mjs`. They exercise four-core startup, atomic failures, full search/sort/usage results, unknown versus empty counts, deferred retries, shared in-flight reads, scope/editor/bulk races, superseded refreshes and draft protection. The existing choices, mapping, spreadsheet and lot-import suites remain required. These tests do not establish live Creator latency.

Before promotion, verify inside authenticated Development:

1. Open Properties and inspect `lm-performance`: only the four core reports and location choices should be needed before first usable render. Compare complete counts and global search/filter results with the `8.13.3` baseline.
2. Open Subdivisions. Confirm complete groups, lot/sold summaries and Next milestone search/sort after its milestones have loaded. Navigate away while it is loading and confirm the older selection does not replace the newer scope.
3. Open a Property. Confirm Builders and Pro Formas have loaded before fields appear. Reopen it and confirm no repeat reads in that generation. Close a waiting editor or select another record and confirm it stays closed or on the newer record.
4. Open an existing Subdivision and compare every related tab count with the transport baseline. A dependency error must show Retry and retain the table; it must not show zero rows as if the read succeeded.
5. Stage a mapping or Project phase draft and verify a section change requires discard. After a failed save, confirm the draft remains present. For any persisted reversible note test, record the original value, save, reread, restore, and reread again.
6. Open bulk Seller choices and close before their load completes. Confirm the old completion cannot enable or populate the closed window. Verify a selected subdivision import still rereads fresh lots and blocks incomplete inventories before insertion.

`land-core-ready`, `land-resource-ready`, `land-editor-ready`, `land-load`, `land-render`, and `first-usable-render` make startup and deferred stages visible. Shared response-size metrics are serialized SDK JSON estimates, not network transfer bytes. Compare the candidate's live metrics before making a latency claim.

Rollback: restore the relevant Land deployment mapping to verified transport release `8.13.3`; no backend rollback is needed. The coordinator owns immutable release creation and environment promotion after synchronizing shared helpers.
