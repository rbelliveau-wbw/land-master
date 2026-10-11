# Simple PO policies and 200-line entry — October 11, 2026

User direction: the only PO route branch is whether submission creates budget
modifications. CFO always approves; the configured additional roles then approve
when the modification plan is nonempty. There are no PO amount thresholds,
overrun conditions, policy dates, policy versions or duplicate-person modes.
Published policies edit in place; Save applies immediately to future submissions.
Existing submissions retain their immutable captured route. The user guarantees
that a person appears only once in a policy.

## Releases and affected source

- Settings Manager 1.5.0: approval-admin.js, approval-policy-domain.js and CSS.
  The PO editor has two groups, fixed CFO first and Add approver for modifications.
  Scope and temporary Test settings collapse. New policies begin as Draft and
  Publish once; later Save preserves Published and the same exact record ID.
- Budget Manager 122.29.18: po-ui.js, po-domain.js and purchase-orders.css.
  Add, +10, Duplicate and Save/Submit support 200 lines. A separate Item name
  column resolves from the selected Budget Item and survives description edits.
  Description/unit-price space is reduced and Element is labeled ELEM.
- Tests cover both route branches, obsolete policy fields, scope ambiguity,
  exact IDs/cents, retained Draft recovery, in-place Published saves, guarded
  frontend compatibility and line-count boundaries.

## Creator handoff

These eight changed functions were saved/compiled in Development, reopened,
and checked against their repository source using exact non-comment tokens.
They remain for the user to promote: `approvalConfigurationSnapshot`, `resolveApprovalRoute`,
`manageApprovalPolicies`, `snapshotApprovalRoute`, `applySharedApprovalPolicy`,
`poApprovalBundle`, `managePurchaseOrder`, `poValidatePayload`.
The earlier Test CFO changes in `handlePurchaseOrderApproval` and
`sendPurchaseOrderEmail` also remain part of the pending ten-function promotion.

Existing APIs retain bindings: Manage_Approval_Policies / _DEV and
Manage_Purchase_Order / _DEV. No forms, fields, APIs or permission grants are
added. Dormant Approval_Policy.Version, Duplicate_Person, Effective_From and
Effective_To, and Approval_Route_Snapshot.Policy_Version remain as historical
columns; active policy DTOs, editing and routing no longer use them. Reconcile
alone can compare old audit intent to those legacy values without replaying a
write. Role-assignment dates retain their existing meaning.

List advertises policyModel scope-v1. Policy Save, Publish and Preview require
that signal, so the new frontend does not submit the simplified payload to old
Creator code. The 200-line native limit requires poValidatePayload promotion.
The old production backend still rejects more than 100 lines until promotion.

The saved $55 Bluebonnet Phase 01 test PO remains Draft. Recover the original
Started policy receipt using Audit → Verify saved draft after promotion, review
the exact scoped Test CFO settings, publish, preview, then submit once. No
submission or mailbox delivery is claimed by local source tests or compilation.
See [test configuration and recovery](po-test-cfo-2026-10-11.md).

## Validation and rollback

Required gates: npm run validate, npm run build:pages, GitHub CI and Pages.
Local `npm run validate` and `npm run build:pages` passed. A read-only browser
fixture reached exactly 200 lines, disabled duplication and rejected further
addition, with zero record writes. The fixed item name also survived a separate
description edit. Native compilation preserved the sources' token structure;
the shared adapter uses explicit nested conditions to avoid Creator's formatter
dropping grouping parentheses.
Native Development compilation and persisted source readback are separate
from production functional testing. Creator promotion remains with the user.
Rollback mappings to Settings Manager 1.4.6 and Budget Manager 122.29.16,
rebuild Pages, and restore changed Creator sources from a63368b in Development
before promoting that Creator rollback. Preserve historical approvals and PO
records; permanent widget URLs remain unchanged.
