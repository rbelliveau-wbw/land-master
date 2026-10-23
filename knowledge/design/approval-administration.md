# Approval administration

Repository-wide rule for applicable surfaces; see [scope and exceptions](README.md).

Settings Manager 1.5.14 adopts [Interaction motion](interaction-motion.md) for
its navigation, actual inline save feedback, curve rows and dialogs. Existing
approval-step FLIP and pending/unknown-write controls remain authoritative.
[Rollout and rollback](../../docs/interaction-motion-rollout-2026-10-16.md).

Use this pattern for approvers, approval rules and route testing. Keep
role membership separate from ordered approval steps. The Settings Manager
implementation is [approval-admin.js](../../widgets/settings-manager/src/app/approval-admin.js).

## Embedded Settings workspace — 1.6.1

Approval Rules, Approvers, Roles, Test Route and Change History are separate
Settings screens reached from the persistent left menu. Keep the existing
editor/controller mounted in a stable host outside the ordinary Settings field
renderer. Hide its duplicate modal header, internal tabs and header Close while
embedded. Normal screens are named regions: they do not inert the Settings
menu or trap keyboard focus. Place Add Rule, Add Approver and Add Role above
their respective lists. Omit routine Refresh buttons per the user's October 23
cleanup. Do not repeat list actions in a footer below the records. Editor and
progress footers remain, including specific read-only recovery actions.

The controller exposes `mount(host, tab, onState)`, `navigate(tab)`, `canLeave()`
and `state()`. Its internal tab keys remain `Policies`, `Assignments`, `Roles`,
`Preview` and `Audit`. `mount` returns false when a requested change is unsafe.
The parent must call `canLeave()` before leaving an approval screen or reloading;
it requests the existing inline flush when dirty. New incomplete editors,
pending writes and unknown replies retain their exact draft/operation and block
navigation. The callback exposes the actual tab, busy/pending/unknown/dirty
state and `canLeave`; the parent reflects those locks without replacing the
embedded host. Check Status remains read-only and retains its operation token.

Explicit configuration writes retain a true compact progress modal. Portal the
same mounted panel to the widget body, keep its existing focus trap, inert
background and duplicate/dismissal guards, and hold the terminal result. Done
restores the panel to its stable host and returns to the relevant list or saved
Draft. An unknown reply stays in recovery; parent navigation cannot hide or
discard it. Existing `open()` callers retain the original modal experience.

This frontend release has no backend/API/routing changes. The rollback frontend
is Settings Manager **1.5.20**.
Focused desktop coverage includes the actual embedded controller, inline saves,
lost-response Check, new drafts, modal portal, inert/focus restoration and
ancestor/result-list scrolling. Full repository validation and Pages build are
separate release gates. See the
[module notes](../../widgets/settings-manager/README.md).

Start on **Approval Rules**. Use **Approvers**, **Roles**, **Test Route** and
**Change History** as the other navigation labels. A rule card shows its workflow,
scope, publication state and ordered roles. An approver card shows the role,
person's full name, approval email, scope and enabled state. Avoid internal
record terminology in headings and button labels.

Use custom searchable single-value pickers and centered SVG close buttons.
Modal compatibility and configuration progress use the navy shell, focus trap
and inert background; embedded ordinary screens use the workspace frame.
Mount an open picker beside the scrollable card in the same approval surface,
then position it within the viewport. Flip above its trigger when space below
is limited; scroll its own results without dismissing it. Keep modal pickers
within the focus trap. First Escape closes the picker and restores its trigger;
subsequent Escape follows the editor's existing safe-close behavior. Dismiss or
reposition on editor/ancestor scroll, resize and navigation. In embedded mode
the ancestor includes Settings' `#view` scroller, so the picker cannot drift
away from its trigger or be clipped by a card/footer.

Approvers and rules persist until changed or disabled. There are no Company
selectors, effective-date controls or date-based route testing. The approval-only
Company, Effective_From and Effective_To fields are deleted from both
Approval_Role_Assignment and Approval_Policy as part of the Creator handoff.
Keep business Company fields and transaction dates elsewhere in Land Master.
Thresholds retain exact decimal strings; show Above and At or above separately.

Settings Manager 1.5.16 keeps Role and Condition in aligned columns across
ordinary rule rows. Reserve a separate column for **Threshold ($)** and a fixed
action area for Enabled and Delete; the threshold must never overlap either
action. Keep field labels, controls and row tools aligned at their actual
desktop size. Threshold inputs use text with a decimal keyboard hint so editing
and inline saves preserve the exact decimal string. Workflow and Active align
along their controls' lower edge. Keep the PO-specific row layout unchanged.

Policies have no effective dates, versions or multiple-role setting. Edit a
Published rule in place; Save applies to future submissions. Existing submitted
routes retain their captured people and order. Show evaluated people, approval
emails, numbered roles and inclusion/exclusion reasons in Test route. Compare
server routing with the same configuration snapshot before displaying a verified
route.

