# Pro Forma approvals use Settings — October 14, 2026

**Correction:** preserve every saved route, including Not Sent rows. Only PFs
without approval rows use Settings; self-approval is always allowed. See the
[1.80.106 correction and native handoff](proforma-approval-preservation-2026-10-14.md).

Frontend releases: Proforma Manager **1.80.103** and Settings Manager **1.5.6**.

New and untouched Pro Formas show the route from Settings → Approvals. The
per-record approver-name/email editor, Add Approver, removal and reordering
controls are retired. Submission requires one applicable published, enabled
Pro Forma policy with its adapter enabled. Missing or ambiguous configuration
stops submission; old default execution rows are never a routing fallback.

User direction: **VP and Dev Mgr always come from the Territory assigned on the
document**, across Pro Forma, Budget, Budget Modification, Contract and Purchase
Order shared policies. VP requires exactly one unique selected User Access
person. Every unique Territory.Dev_Mgr selection becomes an individual approval
in lookup order; all must approve before the next configured role begins.
Role assignments cannot override either Territory source. Other roles retain
Territory/Department assignment precedence. Login identity, routing-enabled
state, approval email and self-approval rules are checked for every person.

The Pro Forma route stays a sequential chain of up to eight resolved recipients.
Submitted routes retain their saved recipients, order, decisions, notes and
timestamps. Historical snapshot/audit JSON and existing records are retained.
Cancel & Reset retains its explicit existing behavior; a subsequent submission
uses current Settings. LOI, approval-email content, PDF and Writer behavior are
unchanged.

## Frontend/native contract

The existing `Start_Proforma_Approval_Chain` Custom API argument accepts JSON.
The widget obtains a read-only route using
`{id: "<exact PF ID>", mode: "Check", settingsPreview: true}`. The new native
function interprets this as Preview and returns:

- `success: true`, `contract: "proforma-approval-settings-v1"`,
  `policyModel: "territory-perpetual-v2"`, `mode: "Preview"`;
- exact string `proformaId` and `policyId`;
- the resolver's ordered `route`, including role, exact User Access identity,
  full name and email.

The widget deliberately uses the existing Check mode. Old native functions
treated unknown modes as Start; sending a new Preview mode directly could
initiate approvals. An old Check response lacks the new contract and blocks
submission before confirmation or writes. Cached previews are scoped to the
record, Territory, actor and Creator environment; Refresh Route and Send both
request current Settings. Untouched legacy default rows do not appear as the
prospective approval route or in the approval queue.

On confirmation the widget sends `mode: "StartSettings"`, `expectedPolicyId`
and canonical `expectedRoute` entries with `order`, `key`, `roleId`, `role`,
`userAccessId` and `email`. Native routing checks that intended route before
execution-row writes. A changed policy or recipient asks the user to refresh.
These are prewrite recipient-intent guards, not automatic save comparisons.

Preview permits approval administrators, owned-record approval/edit grants,
or the dedicated Send grant in its owner/Edit All scope. Native sends retain
the dedicated Send permission and document ownership/Edit All check. Retired
configuration and recipient endpoints keep their signatures but return a
Settings message without touching existing execution rows.

## Creator deployment

GitHub Pages promotion does not publish native functions. Compile and save:

1. `resolveApprovalRoute` — all-workflow Territory VP and Dev Mgr resolution.
2. `applySharedApprovalPolicy` — mandatory Pro Forma Settings policy and intended
   route guard; Budget adapter fallbacks retain their existing migration rules.
3. `Start_Proforma_Approval_Chain` — read-only Preview, StartSettings and scoped
   viewing/send permissions.
4. `Manage_Proforma_Approval_Config` and `Update_Proforma_Approval_Recipient` —
   retired compatibility endpoints.

Publish the latest `approvalConfigurationSnapshot` alongside the resolver so
Settings displays the current Territory VP/Dev Mgr lookups. The unchanged
`snapshotApprovalRoute` remains a dependency. No new forms, fields, Custom APIs
or API signatures are required.

After the updated Start function is installed, disable only
`Add_Pro_Forma` → On Success → **Create Approval Rows - Pro Forma**, link name
`Create_Approval_Rows_Pro_`. Its immutable October 11 Development export shows
the old VP_EMAIL/Legal/CFO/COO/CEO constants. Keep a backup of that workflow;
do not delete existing approval records or rewrite historical exports. New
execution rows are created from the Settings route when approval is submitted.

Check/Repair is bounded and retains duplicate-email guards. Check never writes.
Repair can send a missing first-approver email only for an already active
Pending Approval parent and its single Pending first row, with later rows
untouched. It cannot activate a Draft legacy chain after a rejected Settings
preflight. An acknowledged rejection is reconciled once and ends with its
specific failure instead of triggering automatic repair.

## Verification and rollback

Local actual-source regressions:

- `test-proforma-settings-routing.mjs`: old-native capability rejection without
  sends, no legacy controls/default fallback, exact confirmed recipients,
  environment/actor cache isolation, retained history and rejected-start safety.
- `test-proforma-settings-routing-native.mjs`, imported by
  `test-approval-execution.mjs`: actual Deluge Preview/StartSettings, ownership
  denial, missing/disabled/ambiguous policy, all-workflow Waco Territory VP and
  multiple Dev Mgrs, no assignment override, every selected manager's execution
  row, immutable snapshots, Check/Repair, duplicate email and retired endpoints.
- `test-approval-policy.mjs`: matching client route resolution for all workflows,
  missing/unroutable Territory recipients, exact IDs and retained captured routes.

Run repository validation, Pages build, immutable releases, CI and deployment
monitoring. Live Creator compilation and a read-only targeted Production check
remain separate evidence. Use an existing PF with the safe Check/preview
payload; confirm exact ID/model/policy and Territory recipients, without sending
an approval, calling Repair, or modifying configuration just to test it.

Frontend rollback mappings before this change are Proforma Manager `1.80.102`
and Settings Manager `1.5.5`. Coordinate rollback of the native functions and
the retired seeding workflow. Preserve all existing execution/snapshot/audit
records. A frontend mapping rollback alone does not restore native routing.
