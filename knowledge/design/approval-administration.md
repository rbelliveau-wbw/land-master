# Approval administration

Use this pattern for approvers, approval rules and route testing. Keep
role membership separate from ordered approval steps. The Settings Manager
implementation is [approval-admin.js](../../widgets/settings-manager/src/app/approval-admin.js).

Start on **Approval rules**. Use **Approvers**, **Roles**, **Test route** and
**Change history** as the other navigation labels. A rule card shows its workflow,
scope, publication state and ordered roles. An approver card shows the role,
person's full name, approval email, scope and enabled state. Avoid internal
record terminology in headings and button labels.

Use the navy modal, compact tabs, custom searchable single-value pickers and
centered SVG close button. Trap focus and make the underlying widget inert.
Mount the open picker beside the scrollable card inside the modal overlay, then
position it within the viewport. Flip above its trigger when space below is
limited; scroll its own results. Keep the picker within the focus trap. First
Escape closes it and restores its trigger; subsequent Escape closes the modal.
Dismiss or reposition it on editor scroll, resize and navigation so it cannot
be clipped by the card or footer.

Approvers and rules persist until changed or disabled. There are no Company
selectors, effective-date controls or date-based route testing. The approval-only
Company, Effective_From and Effective_To fields are deleted from both
Approval_Role_Assignment and Approval_Policy as part of the Creator handoff.
Keep business Company fields and transaction dates elsewhere in Land Master.
Thresholds retain exact decimal strings; show Above and At or above separately.

Policies have no effective dates, versions or multiple-role setting. Edit a
Published rule in place; Save applies to future submissions. Existing submitted
routes retain their captured people and order. Show evaluated people, approval
emails, numbered roles and inclusion/exclusion reasons in Test route. Compare
server routing with the same configuration snapshot before displaying a verified
route.

Purchase Orders use two scenarios: **Without budget modifications** requires CFO;
**With attached budget modifications** shows the complete ordered route,
including the mandatory CFO. Label the chain **One approver at a time**.
Move up/down places modification roles before or
after CFO. The requested route is VP → CFO → COO; without a new modification,
only CFO remains. Other roles apply only when the server's modification plan is nonempty. A
budget overrun covered by existing pending modifications does not add roles.
There are no PO amount thresholds or condition/order pickers. Add/remove extra
approvers in display order. Collapse optional territory/department scope.
Historical Test CFO scope remains only in captured evidence and read-only
receipt recovery, not the normal editor. VP resolves directly from Territory.VP;
other roles use approver assignments. Identify that VP source in the UI. Reject
ambiguous or unroutable recipients and ordinary submitter approval. The user
guarantees distinct people in each policy, so no
duplicate-person mode, merging or repeated-role machinery is provided. Preview
uses the same configuration as the server and one PO creates modifications
checkbox. No new forms or Custom APIs are needed.

Scope precedence for every workflow is Territory + Department, then Territory,
then Department, then All territories and departments. Match scope before
checking Enabled; a disabled specific rule or approver blocks routing rather
than falling back to a broader recipient. Reject multiple matches at the same
precedence. Before removing Company and assignment dates, review current
records for collisions under this permanent scope; disabling one duplicate
assignment alone does not remove that ambiguity. Never pick a migration winner
from dates, Company, enabled state or record order.

Audit details show before/after values and the actor's User Access identity.
Follow [transfer progress](transfer-progress.md) for configuration writes.
Keep unknown writes locked in the dialog's recovery state and offer read-only
Check. Do not replay a configuration mutation or activate an adapter to recover
from a lost response. Execution migrations and approved recipients have their
own native gates described in the module handoff.

The settings List response advertises `policyModel: territory-perpetual-v2`. Until the updated
Creator functions are promoted, configuration Save, Publish and Test route stop with a
short promotion message; read-only inspection and existing receipt recovery
remain available. Historical audit intent and dormant legacy columns remain
available as evidence; the six removed scope/date fields no longer exist or
control routing. Removing configuration fields does not rewrite saved audit JSON,
submission context JSON or captured approval routes. See the
[Creator removal and promotion handoff](../releases/approval-territory-perpetual-v2-2026-10-13.md).
