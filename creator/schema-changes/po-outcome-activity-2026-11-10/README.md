# PO Outcome Notifications And Activity Log

This directory contains additive Creator schema candidates and installation
rules. The checked-in generated exports remain historical snapshots. See
`native-install-progress.json` for actual Development changes and remaining
verification; a candidate file alone is not installation evidence.

## Native Fields

- `Settings.PO_Approved_Recipients` and `PO_Rejected_Recipients` are optional
  multi-select lookups to `User_Access`. The Purchase Orders Settings screen
  uses their exact string IDs and the existing native Settings update path.
- `Territory.Construction_PM` is one optional User Access lookup, labeled
  **Construction PM**. Assign the person from the existing native Territory
  editor. It is a notification assignment, not an approval step.
- `User_Access.User` is optional. Keep `Full_Name` and `Approver_Email`
  mandatory; all existing permission/routing defaults stay unchanged. A name
  and email alone do not authenticate a person or grant application access.
- Native lookup display uses Full Name and Approver Email so contacts without
  a Creator login remain identifiable.

Append the supplied User Access validation to current live validation; preserve
the existing **Retire Modification Permission** load action and any concurrent
workflows. Duplicate-login validation runs only for a nonblank User. Multiple
blank-login contacts are intentional. Do not auto-fill User from the current
administrator while adding a contact.

## Reusable Activity Evidence

Create `Activity_Log` from `Activity_Log.form.ds`. `Claim_Key` must be required
with native **No Duplicate Values**. Object and context references are text
pairs rather than PO-only lookups. Process/Event, operation, attempt, recipient,
actor, timestamps, status and snapshot fields support later audit uses.

Keep native direct add/edit/delete and every generated report denied to
ordinary application profiles. The validation actions also reject native
direct form mutations. Authenticated server helpers own inserts and send
states; there is no generic client audit-writing endpoint. Admin can inspect
the observed native **Activity Log Report**, link `Activity_Log_Report`.
Application IDE's Access Development and Open Builder links confirmed that
name; `All_Activity_Logs` was only an earlier candidate and is not the installed
report. Budget activity reads and retries use the existing scoped PO
controller. Never grant raw log or User Access roster reads merely to show
activity inside a budget.

The parent agent read back all nine native application-profile Activity Log
rows: Add, View, Edit, Delete and More were unchecked in each. No permission
changes were made. The exact [native profile capture](activity-profile-permissions.native.json)
is retained; this does not replace signed-in end-user scope tests.

`Sent_At` means the native email operation acknowledged success, not proof of
inbox delivery. Retain each attempt and its original recipient, revision and
event. Failed preparation can be retried; Sending/Unknown claims cannot be
blindly resent. New retries append evidence rather than replacing history.

## Explicit Initial Configuration

Follow `contacts.json`: reuse one exact case-insensitive email match before
creating a name-and-email-only contact. Stop on duplicate matches. Preserve
existing users and permissions. The parent agent inspected the authenticated
Production User Access report read-only on November 10, 2026 and confirmed
**Samuel Spears** (`sspears@wbdevelopment.com`), User
`sspears_wbdevelopment`, native User Access ID `4410926000005497010`.
Production's existing Sam record is unchanged.

Development currently has demo users only. Its setup can explicitly create a
notification-only Samuel Spears contact with that verified email and blank User,
alongside the three provided contacts. Resolve every lookup ID in its own
environment; never copy Production IDs or assume that a Development Creator
account exists. All new contacts retain false permission/routing defaults.
Creation of the three provided Production contacts and Production recipient
setup remain deferred until Creator publication.

