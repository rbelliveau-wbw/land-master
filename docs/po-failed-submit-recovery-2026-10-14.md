# Failed purchase-order submission recovery (2026-10-14)

A late failed submission persisted the PO, automatic budget modifications and captured approvals, then marked its operation Unknown and retained its phase lock. Approvals collided with that lock and deletion was blocked. Read-only Check cannot finalize Unknown receipts.

Recover PO explicitly validates the exact PO/revision/budget, original submitter, terminal Unknown/Complete submission receipt and sole matching phase lock. The native saved-PO reader verifies lines, modifications and captured approval records. Recovery requires the untouched initial chain (first Pending, others Not Sent); it writes only the completion receipt and releases that exact lock. It never resubmits, approves, sends mail or changes PO/modification/financial records. Started, foreign, partial, progressed and newer states remain blocked. CheckRecovery is a separate read-only confirmation for an uncertain recovery response.

Saved PO and delete preview surface Recover PO only for a matching terminal receipt/lock. Approval note validation now runs before lock acquisition; a competing phase operation produces a specific recovery message instead of a generic exception.

Creator functions: managePurchaseOrder and handlePurchaseOrderApproval. Save/compile in Development; Stage/Production promotion remains with the user. Frontend Budget Manager 122.29.39 is promoted to Development and Production. After Creator promotion, open this saved PO or its delete preview and click Recover PO. No automatic data recovery is performed during deployment.

Tests execute the actual native snapshot and recovery handler, confirm no business-record/email/financial changes, deny unsafe recovery, verify read-only CheckRecovery and prove deletion preview unblocks. UI tests cover scoped recovery and no duplicate/replay. Rollback Budget to 122.29.38 and these two native sources; retain failed receipts/locks until reviewed.
