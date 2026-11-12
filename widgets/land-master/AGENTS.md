# Land Master Codex Instructions

- Performance matters with more than 2,000 records. Avoid full rerenders, repeated linear scans, and unnecessary Creator calls.
- Subdivision and Company tabs intentionally have no pagination in this baseline.
- Name, Code, and Status are read-only in Subdivision editing.
- Display Projects_Status where the UI calls for project status; do not invent a replacement status field.
- Facility IDs must remain strings because leading zeroes are significant.

## Required reading

- `../../AGENTS.md`
- `../../knowledge/modules/land-master.md`
- `../../manifests/widget-dependencies.json`
- Applicable Creator field metadata under `../../creator/generated/fields/`

## Spreadsheet Import

- Import chooses exactly one subdivision in a searchable dropdown. City and County are read-only subdivision values. Keep the chosen filename visible through screen updates. Steps are Attach, Review, Create; Next checks source rows with progress, and Create Lots & Properties names the database action. `Lot_Code` is `Subdivision_Code + "-B" + leftpad(block,2,"0") + "-L" + leftpad(lot,2,"0")` â€” identical to the Deluge `Set Lot Code if Manual Update` workflow. `padCode` / `buildLotCode` are unit-tested; do not change the padding without changing Deluge.
- AI identifies source rows and column indexes only. The widget copies values from those cells, validates provenance and phase/project metadata, and flags unclassified possible lot rows for manual review. Never infer or complete lot sequences.
- AI lot import must omit `Notes` from every create payload. Keep filename, sheet, row provenance and AI review warnings in the import review UI; never save them to `Lots.Notes`.
- Nothing is written to `Lots` until the reviewer clicks Create Lots & Properties on the reviewed list. That button starts creation directly, without a second confirmation modal. Inserts go through `addRecord` on form `Lots` one record at a time; lots are re-read first so existing codes are skipped, and Creator's unique `Lot_Code` remains the last line of defence. Keep progress visible and duplicate submissions disabled during creation.
- `Lot_Size` is width in feet (the app formats it as `45Ft`). Area is never treated as width or saved to Lot_Size.
- The OpenAI call lives in Deluge `Plat_AI_Ingest` behind Custom API `Ingest_Plat` (`_DEV` in Development). Provider and model are read from the Settings singleton; the key stays in the `openai` Connection. Never put a key or a direct `api.openai.com` call in the widget.
- Respect the `Lots` field limits before insert: `Block` â‰¤ 2 characters, `Lot_Number` â‰¤ 3 digits, `City`/`County` must be picklist values.
- No native dialogs; use `piConfirm`.
- Require `spreadsheet_schema == 2` from the API before staging. Publish the updated backend before promoting the spreadsheet Land & Projects widget. Settings wording updates may deploy independently when requested.


Import schema references: `../../creator/generated/reports.json`, `../../creator/generated/fields/Lots.json`, and `../../creator/functions/Plat_AI_Ingest.dg`.

## Paired Lot And Property Import — November 12, 2026

- Each newly imported Lot creates a net new Property; never match or update an existing Property and never backfill Properties for pre-existing Lots in this release.
- Set `Property_ID` and `Common_Name` to the Lot Code, `Land_Type` to `Residential`, and `Subtype` to `L&B Res`. The internal lot-format Property ID is a placeholder until a real CAD parcel ID is obtained; do not fabricate one.
- Populate existing `Property.Projects` and `Property.Subdivisions` multi-lookups from the selected subdivision, and the existing single lookup `Property.Lots` from the new Lot's native string ID. Production needs that field published before promotion.
- Both result columns use the same status renderer: Waiting, Creating…, Saved, Failed, Needs Review. Never say Saved & Linked. Keep the mounted progress/results visible until dismissal, lock pending closes, and stop after an unknown reply. Do not replay a terminal import.
- Reuse `createRecord` and `landCreatedRecordId`; accepted writes follow the native save policy. A Lot ID is required only to address its new Property's lookup. Optional refresh failures cannot invalidate accepted saves.
