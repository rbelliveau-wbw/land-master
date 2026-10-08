# Manage Lots Codex Instructions

- A lot is selectable for a takedown only when `Status == "Open"` or `Status == "Contracted"`, `Archived` is false, and `Add_Builder_Takedown_Name` is empty.
- The independent editing selection can include unarchived lots in any status. Edit only the fields approved for the list: Lot_Size, Base_Price, Earnest_Money, Appraised_Value, Additional_Tax, Address, Notes, On_Hold and Builder1. Preserve takedown assignment and status. Builder choices must have Type1 == "Builder"; re-read the chosen builder before writes. Read captured fields before writing; after successful acknowledgement confirm destination identity and refresh the saved row without field-equality checks. Unknown results permit read-only rechecks, never blind replay.
- Re-read lot records immediately before creating a takedown and reject the entire submission if any selected lot is no longer eligible.
- Create takedowns through the `Builder_Takedown` form so existing Creator form workflows remain authoritative.
- Treat all Creator record IDs as strings.
- List starts read-only; enable field updates only in Edit mode. Entered_Date, Purchase_Date and Close_Date are always displayed read-only and must stay outside the edit allowlist. Use Budget's note popover and the shared success-feedback guide for verified single inline saves; retain the multi-record progress dialog for mass updates.
- Use only field and report link names verified in `creator/generated/` or the committed Creator export.

## Spreadsheet Import

Import Lots now belongs entirely to Land & Projects. Its source and rules live in `../land-master/`. Do not restore a second import workflow here.

## Required reading

- `../../AGENTS.md`
- `../../creator/generated/reports.json`
- `../../creator/generated/fields/Builder_Takedown.json`
- `../../creator/generated/fields/Lots.json`
- `../../creator/functions/Plat_AI_Ingest.dg`
