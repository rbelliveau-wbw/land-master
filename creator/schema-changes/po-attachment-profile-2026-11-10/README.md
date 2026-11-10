# PO Attachment Profile Fix

Saved in Creator Development November 10, 2026. User promotes Creator changes.

1. Existing function `createBudgetAttachmentRecord` uses existing
   `constructionReviewActor` and adds the `canAttachPO` capability to the existing
   `Create_Budget_Attachment_Record` API. No argument/endpoint change.
2. Existing Attachment Created or Edited / Validations on form submission
   workflow **Construction Attachment Validation**, link
   `Construction_Attachment_V`: update its single existing Deluge action from
   `creator/workflows/Construction_Attachment_Validation.dg`. Do not add another
   action. The prefix is retained here to isolate the new grant from historical
   captured contract guard checks.

No form/field/report/profile permission change. Construction Budgeting already
has native Attachment Add access. Scope is append files to any PO, all owners
and statuses, exact Budget/PO pair. Budget-only, Check/Wire, modifications,
association, delete and other users' populated-file replacement remain excluded.

Native compilation/reopen and read-only Capabilities/Validate checks passed;
no native FILE transfer was performed. See
[verification and rollback](../../../docs/po-attachment-profile-2026-11-10.md).
