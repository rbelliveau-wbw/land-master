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

- Import chooses exactly one subdivision in a searchable dropdown. City and County are read-only subdivision values. Keep the chosen filename visible through screen updates. Steps are Attach, Review, Create; Next checks source rows with progress, and Create Lots names the database action. `Lot_Code` is `Subdivision_Code + "-B" + leftpad(block,2,"0") + "-L" + leftpad(lot,2,"0")` — identical to the Deluge `Set Lot Code if Manual Update` workflow. `padCode` / `buildLotCode` are unit-tested; do not change the padding without changing Deluge.
- AI identifies source rows and column indexes only. The widget copies values from those cells, validates provenance and phase/project metadata, and flags unclassified possible lot rows for manual review. Never infer or complete lot sequences.
- AI lot import must omit `Notes` from every create payload. Keep filename, sheet, row provenance and AI review warnings in the import review UI; never save them to `Lots.Notes`.
- Nothing is written to `Lots` until the reviewer clicks Create Lots on the reviewed list. That button starts creation directly, without a second confirmation modal. Inserts go through `addRecord` on form `Lots` one record at a time; lots are re-read first so existing codes are skipped, and Creator's unique `Lot_Code` remains the last line of defence. Keep progress visible and duplicate submissions disabled during creation.
- `Lot_Size` is width in feet (the app formats it as `45Ft`). Area is never treated as width or saved to Lot_Size.
- The OpenAI call lives in Deluge `Plat_AI_Ingest` behind Custom API `Ingest_Plat` (`_DEV` in Development). Provider and model are read from the Settings singleton; the key stays in the `openai` Connection. Never put a key or a direct `api.openai.com` call in the widget.
- Respect the `Lots` field limits before insert: `Block` ≤ 2 characters, `Lot_Number` ≤ 3 digits, `City`/`County` must be picklist values.
- No native dialogs; use `piConfirm`.
- Require `spreadsheet_schema == 2` from the API before staging. Publish the updated backend before promoting the spreadsheet Land & Projects widget. Settings wording updates may deploy independently when requested.


Import schema references: `../../creator/generated/reports.json`, `../../creator/generated/fields/Lots.json`, and `../../creator/functions/Plat_AI_Ingest.dg`.
