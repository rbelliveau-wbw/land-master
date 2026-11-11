# PO Route Snapshot Ordering — November 10, 2026

## Problem And Behavior

Creator record IDs are not a chronological ordering guarantee. A later captured-route correction can have a smaller ID than the original snapshot. Selecting the maximum ID caused `poApprovalBundle` to validate against the superseded route and reject an otherwise valid PO read.

The reader now selects the Purchase Order snapshot with the greatest `Added_Time`. Equal timestamps use the greatest ID as a deterministic tie-breaker. The selected record still passes the existing workflow, parent, revision, actor, execution-row, linked-modification and approval-status validation.

## Scope

- Changed function: `creator/functions/poApprovalBundle.dg`.
- Read fields: `Approval_Route_Snapshot.Added_Time` and the existing snapshot fields.
- Existing callers retain their contracts; no widget, API schema, form-field, email or financial-write changes.
- This is a native Creator backend change. GitHub Pages promotion does not deploy it.
- A one-off owner-authorized data correction was kept outside this public repository. The general reader fix does not create or repair records.

## Verification

The function compiled and saved in native Creator Development and was selectively staged in V9.182. GitHub CI passed for source commit `10fb6ce34514adc8c52e42db817fccdd5ec387ef`.

V9.182 was published to Production on November 10, 2026, and the targeted live PO reopened successfully. The Approvers tab showed exactly the two retained approval steps with their prior decisions; the unnecessary COO step was absent. The rejected PO remained available for resubmission without submitting it during verification. Its three saved lines, linked reallocation and attachment count remained visible. The temporary owner-only repair Custom API was disabled after verification.

Regression scenarios:

1. A later timestamp wins even when its record ID is smaller.
2. Equal timestamps select the greatest ID deterministically.
3. A single snapshot follows the existing validation path.
4. Missing, wrong-parent, wrong-revision or inconsistent execution rows remain rejected by existing checks.
5. Reading a corrected rejected route preserves its approval decisions and linked modifications and sends no email.

## Rollback

Restore only the previous snapshot selector from the parent of `10fb6ce`, compile it and publish that native function through the normal environment flow. This rollback can make a PO with a newer lower-ID correction unavailable again. Do not delete its historical snapshots or alter approval decisions as a rollback shortcut.
