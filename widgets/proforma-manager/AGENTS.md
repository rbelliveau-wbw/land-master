# Proforma Manager Codex Instructions

- Approval sequence comes from the applicable Settings policy. VP and every selected Dev Mgr come from the document's Territory; preserve submitted routes and approval history. See `../../docs/proforma-settings-approval-routing-2026-10-14.md`.
- Do not alter LOI behavior during approval-only work.
- Verify LOI field names against creator/generated/fields/Add_Pro_Forma.json.
- Do not change approval email content, PDF generation, or Writer merge behavior unless explicitly requested.
- Treat Proforma and approval record IDs as strings in browser code.
- Attachments use `Attachment` / `All_Attachments` with `Pro_Forma` and `File_field1`. The October 10 production `.ds` predates the rename; verify live Creator metadata first.

## Required reading

- `../../AGENTS.md`
- `../../knowledge/modules/proforma.md`
- `../../manifests/widget-dependencies.json`
- Applicable Creator field metadata under `../../creator/generated/fields/`
