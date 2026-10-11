# Budget Manager Codex Instructions

- Development approvals lock Development and Engineering; Construction approvals lock Construction.
- Budget attachments are one `Attachment` record per file using `Budget` and `File_field1`, read through `All_Attachments`. The October 10 production `.ds` predates the form/report rename; verify live Creator metadata first.
- The confirmed in-widget PDF preview path is the Get_Budget_Attachment_Preview Custom API. Do not replace it with readFile, blob URLs, direct Creator download URLs, or the stock preview URL.
- Treat reimbursement Major Code 8000 as a credit where current code/business rules require it.
- Do not alter approval email, finalization, or category locking behavior during styling-only work.

## Required reading

- `../../AGENTS.md`
- `../../knowledge/modules/budget.md`
- `../../manifests/widget-dependencies.json`
- Applicable Creator field metadata under `../../creator/generated/fields/`
