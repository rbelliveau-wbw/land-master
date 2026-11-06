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

The new form, parent field, native guards and five functions are installed in
Development. Updated functions compiled and their complete saved editor source
was copied and compared after Creator formatting. The OAuth2
`Manage_Construction_Review_DEV` payload binding is enabled. All three requested
profiles have the new parent pointer visible/read-only and no direct audit log
access; their existing grants and native helper defaults remain unchanged.
No new report projection is required; Check resolves the saved native pointer.

Request `4410926000005844058` was submitted as `demouser_1` (Dev/Land Acq) and
rejected as `demouser_4` (Construction Budgeting) using hosted 1.62.58. Native
Check confirmed Rejected, decision `4410926000005844062`, comment
`4410926000005844064`, email attempt 1 sent at November 6, 2026, 1:05 PM, and
recipient `rbelliveau@wbdevelopment.com`. The user supplied an inbox screenshot
with the matching request, Demo Construction reviewer and full reason.
The submitter reopened View Rejection successfully with no review/resend grant.
Read-only Check did not repeat the decision, comment or email.

Final 1.62.59 changes only the read-only progress wording to **Checking
Rejection** / **Rejection Details**, with checking/loading stages instead of
write verbs. Backend and email behavior match the live-tested 1.62.58 release.
See the [installation and test evidence](../creator/schema-changes/construction-rejection-2026-11-06/native-install-progress.json).

## PMP and Live Development Test

The user requested PMP and a live test that submits as **Dev/Land Acq - Proforma
& Budgets**, rejects as **Construction Budgeting**, and sends the notification
to `rbelliveau@wbdevelopment.com`. Publish the candidate to Development first,
record the native test result, then promote the matching hosted release to
Production. Creator publication remains with the user under PMP. Production
Custom API registration must follow promotion of the matching native helpers.


## Development Profile Test — Preview Boundary

The live test created request `4410926000005844058` as `demouser_1`
(Dev/Land Acq - Proforma & Budgets), then attempted rejection as `demouser_4`
(Construction Budgeting). The submitter had no review controls. The initial
1.62.57 API correctly denied the native app-owner identity before any rejection
or email: Creator Custom APIs execute as the owner during Development View-as.

The 1.62.58 correction reuses the proven Purchase Order preview boundary in a
small Construction-specific actor adapter. Only an authenticated native owner
in Development may select an exact existing User Access row; duplicate user
rows fail closed. Stage/Production and ordinary callers always retain their
native identity. Existing Construction permissions apply after resolution.
Both the selected reviewer and native caller remain in the audit snapshot.
Separate code is required because PO helpers expose PO-specific receipt hints,
not a shared actor resolver. The original submitter still comes from the
Contract's native Added_User and its User Access email, independent of owners.

The demo submitter's Development-only Approver_Email was temporarily changed
from its original address to `rbelliveau@wbdevelopment.com` for this authorized
test. The original Development demo email was restored and its report row
was reread after sending. The native actor adapter, snapshot, sender and entry point compiled and were
reopened in Development after the publication lock cleared. The positive
profile/email test passed on hosted 1.62.58.


## Release, Regression and Rollback

Full `npm run validate` and `npm run build:pages` passed again for final 1.62.59. Hosted Development
and Production target 1.62.59; Stage remains 1.62.3. Creator publication remains
with the user, followed by matching Stage/Production API registration.
Rollback hosted Contract Management to 1.62.56. Preserve all saved decision/email
receipts and native history guards; never replay the delivered test notification.

Changed implementation files: Contract Management widget source/config and
immutable releases; the five Construction review/notification functions; native
form/field/workflow/profile installation fragments and evidence; Custom API and
widget manifests; environment mapping; focused rejection regression checks;
this module guide and the shared approval progress guide. Forms/fields and
native API installation contracts are enumerated above and in change.json.

Regression covers native profile defaults and explicit overrides, exact ID
strings, owner-only Development preview and denied impersonation elsewhere,
concurrent review/send claims, lost replies, one original-submitter notification,
HTML escaping, immutable reason, native bypass guards, saved-reason read access,
retained drafts/focus, and ordinary Legal/Accept behavior.
