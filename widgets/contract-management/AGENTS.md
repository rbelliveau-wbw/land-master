# Contract Management Codex Instructions

- Preserve tokenId-based LOI review behavior.
- Do not expose approval tokens or private record data in logs.
- Verify Contract, Attachment, and LOI fields against current live Creator metadata when available, then generated metadata. The October 10 production `.ds` predates the Attachment/All_Attachments rename.
- Preserve the existing `Contract.Contract_Versions` field; it is not the renamed form/report.

## Required reading

- `../../AGENTS.md`
- `../../knowledge/modules/contracts.md`
- `../../manifests/widget-dependencies.json`
- Applicable Creator field metadata under `../../creator/generated/fields/`
