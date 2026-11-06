# Construction Rejection Reason and Submitter Email

Construction Review now collects a required reason when rejecting a request.
The guarded Creator action records the original reason, reviewer, time and
request context, changes the pending request to Rejected, adds its comment, and
notifies its original submitter. Ordinary owner comment notifications are not
sent for this system decision. Acceptance retains its existing behavior.

## Storage and Native Installation

The new internal `Construction_Review_Log` form records a unique decision claim
and a separate unique email-attempt claim. Its immutable decision `Snapshot`
preserves the original reason even if the ordinary `Comment_Log` copy is later
edited or deleted under the existing author/24-hour policy. The one optional
parent field, `Contract.Construction_Rejection_Operation`, identifies the saved
decision without altering existing Legal records or requiring a backfill.
`Claim_Key` must be both Mandatory and No Duplicate Values. These native unique
claims protect against simultaneous reviewers and duplicate email retries.

Install the [schema and native guards](../creator/schema-changes/construction-rejection-2026-11-06/change.json)
and follow the [profile matrix](../creator/schema-changes/construction-rejection-2026-11-06/permissions.json).
The field/form sources are additive installation fragments, not replacements
for historical exported forms. Existing Contract validations remain in place.
The guard prepended inside the existing sole `Field_Validations_Contrac` script
preserves its full current rules and shared City policy. It prevents pointer tampering, a direct
Pending Review to Rejected status bypass, and a conflicting status change while
a decision claim is recording. The internal log's form and deletion guards
deny direct edits; only the authenticated helper's native record operations
maintain its audit state.

## Profiles and API Access

The requested native profiles are **CFO**, **Dev/Land Acq - Proforma & Budgets**,
and **Construction Budgeting**. Reuse `hasConstructionPermission` unchanged:
CFO and Dev/Land Acq receive Construction submit/read access by profile, while
Construction Budgeting also receives review access. An existing explicit
`User_Access.Edit_All_Construction_Requests` grant still permits a reviewer in
another profile. This feature does not give CFO or Dev/Land users a new review
grant or expose Legal data to Construction-only users.

All three requested profiles can read the saved reason in the existing
Construction Comments thread and through the scoped read-only Check operation.
The optional parent pointer is readable where the widget's reports require it
and is not editable. None receives direct View/Add/Edit/Delete/Export access to
the internal log or any report generated on it. Keep the current Construction
page, report scopes, native business-form permissions and ordinary comment
guards. Do not grant `User_Access` roster/email visibility to resolve recipients;
the server performs that lookup.

Register **Manage_Construction_Review**, **Manage_Construction_Review_DEV**, and
**Manage_Construction_Review_STAGE** as OAuth2 POST, JSON Key and Value,
`payload:String`, Standard response, bound to the matching environment's
`Default.manageConstructionReview`. All-users invocation preserves existing
Construction grants across profiles; the helper independently enforces the
authenticated caller, Construction parent, read versus review capability, and
pending status. Stage requires its own suffix because runtime routing appends
`_STAGE`; it must not silently call Production.

## Recipient and Notification Outcome

The submitter is the existing `Contract.Added_User` identity, not an owner or
the last person to edit the record. Resolve that identity through `User_Access`
using the application's native user shape, prefer its `Approver_Email`, and
use `User` only when it is a real valid email address. The email contains the
request name and project/subdivision context, reviewer, time, original rejection
reason and a link to the request. Preserve the existing environment-aware URL,
HTML escaping, sender `Notifications@wbdevelopment.com`, and test-environment
subject treatment.

The request remains Rejected if its submitter has no email or notification
fails. A `Sent_At` stamp is written only after `sendmail` returns successfully;
it means Creator accepted the send, not that the recipient read the message.
Retry performs only a confirmed safe notification attempt. An ambiguous
`sending` or `unknown` result never automatically sends again. Read-only Check
resolves a lost browser reply without repeating the rejection or comment.
Older status-only Rejected requests are not retroactively emailed.

## Progress, Regression and Rollback

The reason dialog leads to the compact existing approval progress treatment:
recording the decision, saving its comment and notifying the submitter. Success
requires the saved decision and matching parent outcome, recorded comment and
confirmed notification result. A failed or missing-recipient email is a saved
rejection with a notification warning. Unknown writes offer a read-only status
check, never a blind repeat. Retain the pending duplicate locks, focus trap,
live status announcements, Close/Escape lock and reduced-motion behavior.
Acknowledged native saves are not rejected by new automatic field-equality
comparisons.

Required regressions cover all three profile defaults and explicit overrides;
no-access and Legal-only denial; native pointer/status/log tampering;
two reviewers claiming one request; duplicate email retries; an actual valid
native submitter identity; missing/invalid email; successful email; mail failure;
lost replies before and after sending; old rejections; and an unchanged Accept
flow. Offline source fixtures are not a Creator compiler or live profile test.
Record live results separately in
`creator/schema-changes/construction-rejection-2026-11-06/native-install-progress.json`.

Creator publication and hosted release promotion are separate. Installation
or compilation in Development does not establish Stage or Production access.
PMP now authorizes the repository and hosted Production promotion; Creator
Stage/Production publication remains user-controlled. Keep the
previous immutable widget release as rollback; disable only the new API bindings
if needed, retain audit rows and optional pointer, and keep the native history
and rejection-bypass guards until an alternate path is reviewed.

## Verified Development State — November 6, 2026

Candidate `1.62.57` passed the full repository validation and Pages build. The
new form, parent field, native guards and all four helpers are installed in
Development; all helper bodies were reopened and compared with the intended
source after Creator formatting. `Manage_Construction_Review_DEV` is enabled
with the matching native String payload binding. CFO, Dev/Land Acq and
Construction Budgeting each have the new parent field visible/read-only, saved
and reopened; their existing routes and lack of direct log grants were checked.
The native permission helper retains its current profile defaults and overrides.

No additional report field is necessary: View Rejection appears for rejected
Construction requests and Check resolves the server-owned pointer even when
SDK projections omit it. Existing report fields and criteria are preserved.

Safe native Check executions returned the structured access-denied result. No
live request was rejected or notification sent; positive authenticated profile
sessions and end-to-end delivery remain unverified. Stage/Production publication
and their API bindings, as well as repository/hosted promotion, remain separate
user-controlled release work. See the [observed installation evidence](../creator/schema-changes/construction-rejection-2026-11-06/native-install-progress.json).

## PMP and Live Development Test

The user requested PMP and a live test that submits as **Dev/Land Acq - Proforma
& Budgets**, rejects as **Construction Budgeting**, and sends the notification
to `rbelliveau@wbdevelopment.com`. Publish the candidate to Development first,
record the native test result, then promote the matching hosted release to
Production. Creator publication remains with the user under PMP. Production
Custom API registration must follow promotion of the matching native helpers.
