# Budget approval comments — October 22, 2026

Budget Manager **122.29.70** adds a decision comment box and saved note history
to standalone modification details, item modification history and modification
approval cards. Approve/Reject commit the comment; no independent Add comment
button or new conversation record is introduced.

## Native connection

Reuses `sdkUpdateRecord` and its existing approval report adapter. One native
update of the exact string `Budget_Approvals.ID` includes `Status`,
`Responded_Date` and `Approval_Notes`. Existing `Budget_Modification` and `Budget`
lookups stay on that row. Prior history uses persisted `Approver`, `Title`,
`Status`, `Responded_Date` and `Approval_Notes`. No invented author/time is used.

The existing rejection progress flow continues to update the same row and run
its targeted reconciliation. Approve continues through `sendModificationEmail`
and native status workflows. Existing Budget track and managed PO approval
notes already save on their own exact approval rows and remain unchanged.
PO-linked modifications remain controlled by their captured PO approval.
Check/Wire requests without approvals retain their existing behavior.

**Creator backend deployment: none.** No Creator source, schema, form, field,
report, API registration, routing, email content or finalization rule changes.
Permissions retain addressed-approver or global modification-admin delegation,
with a fresh client guard before decision writes. Native report permissions
remain the write boundary. Rejection notes remain required; approval notes are
optional.

## Changed files and verification

- `widgets/budget-manager/src/app/widget.html`: shared comment renderer, scoped
  draft capture, saved history, note payload on approval and decision guards.
- `scripts/test-budget-approval-comments.mjs`: actual-source/native-shape tests
  for exact row identity, note/status/date payloads, prior author/date, all three
  renderers, optional/required notes, ownership/admin checks, failed saves,
  actor isolation, double clicks and newer drafts during in-flight writes.
- `scripts/test-budget-request-attachments-browser.mjs`: desktop request tools
  fixture covers the shipped comment renderer and retained rejection drafts.
- Shared comments guide, Budget module guide, version/hash manifests, immutable
  release, validation script registration and Development/Production mappings.

Required gates: focused comments and request-tool checks, desktop browser
fixture, `npm run validate`, `npm run build:pages`, exact-commit CI and Pages.
Live business approvals are not submitted as a test; that native write remains
an explicit verification limitation. Existing SDK update/approval APIs are
reused without migration. PMP deploys repository assets and mappings only.

## Rollback

Restore Development and Production Budget Manager mappings to **122.29.69**
and rebuild Pages. Permanent Creator widget URLs stay unchanged. No Creator
rollback is required. Already recorded approval comments remain in their
native approval records.
