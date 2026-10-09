# Edit Owned Contracts and Actions

Contract Management 1.61.35 renames the existing User Access checkbox to
**Edit Owned Contracts and Actions**. Its link name stays
`User_Access.Propose_Contract_Changes`, and the access API keeps `ctPropose`;
existing grants and integrations require no migration.

The old grant allowed action edits on any open ordinary contract but required
`Edit_Contracts` for parent and Owner changes. It now allows edits to an open
Contract only when the current user's exact User Access ID appears in
`Contract.Owner`, including that Owner list and its actions, pricing,
attachments and approval route. Actions inherit their parent's ownership;
`Dev_Mgr` is an assignee, not an ownership grant. Nonowners see “You need to be
added as an owner to edit this contract or its actions.” Removing yourself from
Owner removes your subsequent edit access. General editors retain access to all
open contracts. New contracts/actions retain Proposed Legal routing; accepting
proposals, deleting/archiving parents and managing global action templates
retain their separate permissions.

Every completed contract is read-only for everyone. The temporary owner Lots &
Pricing backfill exception and `lockBypass` escape are removed. Native CRUD,
attachment upload/create/delete, approval send/repair, comments and Lot transfer
writes check the parent before dispatch. Current parent status/ownership and
child parentage are read before a native edit, so a stale screen cannot authorize
an edit after completion or ownership removal. This is prewrite authorization;
the prohibited automatic post-save editable-field equality check stays removed.
Viewing files, comments and read-only recovery remain available.

An open child or amendment does not inherit its master's completed lock. Status
and ownership are checked on the contract being changed; its actions use that
contract's status and owners. Existing Lot eligibility and claim guards remain.

## Creator and release

Existing forms/fields: `User_Access.Propose_Contract_Changes`, `Edit_Contracts`,
`Contract.Owner`, `Contract.Status`, child `Contract1`, and the existing action,
approval, version, pricing and comment fields. No new field/API is required.
The native `User_Access_Report` column/quickview label follows the renamed field.

Creator deployment is required for the checkbox's display label/tooltip and:

- `Send_Contract_Approvals`: accepts general edit or owned edit plus Owner;
  retains the completed-contract refusal and existing Send/Check/Repair flow.
- `Complete_Lot_Contract`: rejects Complete and LinkOnly writes on a completed
  parent; Check remains read-only and available.
- `createContractAttachmentRecord` and `deleteContractAttachment`: reject
  completed-parent mutations through their existing Custom APIs.

These guards cover the Contract Management module and its changed Custom APIs.
They do not replace Creator's native form/report permissions or turn all native
Creator forms into read-only forms.

## Regression and rollback

`test-contract-owned-edit.mjs` exercises the actual widget's Owner picker,
nonowner warning/zero writes, access loss after owner removal, completed locks
for both owned and general editors, bypass refusal, attachment and approval
entry guards, fresh status/ownership changes and moved child records. Existing
Contracts suites retain proposal acceptance, new Acquisition entry, creation,
inline queuing, lost-reply recovery, file delivery, Lot completion and pricing
behavior. The executable saved Deluge Lot adapter verifies completed parents
produce no writes in Complete/LinkOnly and still support Check. All tests use
fixtures; none sends production emails or changes business records.

Rollback frontend: restore production mapping to immutable `1.61.34`.
Rollback backend: restore the four function bodies from commit `3776be3` and
the previous display label/tooltip; saved checkbox assignments remain intact.

## Publication verification — October 9, 2026

The release and child/master regression checks reached main at `8445d0a`.
Repository validation and Pages build passed; main CI and Pages deployment
passed. All nine live Production Contract Management assets matched the tested
`1.61.35` build, including the permanent bootstrap.

Creator Production `9.62` published the four saved functions. Production `9.63`
published only the two User Access field metadata changes and the corresponding
report label. A fresh Production form and report showed **Edit Owned Contracts
and Actions**; the rendered checkbox still had `name="Propose_Contract_Changes"`.
No access-record grants were changed.

The authenticated Production Legal host loaded the new widget successfully:
89 contracts, 578 actions, 138 versions and 157 approvals. The new fixture checks
confirmed edits to an open owned amendment and its actions, and both server Lot
transfer modes beneath a completed master, without modifying that master.

No Production business records or approval emails were used for testing. A
targeted Production `Send_Contract_Approvals` Check response was not exercised:
the connected Creator API screen exposed endpoint metadata and configuration,
but no authenticated API test runner. Native publication and fixture validation
do not establish live approval delivery; that check remains a verification
limitation.
