# Contract proposal access and manual Acquisition

Contract Management 1.61.34 restores action editing for users granted
`User_Access.Propose_Contract_Changes` without `Edit_Contracts` and makes
Acquisition available in New Contract. Acquisition entry has no Project or
Subdivision controls; type switches clear that scope, and the creation payload
and setup cannot reintroduce stale location selections.

## Permission interpretation

Proposal access permits new proposed Contract records, proposed action additions,
action notes/title/assignee/date/status edits, completion/reopening and reordering
of ordinary actions on open contracts. Parent records enter `Proposed` for Legal
review. Approval Queue acceptance still requires `Approve_Contracts`; parent
editing, approval routing/email sending and attachment administration retain
their existing separate checks. Contract deletion/archive requires
`Delete_Archive_Contracts`; global template editing requires
`Manage_Action_Templates`. Completed parents remain locked.

The production User Access report was inspected read-only and confirms the
reported proposal-only configuration is saved. No access record/profile grant
was changed, and no production Contract/action record or email was created to
test this change.

## Diagnosis and boundaries

The inline controller introduced by `a6ea1a6` on October 3, 2026 at 10:44 p.m.
Central checked only `S.acc.edit`. Both its initial check and queued save now
honor proposal access, with ordinary-parent and completed-parent exclusions.
The Review Save handler already checked `canPropose`; the exact flag/readiness
state in the user's screenshot was not captured and cannot be established from
an administrator's session.

Contracts switched to `Get_User_Access_Lean` in `3ce09d6` on October 4, 2026 at
3:14 p.m. Central. The lean endpoint's documented signed-in Production flag
parity remained pending. This release returns Contracts to the established
`Get_User_Access` / Development `Get_User_Access_DEV` bindings. Production still
uses argument-free authenticated GET; Development retains its existing POST
identity/alias. No flags are inferred from roster names, ownership or other
module permissions. Other modules' access endpoints are unchanged. The full
getter carries its existing Pro Forma owner inventory, a startup payload tradeoff
until the lean Production path is verified for affected users.

The old manual-Acquisition exclusion dates to `92ba296` on September 10, 2026.
Manual creation now follows the same Proposed review flow as other types; LOI
token review remains unchanged. Grid action additions by proposal-only users
now also use Proposed, and all create entry/save paths repeat proposal access.

## Scope and verification

Changed files: Contract widget HTML/config/README, widget and dependency manifests,
Production mapping, immutable release 1.61.34, Contracts module notes, this audit,
SDK2 fixture/aggregate and the focused proposal regression.

Existing forms/fields: `User_Access.Propose_Contract_Changes`, `Edit_Contracts`,
`Approve_Contracts`, `Manage_Action_Templates`, `Delete_Archive_Contracts`;
`Contract.Contract_Type`, `Status`, `Project`, `Subdivision1`, `Owner`;
`Contract_Actions.Contract1`, `Contract_Action`, `Dev_Mgr`, `Dev_Notes`, dates,
`Status`, `Complete`, `Current_Action`, `Sort_Order`. No schema, Deluge body,
workflow, Custom API registration or native profile changes. Frontend functions
include `contractFieldAllowed/Save`, `ncTypeChoices/Change/Payload/Submit`,
`drillAdd`, `gAdd`, edit-grid presentation and the configured access getter.
No Creator publication is required.

Regression covers actual widget startup with proposal-only native API flags,
Review/inline/grid saves, completion/reopening, proposed additions, denied/missing
actor and stale-draft zero-write guards, completed/template exclusions, retained
privilege separation and manual Acquisition UI/type-switch/payload/setup/Legal
routing. The full Contract SDK2 suite, `npm run validate`, `npm run build:pages`
and source/release/Production-output identity checks are release gates. Native
Production appearance is inspected under the available administrator session;
this does not substitute for an affected user's authenticated write session.

## Promotion and rollback

Promote only Contract Management Production to 1.61.34 through
`deploy/environments.json`, preserving permanent URLs and all other environment
mappings. Monitor CI and Pages for the exact commit. Rollback points Production
to 1.61.32 and redeploys Pages; it requires no data migration or native rollback.
