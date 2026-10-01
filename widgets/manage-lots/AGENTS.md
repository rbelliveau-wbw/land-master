# Manage Lots Codex Instructions

- A lot is selectable only when `Status == "Open"` or `Status == "Contracted"`, `Archived` is false, and `Add_Builder_Takedown_Name` is empty.
- Re-read lot records immediately before creating a takedown and reject the entire submission if any selected lot is no longer eligible.
- Create takedowns through the `Builder_Takedown` form so existing Creator form workflows remain authoritative.
- Treat all Creator record IDs as strings.
- Use only field and report link names verified in `creator/generated/` or the committed Creator export.

## Spreadsheet Import

Import Lots now belongs entirely to Land & Projects. Its source and rules live in `../land-master/`. Do not restore a second import workflow here.

## Required reading

- `../../AGENTS.md`
- `../../creator/generated/reports.json`
- `../../creator/generated/fields/Builder_Takedown.json`
- `../../creator/generated/fields/Lots.json`
- `../../creator/functions/Plat_AI_Ingest.dg`
