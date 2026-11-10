# PO Outcome Notifications And Email Activity

The final PO decision has a separate outcome notification. Approved POs notify
the configured approved-recipient list plus the territory Construction PM;
rejected POs use the rejected-recipient list plus the same PM. Email problems
leave the saved decision intact. Budget Requests and saved PO details expose
the recorded email attempts and guarded recovery actions.

Development installation is verified: optional User, both Settings recipient
fields, Territory Construction PM and the generic Activity Log are installed.
All 18 affected functions were compiled and their actual reopened editor source
compared with the reviewed implementation. Direct log access is disabled across
all nine ordinary profiles. A native exact-budget Activity read returned the
versioned contract without writes, and a blank-login contact was denied user
actions. See the [native installation evidence](../creator/schema-changes/po-outcome-activity-2026-11-10/native-install-progress.json).
Generated exports remain historical snapshots; local preview rows are samples.

The owner executed the private utility in Development. Its saved source matches
the final native capture exactly after whitespace/comment normalization, with
all tokens, grouping and string literals retained. Explicit Apply created the
missing Michael contact and configured approved to the four resolved contacts
and rejected to Sam; a subsequent read-only Check confirmed Configured,
missing count zero and no retained setup lock. See the
[native setup evidence](../creator/schema-changes/po-outcome-activity-2026-11-10/setup-verification.json).
Construction PM assignments remain unassigned until the user supplies them.
Hosted widget/Creator publication, Production contacts/default setup and hosted
end-user verification remain rollout work. No live email was sent for testing.

## Configuration And Contacts

Settings has a **Purchase Orders** screen with two User Access multi-select
lookups. Initial configuration follows the requested rule:

| Outcome | Settings Field | Initial Fixed Recipients | Additional Recipient |
| --- | --- | --- | --- |
| Approved | `PO_Approved_Recipients` | Sam, Sokha Sim, Kimberly M. Singer, Michael Wilson | The PO territory's Construction PM |
| Rejected | `PO_Rejected_Recipients` | Sam | The PO territory's Construction PM |

Supplied contacts are Sokha Sim (`ssim@wbdevelopment.com`), Kimberly M. Singer
(`kim.singer@wbdevelopment.com`) and Michael Wilson (`mwilson@wbdevelopment.com`).
Reuse an unambiguous existing User Access row by normalized email before adding
a contact. The authenticated Production report was inspected read-only on
November 10, 2026 and confirmed Samuel Spears (`sspears@wbdevelopment.com`),
User `sspears_wbdevelopment`, native User Access ID `4410926000005497010`.
That Production record remains unchanged. Development's email-only Sam is a
separate contact with its own ID; never copy Production native IDs or assume a
Development login exists.
Normal Settings loads/saves do not create contacts, seed choices or create
another Settings singleton.

The private `setupPurchaseOrderNotifications` installer accepts only Check or
Apply, requires the actual application owner in Development and has no public
API or email send. Check is read-only. Explicit Apply reuses exact email
matches, creates only missing notification contacts and sets empty/already-
intended recipient lists. Duplicate emails, another Settings singleton or
unexpected concurrent configuration stop setup. Existing person names,
logins/grants and Production records are never changed. See the
[setup run contract](../creator/schema-changes/po-outcome-activity-2026-11-10/README.md).

`Territory.Construction_PM`, labeled **Construction PM**, is a single optional
lookup assigned through the existing native Territory editor. It adds a
notification recipient, not an approval step. Resolve the PO territory from its
saved Budget/Subdivision context; do not infer a PM from VP or Dev Mgr. An
absent PM/address produces recorded notification attention, rather than silently
claiming every recipient was notified.

`User_Access.User` becomes optional. `Full_Name` and `Approver_Email` remain
required, and lookup display identifies a contact by name/email. Several
blank-User contacts are intentional; duplicate-login checks apply only to
nonblank native User values. A blank User cannot have approval routing enabled.
Contacts do not gain a Creator login, profile, ownership, permission or approval
authority from name/email. Authentication and Development View-as still require
a real native User identity.

The additive [schema and installation package](../creator/schema-changes/po-outcome-activity-2026-11-10/README.md)
contains candidates, native validation, [contact setup](../creator/schema-changes/po-outcome-activity-2026-11-10/contacts.json),
[permission rules](../creator/schema-changes/po-outcome-activity-2026-11-10/permissions.json)
and [report requirements](../creator/schema-changes/po-outcome-activity-2026-11-10/reports.json).
Preserve unrelated live workflows and report criteria during installation.

## Outcome Email

The navy Land Master email shows Approved/Rejected state, saved phase, vendor,
PO identity, amount and **View Purchase Order**. A small **Cost Code Summary**
has one row per base `Budget_Item.Cost_Code`: code and PO total, followed
by the PO grand total. All PO element lines for the same base code group using
exact integer cents; a missing base code falls back to the exact captured
`PO_Item.Cost_Code` without guessing or stripping suffixes. The chosen label and
total are retained in the immutable notification plan;
budget-modification amounts are not added to PO spend. Source text is HTML
escaped and the saved-PO link follows the current Creator environment.
Development/test subject markers remain.

