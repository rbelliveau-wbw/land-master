# Inline approval settings, territory managers and PO workspace

Release Budget Manager 122.29.37 and Settings Manager 1.5.5 to Development and
Production. Existing approval records save inline; new rules retain Save Rule.
Saving a new rule returns to the rules list without closing Approvals.
PO Vendor is centered; Add New Vendor opens a separate dialog and selects the
exact acknowledged created ID. Increase desktop card height 18%, keep matrix
scrolling internal and show contextual Approvers below Summary.

## Creator handoff — not deployed from this session

The in-Codex browser is visible but its control tools are unavailable. External
Chrome is not authorized. Save and compile these existing functions in Dev:

1. [approvalConfigurationSnapshot](../creator/functions/approvalConfigurationSnapshot.dg): expose Territory.Dev_Mgr as devMgrUserAccessIds.
2. [resolveApprovalRoute](../creator/functions/resolveApprovalRoute.dg): resolve every unique Territory.Dev_Mgr user into consecutive individual approvals. All must approve before the next role; retain sequential delivery and all permission/self-approval/routing guards.
3. [managePurchaseOrder](../creator/functions/managePurchaseOrder.dg): read-only PreviewApprovals includes resolved people and emails for the new sidebar.

Promote those changes to Stage, then Production. No schema, forms, Custom API
registrations or permission changes are needed. Until promoted, Dev Mgr routing
and detailed person/email previews remain unavailable from the existing native
backend. Widget inline saves and native vendor creation are independent of the
new function changes. Do not rewrite already captured routes.

## Verification and rollback

Actual-source regressions cover rapid/coalesced edits, exact new IDs, no-op
updates, invalid drafts, mounted editor, ambiguous replies and read-only Check;
manual new rules and persistent Approvals; multi-manager native/JS parity,
missing/unroutable members and self-approval; exact vendor selection, duplicate
clicks, uncertain no-replay, and escaped contextual recipient details.
Full npm run validate and npm run build:pages passed before widget promotion.
In-app and native record testing are left to Robby. Native compile and Creator
promotion are pending the handoff above. No live emails or test records were
created. Roll back widget mappings to Budget 122.29.36 and Settings 1.5.4; revert
the three native functions separately if promoted. Captured routes remain saved.
