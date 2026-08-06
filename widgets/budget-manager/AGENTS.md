# Budget Manager Codex Instructions

- Development approvals lock Development and Engineering; Construction approvals lock Construction.
- Budget attachments are one Contract_Version record per file using File_field1.
- The confirmed in-widget PDF preview path is the Get_Budget_Attachment_Preview Custom API. Do not replace it with readFile, blob URLs, direct Creator download URLs, or the stock preview URL.
- Treat reimbursement Major Code 8000 as a credit where current code/business rules require it.
- Do not alter approval email, finalization, or category locking behavior during styling-only work.

## Required reading

- `../../AGENTS.md`
- `../../knowledge/modules/budget.md`
- `../../manifests/widget-dependencies.json`
- Applicable Creator field metadata under `../../creator/generated/fields/`
