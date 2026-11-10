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
An existing legacy PO rule exposes Save Rule so its normalized route can be
explicitly applied through the same audited SavePolicy contract without
temporarily disabling or rescoping the rule.
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
- Production releases: Settings Manager 1.6.12 and Budget Manager 122.29.130.
- Changed source files: the three functions above; Settings
  `approval-policy-domain.js`, `approval-admin.js`, `approval-admin.css`,
  `widget.html` and version/hash manifests; Budget `po-ui.js`, `widget.html`
  and version/hash manifests; matching immutable releases and environment
  mappings; focused approval/PO regression scripts and module/design docs.

Creator deployment was required and is complete. The owner explicitly
authorized updating the functions, promoting them in Creator, and verifying
Production. All three functions were saved, compiled and reopened in
Development to confirm the persisted source matched the repository (allowing
Creator's formatter). Native Development Preview returned VP/CFO at $9,999
and VP/CFO/COO at $10,000. The matching Development policy was saved through
the audited native function.

Creator's publication package contained exactly those three functions.
Version **9.177**, titled **PO Net Budget Approval Routing**, was published to
Stage and then Production. Both environments visibly reported 9.177.
The existing Production policy **4410926000005148030** was then updated using
Settings Save Rule and returned **Changes Saved · verified audit receipt**.
Its ID, Published status, enabled state and global territory/department scope
were retained. Change History preserves its original conditional VP/COO steps
and the new VP Always / CFO Always / COO At or above 10000.00 steps.

Main contains implementation commit `f8dbed48` and Settings migration control
commit `5cb3d883`. CI and GitHub Pages passed for both. Development and
Production mappings use Settings 1.6.12 and Budget 122.29.130; Stage widget
mappings and unrelated widget mappings were preserved.

## Verification And Rollback

Regression checks cover $9,999, $9,999.99, exactly $10,000, $10,000.01, negative
and zero nets, malformed input, server planner aggregation, unrelated workflow
thresholds, Territory recipients, configuration recovery, retained historical
routes and pending edits, plus an explicit legacy-policy Save Rule that updates
the same Published ID without disabling it or writing merely on open.

Completed checks: the full prevalidate, validate and postvalidate suites,
`npm run build:pages` (35 environment paths), and diff whitespace checks.
Desktop verification used only the agent-owned browser and the real
Production Custom APIs. Settings Test Route cross-checked the native response
against the local resolver, using a $500,000 header amount and Fort Hood:

| Signed Net Budget Change | Verified Roles In Order |
| --- | --- |
| $0.00 | VP → CFO |
| −$20,000.00 | VP → CFO |
| $9,999.00 | VP → CFO |
| $9,999.99 | VP → CFO |
| $10,000.00 | VP → CFO → COO |
| $10,000.01 | VP → CFO → COO |
| $49,995.00 | VP → CFO → COO |

The actual Budget Manager PO editor also called Production
`Manage_Purchase_Order` PreviewApprovals against Windmill Preserve Phase 02
(Waco). Native recipients were Adrienne Donatucci (VP), Julie King (CFO),
then Doug Reinke (COO). A $9,999.99 net showed two approvers; exactly $10,000
showed three. A combined draft with **$9,999.99 in WP02-3619 element 4** and
**$0.01 in WP02-4104 element 5** showed $10,000 net and VP/CFO/COO, proving
that the largest individual change is not the threshold basis.

The unsaved PO was closed; no test PO, budget modification, financial approval
or approval email was submitted. Existing pending PO decisions remained
visible and unchanged. These live checks establish deployed route resolution
and real recipient selection; email delivery and actual finalization were
covered by regression tests rather than executing a live financial workflow.

Screenshots, exact route results, original function backups and the Production
policy before/after audit JSON are retained in the local task artifacts under
`C:/Users/R/.codex/visualizations/2026/11/10/01a1c717-b384-74f3-8641-b4294f308344/`.

Rollback restores Settings Manager 1.6.9 and Budget Manager 122.29.128 together
with the prior three function versions from repository commit
`2a3a67bffc3e02bac7673829d8a9b6330294b0b4` and the backed-up Production PO policy
JSON (also retained as Change History Before). Preserve captured routes,
decisions, audit receipts, stable widget URLs and unrelated changes.
