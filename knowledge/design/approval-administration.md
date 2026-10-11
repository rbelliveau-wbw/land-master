# Approval administration

Use this pattern for role assignments, scoped policies and route preview. Keep
role membership separate from ordered policy steps. The Settings Manager
implementation is [approval-admin.js](../../widgets/settings-manager/src/app/approval-admin.js).

Use the navy modal, compact tabs, custom searchable single-value pickers and
centered SVG close button. Trap focus and make the underlying widget inert.
Role-assignment dates use an explicitly labeled YYYY-MM-DD text control. Thresholds retain
exact decimal strings; show Above and At or above as separate choices.

Policies have no effective dates, versions or multiple-role setting. Edit a
Published policy in place; Save applies to future submissions. Existing submitted
routes retain their captured people and order. Show the evaluated people, ordered
roles and inclusion/exclusion reasons in Preview. Compare server routing with
the same configuration snapshot before displaying a verified route.

Purchase Orders use two groups: **Every purchase order** fixes CFO as the first
required role; **When the PO creates budget modifications** adds the selected
roles sequentially only when the server's modification plan is nonempty. A
budget overrun covered by existing pending modifications does not add roles.
There are no PO amount thresholds or condition/order pickers. Add/remove extra
approvers in display order. Collapse company/territory/department scope and
temporary Test CFO settings. Budget ID belongs only to the temporary test scope,
not ordinary policy scope. VP resolves directly from Territory.VP; other roles
use role assignments. Reject ambiguous or unroutable recipients and ordinary
submitter approval. The user guarantees distinct people in each policy, so no
duplicate-person mode, merging or repeated-role machinery is provided. Preview
uses the same configuration as the server and one PO creates modifications
checkbox. No new forms or Custom APIs are needed.
Use All companies for the shared PO policy and CFO/COO assignments so the same
chain does not need to be copied onto every company. Company-specific PO
templates and assignments override that default. This global fallback is
limited to Purchase Orders; other workflow templates keep their company scope.

Audit details show before/after values and the actor's User Access identity.
Follow [transfer progress](transfer-progress.md) for configuration writes.
Keep unknown writes locked in the dialog's recovery state and offer read-only
Check. Do not replay a configuration mutation or activate an adapter to recover
from a lost response. Execution migrations and approved recipients have their
own native gates described in the module handoff.

The settings List response advertises `policyModel: scope-v1`. Until the updated
Creator functions are promoted, policy Save, Publish and Preview stop with a
short promotion message; read-only inspection and existing receipt recovery
remain available. Historical audit intent and dormant legacy columns remain
available as evidence; they no longer control policy routing.
