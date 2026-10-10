# Contracts 1.61.42

Creation starts independent exact-ID counts and full-field reads together, reuses
its verified parent for subdivision/status preflights, and displays completed
stages without synthetic animation pauses. Writes stay ordered and every destination
requires exact ID and counted readback. Other callers keep serial count-first reads.
Actual throttling keeps read retries and maximum three concurrent requests;
writes are never retried blindly.

Attachment `Email_Attachment` and approver `Approval_Email` switches send Creator
checkbox strings (`"true"`/`"false"`) in both directions. Shared busy-release cleanup
restores controls after settled saves and failures across Contract edits, owners,
approvals, actions, templates, pricing and attachments. Pending operations hold
controls. Unknown outcomes block another write; settled attachment failures allow
closing the modal.

Native deletion failures take precedence over conflicting acknowledgement metadata.
Known permission/validation rejections release review only when fresh exact-ID
readback proves the captured deletion target still exists. Counted absence alone
confirms deletion; conflicting success replies or unavailable readbacks stay unknown.
The UI never substitutes an acknowledgement ID or repeats a deletion automatically.
Native failure messages also survive nested JSON envelopes.

## Creator permissions

Live Creator showed Contract Approvals Delete disabled for Dev/Land Acq - Proforma &
Budgets and Contract Mgmt. The user approved Contract Approvals Delete for those
profiles and CFO through `All_Contract_Approvals`, including production publication.
This is a separate native permission deployment. Parent Contract Delete and unrelated
profile settings remain unchanged. No new field, Deluge function or Custom API.

## Regression and rollback

- Actual whole-widget creation with seven actions/two approvals and equal simulated
  100 ms native latency: 5700 ms to 3200 ms (44% reduction), 57 to 53 calls.
  This fixture does not guarantee live-server timings.
- Exact parallel reads cover mismatched IDs/counts, denied/malformed replies, zero
  rows, cursors, cancellation and cache isolation.
- Actual Email switches cover both directions, permission rollback, restored modal
  controls, pending duplicate exclusion and unknown no-replay behavior.
- Delete tests cover permission failures carrying conflicting/numeric ID metadata,
  retained targets, applied deletion after lost replies, actor changes and unavailable
  verification. Existing SDK/approval/transfer/attachment/creation suites, complete
  `npm run validate` and `npm run build:pages` remain required.

Changed files: shared data helper and synchronized source copies; Contract widget,
progress/config; widget/environment manifests; immutable release, tests and docs.
Affected forms/fields: existing `Contract`, `Contract_Actions`, `Contract_Approvals`
(`Approval_Email`), `Contract_Pricing`, `Contract_Version` (`Email_Attachment`), plus
existing exact IDs/parent links/status/counts read by creation/recovery.
Frontend functions: `sdkGetAll`, `contractNativeMutation`, `contractFailureCause`,
`contractDefiniteRejection`, `contractReleaseBusy`, `ncFixSubdivision`,
`contractStatusPreflight`, `toggleEmailAttach`, `aprToggleEmail`.
No Custom API/backend function changes. Creator publication is required for permissions.

Rollback: map Contract Management Development/Production to `1.61.41` and rebuild
Pages. Native permission rollback removes only the newly approved Contract Approvals
Delete grants from the named profiles.