Purchase Orders use two scenarios: **Without budget modifications** requires CFO;
**With attached budget modifications** shows the complete ordered route,
including the mandatory CFO. Label the chain **One approver at a time**.
Drag grips place modification roles before or
after CFO. The requested route is VP → CFO → COO; without a new modification,
only CFO remains. Other roles apply only when the server's modification plan is nonempty. A
budget overrun covered by existing pending modifications does not add roles.
There are no PO amount thresholds or condition/order pickers. Add/remove extra
approvers in display order. Collapse optional territory/department scope.
Historical Test CFO scope remains only in captured evidence and read-only
receipt recovery, not the normal editor. In every shared-policy workflow, VP
resolves directly from the document's Territory.VP, and Dev Mgr resolves every
selected Territory.Dev_Mgr person. Other roles use approver assignments.
Identify those Territory sources in the UI. Reject
ambiguous or unroutable recipients. Self-approval follows the rule below. The user
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
Keep unknown writes locked in the mounted editor or modal recovery state and
offer read-only Check. Do not replay a configuration mutation or activate an adapter to recover
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

## Compact rule editing (Settings Manager 1.5.4)

Use Title Case for tabs and buttons: Approval Rules, Add Rule, Test Route and
Change History. Omit the workflow-order explanatory heading on the rule list.
Each approver occupies one compact horizontal row: drag grip, numbered step,
role and applicable condition fields, Enabled, and a red square trash icon.
Use Legal-style insertion lines, dragged opacity and stable-key FLIP animation;
Alt+Up/Down offers keyboard reordering. The required PO CFO can move but cannot
be disabled or removed. Removing a row animates the remaining rows.

New rules are active by default. Hide the activation checkbox during creation;
Save Rule first saves the native Draft and then publishes its verified record
using a distinct operation token. Existing rules show Active and save inline.
Never publish after an ambiguous save or as a side effect of read-only Check.
A recovered Draft offers an explicit Activate Rule action. Lost publish replies
retain the exact activation token for read-only recovery.

Configuration writes use the compact Legal progress/result appearance: navy
header, slim green bar, numbered stages, succinct outcome and Done. Hide tabs
in that state. Keep failure and unknown outcomes truthful and retain the native
audit receipt and duplicate-write guards. Done dismisses verified success.

## Inline configuration editing (Settings Manager 1.5.5)

Approvers, roles and existing rules save inline after a 650 ms pause. This is
the explicit exception to the configuration progress modal: keep the editor
mounted, show Saving then a centered green Saved check and grouped shared
success feedback. Pickers, switches, fields, removals and drag order use the
same audited write contract. Skip unchanged input; keep invalid/incomplete
drafts without writes. Briefly lock controls during a write to prevent overlap.
Known not-started failures allow explicit retry; unknown replies keep the exact
operation token and allow read-only Check Status, without replay.

New Approval Rules retain an explicit Save Rule button and native Draft then
Publish sequence. Done returns to the rules list within the mounted approval
surface. Existing rules expose Active but have no Save Changes button.

Dev Mgr resolves from the Territory.Dev_Mgr multi-select User_Access lookup
for shared approval-policy workflows. Expand unique selected users, preserving
lookup order, into individual sequential approval rows. All selected managers
must approve before the following role starts. This retains the one-approver-
at-a-time chain; it does not send concurrent approvals. Resolve every person
and validate their login, routing flag and approval email before
creating a route. Never fall back to a global Dev Mgr assignment. The captured
route retains people after Territory edits. VP resolves exactly one unique
Territory.VP person in every shared-policy workflow, including Pro Forma and
Budget. Never fall back to a separate VP assignment.
Native updates: approvalConfigurationSnapshot and resolveApprovalRoute.

New standalone Budget Modifications use the published Budget Modification
Settings rule, including its ordered roles and exact threshold conditions.
Missing, disabled, ambiguous or unroutable configuration blocks submission;
neither the hidden Adapter_Enabled flag nor the legacy global COO threshold may
select a fallback chain. Existing sent/decided routes keep their captured people
and order. See the [Creator handoff](../../docs/budget-modification-settings-routing-2026-10-19.md).

Pro Forma's Approvals tab previews Settings rules without exposing a separate
route editor. New submissions require a usable Settings policy; keep existing
submitted recipients and decisions. Its read-only capability uses the existing
Check mode with settingsPreview so an older API cannot mistake preview for a
send. See [native/frontend routing and retirement](../../docs/proforma-settings-approval-routing-2026-10-14.md).

## Self-approval — October 14, 2026

Self-approval is always allowed for every shared workflow. Do not show a Deny or
Unspecified selector. Retain the legacy field for storage compatibility, return
Allow in configuration and route DTOs, and ignore old Deny/blank values. Every
configured recipient still approves their own step.