The new outcome email has **no workbook attachment**. Concise cost-code totals
replace a detailed line/element dump. The existing request to the active Pending
approver keeps its Excel attachment and separate routing purpose. Neither email
claims payment was released, the vendor was notified or work was authorized.

The sender remains `Notifications@wbdevelopment.com`. Normalize and deduplicate
addresses. Capture recipient identities with the operation; a confirmed failed
attempt may re-resolve its contact/PM address after configuration is corrected.
A separate normalized-address claim prevents two corrected contacts from
sending the same outcome twice to one address.

## Reusable Activity Evidence

`Activity_Log` uses generic `Object_Type/Object_ID` and
`Context_Type/Context_ID` text pairs: Purchase Order and Budget for this process.
`Process`, `Event`, `Operation_ID`, `Attempt_No`, recipient, subject, actor,
started/sent timestamps, status, error and `Snapshot` support future audit uses
without PO-only lookup columns.

`Claim_Key` is required with native **No Duplicate Values**. A private reusable
claim helper owns an attempt only after a successful native insert. Each retry
adds an attempt, retaining prior failures/successes and original recipient
evidence. Outcomes also retain a captured notification plan and a unique
normalized-address claim. The Budget view lists actual approval request/outcome
attempts, excluding internal plan/address-claim rows.

Statuses are Preparing, Sending, Sent, Failed, Unknown and Skipped. Write
`Sent_At` only after native `sendmail` acknowledges success. **Sent means Creator
accepted the send request; it does not prove inbox delivery or recipient read.**
A stamped Skipped row means another claim already confirms the same address's
send for this outcome and must not prompt another send.

Ordinary profiles receive no direct form/report add/edit/delete/export grant.
Native validation blocks direct activity mutations; server helpers own inserts
and state changes. The observed native report is **Activity Log Report**,
link `Activity_Log_Report`; the earlier `All_Activity_Logs` name was a candidate
only. Application IDE's report links confirmed the installed name. All nine
Development profile rows showed their five visible Activity Log permission
controls unchecked; no new permission grants were needed. See the
[native profile evidence](../creator/schema-changes/po-outcome-activity-2026-11-10/activity-profile-permissions.native.json).
Admin report inspection is separate from scoped Budget
activity. Do not grant raw log or User Access roster access merely to render
activity. No generic client endpoint can manufacture an audit event or choose
arbitrary recipients/body text.

## Controller And API Contract

Reuse `managePurchaseOrder` and existing `Manage_Purchase_Order` /
`Manage_Purchase_Order_DEV` Custom APIs. No new public API is required. Every
action retains authenticated native actor matching and exact string IDs.
Budget editors/owners can read their authorized Budget log; other readers see
only POs with their captured submitter/approver relationship. Notification
membership and Create PO alone grant no blanket log visibility.

| Action | Request And Behavior |
| --- | --- |
| `Activity` | Budget/actor, optional exact PO `id`, optional string `cursor`; read at most 50 rows newest first and return `hasMore`/`nextCursor`. PO-specific terminal reads also return `outcomeNotification`. Relationship filtering can yield fewer visible rows than the scan page. |
| `RetryOutcomeEmail` | Exact PO `id`, `expectedRevision`, Budget/actor and failed `activityId`; recheck eligibility before claiming the next attempt. An empty activity ID is accepted only for verified Not Started. An exact plan ID may resume only never-claimed recipients when `canResumeEmail` is true. |
| `CheckOutcomeEmail` | Exact PO/revision/Budget/actor; read captured outcome status without sending or changing the decision. |
| Existing `RetryEmail` | Remains the active Pending approval-request retry path; its send/retry attempts are now logged. It is not a terminal outcome retry. |

Activity responses use `contract: "po-v1"`,
`activityContract: "po-activity-v1"` and `success` for the API read result.
`events` includes exact `id`, `objectId`, `budgetId`, immutable `operationId` and
`recipientKey`, revision, approval ID where applicable, attempt number, status,
name/email, subject, timestamps/error and backend retry eligibility/action.
Keep `recipientKey` stable when a failed contact's address changes; never select
another recipient's Sent result by email fallback.

`outcomeNotification.contract` is `po-outcome-email-v1`, with exact PO, Budget,
revision/outcome, state, `emailSent`, events and safe retry/resume metadata.
States are Not Started, Preparing, Failed, Partial, Unknown and Sent. API
`success: true` alone is not email success. An authorization refusal sets
`permissionDenied: true`; the widget clears and closes private activity.

## Decision And Recovery Predicates

`handlePurchaseOrderApproval` preserves actor/current-step, note, revision,
phase-lock, chain, reserved commitment and financial checks. Only a verified
final Approved/Rejected state, after its decision lock releases, starts outcome
mail. Intermediate approvals still route to the next Pending approver.
`CheckDecision` reads outcome evidence without starting another send. Email
retries never repeat the decision or financial finalization.

