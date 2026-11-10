# Purchase Order Net Budget Approval Routing

Every new PO requires **VP → CFO**. Add **COO** after CFO when signed net
budget changes across all cost codes and all five elements total **$10,000 or
more**. $9,999.00 and $9,999.99 do not qualify. Zero, decreases, and offsetting
transfers follow VP → CFO. Five $9,999 increases total $49,995 and require COO.
The header amount, largest individual change, and gross movement are not the
threshold basis.

## Implementation

Reuse the existing published Purchase Order policy, Territory VP, CFO/COO
assignments, route snapshots, sequential execution, email, and finalization.
The policy contains exactly three enabled steps: VP Always, CFO Always, COO
At or above `10000.00`. Only PO thresholds use `context.netBudgetChange`;
other workflows retain their existing submitted-amount semantics.

`managePurchaseOrder` sums the server-validated plan amounts in signed cents,
including decreases and zero-net reallocations. Captured context contains the
exact signed currency string and `poApprovalRule: net-change-v1`. Submission
never trusts a client-supplied net. Read-only PreviewApprovals accepts the
displayed net; the frontend includes it in the cache key and rejects a preview
whose roles do not match VP → CFO → conditional COO.

Settings normalizes legacy rules only in the editable draft and saves through
the existing audited contract. Merely opening/testing does not persist edits.
Missing roles or invalid policies block saving/submission. PO order cannot be
changed, disabled, or extended through the editor. Existing captured routes
and decisions remain unchanged. Pending POs using the new rule cannot cross
the COO threshold through an edit preserving approvals; reject and resubmit.
Historical scoped CFO test receipts remain recoverable; new policies and new
submissions cannot use the obsolete exception.

## Components And Installation

- Functions: `managePurchaseOrder`, `resolveApprovalRoute`,
  `manageApprovalPolicies`.
- Existing APIs: `Manage_Purchase_Order`, `Manage_Approval_Policies`, and their
  existing Development variants. No new API is required.
- Existing fields: Approval_Policy.Steps_JSON;
  Approval_Route_Snapshot.Context_JSON/Route_JSON; Payment_Request PO fields;
  Budget_Modification amounts/types/components; Budget_Approvals execution.
  No new native form, field, report, or recipient list is required.
- Candidates: Settings Manager 1.6.11 and Budget Manager 122.29.130.

Creator deployment is required. Compile/save the three functions in
Development, and save the PO policy using the updated Settings editor. Verify
the real native route before publishing. Publish the matching policy,
functions, and widgets together; old policy shapes fail closed. PMP promotes the matching widget releases in the repository. The owner subsequently authorized updating the functions, promoting them in
Creator, and verifying the Production approval routes. No live approval
emails are sent as part of this change.

## Verification And Rollback

Regression checks cover $9,999, $9,999.99, exactly $10,000, $10,000.01, negative
and zero nets, malformed input, server planner aggregation, unrelated workflow
thresholds, Territory recipients, configuration recovery, retained historical
routes and pending edits. Local native-source execution does not establish
Creator compilation or real email delivery; live Development checks remain a
deployment requirement.

Completed checks: the full prevalidate, validate and postvalidate suites,
`npm run build:pages` (35 environment paths), and diff whitespace checks.
Desktop verification in the agent-owned browser confirmed the fixed editor
sequence and $9,999/$10,000 Settings previews without live Creator writes.
PMP promotes Settings 1.6.11 and Budget 122.29.130 in Development and
Production. Stage and unrelated widget mappings remain unchanged. Creator
functions have been saved and compiled in Development. Creator promotion and
the matching Production policy update are the next release steps.

Rollback restores Settings Manager 1.6.9 and Budget Manager 122.29.128 together
with the prior three function versions and backed-up PO policy JSON. Preserve
captured routes, decisions, audit receipts, and unrelated changes.
