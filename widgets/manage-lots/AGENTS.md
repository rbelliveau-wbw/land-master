# Manage Lots Codex Instructions

- A lot is selectable only when `Status == "Open"` or `Status == "Contracted"`, `Archived` is false, and `Add_Builder_Takedown_Name` is empty.
- Re-read lot records immediately before creating a takedown and reject the entire submission if any selected lot is no longer eligible.
- Create takedowns through the `Builder_Takedown` form so existing Creator form workflows remain authoritative.
- Treat all Creator record IDs as strings.
- Use only field and report link names verified in `creator/generated/` or the committed Creator export.

## Spreadsheet Import

- The subdivision(s) are chosen before the spreadsheet is read; `Lot_Code` is `Subdivision_Code + "-B" + leftpad(block,2,"0") + "-L" + leftpad(lot,2,"0")` — identical to the Deluge `Set Lot Code if Manual Update` workflow. `padCode` / `buildLotCode` are unit-tested; do not change the padding without changing Deluge.
- AI identifies source rows and column indexes only. The widget copies values from those cells, validates provenance and phase/project metadata, and flags unclassified possible lot rows for manual review. Never infer or complete lot sequences.
- Nothing is written to `Lots` until the reviewer confirms in the in-widget dialog. Inserts go through `addRecord` on form `Lots` one record at a time; lots are re-read first so existing codes are skipped, and Creator's unique `Lot_Code` remains the last line of defence.
- `Lot_Size` is width in feet (the app formats it as `45Ft`). Area is never treated as width or saved to Lot_Size.
- The OpenAI call lives in Deluge `Plat_AI_Ingest` behind Custom API `Ingest_Plat` (`_DEV` in Development). Provider and model are read from the Settings singleton; the key stays in the `openai` Connection. Never put a key or a direct `api.openai.com` call in the widget.
- Respect the `Lots` field limits before insert: `Block` ≤ 2 characters, `Lot_Number` ≤ 3 digits, `City`/`County` must be picklist values.
- No native dialogs; use `piConfirm`.
- Require `spreadsheet_schema == 2` from the API before staging. Publish the updated backend before promoting the spreadsheet Manage Lots widget. Settings wording updates may deploy independently when requested.

## Required reading

- `../../AGENTS.md`
- `../../creator/generated/reports.json`
- `../../creator/generated/fields/Builder_Takedown.json`
- `../../creator/generated/fields/Lots.json`
- `../../creator/functions/Plat_AI_Ingest.dg`
