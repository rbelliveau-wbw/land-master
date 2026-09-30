# Spreadsheet lot import — Creator publication handoff

The selectable-lot and complete subdivision loading fixes are already deployed as manage-lots **0.8.5**. Spreadsheet import is packaged as manage-lots **0.9.3** and settings-manager **1.3.0**, awaiting Creator publication.

## Publish in Creator

1. Open the existing standalone function **Plat_AI_Ingest**. Replace its source with `creator/functions/Plat_AI_Ingest.dg`, retaining signature `string Plat_AI_Ingest(string payload)`. Save/compile and publish it to the intended Creator environment.
2. Keep the existing Custom API **Ingest_Plat** (Production) and **Ingest_Plat_DEV** (Development) bound to that function, POST Entire JSON with the existing `payload` argument. No new Custom API or Settings field is needed.
3. Confirm the existing **openai** Connection is available. Provider/model still come from Settings **PF_Review_Provider** and **PF_Review_Model**.
4. Verify a ping through the API: `{"mode":"ping"}` must return `success: true` and `spreadsheet_schema: 2`. The frontend uses this capability check before sending spreadsheets.
5. Paste `creator/handoffs/spreadsheet-import-starter.txt` into **Settings.Plat_Review_Criteria**. Settings Manager 1.3.0 also has a **Use starter instructions** button. The response schema is appended in the function; custom instructions only describe interpretation.
6. After successful publication, promote **manage-lots 0.9.3** and **settings-manager 1.3.0** together in `deploy/environments.json`, validate/build, push main, and verify the production assets. Existing Creator widget registrations keep their stable URLs. Candidate release files are committed; they are not served by the current production mapping.

The uploaded sample contains **97 explicit lot rows** under **Project: Arroyo Ranch / Phase: 6**. Select Phase 6 for that import. Selecting only Phase 7 produces unresolved subdivision flags, even if the AI incorrectly selected Phase 7. Resolve or exclude flagged rows before confirming.

## Verification and limits

Full `npm run validate` and `npm run build:pages` pass. Local browser checks with mocked Creator/API responses cover: the real sample CSV; 42-lot/41-sold subdivision loading; Contracted selection; phase conflicts; editable staging; no inserts before confirmation; failed-record retry without duplicate successful inserts; old API compatibility gating; Settings starter button; desktop/mobile layout. Bundled SheetJS 0.20.3 is tested with a two-worksheet XLSX and blank rows preserving source numbering.

Deluge received static review for null handling, unchanged caller/signature, no unsupported loops/map methods, credential isolation, and no record writes. Live Creator compilation and a live model call require publication in the user's authenticated Creator editor and remain unverified here. No live Lots records were created during QA.

CSV/XLSX files are limited to 10 MB, 5,000 nonempty rows, and 100,000 cells. AI requests are bounded batches of up to 60 source rows. Source references and selected subdivision IDs are validated before staging. Explicit source lot rows omitted by AI under recognizable Block/Lot headers are added as unresolved review rows; arbitrary unknown headers still require checking the spreadsheet against the review screen.

## Release checklist

- Changed files: Manage Lots HTML, spreadsheet JS/CSS, vendored XLSX parser/license, widget configuration/dependency manifests, Settings HTML/configuration, Deluge function, regression scripts, immutable releases, and documentation.
- Affected forms/fields: Lots (`Lot_Code`, `Subdivision`, `Subdivision_Code`, `Phase`, `Block`, `Lot_Number`, `Lot_Size`, `City`, `County`, `Status`, `Archived`, `On_Hold`, `Notes`); Builder_Takedown keeps its existing creation workflow; Settings reuses `Plat_Review_Criteria`, `PF_Review_Provider`, `PF_Review_Model`.
- Affected function/APIs: `Plat_AI_Ingest`, `Ingest_Plat`, `Ingest_Plat_DEV`; no names/signatures change. New mode `spreadsheet` returns provenance column mappings; ping advertises schema 2. Legacy tile mode remains for rollback.
- Frontend deployment: 0.8.1 is live. 0.9.3 and Settings 1.3.0 need promotion after backend publication.
- Backend deployment: user publishes the provided function in Creator. GitHub deployment does not publish Deluge.
- Permissions: selected subdivision reads now require both `All_Lots_All_Fields` and `All_Active_Lots_List_View`. Existing form-create permissions remain authoritative; no new permissions are granted.
- Rollback: spreadsheet frontend to manage-lots 0.8.1 and settings-manager 1.2.0. Restore prior image instructions before using legacy image import. Selection/loading fix can roll back to 0.8.0. The updated backend retains legacy tile support.
