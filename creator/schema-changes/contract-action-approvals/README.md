# Contract Action Approvals in Creator

Publish the Creator components together. The hosted widget release is separate.

1. Add the optional unchecked Decision Box `Requires_Approval` to Contract
   Actions and the optional single `Contract_Action` lookup to Contract
   Approvals. The lookup points to the Contract Actions record ID.
2. Keep the lookup hidden in the existing Hide Fields - Contract Approval
   workflow and out of the public report projections. Check both fields with
   the authenticated full-field reads of `All_Contract_Actions` and
   `All_Contract_Approvals` under the Legal editing profiles.
3. Install `hasContractActionApproval` and the three form submission
   validators in this directory. Deploy the updated existing
   `Send_Contract_Approvals`, `Send_Contract_Approval_Email`,
   `applyContractDevelopmentDefaults`, `Create_LOI_Contract` and
   `Complete_Lot_Contract` functions. Keep the existing Custom API
   registrations and environments.
4. Update the existing Load Contract Action Template, Contract to Rejected
   Status, Set Contract Approved and both Send for Approvals workflows from
   `creator/workflows/`. Verify Insert and Update triggers, report scope, and
   both email decision paths. Protect removal of sent action approvals through
   native permissions and verify related-record permissions before publishing.
5. Test in Development with dedicated test recipients. A required step blocks
   completion with no requests, unsent, pending or rejected requests. It opens
   once every latest approver and role has a sent and approved request for that
   exact step. Verify a rejected request can be replaced, a decision for a
   different action has no effect, and contract-wide approvals remain separate.
   Confirm the Lot transfer does not start with an incomplete required action.
6. The Creator owner promotes to Stage and Production. In Production verify a
   read-only scoped Check and the widget badge without sending live approval
   emails during release verification.

Existing rows have an unchecked requirement. Additive field values and
historical decisions should be retained during rollback. Restore the previous
workflows and functions together if Creator behavior must be rolled back.
