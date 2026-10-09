# Approval administration

Use this pattern for role assignments, policy versions and route preview. Keep
role membership separate from ordered policy steps. The Settings Manager
implementation is [approval-admin.js](../../widgets/settings-manager/src/app/approval-admin.js).

Use the navy modal, compact tabs, custom searchable single-value pickers and
centered SVG close button. Trap focus and make the underlying widget inert.
Dates use an explicitly labeled YYYY-MM-DD text control. Thresholds retain
exact decimal strings; show Above and At or above as separate choices.

Draft policies do not invent role chains, self-approval rules or thresholds.
Published policies open as a new version. Show the evaluated people, ordered
roles and inclusion/exclusion reasons in Preview. Compare server routing with
the same configuration snapshot before displaying a verified route.

Purchase Orders always require CFO approval. The Budget line exceeded condition
adds COO and the territory VP when any item's combined PO lines exceed its
available budget after existing POs. VP resolves directly from Territory.VP;
the company role-assignment table continues to supply CFO and COO. Reject an
empty or ambiguous territory VP, an unroutable person, submitter approval or
one person filling multiple required steps. Preview uses the same territory
lookup identities as the server. No new forms or Custom APIs are needed.

Audit details show before/after values and the actor's User Access identity.
Follow [transfer progress](transfer-progress.md) for configuration writes.
Keep unknown writes locked in the dialog's recovery state and offer read-only
Check. Do not replay a configuration mutation or activate an adapter to recover
from a lost response. Execution migrations and approved recipients have their
own native gates described in the module handoff.