Terminal progress claims outcome notifications sent only when the matching
versioned snapshot says Sent/`emailSent: true` with stamped send evidence. A
missing, partial, failed, preparing or unknown notification leaves the decision
saved and shows a warning with **Email Activity**. Saved decision and financial
verification remain independent from mail.

Only a latest confirmed Failed recipient attempt with matching PO revision and
server retry grant exposes **Retry Email**. Sending/Unknown/Preparing is not a
resend grant. A lost retry reply retains its exact operation and offers
read-only **Check Status**, including after close/reopen. Every settled result
offers **Back To Activity**, including Unknown. This returns to readable history
and refreshes it without sending. Closing also clears only result presentation;
reopening shows history with exact unresolved targets retained as Check-only.
Other confirmed failed recipients remain usable. A new result or replacement
read cannot discard another recipient's unresolved operation. An interrupted plan
can separately expose **Resume Outcome Emails** for recipients with no prior
claim; it cannot replay existing attempts. Configuration-only failure retries
reconcile the resulting plan as a whole after Settings is corrected. Ordinary
recipient retries reconcile the exact stable recipient key.

## Budget Interaction And Verification

**Email Activity** is in the phase Requests header and saved PO footer, including
terminal approval results. Rows show date/event, PO/attempt, recipient and
status; expansion reveals subject/address/error. Opening, Refresh and Older
Activity are read-only. Retain complete same-scope rows, disclosures/focus and
scroll during refresh; clear them on actor, permission, environment or Budget
change. Explicit retries/checks use compact mounted progress, disabled pending
close/duplicate controls, focus trap, inert background, centered SVG icons and
truthful display-only/reduced-motion pacing.

Frontend entry points are [po-activity.js](../widgets/budget-manager/src/app/po-activity.js),
[po-progress.js](../widgets/budget-manager/src/app/po-progress.js) and
[the Budget widget](../widgets/budget-manager/src/app/widget.html). Backend
boundaries are [managePurchaseOrder](../creator/functions/managePurchaseOrder.dg),
[handlePurchaseOrderApproval](../creator/functions/handlePurchaseOrderApproval.dg),
[sendPurchaseOrderEmail](../creator/functions/sendPurchaseOrderEmail.dg),
[buildPurchaseOrderOutcomeEmail](../creator/functions/buildPurchaseOrderOutcomeEmail.dg),
[renderPurchaseOrderOutcomeEmail](../creator/functions/renderPurchaseOrderOutcomeEmail.dg),
[sendPurchaseOrderOutcomeEmail](../creator/functions/sendPurchaseOrderOutcomeEmail.dg),
[activityEmailClaim](../creator/functions/activityEmailClaim.dg),
[poOutcomeNotificationStatus](../creator/functions/poOutcomeNotificationStatus.dg),
[poEmailActivity](../creator/functions/poEmailActivity.dg) and its actor/row helpers.

Focused checks cover Activity, progress, PO controller/requests, Settings
SDK/approval identity and backend outcome behavior. Actual-module desktop
previews run with `node scripts/serve-po-email-fixtures.mjs 32194`; Activity and
Settings use isolated in-memory data and no native calls. Local checks do not
establish native compilation, end-user profile behavior or receipt of a real
message. Before release, run repository validation/Pages build and record
desktop/native results separately. Never send production mail merely to test
publication.

For rollback restore prior immutable Budget/Settings mappings and disable the
new outcome invocation separately if needed. Keep activity evidence, claims and
contacts. Do not delete logs or remandatory User while blank-login contacts
exist. Preserve permanent widget URLs and the existing active-approver email
path.

## Local Candidate Releases

| Widget | Candidate | Development Rollback |
| --- | --- | --- |
| Budget Manager | `122.29.127` | `122.29.124` |
| Settings Manager | `1.6.9` | `1.6.8` |

PMP maps Development and Production to these immutable releases; Stage and all
other widget mappings retain current main. The integrated Budget 122.29.127
preserves published 122.29.124's compact ledger and the requested
[15% wider Reallocation panel](po-reallocation-width-2026-11-10.md). Local
notification candidates 122.29.125 and 122.29.126 remain immutable. The earlier
unpublished notification candidate numbered124 is archived locally; it never
replaces main's distinct published124 release. See the
[PMP integration and rollback record](po-notifications-pmp-2026-11-10.md).
Creator publication remains the user's action. Native installation/readback and
hosted build evidence are recorded separately; CI is monitored after the push.

The new PO suites run automatically through the `postvalidate` lifecycle after
the existing repository checks. `npm run validate` passed its complete
prevalidate/validate/postvalidate lifecycle, and `npm run build:pages` built all
35 local environment paths. Recursive byte checks confirm both candidates
match every frozen source asset, the Development build uses those candidates,
and the Production build still uses the previous releases. See the
[local release evidence](../creator/schema-changes/po-outcome-activity-2026-11-10/release-validation.json).

The canonical interaction-surface registry adds the scoped PO activity list.
Required synchronization updates its eleven standalone widget copies, including
Crew Locations. Only the Budget/Settings candidates package this change here;
other immutable releases and environment mappings remain unchanged. The new
selector applies only to the Budget activity surface.
