# PF approval preservation and universal self-approval

Corrects Proforma Manager 1.80.103. Releases: PF **1.80.106**, Settings **1.5.8**.
Rollback widgets: PF **1.80.103**, Settings **1.5.7** (these retain the reported defects).
PF 1.80.104 and 1.80.105 are unpromoted intermediate candidates; use 1.80.106.

Existing PFs with any saved approval rows keep recipients, titles, IDs, order,
notes, dates and decisions, including Not Sent routes. Settings never overwrites
these rows. New PFs with no rows resolve the published enabled policy, Territory
VP and every Territory Dev Mgr. No backfill or mass approval-row mutation runs.
Cancel/reset retains the saved route too. Permission, Offer readiness, history,
recipient-intent and duplicate-email protections remain.

User direction: self-approval is always allowed across all shared workflows.
Remove the Settings selector and ignore stale Deny/blank values. Keep the legacy
storage field for compatibility. Do not auto-approve a recipient step.

PF Settings preview failures now show the native reason. A read-only preview
cannot become an unknown mutation that locks subsequent writes. Published enabled
PF policies require no separate hidden Adapter_Enabled flag; Budget migration
gates remain unchanged.

## Creator handoff — promotion belongs to the user

Compile/save these Development functions, then promote together:

- resolveApprovalRoute: universal Allow; Territory recipients unchanged.
- approvalConfigurationSnapshot: canonical Allow DTO.
- manageApprovalPolicies: normalize saves/recovery to Allow; no Deny validation.
- snapshotApprovalRoute: published PF policy sufficient for capture.
- applySharedApprovalPolicy: keep every existing PF route; PF migration flag retired.
- Start_Proforma_Approval_Chain: preserved route allowed, exact saved-recipient
  intent checked, StartSettings cannot replace any saved chain, PF preview gate fixed.

No new forms, fields, Custom APIs or signatures. Affected records remain
Add_Pro_Forma and Budget_Approvals; Approval_Policy.Self_Approval remains a
compatibility field. No existing PF approval row was edited by this work.
The live PF policy was changed from Deny to Allow at the user's explicit request.

## Regression coverage

Frontend: saved unsent route displays without a Settings request; exact saved
route intent on send; new route scoped/validated; raw native reason retained;
preview failures leave no mutation ledger or quarantine.
Native: existing route starts with no policy, retains IDs/titles/emails/order and
creates no Settings snapshot; StartSettings refuses to overwrite it; changed saved
recipient blocks before any write/email; submitter-as-recipient works despite
Deny; new PF uses published enabled policy with Adapter_Enabled false; existing
history, permissions, Offer readiness and duplicate delivery stay protected.

Until the new native Start is promoted, sending an existing saved route is blocked
by a read-only capability check; its displayed route remains intact. This stops an
older backend from replacing those recipients. No send is used as a deployment test.

All six functions were compiled/saved in Development during this correction;
resolver, Start, administration and adapter bodies were independently reloaded
and confirmed. No Creator promotion was performed.