The parent agent's explicit native Development Apply reused email-only Samuel
Spears (`4410926000005910064`), Sokha Sim (`4410926000005910066`) and Kimberly M.
Singer (`4410926000005910068`), and created Michael Wilson
(`4410926000005894715`). It configured Settings `4410926000000687647` with all
four approved recipients and Sam alone for rejected notifications. A subsequent
read-only Check confirmed each email has exactly one matching record, no
missing contacts, Configured state and no retained setup lock. These are
Development contact IDs, not Production login mappings. The exact native
[source comparison and run evidence](setup-verification.json),
[Apply result](setup-apply.native.json) and
[Check result](setup-check-after.native.json) are retained separately.

Initial approved recipients are Sam plus the three provided contacts; rejected
recipients are Sam. Each outcome also includes that PO's territory Construction
PM. Assign territory PMs explicitly; never infer them from other territory roles.

Settings loading and normal saves do not create contacts or seed defaults.
Require the existing Settings singleton and preserve unrelated settings.

### Owner-Only Development Setup Utility

[`setupPurchaseOrderNotifications`](../../functions/setupPurchaseOrderNotifications.dg)
is a private installer with one string argument, **Check** or **Apply**. It can
run only as the actual authenticated application owner in Development; it does
not require an owner User Access row. Do not bind it to a Custom API or install
it as an automatic workflow. It contains no email send or account/grant action.

Execute **Check** first. It scans the bounded User Access roster for the four
exact normalized email addresses and returns existing native IDs, missing
contacts, Settings identity, list state and setup-lock state without writes.
Duplicate email matches and unexpected nonempty recipient configuration stop
setup. Existing names, native users and permissions are never changed.

Explicit **Apply** rechecks the same conditions under the existing native unique
`Approval_Config_Lock` using a dedicated `po-notification-setup` key. It creates
only missing name/email contacts with blank User and routing disabled, then
sets approved to the four resolved native IDs and rejected to Sam alone. Each
existing list must be empty or already exactly intended. It checks identities
again before Settings writes and refuses concurrent unexpected configuration.
Acknowledged native assignments establish save success; no editable-field
equality comparison is added after saving. A repeat Apply reuses the contacts.

If interrupted, run **Check** before another Apply. A hard-interruption lock
requires owner review; do not automatically clear another run's claim. Partial
contact creation is retained and reused. This utility does not infer or assign
Construction PM, publish Creator, mutate Production, or configure Production
contacts/recipients. Record its native compilation and explicit run results
separately from these source candidates.

The final native setup source was saved and compiled, then compared against
the current function with all code tokens (including parentheses) and string
literals matching exactly after whitespace/comment normalization. The explicit
Apply and subsequent Check succeeded as recorded above. Native User Access
validation is saved and Enabled with one script action; Territory Construction
PM was independently verified as a single dropdown lookup displaying name and
email. All 18 functions now have actual reopened native source proof in
`function-native-verification.json`. All nine ordinary profiles have direct
Activity Log access disabled. Native exact-budget Activity reads succeeded and
the blank-login contact actor was denied, without writes or email. See
`native-install-progress.json`. Hosted publication, Production configuration
and hosted end-user checks remain separate; no live email was sent for testing.

## Verification And Rollback

`node scripts/test-settings-sdk-v2.mjs` exercises the actual whole Settings
source, native string/lookup shapes, blank-login contacts, exact saved IDs,
missing-address rejection, retained unresolved choices and unavailable-roster
locks. `node scripts/test-approval-admin.mjs` and
`node scripts/test-approval-policy.mjs` retain approval identity/route checks.
`node scripts/test-po-notification-schema.mjs` also executes the private setup
fixture, including read-only Check, exact email reuse, owner/environment denial,
duplicate/configuration conflicts, idempotent Apply and concurrent setup claims.
These local checks do not prove native compilation, deployment, end-user
permissions or inbox delivery. Record those separately after native readback.

For frontend rollback restore the prior immutable Settings/Budget release
mapping. Keep activity history and the generic form. Do not delete contact rows,
clear recipient selections, or remandatory User while blank-login contacts
remain. Disabling the new outcome helper is separate from historical evidence.
