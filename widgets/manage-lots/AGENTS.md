# Manage Lots Codex Instructions

- A lot is selectable only when `Status == "Open"`, `Archived` is false, and `Add_Builder_Takedown_Name` is empty.
- Re-read lot records immediately before creating a takedown and reject the entire submission if any selected lot is no longer eligible.
- Create takedowns through the `Builder_Takedown` form so existing Creator form workflows remain authoritative.
- Treat all Creator record IDs as strings.
- Use only field and report link names verified in `creator/generated/` or the committed Creator export.

## Import Plat

- The subdivision is chosen before the plat is read; `Lot_Code` is `Subdivision_Code + "-B" + leftpad(block,2,"0") + "-L" + leftpad(lot,2,"0")` — identical to the Deluge `Set Lot Code if Manual Update` workflow. `padCode` / `buildLotCode` are unit-tested; do not change the padding without changing Deluge.
- The model transcribes only. Never let the widget or the prompt infer, interpolate, or "complete" lot sequences; gaps are surfaced as block chips for a person to resolve.
- Nothing is written to `Lots` until the reviewer confirms in the in-widget dialog. Inserts go through `addRecord` on form `Lots` one record at a time; lots are re-read first so existing codes are skipped, and Creator's unique `Lot_Code` remains the last line of defence.
- `Lot_Size` is width in feet (the app formats it as `45Ft`). Area is displayed for checking only and is not stored except in the optional Notes stamp.
- The OpenAI call lives in Deluge `Plat_AI_Ingest` behind Custom API `Ingest_Plat` (`_DEV` in Development). Provider and model are read from the Settings singleton; the key stays in the `openai` Connection. Never put a key or a direct `api.openai.com` call in the widget.
- Respect the `Lots` field limits before insert: `Block` ≤ 2 characters, `Lot_Number` ≤ 3 digits, `City`/`County` must be picklist values.
- No native dialogs; use `piConfirm`.

## Required reading

- `../../AGENTS.md`
- `../../creator/generated/reports.json`
- `../../creator/generated/fields/Builder_Takedown.json`
- `../../creator/generated/fields/Lots.json`
- `../../creator/functions/Plat_AI_Ingest.dg`
