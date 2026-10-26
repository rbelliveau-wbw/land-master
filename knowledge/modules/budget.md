## Hide Empty beside Search — 122.29.79, October 26, 2026

The approved **Hide Empty** pill switch sits immediately beside line-item Search
in single-phase View/Edit and all-phases tables. It starts off and remains a
local editor-session choice when changing categories, tiers, phases and modes.
Rows hide only when every loaded phase has zero Preliminary, Unapproved, Final,
HCSS and GP actual amounts, no nonzero per-unit rate or modification, and no
per-unit setup/draft. Credits and cancelling modifications stay visible. Search
and category filters compose; empty categories hide, while totals and native
editors remain mounted. See [the design rule](../design/empty-row-filters.md).

Changed files: Budget HTML/CSS/config and immutable release; shared motion engine
and adoption registry with synchronized widget source copies; the focused
regression, package validation entry, manifests, design/module documentation and
environment mapping. A new combined visibility function was needed because the
existing Budget search only matched text. It reuses the existing amount parser,
item lookup and modification adapters. The switch follows Pro Forma's proven
Hide Empty control.

Creator forms/fields, functions and Custom APIs: no changes. No Creator deployment
is required for this frontend change. Verification covers zero rows, actual-only
rows, credits, cancelling modifications, cross-phase amounts, per-unit drafts,
unknown data, combined search/categories, switch restoration and desktop UI.
Full `npm run validate` and `npm run build:pages` passed. Desktop verification
used the actual widget in its isolated mock-data preview: switch placement and
ARIA state, expanded rows, combined Search, retained phase selection and totals.
Live Creator records were not changed during verification.
Rollback: restore Production Budget to 122.29.77; keep the permanent widget URL.

## Development 76 readonly modal forecast display — October 26, 2026

Budget Manager 122.29.76 hides the future Approvers forecast pane whenever the
existing live composer capability is denied. Readonly foreign Drafts and older
Submitted POs no longer display Checking approvers indefinitely when no lookup
is authorized. New and authoritative own Drafts keep their real forecast;
captured modern approval chains remain separate and unchanged. No native
function, permission, data, reservation or approval behavior changes.

The Development 75 acceptance audit also found a preexisting readonly visibility
limit: All_External_System_Mappings is denied and its UI section remains hidden.
This does not block Budget/PO reads or creation; no extra grant was approved.
Final Development 76 modal/forecast verification follows Pages deployment.

## Development 75 legacy history and permission acceptance — October 26, 2026

Budget Manager 122.29.75 distinguishes verified older PO snapshots without
captured approval history from real API/identity failures. The Request rail
shows a passive history-unavailable notice and preserves all read, authorization
and modern-bundle validation. See the complete
[diagnosis and replacement code](../../docs/po-legacy-history-display-2026-10-26.md).

Signed-in Development 74 testing with demouser_4 created, saved, reopened and
submitted the $0.01 PO 4410926000005444014. Its exact snapshot is Submitted /
Reserved / Pending with a captured CFO approval; the UI acknowledged email sent
and the user confirmed receipt. The own submitted PO, a foreign Draft, Budget
Edit, comments, attachments and approvals exposed no mutation controls for Const.
All_Wire_Requests View and View All were explicitly approved by the user and
saved with Add, Edit and Delete off. The configured over-budget preview remains
blocked before writes when its required Territory VP is missing; it needs route
configuration rather than additional Const powers. Actual state, exact revision,
approval IDs and readonly screenshots are recorded in the permission contract
and live-install-progress audit. Signed-in Development 75 testing confirmed two neutral legacy-history notices,
no critical audit errors and valid modern Pending PO history.

## PO approval preview permission fix — October 26, 2026

Budget Manager 122.29.74 requests the existing read-only approval preview for a
new PO or an authoritative own Draft through the same live `canCompose()` gate
as the composer. The prior legacy Budget-edit check prevented a PO-only Const
creator from sending the lookup and left the Approvers panel at Checking
approvers. Existing Budget editors retain preview access; foreign Drafts stay
restricted. Approval routing, notification settings and native writes are unchanged.

## Create Purchase Orders and Const access — October 26, 2026

Budget Manager 122.29.73 adds `User_Access.Create_Purchase_Orders`, a default-false decision box under
**Budgets**, labeled **Create Purchase Orders**. The full and lean access
functions return `poCreate`. Missing or malformed new capability data grants no
PO creation; legacy access responses retain their existing Budget permissions.
Conflicting lean response envelopes are rejected, including conflicts on this
new flag. Install the native field before saving functions that reference it.
The generated schema remains tied to its captured DS export; record additive
live observations in [the permission contract](../../manifests/budget-request-permissions.json).

PO creation is permitted by the new grant, by `Edit_All_Budgets`, or by
`Edit_Owned_Budgets` when the authenticated User Access record is in that phase's
`Budget_Owner` lookup. The new grant does not enter `canEditBudget`, the Budget
edit/approval flags, owner/import permissions, attachment permissions or the
standalone modification grant. Existing global and owned Budget editors keep
their PO creation and editing behavior.

| Const capability | Scope |
|---|---|
| Budgets | View the list, phase detail and existing request history; no Budget, item, category, owner, import, Project association or approval changes |
| Purchase Orders | Create, save and reopen the creator's own unsubmitted Draft, then submit it on an active phase |
| Construction Requests | Existing full Construction profile functionality, including review, requests, actions, templates and files, with existing completed-record and comment-author locks |
| Dev/Land Acq Construction access | Read requests/actions and submit new requests; existing submitter files/comments remain available; no request/action editing, review decisions or templates |

The creation receipt, not `Added_User`, proves PO ownership:
`Payment_Request.PO_Client_Key` must identify one initial `PO_Operation` with the
same PO, Budget and authenticated Actor. List and Get responses project
`canEditDraft`; the server repeats the creator, phase, Draft state, revision and
permission checks before and after locking. A PO-only creator cannot edit
another user's Draft, revise a Submitted/Rejected PO, amend Pending approvals,
delete a PO, manually link an existing Budget Modification, create a Check/Wire
request, add a Vendor, or gain general Budget/PO file or approval rights. The
normal UI keeps submitted/rejected records read-only and does not add a recovery
action for this grant; exact-operation reconciliation retains its existing
no-replay behavior.

The user confirmed that an over-budget PO retains the existing automatic
shortfall modification and captured approval process. This does not authorize
standalone Budget Modifications or bypass the required approvers. No arithmetic,
reservation, approval sequence or finalization rule changes with this grant.

### Native read-only enforcement

The access audit found legacy elevated functions whose UI controls checked
permissions while their native mutation bodies did not. Native guards now cover
standalone modification creation/submission (`createBudgetModification`,
`submitBudgetModification`), Project/Pro Forma association (`setProjectProforma`)
and Budget attachment deletion (`deleteBudgetAttachment`). Project association
requires an editable Budget under the exact `Subdivision.Project`; file deletion
retains the existing Budget editor/approver all/owned scope. Standalone request
submission requires Budget edit access, with the authenticated publishing admin
retaining the scheduled `approvalWatchdog` repair path.

`modificationAdmin` also checks mutating reopen/repair/send/rejection paths;
`sendModificationEmail` checks before changing a request, approval or financial
rollup. Unrelated recorded approvers retain their existing path through the exact
authenticated login or authoritative `User_Access.Approver_Email`, matching an
actual approval row and the relevant action/status. No email-local-part matching,
caller-supplied actor override or global approval grant is inferred. Read-only
check actions remain read-only. Modification email links navigate to the signed-in
Budget page; these two function signatures accept no approval token.

Construction Budgeting is denied Budget mutations before those general grants
or recorded-approver exceptions can apply. This closes the mismatch where a
retained checkbox or recorded approval assignment could otherwise override the
requested Const read-only scope. Only the actual authenticated publishing admin
retains trusted scheduled execution; `approvalWatchdog` and
`sendApprovalReminders` keep their existing internal mail/repair calls.

The native approval API audit also adds permission/profile guards to
`startApprovalChain`, `killApprovalChain`, `killApprovalFlow` and
`handleApprovalAction`: ordinary sending requires `Send_for_Approvals`, cancelling
retains that grant or `Edit_All_Approvals`, and recorded approval mutations retain
their exact authorized approver scope. Read-only Check variants remain available.
The profile veto also covers `syncBudgetApprovalStatus`, `sendApprovalEmail`,
`exportBudgetSnapshot`, `manageBudget`, `createBudgetFromSubdivision` and
`createBudgetAttachmentRecord`, retaining their existing authorized/system
behavior. Snapshot export is a write because it persists an Attachment record;
ordinary read/download exports remain separate. Attachment Capabilities reports
`canWrite:false` for Const. These functions are part of the same native
installation bundle; use its deployment record for the exact saved source,
rather than assuming a hosted widget release publishes Creator functions.
Budget/Project comment controls now respect the host's read-only state: viewing
and author identity stay available, while the composer/mutation controls and
their add/update callbacks remain denied. Shared and Construction comment
behavior stays unchanged; native `postRecordComment` and `Validate_Comment_Log`
already restrict Construction Budgeting to Construction parents.
Construction comments retain their separate native parent-module and
author/time checks. `handlePurchaseOrderApproval` also blocks Const approval
decisions or another submitter's email retry even when an old route still names
that user. The existing creator's own submission-email retry/check remains
available; `poActorResponse` must match the final installed approval projection
so Development owner preview cannot restore approval controls.
The complete bundle has twenty-one existing functions: four
access/PO functions, six standalone-modification/Project/file guards, four
approval-control guards, these six additional native entry points and the PO
approval handler.

Two native validation actions close the shared-child boundary as well:
`Construction_Attachment_V` rejects Const file records linked to Budget,
Pro Forma, Payment Request or Budget Modification in addition to Construction;
`Validate_Comment_Log` rejects extra Budget, Project or Pro Forma links.
Both examine input and stored parents, so clearing an input cannot authorize
editing an already shared child. Pure Construction files/comments retain the
existing permission, completion and author/time rules. Other profiles retain
their existing parent policy. These are two existing workflow actions, not new
functions or new form fields, and require their own native save/reload evidence.

These functions keep their existing Custom API names and argument lists. Save
`sendModificationEmail` before its callers `modificationAdmin`,
`createBudgetModification` and `submitBudgetModification`; the Project/file
guards have no new dependency. The PO field precedes the full/lean access getters
and `poActorResponse`; save `poActorResponse` before `managePurchaseOrder`.
Native publication and API binding/audience checks are separate from GitHub
Pages deployment. Previously captured All users metadata for a named API does
not establish the current audience of every other Budget endpoint.

### Verification and release boundary

Actual-source tests cover create-only/legacy-editor access, own Draft Save and
Submit, foreign/rejected/in-flight/delete denial, automatic shortfall routing,
post-lock revocation, exact lookup IDs, recorded-approver scope, duplicate/missing
actors, Const profile denial and zero-write/zero-mail failures. Focused suites
include `test-po-create-permission-backend.mjs`,
`test-po-create-permission-ui.mjs`, `test-budget-readonly-backend.mjs` and
`test-budget-approval-permissions.mjs`; the existing Settings routing and request
delete-permission suites preserve authorized behavior. These execute native
source against fixtures and are not a Creator compiler or mail-delivery test.
`test-construction-backend.mjs` additionally checks dual-parent create/update,
hidden/cleared input, exact Construction parents and unrelated profile behavior.
Its default saved-body gate still requires independent native workflow captures;
`--behavior-only` explicitly runs offline source behavior without claiming that
deployment gate passed.

The independent saved-body captures and current native verification status are
recorded in
[`live-install-progress.json`](../../creator/schema-changes/po-create-permission-2026-10-26/live-install-progress.json).
Only entries marked saved and independently reopened are confirmed installed.
All twenty-one function bodies and both validation workflows now have independently
reloaded Development captures matching the current reviewed source; each workflow
capture contains exactly one complete script action. Frontend 122.29.76 targets Development only. Native Production publishing remains user-owned, and final
in-app behavior is verified separately after the frontend deployment.
Creator's formatter has previously changed grouped conditions, so native bodies
must be compared while preserving literals and boolean grouping.
The independently reloaded `sendModificationEmail` and `modificationAdmin`
bodies normalize the actor-match grouping. Their actual native expressions are
adopted in source and pass the focused scope tests: the alternative routing-email
branch requires a nonempty routing email equal to the recorded approval email,
so it cannot authorize an empty recorded address.

Development View-as Custom APIs can execute as the publishing admin. The PO API
uses its existing Development-only authenticated-admin simulation contract;
Stage and Production keep the authenticated actor. The legacy modification,
Project and file API signatures have no preview actor parameter, so a publisher
View-as success does not prove that a real Demo login can mutate the same data.
Use an actual signed-in Demo session or explicit native execution identity for
denial verification. Live PO persistence, approval routing/delivery, native file
behavior and employee-profile enforcement must be reported only when tested.

For frontend rollback, restore the preceding Budget Manager environment mapping.
Retain the default-false field and native security guards; do not restore an
unguarded native function or delete request/approval/file records as part of a
widget rollback.

## Import assignment count and code filter — October 26, 2026

Budget 122.29.71 loads the exact missing Budget Item count after the usable landing
screen, shares the complete import read with the workspace, and refreshes the
toolbar after assignment. Different code filters assigned rows against the native
`Subdivision_Code + "-" + Minor_Code` key, preserving leading zeroes and existing
search/source filters. The existing shared numeric transition covers the toolbar.
No Creator backend deployment is required. See
[native contract, verification and rollback](../../docs/budget-import-count-and-code-filter-2026-10-26.md).

## Approval decision comments — October 22, 2026

Budget 122.29.70 shows per-approval comments in standalone modification details,
item history and modification approval cards. Approve and Reject save the note
to the exact existing `Budget_Approvals.ID` in `Approval_Notes`, alongside Status
and Responded_Date; the row remains linked through Budget_Modification/Budget.
There is no separate Add comment button or Comment_Log write. Existing Budget
track and managed PO decision comments already use the same native field.
Check/Wire requests retain their existing workflow availability.

Approved/rejected notes show their stored approver, role and response date.
Drafts survive re-render, modal close/reopen and failed writes, and stay scoped
to the authenticated actor/environment and approval ID. Existing ownership,
modification-admin delegation, required rejection notes, routing, email,
finalization and PO-linked modification handling remain. Duplicate modification
Approve clicks are guarded while the write is active, and acknowledged rows
are updated locally before the display refresh.

No new forms/fields/reports/functions/Custom APIs or Creator promotion is needed.
[Release verification and rollback](../../docs/budget-approval-comments-2026-10-22.md).

## Delivery strip composer — October 21, 2026

Budget 122.29.67 adopts the approved shared Delivery strip composer for Budget
and Project conversations.
[Release, regression coverage and rollback](../../docs/comment-delivery-strip-2026-10-21.md).

## Comment email and Post correction — October 21, 2026

Budget 122.29.66 uses stable shared Post feedback; the existing native comment
helper now follows the established typed owner lookup pattern and corrected email validation.
[Native checks, regression coverage and rollback](../../docs/comment-email-post-correction-2026-10-21.md).

## October 21, 2026 follow-up

Budget 122.29.65 adds shared owner-email comments for Budget and Project conversations and corresponding deep links.
[Creator requirements, checks and rollback](../../docs/comment-owner-email-2026-10-21.md).

## Parent-scoped deletion — October 20, 2026

Budget deletion requires Archive instead when any PO, Check/Wire request or PO
operation history remains. Request deletion preserves its files in Budget
Attachments, restoring a missing Budget link from the genuine request first.
Parent deletion preserves shared files/comments and Subdivision month records.
No new scheduled or global orphan delete is introduced. See the
[Creator changes, verification and rollback](../../docs/orphan-child-lifecycle-2026-10-20.md).

## Requests reveal together — 122.29.60, October 20, 2026

First entry shows one Loading requests state until the scoped native payment
report, managed PO List/Vendors and submitted PO child reads finish. Budget
Mods cannot briefly appear alone before their parent PO. Same actor/phase
refreshes retain the previous complete request rows; changed scope or failed
reads cannot retain old PO data. Existing read concurrency, authorization,
child-failure notices and action guards remain.

managePurchaseOrder and poActorResponse were saved in Creator Development
through the browser and reloaded to verify persistence. Creator formatting
removed grouped boolean parentheses; explicit intermediate flags preserve the
intended recovery, amendment permission/state and balance guards. The native
source regression passed with the explicit guards. Promote both functions
together to enable god-only Pending PO pencils. No new fields, reports or APIs.

Changed widget.html, widget config/hash, Requests regression and immutable
release/environment mappings. Full validation and Pages build required.
Rollback frontend: 122.29.59. Native guards preserve the approved behavior.

## God-only Pending PO edits — 122.29.59, October 20, 2026

Pending reserved POs gain Edit only with the exact global Budget/request grant
and fresh native canEditInFlight capability. Save changes preserves the existing
chain and decisions, recalculates linked automatic modifications, and sends no
mail. Draft/Rejected paths are retained; Approved stays read-only. Native phase
lock, revision, actor and grant are checked before writes; retain receipts and
read-only recovery for unknown writes. **Promote managePurchaseOrder and
poActorResponse together** to enable the Pending pencil. The widget hides it
against the old backend. No schema/report/API changes. See [implementation,
Creator handoff, regressions and rollback](../../docs/budget-po-cleanup-and-inflight-edit-2026-10-20.md).

## PO spacing, draft files and compact progress — 122.29.59, October 20, 2026

The first PO line has 6px of top padding beneath its column titles (4px more).
Subsequent rows retain compact 2px spacing. Draft file tabs now use the standard
upload area, empty state and file-type/name/actions grid without the save-first
paragraph. This fixes filenames squeezed into the 42px icon column across
PO/Budget Mod/Check/Wire drafts and retained pending files. Progress stays 540px
wide for Save, Submit, decisions, retry and deletion: the hidden-sidebar editor
selector no longer overrides its width. Other routine Budget/Legal progress
shells already cap at 540px; wider destination-table dialogs retain their columns.
Changed purchase-orders.css, request-attachments.js/.css, design guides and
widget version/release metadata; no forms, fields, reports, functions or Custom
APIs changed for the visual fixes. The in-flight editing addition below needs
two native function updates. Verify desktop Row/Spreadsheet
geometry, existing attachment/PO browser regressions, full validation and Pages
build. Rollback: Budget Production mapping 122.29.58.

## Link to Record select and Save — 122.29.58, October 20, 2026

The association picker highlights one selected row and saves from that same
screen. Save remains disabled until a row is selected. No review screen; no
write until Save. Helper: “Choose a request to link this attachment to.”
No Creator changes. See [release and regression notes](../../docs/budget-link-select-save-2026-10-20.md).

## Draft attachments and Link to Record — 122.29.57, October 20, 2026

New Budget Mods and managed POs queue files before creation, then upload to the
exact saved request and Budget. Link to Record uses choose → review → Save.
No new Creator promotion is required. See [draft files, recovery and rollback](../../docs/budget-draft-attachments-2026-10-20.md).

## Settings-based modification routing — 122.29.51, October 19, 2026

New standalone modifications and Draft submissions require the published
Settings Budget Modification rule. For CFO Always and COO Above $10,000,
$10,000 routes to CFO; $10,000.01 and $18,750 route CFO → COO. Configured
approver assignments supply recipients. No hidden adapter flag or legacy
VP/CFO/COO fallback may override the rule. Sent/decided chains remain captured;
existing submitted records are not automatically rerouted. PO-linked
modifications retain their PO approval path.

Creation validates routing before inserting. If capture subsequently fails,
the saved modification remains Draft and its exact ID appears in the terminal
error without duplicate creation, polling or email. Success still requires
Submitted, linked rows, exactly one first Pending recipient and a delivery stamp.
Chainless Submitted repair uses Settings, creates only Not Sent rows, and sends
no mail; Drafts, existing chains and orphan history remain untouched.

Five Creator functions must be compiled and promoted together to activate this
routing fix. PMP deploys Budget 122.29.51 and Settings 1.5.16 frontend assets;
it does not deploy Creator. [Files, native handoff, regression checks and rollback](../../docs/budget-modification-settings-routing-2026-10-19.md).

## Stable Purchase Order dismissal — 122.29.50, October 19, 2026

Close, X and Escape remove the real PO workspace, Summary and backdrop together,
restoring focus immediately. The composite overlay opts out of detached motion
exit copies: the old copy lost its ancestor CSS and shrank the 944px desktop card
to 800px after closing, while losing status styling and backdrop context. The
real opening fade, nested-picker Escape behavior and pending-write locks remain.

Changed files: `po-ui.js`, the shared `interaction-motion.js` and synchronized
widget source copies, Budget version/hash metadata, immutable 122.29.50 release,
Development/Production mappings, design guides and the desktop regression script
`scripts/test-po-dismiss-browser.mjs` (`npm run test:po:dismiss:browser`). Only
Budget receives a new release; other widgets retain their current deployments.
No forms, fields, Creator functions or Custom APIs change. No Creator deployment
is required. Desktop regressions cover Close/X/Escape, loading cancellation,
rapid reopen and geometry, nested picker dismissal, immediate focus/inert reset,
reduced motion and approval-write close locks. The test fails on the previous
code when a detached 800px card reappears. Rollback: restore the Budget environment
mappings to 122.29.49 and rebuild Pages; keep the permanent widget URLs.
Verification passed: `npm run validate`, `npm run build:pages`, the new PO fixture,
the shared interaction-motion browser fixture, numeric field-exit and seven-module
rollout fixtures, Pro Forma numbers, Insights numbers/desktop geometry/26,000-lot
performance, and Forecast. Every immutable Budget release asset matches source.

## Shared interaction motion — 122.29.48, October 16, 2026

Applicable tabs, disclosures, keyed rows, authorized refreshes, actual save
feedback, overlays, changed rows and progress meters follow the approved
[repository-wide interaction rule](../design/interaction-motion.md). Every new
feature must use the shared layer and explicit registry. Native field-exit
numbers, business timing and access guards remain. No Creator deployment is
required. [Coverage, checks and rollback](../../docs/interaction-motion-rollout-2026-10-16.md).

## Complete held numbers and scroll containment — 122.29.47, October 16, 2026

Numeric wrappers contain animation overflow so fitting tables do not acquire
scrollbars. Field-exit holds retain complete scalar results and semantic sign
color, including Pro Forma subforms. Native calculations/save timing and Creator
contracts remain unchanged; no Creator deployment is required.
[Changed files, desktop regressions and rollback](../../docs/number-subforms-and-scroll-2026-10-16.md).

## Stable numeric layout — 122.29.46, October 16, 2026

Held old numbers keep their natural width, baseline and position during typing;
real text sizes the committed transition. Insights also removes its visible
bottom description/page footer and fills that space with the matrix. No Creator
contracts or deployment changes. [Verification, files and rollback](../../docs/number-layout-and-insights-footer-2026-10-16.md).

## Keep old numbers visible — 122.29.45, October 15, 2026

Existing calculated numbers stay visible during typing, then transition on field
exit. Nested renders cannot erase the held old value. No Creator contract or
deployment changes. [Fix, verification and rollback](../../docs/number-old-values-visible-2026-10-15.md).

## Budget Manager field-exit numbers — 122.29.44, October 15, 2026

Derived visuals retain their last committed number during typing and replace it
once on field exit. Explicit choices remain immediate; native precision, model
calculations, accessible DOM values, exports and save/API timing are preserved.
No Creator contracts or deployment change. [Release evidence, regressions and
rollback](../../docs/number-field-exit-2026-10-15.md).

## Budget Manager number transitions — 122.29.43, October 15, 2026

Sliding push now covers financial matrices, item/category/phase/project totals, comparisons, PO commitments, modification/payment previews and counts.
Real values update immediately; native editable precision/caret, identities, dates,
financial math, permissions and existing save/approval/recovery gates are retained.
Reduced motion is immediate. No Creator forms, fields, functions or APIs change;
no Creator deployment is required. Production rollback: 122.29.42.
[Changed files, complete coverage and regression evidence](../../docs/number-transition-rollout-2026-10-15.md).

## Approval administration without Company or dates — October 13, 2026

Settings Manager's Approvals dialog starts on Approval rules and separates
ordered rules from Approvers. Cards show the route or assigned person and email;
Test route shows numbered recipients. Searchable pickers open above or below
their controls within the overlay so the editor footer cannot clip them.
The PO rule shows CFO without new modifications and VP → CFO → COO with attached
budget modifications. The existing budget calculations and captured PO routes
are retained.

Approval configuration now uses only Territory and Department and persists until
changed or disabled. `policyModel: territory-perpetual-v2` gates writes and route
testing until the matching Creator functions are promoted. The Creator handoff
deletes Company, Effective_From and Effective_To from Approval_Policy and
Approval_Role_Assignment; business Company fields, modification transaction
dates, audit JSON and submitted route snapshots remain intact. Review existing
configuration for scope collisions before removing these fields. Creator changes
are for the owner to promote. See the
[field removal and promotion handoff](../releases/approval-territory-perpetual-v2-2026-10-13.md)
and [approval administration guide](../design/approval-administration.md).

Regression: both PO route branches, exact recipients/order, Territory VP,
permanent assignments, Territory/Department overrides, ambiguous and disabled
scopes, unroutable people, submitter exclusion, read-only unknown-write recovery,
picker clipping and keyboard dismissal. Rollback Settings Manager to 1.5.2 and
restore the pre-removal Creator schema/functions and configuration backup
together; the prior frontend alone cannot restore deleted scope/date fields.

## PO budget context and vendor entry — October 13, 2026

Budget Manager 122.29.27 places Available, Remaining or Modification, and the
ordered required approvals to the left of the PO total. Item allocations are
grouped once, pending modification credits retain their existing meaning, and
shortfalls remain per item. Drafts use the read-only `PreviewApprovals` action on
`Manage_Purchase_Order` / `_DEV`, with scope and submitter derived on the server.
The preview creates no records and sends no email. Stale replies are discarded;
unresolved balances or routes show unavailable rather than guessed approvers.
Submitted POs display their captured chain. New modification routes support
VP → CFO → COO; CFO is the sole required role when no new modification is created.

Add New Vendor sits beside the Vendor label, matching Add line. It opens the
existing `Vendors` form in the authenticated environment. Reopening the vendor
picker refreshes its options while retaining the PO draft.

Settings Manager 1.5.2 preserves the mandatory CFO at its configured position
and provides Move up/down for the complete modification route. Its readiness
gate requires `policyModel: ordered-cfo-v1`. Publish the changed existing
`manageApprovalPolicies`, `resolveApprovalRoute` and `managePurchaseOrder`
functions before frontend promotion. No forms, fields or Custom APIs are added.
Existing submitted routes are unchanged. Native policy setup is Development only.

The three functions compiled in Development and were reopened to verify their
non-comment tokens against this source. Development's existing global policy
was updated in place to VP → CFO → COO when new modifications are created;
its ordinary CFO assignment was retained and its territory VP was enabled for
routing. COO membership still requires the owner's Dev user-record selection.
Production promotion is held pending approval of Creator's required Stage
publication; production widget mappings remain at their prior releases.

Regression: both route branches and CFO at step two; missing/duplicate/disabled
CFO; direct territory VP resolution; exact per-item shortfalls, pending credits,
stale preview responses, unavailable reads, vendor refresh and narrow layouts.
Rollback Budget to 122.29.26 and Settings to 1.5.1, and restore the three functions
from 7a5b89ef when reverting backend behavior. Preserve saved policies and routes.

## PO review and delete confirmation (122.29.26)

The approval chain uses green for approved steps, with amber Pending and red
Rejected. The footer retains its existing save/submit/decision actions and a
28px red trash icon; Saved POs and manual Refresh balances are removed while
automatic balance loading remains. The compact delete preview reuses budget
confirmation styling and shows vendor, amount, phase and exact captured child
counts. Cancel/Escape/backdrop restores the same PO and returns focus to trash.
The final deletion still uses its captured record set, duplicate guard,
three-stage progress and read-only unknown-reply recovery.

`managePurchaseOrder` List additionally returns existing `PO_Approval_State`
as `approvalState`, so report-denied profiles display Approved rather than the
header's Submitted lifecycle status. No form/field additions or approval,
email, commitment or deletion business rules change. Publish this function to
Creator. Regression: final status on API-only Requests, PreviewDelete counts,
Cancel/Escape with no Delete call, removed footer buttons, direct saved PO
entry, existing parent/children deletion and pending/unknown progress guards.
Rollback widget 122.29.25 and restore managePurchaseOrder from 8597451.

## PO Development profiles and approval attachment (122.29.23)

Owner-only native Development View-as selects the existing profile for PO
permissions and operation Actor. Stage/Production authentication remains strict.
A denied Check/Wire report no longer hides independently authorized PO cards.
Approval email summarizes the request and attaches a compact formatted Excel
file. See [scope, regression and rollback](../../docs/po-dev-profiles-email-2026-10-12.md).

## Attachment form and report rename (122.29.16) — October 11, 2026

Budget file records use `Attachment` and `All_Attachments`, retaining `Budget`
as the parent lookup and `File_field1` as the upload field. Budget deletion and
the existing attachment Custom APIs use the renamed form/report. The October 10
production `.ds` predates this rename; the October 11 Development export and live
Creator Development checks confirm it. Creator promotion remains with the user.
See the
[affected surfaces, regressions and rollback](../../docs/attachment-form-rename-2026-10-11.md).

## Attachment acknowledgements (122.29.12)

Native FILE success (`code:3000` without explicit API failures) now confirms
the captured upload even when Creator omits metadata or sanitizes filenames.
Fresh reads still require the exact attachment ID, parent and current scope;
unknown replies keep saved-file recovery and no-replay protections. Preview,
download, delete and existing write permissions remain unchanged.

Existing Purchase Order Summary and cost filters from 122.29.11 are retained.
Regression: metadata-free/root/data success, changed or omitted report metadata,
exact parent checks, native errors, held writes and read-only recovery. No
Creator publication is required. Production rollback: `122.29.11`. See the
[system save policy](../../docs/automatic-save-check-removal-2026-10-08.md).

## Empty budget detail reporting (122.29.6)

## Save policy — October 8, 2026

Acknowledged successful saves no longer compare refreshed editable/calculated
fields with the submitted payload. Record identity/count, real API errors,
preflight and duplicate-send guards remain; explicit unknown-reply recovery is
read-only. This supersedes earlier automatic field-equality requirements. See
[implementation, regressions and rollback](../../docs/automatic-save-check-removal-2026-10-08.md).

Successful category and item reads with zero matches are informational, including
full-report fallback checks. A criteria failure recovered by the full report is
a warning; a failed fallback rejects without publishing an empty financial
snapshot or replaying the failed read. This prevents false critical-error emails.
No forms, fields, functions, Custom APIs, or Creator publication are required.
Regression coverage executes the actual detail loader for empty, populated,
recovered, and failed reads. Rollback frontend mapping: 122.29.5.


## Main-page currency (122.28.36)

The project list rounds project totals, Avg $/Lot, phase Grand Total and $/Lot,
and preliminary/final summaries to the nearest dollar. Aggregation uses raw
amounts; detail/edit screens retain fractional precision. No Creator deployment
is required. Regression and rollback to 122.28.35:
[main-page dollar display](../../docs/main-page-dollar-display-2026-10-08.md).

## Currency presentation (122.28.33)

Dollar displays omit trailing `.00`, including project/phase totals, metric cards,
category/item/per-unit amounts, zero labels and request/modification balances.
Nonzero cents and editable precision remain intact; data and approvals are
unchanged. No Creator deployment is required. Regression and rollback to
122.28.32: [currency display release](../../docs/currency-display-2026-10-08.md).

## Full User Access owner names

Owner pickers and displays prefer User_Access.Full_Name, preserving original
record IDs and login/email permission identities. Blank names keep the existing
fallback. See [scope, verification and rollback](../../docs/owner-full-names.md).

# Budget Module

## Compact phase financial table (122.28.35)

The single-phase editor adopts the approved Compact table layout. Item codes
sit below wrapping names, category/lock/code metadata sits below wrapping
category titles, Per Unit appears once above compact row switches, and
Preliminary status badges stack beneath the heading. Note actions remain in
the item column. All eleven columns remain, including HCSS and GP actuals;
narrow screens retain the matrix's internal scrolling. All-phase and comparison
layouts retain their existing behavior.

Changed files: Budget widget HTML/CSS, version/hash manifests, immutable release
and production mapping, plus this module and the general style guide. No Creator
forms or fields, Deluge functions, Custom APIs, approval routing, financial
calculations or persistence contracts change. No Creator publication is required.

Regression: partial Development/Engineering locks with editable Construction,
long names/codes and notes, per-unit switches and unit/rate entry, monetary totals,
all eleven columns, narrow matrix scrolling, all-phase/comparison rendering,
repository validation and Pages build. Full validation and Pages build passed.
An offline fixture using the actual renderers and source CSS verified all eleven
columns at 1024/1366/1600px, long labels, saved-value checks, large rate inputs,
stacked statuses, and sticky headings during contained horizontal scrolling.
No Creator records were written during verification. Rollback: restore production
Budget mapping to 122.28.33
and rebuild Pages; retain the permanent Creator widget URL.

## Native attachment upload receipts (122.28.31)

Budget FILE uploads accept one documented metadata container: root or `data`
filename/path. The existing wrapper shape is preserved for downstream saved-file
verification. Malformed, conflicting and failed receipts remain unknown; file
receipt evidence cannot authorize alias replay or cleanup. Fresh exact child,
Budget parent and acknowledged path checks, inline spinner and read-only recovery
remain. No native Creator change is included. Source regressions passed; live
upload behavior remains unverified. See the [October 7 upload audit](../../docs/budget-attachment-upload-response-2026-10-07.md).
Rollback frontend mapping: 122.28.30.

## Vendor detail panel and centered header (122.28.29)

Check, Wire and Purchase Order share the approved Detail panel vendor picker.
The picker title bar contains the actual line-item name and code, with phase
and request type below. Rows show vendor name plus available location/contact;
name, vendor number, city/state and contact are searchable. Selecting a row
previews contact, phone, address and payment terms; Use Vendor commits the
candidate to the draft. Back, quiet Refresh Vendors and Use Vendor occupy a
separate footer. The list scrolls without shrinking rows, and the panel stacks
below it on narrow screens. Add Vendor still opens the native environment form.

Request details and preview center the vendor/Change section geometrically
in the title bar. Hovering or focusing the name shows its facts; click/tap also
opens them, while Escape, blur or leaving the popup dismisses them. Long names
wrap. Change returns to the picker with the current vendor selected and retains
request dates/amount. Missing optional facts show Not provided; no email field
is invented. Fresh counted vendor reads and scoped stale-response protection
are preserved, with projections expanded to live-verified existing Vendors
fields recorded in `creator/workflows/PAYMENT_REQUEST_LIVE_SCHEMA.md`.

Changed files: widget HTML/CSS, vendor projection regression checks, live schema
note, style/module documentation, version/hash manifests, immutable 122.28.29
and production mapping. No Creator form/field/function/Custom API changes or
backend publication. Financial math, eligibility and permissions are unchanged;
requests remain editable previews.

Regression: vendor search/selection, blank details, refreshed missing candidates,
retained drafts, title/header/hover keyboard behavior, desktop/narrow layout,
existing financial/stale-scope checks, repository validation and Pages build.
Actual-source UI verification confirmed two-step selection, city search, the
line-item/code title, a 320px stacked picker without horizontal overflow,
centered header and keyboard facts popup, Escape dismissing only the popup,
and retained dates/amount when changing vendors. No vendor or financial request
was created during verification.
Full repository validation and Pages build passed for this immutable release
and production mapping.
Rollback: production budget-manager mapping to 122.28.28 and rebuild Pages.

## Eligible items and compact request header (122.28.28)

The shared line-item picker for Bud Mod, Check Request, Wire Request and
Purchase Order omits items that fail its existing category/finalization rule.
Global and phase entry use the same picker. Finalized zero-value items remain
selectable; code ordering, name/code search, modification counts and string
record IDs are preserved. Empty lists distinguish no eligible items from no
eligible search matches.

Selected vendor and Change move into the title bar for Check, Wire and Purchase
Order details and draft preview. The body starts with the line item; tighter
rail/footer spacing removes the separate vendor row. Long names wrap, and
the header vendor occupies a second row below 460px. Change returns to vendor
selection without losing draft fields; earlier steps and Bud Mod hide this
header context.
Release 122.28.27 introduced this change; 122.28.28 keeps the Vendor label
on one line at narrow widths while the vendor name wraps.

Changed files: Budget Manager `src/app/widget.html` and `budget-layout.css`, version/hash manifests,
immutable releases 122.28.27–122.28.28, production mapping and style/module documentation.
No Creator forms, fields, functions or Custom APIs change; this frontend release
does not require Creator backend publication. Financial math and request/vendor
behavior are unchanged. The proposed vendor-picker designs remain mockups.

Regression: existing category eligibility across all four types, search,
zero-value finalized items, code ordering, full validation and Pages build.
Also check header vendor, Change/back draft retention, preview, and narrow fit.
Verification completed: full validation and Pages build passed. An actual-source
fixture verified category exclusions, missing categories, finalized zero values,
string IDs, sorting and search for all four types. The offline request UI verified
header vendor, Change preserving dates/amount, and draft preview. Check and
Wire also use the header; the corrected label and wrapped name fit a 320px
viewport without horizontal clipping. Production's live picker confirmed no
disabled/unfinalized rows and retained eligible zero-value items. No native
financial request or vendor record was created during verification.
Rollback: restore production budget-manager mapping to 122.28.26 and rebuild
Pages. Development and Stage mappings remain as configured.

## Budget rail request details (122.28.26)

The approved Budget rail design applies to global and phase Purchase Order,
Check and Wire details and draft previews. Dates and a larger currency input
occupy the left column, with the fresh Available Budget shown as its maximum
and GP Actuals below as reference. A compact right receipt shows Final, approved
Bud Mods, Revised Final, all same-line issued POs, Available Budget, the current
request and remaining balance. Nonnegative remaining values are green; negative
values remain red and block preview. Both columns stack below 580px.
Back, quiet Refresh Balance and Preview Draft share the footer; the existing
centered header X closes the dialog. Draft entry, native date picker, vendor
selection, fresh counted PO checks and financial precision are preserved.

Changed implementation: `widgets/budget-manager/src/app/widget.html` and
`budget-layout.css`, version/source hash manifests and immutable 122.28.26,
production mapping and this style/module documentation. Presentation only:
no Creator forms, fields, functions or Custom APIs change, and no Creator
backend deployment is required. Requests remain preview-only.

Regression: full repository validation and Pages build; actual-source request
balance, exact limit and one-cent overage checks; desktop side-by-side layout,
320px stacked fit, date picker, refresh preserving edits and draft preview.
Rollback: restore production budget-manager mapping to 122.28.25 and rebuild
Pages. Development/Stage mappings stay as configured.

Verification completed: `npm run validate` and `npm run build:pages` passed
with the immutable release and production mapping. The actual-source offline
composer verified global PO and Check flow, phase Wire flow, approved Bud Mod
math, one-cent overage blocking, exact-limit preview, custom date selection,
refresh retaining the draft, and no clipped details at 320px. No native
financial request or vendor record was created during verification.

## Payment request vendor and issued-PO receipt (122.28.25)

Global and phase Check/Wire/Purchase Order composers now select a finalized
budget item, then a searchable Vendor, then dates/amount and a live receipt.
Global entry first selects the Budget. Add Vendor opens the existing native
Vendors form in the authenticated environment; Refresh Vendors retains the
draft and reloads the fresh full counted `All_Vendors` projection `ID,Vendor_Name`.
The composers remain preview-only: no Payment Request writes or approval sends
were added, and the live Payment Request form has no Vendor field.

Receipt: Final Budget plus approved signed Bud Mods equals Revised Final.
Available Budget is Revised Final minus every issued Purchase Order on the same
exact Budget and Budget Item, regardless of paid status. The new request is
then deducted from Available Budget. GP Actuals remain reference-only and are
not deducted again from the full issued-PO commitment. No inferred unpaid
balance or invoice linkage is introduced. A negative result, including a
one-cent excess, blocks Preview Draft. Preview refreshes the PO read first.
Unknown amounts, denied/incomplete reads and stale scopes cannot become zero.
Modal identity, budget/item, navigation, authenticated actor/app/environment and
startup readiness guard late replies. Exact Creator IDs remain strings.

The live `All_Wire_Requests` report is available in Production, so its former
Development-only UI restriction was removed. The source is `Payment_Request`
with `Request_Type` exactly `Purchase Order`. [Live metadata](../../creator/workflows/PAYMENT_REQUEST_LIVE_SCHEMA.md)
records the verified field names. The owner approved the full issued-PO rule
and publication to main/Production on 2026-10-06. Each fresh counted read filters
`Budget`, `Budget_Item`, `Request_Type == "Purchase Order"`, validates every
string ID/parent/type/amount and sums `Request_Amount`. Empty verified results
are zero; failed or incomplete reads remain unavailable. No Creator
schema/function/API deployment is required for this preview functionality.

Changed files: Budget source/CSS/config/dependencies, widget/dependency
manifests, package validation, payment-request/currency/deferred-read tests and
this metadata/design documentation. Regression covers scoped fresh Vendor/PO
reads, exact IDs, stale/dismissed replies, malformed/foreign/duplicate records,
approved modification math, unknown values, exact balance and one-cent overage.
The editable sample mock shows the full flow and overage blocking. No saved
financial request or vendor test record was created. Rollback: 122.28.24.

Verification: full `npm run validate` and `npm run build:pages` passed. An offline
copy of the actual composer verified global Budget selection, finalized item,
Vendor selection, approved modification math, a one-cent overage with disabled
Preview, and a valid refreshed Draft Preview. The copy omits the SDK script for
sample data. All issued PO fixtures now load successfully; the owner example
100 + 5 - 75 = 30 passes, and changing GP invoiced amounts does not change that
availability. Full validation and the Pages build passed after integration with
current main and immutable 122.28.25 creation. Production mapping is 122.28.25;
Development/Stage mappings are preserved. [Receipt overage proof](../../creator/workflows/payment-request-candidate-overage.png).

## Global Add menu (122.28.23)

The main budget list has an Add menu at the right of the filter toolbar: Budget, a separator, Bud Mod, Check Request, Wire Request and Purchase Order. Budget opens a searchable subdivision picker using fresh full subdivision and budget reads. Subdivisions with an existing parent or matching subdivision code are excluded, including archived budgets. Either Edit All Budgets or Edit Owned Budgets permits creation; the creator is added to `Add_Budget.Budget_Owner`. Both existing permission field descriptions now state this behavior in Creator Development, Stage and Production.

Other global options choose a budget first, load its existing Requests workspace and open the existing composer. Bud Mod retains its existing edit/modification permissions. Check/Wire and Purchase Order share the existing preview-only item, date, amount, balance and budget-modification warning flow; this change adds no submission or persisted request records. Purchase Order is also available from the phase Request menu.

Creator function `createBudgetFromSubdivision` shares the original `All_Subdivisions` action's Development budget, template categories/items, HeavyJob prerequisite and six Not Sent approval rows. `Create_Budget_from_Subdiv` now calls it. The server uses the authenticated user's existing edit grants and rejects duplicate budgets, including archived budgets, before insertion. The progress dialog starts immediately, blocks duplicate commits and dismissal, and requires the exact string subdivision/budget IDs, nonzero integer category/item counts, six approval rows and server read-back verification. Pre-write failures can retry; ambiguous or partial writes allow only the read-only `check` action. There is no atomic cross-request uniqueness constraint; concurrent callers still require review if duplicates occur.

Changed implementation: `widgets/budget-manager/src/app/widget.html`, `budget-layout.css`, widget configuration/dependency/release manifests, `creator/functions/createBudgetFromSubdivision.dg`, report wrapper and permission descriptions. Affected forms/fields: `User_Access.Edit_All_Budgets`/`Edit_Owned_Budgets` descriptions and authorization; `Subdivision.ID`/`Subdivision_Code` and existing HeavyJob mappings; `Add_Budget` parent fields/`Budget_Owner`/`Approvals`; existing template fields in `Budget_Category`, `Budget_Item` and `Budget_Approvals`. No schema fields were added.

Development function compile/save/reload, report-wrapper persistence and both field descriptions were verified in Creator. With explicit user approval, the four scoped components were published to Stage and Production as Creator 9.51. The OAuth2 POST APIs `Create_Budget_From_Subdivision_DEV` and `Create_Budget_From_Subdivision` are enabled against their respective environments. Production widget 122.28.23 is promoted; Development and Stage widget mappings are unchanged. See [setup and acceptance](../../creator/workflows/GLOBAL_BUDGET_ADD_HANDOFF.md). An explicitly disposable Development budget-creation test remains outstanding.

Regression: actual-source tests cover exact large IDs, archived/existing subdivision exclusion, both edit grants, readonly denial, double-click and dismissal guards, malformed success/counts, read-only reconciliation and stale/dismissed navigation. Local browser checks cover the Add menu, global Purchase Order parent/item selection, amount/balance warning, existing request modal reuse and menu/picker fit at 420px. Full repository validation and Pages build passed with the immutable candidate. Rollback: widget `122.28.22`, original report action from the Creator export and prior permission descriptions; retain any saved budget records.

## Currency edit and financial precision repair (2026-10-05)

Manual `Add_Budget.Lot_Price` / `Land_Cost` and `Budget_Item.Prelim_Budget_Ttl` edits now preserve cents and supported additional fractional digits through rendering, focus, parsing, blur and the captured SDK payload. The old `parseMoney` and editable header formatters rounded to whole dollars; focusing a manual item also stripped its cents. Ordinary currency displays now include two decimal places; editable money retains additional fractional digits. Compact K/M labels remain abbreviated. Existing per-unit calculations retain their explicit two-decimal rate and total rules, reimbursement credits remain negative, and approval locks are unchanged.

The general financial reader `v()` no longer rounds native amounts before category/department sums, Budget/Pro Forma comparison projections, finalized amounts, GP/HCSS actuals and request balance checks. Parenthesized accounting amounts retain their negative sign in all financial parsers, header values and preliminary totals. Counts, native phase indices and approval sort indices keep explicit whole-number rounding at their callers. Regression coverage in `scripts/test-currency-edit-preservation.mjs` exercises the actual committing header/item handlers, unchanged focus/blur, additional decimals, credits, counts, aggregate/comparison totals and a one-cent request overage. No Creator form, field, workflow, function or Custom API change is required for this frontend repair. These offline checks do not establish current native field capacity. Rollback: map Budget Manager to `122.28.20` and rebuild Pages.

## Targeted approval Check failures (122.28.20)

A negative native object response without the existing targeted `ok` predicate
now ends Check reconciliation as unavailable, matching the JSON response path.
The original error, captured actor/environment/target and no-replay behavior
remain. Repair, write modes, known `ok:false` outcomes and native code failures
keep their prior handling. Actual native-boundary fixtures cover all four
approval/modification paths and stale-context replies. No Creator deployment is
required. Rollback: 122.28.19.

## Main-list attachment modal (122.28.18)

The phase paperclip now opens attachments over the main list, using the same file cards and upload area as the existing editor Attachments workspace. The main list, search, scroll, navigation generation and selected editor/drafts remain in place. Legal's blue top rail, compact file count, phase name and centered SVG Close are retained; Budget has no Email switch. The editor Attachments workspace remains available.

Each modal captures the exact loaded phase ID and startup/navigation/environment/app/actor scope, then requests fresh counted detail through the existing parent-scoped attachment loader. Closing a loading modal is safe; late replies cannot replace or reopen another phase. Errors remain unavailable with Retry rather than becoming zero. Verified upload/delete refreshes that phase's detail and existing badge patch/invalidation path without rebuilding the list. Read-only users retain Preview and Download. Busy writes block Close, Escape, navigation and conflicting file mutations; unknown uploads keep the existing read-only Recheck/no-replay controls. The native picker belongs to the modal session, so a file selection arriving after dismissal cannot upload into the retained editor.

The named dialog traps keyboard focus, makes the background inert, and restores the original paperclip focus and page scroll on close. Preview and Delete confirmation remain nested existing surfaces; Escape dismisses the active child first. Preview deletion resolves the exact retained child ID rather than relying on a stale file index. Existing `Attachment.Budget`/`File_field1` create, FILE verification, upload/delete failure guards and `Get_Budget_Attachment_Preview` PDF route are unchanged. No Creator schema, report, permission, function or API deployment is required.

Actual-source fixtures exercise the mounted landing/control handlers, canonical counted detail transport, exact large string IDs, fresh/retry/denied reads, dismissed-phase replies, environment/app/actor/startup/navigation changes, readonly/busy/review controls, native picker session retention, upload/delete scope and badge refresh, nested keyboard/focus/inert behavior, preserved list/editor/search/scroll and original editor workspace. The existing startup/FILE/no-replay, automatic badge and financial suites also pass. The user waived native UI gates for this presentation change; these checks do not claim a new live upload/delete or rendered browser visual check. Rollback: map Budget Manager to `122.28.17`.

## Attachment presentation and recorded author (122.28.17)

Budget's existing phase Attachments page follows Legal's attachment layout: a dashed upload area with Choose Files, clickable filenames, compact file-type cards, date/Added by details, and matching 34px Preview, Download and Delete icon buttons. The Email slider remains exclusive to Legal. Picker and drop both enter Budget's existing guarded upload flow; permission, busy and unverified-upload locks also apply to the drop area. PDF preview continues through `Get_Budget_Attachment_Preview`.

Attachment detail reads remain counted and scoped to `Budget`, with the existing empty-scope lookup fallback. They explicitly request `ID,Budget,File_field1,Date_field1,Added_Time,Modified_Time,Added_User`; the automatic background badge projection stays `ID,Budget,File_field1`. `field_config:all` is the report layout union and may omit system fields. Requesting `Added_User` explicitly is necessary to read the saved creator when its report layout omits it. Missing authors display `—`; `Modified_User`, an ID-only object and the current session are never substituted.

The existing access roster retains its additive `userName`, `approverEmail` and scalar `fullName` fields. A recorded `Added_User` identity matches these existing roster identities by exact case-insensitive whole string; a unique match prefers `fullName`. There is no email-local-part or username-suffix inference. Ambiguous or unmatched identities keep genuine native display data. The lean response conflict signature includes the additive roster fields, while existing permission flags and old three-field roster compatibility remain intact. The companion Creator function publication is managed separately; this widget does not alter permissions, report layouts, schema or write workflows.

Actual source fixtures cover file/date/parent/string-ID preservation, native and roster author shapes, missing/ambiguous authors, escaping, read-only/busy/review controls, drop guards, projected native counted detail reads, and lean roster conflicts. Existing startup/FILE/no-replay, badges and financial regression suites remain required. Native Dev/Prod layout, author availability, preview and unchanged financial rows still require the release gate; no new upload/delete is claimed from the offline fixtures. Rollback: map Budget Manager to `122.28.15`; the additive backend roster keys are backward-compatible.

## Approval sidebar clipping fix (122.27.25)

The phase View/Edit approval card now gives long approver emails room to wrap beside the status badge, and its desktop width increases from 285px to 315px. The approval status remains fully visible inside the card; the category summary tables continue to fit beside it. This is a frontend layout change only. No Creator form, field, function, Custom API, approval routing, or record data changes.

Regression: check the approval card at wide and narrower desktop widths with long emails and all statuses, both summary tables, and the phase View/Edit modes. Rollback by mapping `budget-manager` to `122.27.24` and rebuilding Pages.

## Check and Wire request details (122.27.24)

The Requests menu now has three direct choices: Bud Mod, Check Request, and Wire Request. Check and Wire open the existing finalized-budget-item picker immediately, then a request details modal. The selected item's Department appears as a chip beside its name and code. Request Date defaults to today, Date Needed starts blank, and both use the widget's custom calendar picker while remaining editable. Request Amount is entered in the modal.

The modal previews the selected item's Final Budget, approved prior modifications, current modification (zero until a request can link one), Revised Final, GP Actuals, Remaining to Spend, and Remaining After Current Request, all to the cent. A negative after-request balance shows the budget modification warning. This remains a preview-only first step: Check and Wire requests are not saved or submitted, and the Development-only Creator form/report are not promoted by this widget release. No Creator function or Custom API changed.

Regression: verify all three menu choices, Check and Wire item search/finalized filtering, Development and Construction Department chips, calendar month navigation and selection, date and amount edits, one-cent overage warning, Back/Close, and the existing Bud Mod flow. Rollback the widget by mapping `budget-manager` to `122.27.23` and rebuilding Pages; Creator components are unchanged.

## Requests workspace start (122.27.23)

The phase editor's Modifications tab is now Requests. Approvals, Attachments, and Requests keep the budget identity heading but hide the owners, metrics, category summaries, and compact approvals row. Requests has a Request menu with Budget Modification (the existing composer and approval flow) and Check/Wire Request, plus separate columns for existing modifications and check/wire requests. The modification close button now uses a centered SVG, as do the new request steps.

Check/Wire Request begins with Check or Wire, uses the existing finalized-budget-item picker, then shows the selected item, a Department derived from its category (Engineering maps to Development), an editable Request Date defaulted to today, and a blank editable Date Needed. This first pass stops there; it does not create a record or start approval. The read-only request list uses `All_Wire_Requests` scoped to `Budget` in Creator Development. The `Check_Wire_Request` form and report remain Development-only from the earlier form setup; Stage and Production show an availability state until the owner publishes them. No Creator function or Custom API changed for this widget release.

Regression checks: mode visibility and return to View/Edit, existing modification creation/detail actions, Request menu, Check and Wire selection, finalized-item filter/search, both Department mappings, editable dates and Back state, centered close buttons, and narrow modal layout. Rollback the widget by mapping `budget-manager` to `122.27.22`; Creator components are unchanged by this release.

## Manual header inputs and per-unit preliminary pricing (2026-09-29)

The phase budget header's five inputs belong to `Add_Budget`: `Lot_Total_Residential` (Lots), `Acres`, `Equiv_LF_of_Street` (Equiv. LF), `Lot_Price`, and `Land_Cost`. Users enter them in the Budget Manager under the existing edit permission and approval locks. Lot Price and Land Cost were already manual; Lots, Acres, and Equiv. LF are newly editable. Existing saved values remain in place. The Budget no longer refreshes those quantities from Zoho Projects/Analytics or the linked Subdivision.

Each `Budget_Item` has optional `Unit` (`Acre`, `LF`, `Lot`) and `Per_Unit` (USD currency, two decimal places) fields, matching the Pro Forma item fields. The row's Per Unit switch is widget state; the two source values and calculated `Prelim_Budget_Ttl` are persisted. The selected unit maps to that phase budget's manual header input:

| Unit | Budget quantity |
| --- | --- |
| Acre | `Add_Budget.Acres` |
| LF | `Add_Budget.Equiv_LF_of_Street` |
| Lot | `Add_Budget.Lot_Total_Residential` |

With Per Unit on, `Prelim_Budget_Ttl = round2(quantity × Per_Unit)` and the calculated total is read-only in the widget. As in Pro Forma, a unit, a positive unit cost, and a positive matching header quantity are required for a calculated row. A header quantity edit recalculates its dependent rows. Switching Per Unit off clears `Unit` and `Per_Unit` and returns the preliminary total to manual entry; the current total remains available to edit. Existing reimbursement credit sign rules and Development/Construction approval locks still apply to the resulting preliminary amount. The widget continues to save the normal preliminary total used by category, grand-total, approval, and comparison calculations; there is no separate downstream per-unit total.

Creator Development now has two optional `Budget_Item` fields (`Unit`, `Per_Unit`), both `All_Budget_Items` report quick-view columns for SDK reload, removal of the three quantity `disable` statements from `Hide_Disable_Fields_Budge`, and removal of the three `Budget_Category` plus three `Add_Budget` quantity assignments from `Update_Budgets_w_Projects1`. That schedule continues to import Subdivision data and update budget Project, Status, and Phase identity fields. No new Custom API or standalone Deluge calculation function is required; the widget calculates and persists the preliminary amount. The exact Creator edits and remaining verification are in `creator/workflows/BUDGET_MANUAL_METRICS_CREATOR_DEV_HANDOFF.md` and the two adjacent scoped workflow patches. Development schedules are suspended, so the persisted source can be checked there, while the next executing environment must verify that manual values are not overwritten. A real SDK record fetch has not yet been verified.

The Creator changes remain in Development for the owner to promote through Stage and Production. The promotion set is the two fields, the item report, the Add Budget on-load workflow, the Projects sync schedule actions, the two Budget Category lock workflows, and `exportBudgetSnapshot`; the widget's GitHub Pages promotion is independent of Creator publication. Regression checks: manual header save/reload, all three unit calculations, zero/missing quantity and rate validation, switching back to manual entry, header quantity changes, reimbursement credits, both approval track locks, PDF and Excel output, and a schedule run after Creator promotion. Rollback the widget by mapping `production.budget-manager` to `122.27.21`; restore prior workflow and function bodies through Creator publication if their behavior must be reversed. Leave optional item fields in place to preserve saved data.

The widget Export dropdown's PDF and Excel files are generated by Creator function `exportBudgetSnapshot`. Its Development source now includes each item's Unit and Cost per Unit after Budget Item in the regular PDF line-item table and Excel Budget Detail worksheet. Manual items show blank values; Excel keeps the price numeric with Money formatting. The automatic `APPROVED_PDF` path retains its original eight-column table. The change was saved and verified after reloading the Creator editor, but generated files still need a priced and manual record check before the owner promotes Creator. The update record is `creator/functions/BUDGET_EXPORT_PER_UNIT_HANDOFF.md`; no widget Custom API request change is needed. The two `Budget_Category` on-load workflows now disable `Budget_Items.Unit` and `Per_Unit` under the same locks as `Prelim_Budget_Ttl` in Development.

Widget release `122.27.22` highlights only missing or zero required header values. An enabled Per Unit row pulses the Unit picker until selected, then Cost per Unit until positive. Missing data focuses the needed row or header field and blocks in-widget navigation and approval submission; turning Per Unit off returns the row to manual entry. PDF and Excel export waits for header and per-unit pricing saves to finish so attached files use persisted values.

## Rejection progress (122.27.18)

Development and Construction Reject open the same paced modal as Approve. `Handle_Approval_Action` accepts `CheckReject` and `RepairReject` for the targeted budget and row. It verifies the rejecting row is Rejected, its immediate predecessor is the only Pending row, the parent track is Pending, and the predecessor's `Sent_Date` was stamped after return mail. `RepairReject` only reactivates that predecessor and sends missing mail. Budget Modification's confirmed Reject also opens progress: `Modification_Admin` `check-reject` verifies the targeted row and parent are Rejected, the note matches, and no row remains Pending; `repair-reject` can reconcile the parent without resending notifications. Its email helper has no persisted notification stamp, so a lost response yields a warning instead of a delivery claim. Both paths use a 20-second deadline and one guarded repair. Creator deployment: `handleApprovalAction` and `modificationAdmin`; no new fields or Custom APIs. Regression: prior-approver return, failed mail, missing predecessor, modification rejection with and without prior approvers, ambiguous response, retries, duplicate clicks, focus/Tab/Escape. Rollback: widget `122.27.17` and prior function bodies.

## Approval initiation progress (122.27.17)

The Development and Construction track Submit for Approval actions open the same modal as Budget Approve. `startApprovalChain` guards an already active track and leaves the first row's `Sent_Date` empty until `sendApprovalEmail` succeeds. The existing `Handle_Approval_Action` API supports `CheckStart` and `RepairStart` for the selected budget, track, and first row. Success requires a Pending parent track, exactly one Pending row (the first), no Approved row, and a populated delivery stamp, role, and address. An active first approver without a stamp ends in the email warning; an unverified route ends in error. A retry checks the targeted state before a safe email repair or start. Rollback: Budget Manager `122.27.16` plus the prior `startApprovalChain` and `handleApprovalAction` function bodies.

## Modification send progress (122.27.16)

Both the new Modification composer and an existing Draft's Submit for approval action open the same accessible, paced progress dialog used by Budget approvals. It verifies only the targeted modification through `Modification_Admin` `check-send`, with one `repair-send` attempt after five seconds and a 20-second deadline. Success requires Submitted, a linked approval chain, the first row as the only Pending row, no Approved rows, and a populated `Sent_Date`, role, and email address. The create and submit functions now return the modification ID or a recoverable result even when email fails; retry checks persisted state before sending again. The dialog keeps success, email warning, or error visible until dismissal and blocks duplicate submission. Release `122.27.16` requires publishing `modificationAdmin`, `createBudgetModification`, and `submitBudgetModification` before widget promotion. Regression: both submit paths, delayed email, missing recipient, email exception, duplicate click, ambiguous create response, focus/Tab/Escape, and existing Budget approval. Rollback: restore `122.27.15` and the prior three Creator function bodies.

## Approval progress presentation (122.27.15)

The approval dialog follows Pro Forma Submit to Legal's visual pattern: gradient navy header and progress bar, three numbered phase rows with Running/Up next/Done/Failed chips, and a footer that holds Retry email, Try again, and Close as appropriate. Verified phase updates are displayed one at a time, 560 ms apart; only the display is paced. The API poll interval and 20-second reconciliation deadline are unchanged. The dialog never auto-closes, and Close remains disabled until a terminal result. Focus stays inside the dialog; Escape works after the result is safe to dismiss. The Creator function and Custom API are unchanged from `122.27.14`.

## Approval progress and reconciliation (122.27.14)

Budget track Approve opens an in-widget dialog immediately. It shows Recording approval, Activating the next approver, and Sending approval email; the final approver sees Completing approval track and Finalizing budget instead. The dialog polls only the existing `Handle_Approval_Action` Custom API with `approvalAction: "Check"` about once per second. The updated `handleApprovalAction` function returns the scoped approval row and track snapshot. Success requires the triggering row Approved, its immediate successor as the only Pending row, and both `emailSent` and `sentDate`. `emailSent` is derived from `Budget_Approvals.Sent_Date`, which is now cleared when the successor activates and stamped only by `sendApprovalEmail` after `sendmail` succeeds. A final step also requires every track row Approved, no Pending row, the `Add_Budget` track status Approved, and reconciled `Budget_Item`, `Budget_Category`, and budget Final/Unapproved totals.

After five seconds without verification, the widget makes one `Repair` call through the same API. It can activate the immediate successor and send its missing email, or resync a completed track's parent status. It never replays financial finalization on a partial result, because that would risk clearing Final amounts. The modal ends after 20 seconds with a notification warning (active successor, missing email) or a conflict/error, offering Retry email or Try again as appropriate. Escape and Close work only after a terminal state; approval actions remain disabled while the dialog is open. The API keeps its existing POST name, OAuth scope, and argument list; no new Creator form, field, report, or Custom API registration is needed.

Creator deployment is required: save `handleApprovalAction` in Development, publish only that function through Stage and Production, then promote the widget release. Regression: middle/final approval, delayed routing, email failure and retry, wrong or multiple Pending rows, stale action, final financial mismatch, request/API failure, timeout, duplicate click, keyboard focus/Tab/Escape, and narrow viewport. Rollback: map Budget Manager to `122.27.13` and restore the previous `handleApprovalAction` body from git through Creator publication.

## Archive and delete controls (122.27.12)

Each phase row shows a three-dot menu before View. Archive/Restore and Delete are always present; users without `User_Access.Delete_Archive_Budgets` see both disabled. The server repeats the permission check through `Manage_Budget`, so the UI is not the security boundary.

Archive writes `Add_Budget.Archived`. Delete permanently removes the selected budget's `Budget_Approvals`, `Budget_Modification`, `Budget_Item`, `Budget_Category`, `Budget_Months`, `Attachment`, and `Comment_Log` children before removing `Add_Budget`. Existing `Budget_Import_Item` history is retained and its deleted-item lookup assignments are cleared. The confirmation modal lists the seven deleted child object types. `All_Budgets` must expose `Archived`; `getUserAccess` must return `budgetDeleteArchive`; Custom API `Manage_Budget` is POST/OAuth2/All users with `{budgetId, action, userAccessId}`. Rollback: Creator prior app version and widget `122.27.11`.

## Attachment and comment actions (122.27.5)

Project comments are 30% larger. Each phase now shows a Legal-matching paperclip attachment count followed by its comment count; both phase controls match Legal at 28.75px with the same hover treatment. The Actions column is sized for all four controls and lets count badges render without clipping. Attachment counts load from the existing `Attachment.Budget` records and open the phase's existing Attachments workspace. Rollback: `122.27.4`.

## Comment Log on Projects and Budgets (122.27.0)

Project cards use `Comment_Log.Project` for overarching project discussion; phase rows and the phase-editor toolbar use `Comment_Log.Budget` for budget-specific discussion. Counts and the teal recent-activity state share the Pro Forma seven-day rule. The Comment Log form/report and the `Validate_Comment_Log` workflow must expose and preserve both parent lookups. Rollback: `122.26.9`.

## Centered editor controls (122.26.9)

Equal outer toolbar columns center the entire editor control group across the page. Breadcrumb and controls retain a common vertical center on wide screens; controls use a centered second row below 1400px. Browser fixture verified horizontal center at 2200px, no breadcrumb overlap, and no page overflow at 390px. CSS and release metadata only; no forms, fields, functions, Custom APIs, or Creator deployment changes. Regression: wide/narrow toolbar, long breadcrumbs, and navigation. Rollback: `122.26.8`.

## Toolbar alignment and back button (122.26.8)

Breadcrumb and action controls share a vertically centered desktop row, wrapping on smaller screens. Back buttons match the Pro Forma navy gradient, dimensions, hover, and focus styling; pointer cursor includes the SVG. Verified equal toolbar centerlines at 1600px and no horizontal overflow at 390px. Changes are presentation CSS, version metadata, release, and production mapping. No forms, fields, functions, Custom APIs, or Creator deployment changes. Regression: back navigation, comparison return, keyboard focus, and narrow-screen controls. Rollback: `122.26.7`.

## Scope

Budget landing, phase/category/item editing, HCSS and GP actuals, preliminary/unapproved/final states, approval tracks, attachments, PDF generation, and Proforma comparison.

## Approval tracks

- Development track locks Development and Engineering.
- Construction track locks Construction.
- Both tracks can be active independently.
- Finalization moves the applicable Unapproved amounts into Final and clears workflow-owned Unapproved values according to current Deluge logic.

## Attachments

Attachments use one `Attachment` record per file:

- lookup: `Budget`
- file field: `File_field1`

The working in-widget PDF preview uses `Get_Budget_Attachment_Preview`.

Do not replace it with `ZOHO.CREATOR.API.readFile`, blob URLs, direct Creator download URLs, or Creator stock preview links; those approaches previously produced blank pages or downloads instead of embedded previews.

## Phase header label removal (122.26.7)

Removes the Phase budget eyebrow; the phase title remains vertically centered beside its icon. Project budget labeling is unchanged. Promoted Budget Manager to development, stage, and production. Frontend only; no forms, fields, functions, Custom APIs, or Creator deployment changes. Regression: phase title, icon, and status rendering; project heading retains its label. Rollback mappings: development `122.24.4`, stage `122.24.3`, production `122.26.6`.

## Budget identity header (122.26.6)

Phase and project editors group the title and status badges in a bordered, subtly shaded header with a blue accent, budget icon, and Phase budget / Project budget label. Titles expose heading semantics; narrow screens wrap badges below a divider. Changes: header rendering and layout CSS, version manifests, immutable release, and production mapping. No Creator forms, fields, functions, Custom APIs, or Creator deployment changes. Desktop and 390px header fixtures visually checked; regression scenarios include phase/project navigation, long titles, empty statuses, and locked/approved badges. Rollback: `122.26.5` via the production mapping.

## Project Pro Forma controls (122.26.5)

The comparison action uses a saturated blue background with white text and visible hover/focus states. A selected Pro Forma retains a white dropdown background and blue border. Frontend styling only; no Creator deployment or contract changes. Regression: selected/unselected dropdown, hover/focus, and comparison navigation. Rollback for both visual updates: `122.26.3`.

## Single-owner project pill (122.26.4)

A project with one owner uses an intrinsic-width pill, a singular Owner label, and an unbordered avatar/name inside the outer pill. Multiple-owner and empty states keep their existing layout; owner editing and permissions are unchanged. Frontend only: no forms, fields, functions, Custom APIs, or Creator deployment changes. Regression: single, multiple, and empty owners with and without editing permission; long names at narrow widths. Rollback release: `122.26.3`.

## Compact project and budget layout (122.25.0)

122.25.3 softens the landing palette: blue-gray page background, blue project headers and edge accents, tinted metadata and table headers, and alternating phase rows. CSS-only presentation change in `budget-layout.css`, with widget/release version metadata updated. Expanded rows were visually checked; no dimensions, controls, Creator forms/fields, functions, or Custom APIs change, and no Creator publication is required. Rollback: `122.25.2`.

122.25.2 increases breadcrumb text to 14px and the back control to 36px. Project search and project/territory/status filter changes expand matching projects; manual collapse still works afterward. The Pro Forma picker floats over the page instead of enlarging its metadata row, with aligned owner controls. Browser checks confirmed unchanged row height when opening the picker, automatic expansion, manual collapse, and navigation sizing. Frontend-only changes in `widget.html` and `budget-layout.css`; no Creator forms, fields, functions, APIs, or publication change. Rollback: `122.25.1`.

122.25.1 removes the landing title/count row, places Expand/Collapse immediately after Status, and uses white bordered filter controls with a blue search icon. Changes are confined to `widget.html`, `budget-layout.css`, and release metadata; no Creator fields, functions, APIs, or publication are affected. Verified the heading removal, button position and expansion behavior in the browser; repository validation and Pages build pass. Rollback for this toolbar update is `122.25.0`.

- Projects start collapsed; the disclosure control or project heading shows their phase budgets. Expansion is retained while navigating within the widget. Project/phase search combines with the existing project, territory, and status filters.
- Lifecycle statuses come from the loaded budgets, including blank statuses. The searchable Status dropdown supports multiple selections, Clear, Done, keyboard navigation, and Escape. No selection includes all statuses.
- Users with owner-edit permission click populated owner names on project cards or phase budgets to open the existing owner dialog. Empty owners retain Add owners. Populated Project Pro Forma associations and external mapping values use the same hover affordance; existing permission checks and save paths still apply.
- Category and line-item dimensions match 122.24.4. The lighter Budget/Pro Forma styling is in `widgets/budget-manager/src/app/budget-layout.css`; controls, financial columns, approval locks, and workflows remain available.
- Frontend only: no Creator forms, fields, Deluge functions, or Custom API contracts changed. No Creator publication is required.
- Existing data paths remain `Add_Budget.Status` / `Budget_Owner`, `Project.Proforma`, and `External_System_Mapping.Subdivision1` / `External_System` / `External_Code`. Frontend changes cover landing filter/card rendering, owner/mapping renderers, editor headings, and presentation CSS. Approval, financial calculation, export, attachment, and persistence functions are unchanged.
- Regression: combine status/project/territory/search filters; expand projects and return from a phase; edit populated/empty owners and mappings with and without permission; open all phases, comparison, approvals, attachments, modifications, imports, and export menus. Local fixture writes are confined to the design lab.
- Rollback: point `production.budget-manager` in `deploy/environments.json` to `122.24.4` and redeploy Pages. Keep the permanent Creator widget URL.

## Diagnostics

The Audit Log control lives at the top-right of the application bar. It opens a right-side drawer consistent with Pro Forma Manager and must remain available in every Budget view.

## Pro Forma comparison

- The comparison table header remains visible at the top of the comparison view while its rows scroll.
- Acres, Lots, and LF header metrics have a bounded width and stay aligned to the right edge of their comparison column.

## Budget Modifications (after-finalized changes)

Created 2026-08-13 in the live Creator app as the backbone for post-finalization budget changes.
An approved modification is a delta on top of the approved Final (`Budget_Ttl`); it never overwrites Final.
Revised Final = `Budget_Ttl` + sum of approved modification amounts (Increase positive, Decrease negative).

- Form: `Budget_Modification` (display "Budget Modification")
- Report: `All_Budget_Modifications` (display "All Budget Modifications"; auto-created with the form)

Fields (link name — type — notes):

| Link name | Type | Notes |
|---|---|---|
| `Budget_Item` | Lookup → `Budget_Item` (displays `Item`) | mandatory |
| `Budget_Category` | Lookup → `Budget_Category` (displays `Category`) | for category rollups |
| `Budget` | Lookup → `Add_Budget` (displays `Budget_Name`) | for phase rollups |
| `Modification_Type` | Dropdown: Increase, Decrease | mandatory |
| `Amount` | Currency (USD) | mandatory; always positive, sign comes from `Modification_Type` |
| `Reason` | Multi line | mandatory; audit trail |
| `Reference_Number` | Single line | e.g. CO-014 |
| `Effective_Date` | Date | |
| `Status` | Dropdown: Draft, Submitted, Approved, Rejected | default Draft |
| `Approval_Track` | Dropdown: Development, Construction | which approval track gates it |
| `Approved_By` | Single line | stamped on approval |
| `Approved_On` | Date-Time | stamped on approval |

Only records with `Status == "Approved"` count toward Revised Final. Pending (Submitted) amounts
are displayed separately in the widget (amber), mirroring the Unapproved convention.

### Modification approval track

Modification approvals reuse the existing `Budget_Approvals` form (added 2026-08-13):

- `Type1` gained a fourth choice: `"Modification"` (existing choices untouched).
- New lookup `Budget_Modification` → `Budget_Modification` (displays `Reference_Number`) so each
  Modification-type approval row references the specific modification it gates.
- Chain rows carry the usual `Approver`, `Title` (VP/CFO/COO...), `Status`, `Sort_Order`,
  `Sent_Date`, `Responded_Date`, and the phase `Budget` lookup.

### Rejection semantics differ by approval system (added 2026-08-17)

All three approval systems share `Budget_Approvals`, but rejection does not mean the same thing in
each, and this is the single most confusing part of the table:

| System | Row key | Parent status | Reject |
| --- | --- | --- | --- |
| Budget track | `Budget` + `Type1` (Development/Construction) | `Add_Budget.*_Budget_Approval_Status` | Bounces back one step; chain stays alive |
| Pro Forma | `Proforma` | `Add_Pro_Forma.Status` | Bounces back one step; chain stays alive |
| Modification | `Budget_Modification` | `Budget_Modification.Status` | **Terminal** |

A modification is a discrete proposal, so bouncing it back to a VP who already approved would just
re-approve an unchanged request. Terminal rejection is deliberate — but it left the record with no
way forward, because Submit only renders for `Draft`. `modificationAdmin("reopen")` is the exit:
it deletes the chain, clears `Approved_On`/`Approved_By`, and sets the record back to `Draft`, where
the normal edit-then-submit path takes over. The chain is rebuilt rather than reset so a resubmit
picks up the current territory VP and the current COO threshold. Surfaced in the widget as
**Revise & Resubmit**, gated behind `canSubmitMod` (Edit Owned Budgets, or modification admin).

Anything walking this table generically must classify rows by **which lookup is populated**, not by
`Type1` — pro forma rows do not reliably carry a `Type1` value.

### Approval watchdog (`approvalWatchdog`)

Sweeps every chain and repairs the ones stalled with no active approver; emails a summary only when
it finds something. Auto-repairs: budget tracks (promote next / activate first), pro formas (promote
next, or stamp `Approved` when every step already approved), and modifications (delegates to
`sendModificationEmail` with `created`/`approved`/`rejected`, which already picks the next approver
and runs the rollups). Also rebuilds chains for `Submitted` modifications that own no approval rows,
and counts orphaned Modification rows as a health signal.

Reports without touching rows: a budget or pro forma chain where a rejection never landed back on a
prior approver (guessing which row to reopen could reverse a decision someone made), a chain fully
approved while the parent still reads Pending (may mean finalization failed — flipping the parent
would hide it), and rejected modifications, which are listed separately as awaiting revision rather
than counted as stuck.

### Modification email function / Custom API

- Deluge function: `sendModificationEmail(int modificationId, string action)` — source mirrored at
  `creator/functions/sendModificationEmail.dg`. Actions: `created` / `approved` (emails the next
  pending approver in the Modification chain and stamps `Sent_Date`; on `approved` with no pending
  approver left it stamps the modification Approved + `Approved_On`/`Approved_By`), `rejected`
  (stamps Rejected and notifies approvers who had already approved).
- Custom API: `Send_Modification_Email` — POST, OAuth2, All users, `application/json` key-value
  `{modificationId, action}`; endpoint `https://www.zohoapis.com/creator/custom/wbdevelopment/Send_Modification_Email`.

### Revised Final on Budget_Item

`Budget_Item.Revised_Final` (currency, added 2026-08-13) persists Revised Final on the item record
for reports and downstream consumers. It is maintained by:

- `recalcItemRevisedFinal(int itemId)` — sets `Revised_Final = Budget_Ttl + sum(approved mods)`;
  called by `sendModificationEmail` when a modification chain completes (action `approved`).
- `recalcAllRevisedFinals()` — batch: recalcs every item with modifications and resets stale
  values on items without mods. (The nightly schedule that ran this was removed by Robby on
  2026-08-13; the function remains available for manual/on-demand runs.)
- `createBudgetModification(...)` / Custom API `Create_Budget_Modification` — creates the
  modification record, a two-row approval chain (VP + CFO, both rbelliveau@wbdevelopment.com,
  recipients editable in the widget), and sends the first approval email atomically. The widget
  no longer inserts these records client-side.

The widget computes Revised Final live from `All_Budget_Modifications`; the field is the
persisted mirror, not the widget's source.

- `submitBudgetModification(modId)` / Custom API `Submit_Budget_Modification` — promotes a Draft
  modification: builds the two-row chain if missing, marks Submitted, sends the first email.
- `modificationAdmin(action, ...)` / Custom API `Modification_Admin` — admin operations gated by
  `User_Access.Edit_Delete_All_Modifications`: `update` (edit any modification's fields; recalcs
  Revised_Final when Approved), `delete` (removes the modification AND its approval rows; recalcs),
  `repair` (relinks orphaned Modification approval rows on a budget to their modifications and
  removes unreachable leftovers; idempotent, no email — the widget auto-invokes it when it sees a
  Submitted modification with no chain).
- Email deep links carry `budgetId` + `modificationId`; both are declared page variables on the
  Budgets page (`Budget_Management1`), and the widget opens the phase in Modifications mode with
  that modification's detail.

### COO approval threshold (legacy, superseded October 19, 2026)

The old `Settings.COO_Approval_Threshold` currency field controlled a fixed
VP → CFO → optional COO chain. After the five-function Creator promotion above,
standalone Budget Modifications instead evaluate the published Settings
Budget Modification policy. Configure COO's Above or At or above condition and
Threshold ($) there; changing the old global field does not change that rule.
`sendModificationEmail` still traverses the resulting ordered chain unchanged.

### Approval reminders (added 2026-08-16)

`Settings.Approval_Reminder_Interval_Days` (number, default 3) and
`Settings.Next_Approval_Reminder_Date` (date) drive `sendApprovalReminders()`, run by the
**Send Approval Reminders** schedule (daily, 07:00). The function no-ops until
`Next_Approval_Reminder_Date` arrives; on the due date it re-sends the approval email for every
`Budget_Approvals` row still `Pending` — budget tracks via `sendApprovalEmail`, Pro Formas via
`Send_Proforma_Approval_Email`, Modifications via `sendModificationEmail(..., "created")` — then
advances the date by the interval. A blank date arms it (interval days out) without sending.
The schedule runs daily rather than on the date itself because a Creator schedule cannot retarget
itself; the date field is the real gate.

### Modified Final rollups (added 2026-08-16)

Modified Final = Final + approved modification deltas, persisted at two levels:
`Budget_Category.Modified_Final_Total` and `Add_Budget.Modified_Final_Grand_Total`, maintained by
`recalcBudgetModifiedTotals(budgetId)`. It recomputes from the modification records (not from
`Budget_Item.Revised_Final`) so a stale Revised_Final cannot skew the rollup. Called when a
modification chain completes (`sendModificationEmail`) and on admin update/delete
(`modificationAdmin`). The widget's summary matrices compute the same figure client-side and only
render the Modified Final column when the budget has at least one approved modification.

### Territory defaults (added 2026-08-14)

Form `Territory` (report `All_Territories`, app menu section "Territories") holds per-territory
defaults: `Territory_Name` (single line, mandatory, unique), `VP` and `Dev_Mgr` (multi-select
lookups to `User_Access`, display `User` — same record-ID convention as `Budget_Owner`).

`Territory_Name` must match the **Subdivision.Territory** picklist value verbatim (e.g.
"Temple/Belton"); a budget resolves its territory as `Add_Budget.Subdivision1.Territory`
(Add_Budget itself has no Territory field).

**Routing email**: `User_Access.User` is a Users picklist that returns the Zoho *login name*
("jking_wbdevelopment84"), not an email, so it cannot be used to address an approval.
`User_Access.Approver_Email` (added 2026-08-16) holds the routing address, and
`territoryApproverEmail(territoryName, role)` resolves Territory.VP / Territory.Dev_Mgr → that
email. `createBudgetModification`, `submitBudgetModification`, and the `modificationAdmin` repair
rebuild use it for the VP row, falling back to the standing placeholder recipient when the
territory has no VP or that VP has no Approver_Email.

### Modification access model

Submitting a modification requires owned-Budget edit access or the global
Edit/Delete All Budgets/Requests grant (Edit_All_Budgets). The global grant,
with an authenticated User Access identity, also permits standalone modification
Edit/Delete and the existing admin approval/recipient override. The retired
Edit_Delete_All_Modifications field is hidden and ignored; modAdmin remains only
a response alias of editAll. See the 122.29.56 section and native promotion handoff.

### Report-layout gotcha (v2 API)

The record API (`/api/v2/.../report/<report>`) returns ONLY the columns configured in the report's
quick view. If a field is missing from the layout, the widget never receives it — this is why
modifications once rendered as "Draft" while the records were "Submitted" (no `Status` column in
prod's `All_Budget_Modifications` layout) and chains looked unlinked (no `Budget_Modification`
column on `All_Budget_Approvals`). When adding fields consumed by a widget, add them to the report
quick view AND publish the report component. The `Budget_Modification` lookup displays `Amount`
(was `Reference_Number`, which is usually blank).

### Environment note

The `Budget_Modification` form/report, `Budget_Approvals` changes, the Deluge function, and the
Custom API binding were created in the **Development** environment (`land-master-development`).
They require a Development → Stage → Production push before production users see them; re-verify
the Custom API's function binding after that push.

## 122.26.1 — centered filter clear controls

Centers the project, territory, and status clear buttons vertically in their filter controls and centers each X with flex alignment and zero padding. Frontend styling only in `budget-layout.css`, plus widget version/release metadata; no Creator forms, fields, functions, Custom APIs, or backend publication changes. Browser verification covers open/closed dropdowns, centering at 1400/700/420px viewport widths, and clearing all three selections. Rollback: restore production budget-manager to `122.26.0` and rebuild Pages.

## 122.26.0 — always-visible phases and filter controls

Frontend-only: `widgets/budget-manager/src/app/widget.html` and `budget-layout.css`. Project selection is now a searchable multi-select; project, territory, status, and search selections clear directly from the toolbar. Project phase tables always remain visible and the expand/collapse controls are removed. Owner chips use PF initials avatars and a white capsule; the existing audit action uses the PF document icon/count. Existing owner permissions, mapping editors, table information, approvals, category expansion, calculations, fields, Creator functions and Custom APIs are unchanged.

Regression: browser-check multiple project selections, each external clear control, search reset, visible phase tables, and owner editor opening. Run `npm run validate` and `npm run build:pages`. Promote production mapping only after immutable release validation; no Creator backend publication required. Rollback: restore production budget-manager mapping to `122.25.3` and rebuild Pages.

### 122.26.2 — consistent clear-icon centering

Center the search clear icon with the same flex alignment and line height as the project, territory, and status clear controls. CSS-only behavior change; fields, functions, APIs, permissions and filter behavior unchanged. Validate with repository checks and Pages build. No Creator publication required. Rollback production mapping to 122.26.1.

### 122.26.3 — SVG clear icons

Replace font-based multiplication characters in search, project, territory and status clear buttons with symmetric SVG paths. Explicit icon dimensions override search-icon styling. Browser verification with all selections active and a dropdown open confirms zero horizontal/vertical icon-center offset for all four buttons; screenshot reviewed. Frontend-only widget.html and budget-layout.css changes; filter behavior, permissions, fields, functions and APIs unchanged. Validate repository and Pages build; no Creator publication needed. Rollback production mapping to 122.26.2.

## Routine success feedback — October 6, 2026

Budget header metrics, line-item fields, per-unit pricing and notes keep inline saved indicators and add grouped confirmations. Existing successful owner, mapping, attachment, request and approval pills use the approved black style. Note confirmation now waits for the existing verified save callback. See [the shared design guide](../design/success-feedback.md) for sizing, wording, inline preservation and reuse. This rollout is frontend only and adds no forms, fields, backend functions, Custom APIs or verification requests.

## Saved attachment reconciliation (122.28.32)

After a settled unrecognized/lost FILE reply, automatically verify the exact saved
child and parent/file before reporting failure. Never replay an upload from that
check. Contract uploads preserve the Email switch without requiring it to be on;
Budget phase rows omit the direct Approvals shortcut and reserve space for their
remaining controls. No Creator backend deployment is required. See
[regression evidence and rollback](../../docs/attachment-upload-reconciliation-2026-10-07.md).

## Compact Purchase Order ledger (122.29.8)

### Item picker refinement (122.29.9)

122.29.10 widens the menu to 780px (bounded by the viewport), increases the
visible list height and aligns each item and both amounts on one horizontal
row under a sticky column heading. Narrow screens scroll within the menu;
search, keyboard selection and all balance rules are unchanged. The receipt
design remains a mockup. Validation/Pages build and actual-source visual checks
cover the dropdown; no Creator backend publication is needed. Rollback the
Budget widget mappings to 122.29.9.

The PO item dropdown excludes zero modified totals (Final Budget plus approved
signed modifications) and unresolved balances. Options show that modified
total and the remaining amount after existing reserved POs. When editing a
reserved PO, its own saved allocation is added back before displaying
availability. Negative modified totals and nonzero budgets with zero remaining
funds remain eligible. Existing saved selections keep their display labels.
The desktop vendor field is approximately 30% narrower. The right-side receipt
panel is a separate design mockup and is not included in this release.

Changed source: `po-ui.js`, `purchase-orders.css`, version/hash manifests,
immutable release and Development/Production Budget mappings. No Creator forms,
fields, functions or Custom APIs change; no Creator publication is required.
Regression coverage executes the actual picker for signed modifications,
duplicate own reservations, exhausted budgets, exact string IDs, saved zero
selections, failed/loading reads and alphabetical order. Rollback: restore
Budget mappings to 122.29.8 and rebuild Pages, retaining permanent widget URLs.

The existing Budget widget accepts up to 100 thin line rows with an inline
description, pencil editor, quantity, UOM, searchable Cost Element 1–5, unit price
and total. Cost codes are generated from `C_`, the subdivision code, item minor
code and line Cost Element. Supported UOM values are CY, EA, LB, LF, LOTS, LS, S,
SET, SF, SY, TN, VF and WK. New rows require a UOM; older saved rows remain readable.

Each line shows its item's available budget, the current PO's allocation to that
item, and remaining budget. Reserved other POs are included once; Draft POs do
not reserve funds. Rejection retains the reservation. Submission creates one
automatic modification per item shortfall and captures one sequential approval
chain covering the PO and every modification. The submitter is excluded on ordinary routes. CFO always approves; selected
additional roles apply when submission creates budget modifications. Policies
assume distinct people and have no duplicate-person option. Resubmission resets decisions and retains notes.

The approval email contains the PO header, all lines, modifications and chain.
Automatic modifications cannot be edited, submitted or repaired through the
independent modification flow. Existing Budget and Pro Forma approval behavior
continues through its existing handlers. A published company PO template is
required before submission; the owner's default chain remains TBD.

Affected schema: `PO_Item.UOM`, `PO_Item.Cost_Code`,
`Payment_Request.PO_Approval_State`, `Budget_Approvals.Type1` and
`Budget_Modification.Amount` (16 digits, 2 places). Development and Production
PO/policy APIs use authenticated POST payloads and currently have Admin-only
audiences. Creator backend publication is required along with the widget release.
See [function boundaries and cleanup](../../docs/purchase-order-function-boundaries.md).

Verification covers exact cent rounding, duplicate item allocations, other PO
reservations, automatic shortfalls, saved-line readback, unknown-write rechecks,
and existing payment-request paths. Native testing saved and independently read
back 100 calculated rows with UOM and cost code. Rollback the widget mapping to
122.29.7; retain saved PO data and use a compatible Creator version for backend
rollback. Do not replay an unverified write.

### PO email links

The existing `Budget_Management1` page accepts the Text page variable
`purchaseOrderId`, alongside `budgetId`, `page` and `modificationId`. Combined PO
approval emails open that saved PO inside the existing Budget Manager widget.


### PO Summary, duplication and eligible costs (122.29.11)

The existing PO dialog now includes a horizontal **Summary** panel on the right
on desktop, stacked below the editor on narrower screens. Each distinct cost
code appears once, with Modified budget, Existing POs, Available, This PO and
Remaining. Repeated codes consolidate. Codes sharing a Budget Item show Shared:
their This PO and Remaining use all current lines for that item, preserving the
existing shared budget calculation rather than inventing element budgets.
The total footer sums the PO once. Pending modification and automatic shortfall
hints remain visible; unavailable balances display dashes. Saved reservations
are restored once when showing this PO's before/after balance.

Description stays inline; the pencil is replaced with a compact blue overlapping
squares Duplicate line button. It inserts immediately after the source, keeps
all entry fields and manual pricing nulls, generates a fresh key and strips native
child/parent/revision IDs. Duplication stops at 100 lines and is hidden when locked.
The searchable item dropdown excludes the 8000 and 9000 classes and cost codes
4000–4099, retaining other 4000-class items. Existing saved selections remain
readable; the nonzero modified-budget and category-lock requirements still apply.

Changed source: po-domain.js, po-ui.js, purchase-orders.css and widget.html, plus
focused tests, docs, version/hash manifests and immutable release. Development
and Production use 122.29.11. No Creator forms, fields, functions or Custom APIs
change; no Creator publication is required. Regression checks cover exclusions
at 4099/4100 and class boundaries, copying without native identities, manual
nulls, shared cost-code balances, own reservations and missing balances. Actual
source browser checks cover desktop/narrow fit, duplicate placement and totals,
and the 100-line cap. Rollback Production to 122.29.10 and rebuild Pages; keep
Development on the latest complete release under the repository release policy.


### PO entry polish (122.29.13)

The PO budget-item dropdown sorts by numeric cost code and groups by major code
and the item's existing Budget Category. Group order follows the first cost code;
each category's items stay ascending. Options display a cost-code pill followed
by Item Name and the two existing budget amounts. Search includes group names
and hides groups without matches. The 8/9-class exclusions also cover extended
codes such as 99991, while 4100–4999 remain eligible.

Editable ledger cells have a pale blue surface, visible border and subtle glow;
locked/manual-derived cells stay muted. Cost Element defaults to 5 on new lines
and uses a compact five-option single-select without a search field. Duplicate
still preserves the source's chosen element. Request Date and Date Needed reuse
the Budget request date picker (calendar icon, floating dialog, weekday headings,
Today/Tomorrow/Clear), with ISO PO dates and unchanged US dates for Check/Wire.
Opening the calendar no longer rebuilds or enlarges the main PO dialog.

The PO header amount is calculated from exact line cents, including edits to
saved drafts. There is no editable Full PO Amount field or balance-match prompt.
Both receipt and editor footers say TOTAL with larger text. The ledger uses an
800px minimum row width; panels stack below 1400px and tables contain horizontal
overflow on small screens.

Source changes: po-ui.js, purchase-orders.css and widget.html, focused tests,
version/hash manifests, docs and immutable release. No Creator forms, fields,
functions or Custom APIs change; no Creator publication is required. Regression
checks cover sorted/grouped eligible options, default element 5, exact calculated
save totals, date round trips and retained Check/Wire behavior, plus browser
selection/search, date dismissal, editable surfaces and responsive containment.
Rollback Production to 122.29.12; keep Development on the latest complete release.

### Saved PO editing from Requests (122.29.15)

The specific budget's Requests tab reads its scoped Payment Request report with
all available fields and merges the exact managed PO identities, vendor, amount,
status and revision from existing List and Vendors commands. Production's native
report has no visible field columns and rejects custom projections; the managed
PO command remains authoritative when the report returns ID-only rows. Dates and
approval state appear when the report exposes them; Get loads the full saved PO
when opened, without per-row Get calls for the Requests list.
Managed Draft POs show **Edit PO** for budget editors; rejected submitted POs
retain the existing editable revision flow. Pending/approved POs and read-only
users show **View PO**. Check, Wire and legacy PO rows retain their existing
behavior. Each action opens the exact saved PO through the existing phase-scoped
Get command, preserving its parent ID and expected revision.

Saved PO entry stays locked until the exact PO/budget snapshot is loaded and
validated. Failed loads offer Retry load and cannot save a blank new PO. A newer
selection supersedes older replies, and opening a different saved PO clears the
previous approval bundle. Successful PO saves force a fresh Requests read; the
previous truthy `idle` state no longer prevents the list from updating.

Frontend source: Budget `widget.html` and `po-ui.js`; regression:
`scripts/test-po-requests.mjs` through the existing purchase-order suite.
Affected existing fields: `Payment_Request.ID`, `Budget`, `Budget_Item`,
`Request_Type`, `Request_Amount`, `Request_Date`, `Date_Needed`, `Vendor`,
`PO_Status`, `PO_Approval_State`, `PO_Revision`, `PO_Line_Count`. Existing
`managePurchaseOrder` and `Manage_Purchase_Order` / `_DEV` contracts are reused;
this editing change requires no Creator form, field, function or API publication.

Regression covers draft/rejected editing, pending/approved/read-only viewing,
exact string IDs and phase scope, ID-only report/API merging, post-save fresh reads,
duplicate/foreign/malformed rows, failed loads, lost scope and superseded reads.
Rollback Production Budget Manager to 122.29.13 and rebuild Pages; retain saved
PO records and the permanent widget URL. The initial 122.29.14 projection failure
was caught in native Production and corrected by the immutable 122.29.15 release.

Temporary PO test CFO configuration is documented in
[the October 11 handoff](../../docs/po-test-cfo-2026-10-11.md). It requires five
existing Creator function updates; the user retains promotion control.

## PO entry and simple policies — October 11, 2026

Budget Manager 122.29.18 supports 200 PO lines, including Add, +10, Duplicate
and backend Save/Submit validation. The ledger shows a separate read-only Item
name from the selected Budget Item; edited PO descriptions never replace it.
Description and Unit price give space to that column; Element is labeled ELEM.
No new field stores the name. Settings Manager 1.5.0 has CFO always plus optional
roles when the PO creates budget modifications, with no policy dates, versions
or multiple-role controls. Published Save changes future submissions in place.
Creator promotion is required for the policy behavior and 200-line validation.
See [handoff](../../docs/approval-policy-simplification-2026-10-11.md).

## PO Ledger, 250 lines and deletion (122.29.20)

Managed PO cards use the approved Soft rail row (122.29.25): blue PO pill,
vendor, MM/DD/YYYY request date, green amount, status and Edit/View action.
Omit the heading strip. Keep rows slim, truncate long vendors and contain narrow
screen scrolling inside the card. Missing dates show an em dash; the
card renderer does not add per-row API calls. See [the card guide](../design/payment-requests.md).

The existing `managePurchaseOrder` List response now includes native
`requestDate` and `dateNeeded` in YYYY-MM-DD, so API-only profiles receive dates
even when the separate Check/Wire report is denied. Merge these authoritative
dates before formatting; preserve the old report dates when an older API omits
the fields. Creator publication is required for this function only. No forms,
fields, other Custom API scopes or write/approval behavior changed.
Regression: ISO and US dates, invalid/leap dates, denied separate report,
scoped parent IDs, edit eligibility and native List. Rollback widget 122.29.23
and the previous managePurchaseOrder List projection from 5977c3d.

The editor and native payload validator accept 1–250 lines, with a 500,000-character
request ceiling. Item names remain separate from editable descriptions and the
element heading is ELEM. Modification submissions accept CFO plus any configured
additional roles rather than requiring the role name COO.

Delete PO is available to current budget editors for managed drafts and submitted
POs, including Pending, Rejected and Approved approvals. A read-only PreviewDelete
captures the parent revision, every line revision, operation receipts, captured
PO/modification routes, approval rows and modifications proven by the native
PO:<parent ID>: reference prefix. Unrelated/externally linked modifications remain
untouched; shared associations or unresolved phase writes block deletion.
The widget asks for permanent-delete confirmation, then Delete recomputes the
preview, acquires the unique phase lock and removes children before the parent.
Removing the parent releases its PO commitment. Removed approved modifications
recalculate affected item and phase totals with the existing helpers.
Approval decisions use the same phase lock; notification retries cannot send
while a deletion lock is present. Ambiguous deletion replies retain the lock and
captured IDs; CheckDelete is read-only and never replays deletion.

Changed files: Budget HTML/CSS and PO UI/domain/controller, matching regression
checks, PO schema contract, design/module guides, release/version/hash metadata
and Development/Production mappings. Native functions: managePurchaseOrder,
poValidatePayload, handlePurchaseOrderApproval and sendPurchaseOrderEmail. Existing
Manage_Purchase_Order APIs are unchanged. No new Creator forms, fields or grants.
Both frontend deployment and Creator promotion are required. Budget edit grants
continue to protect deletion; a separate deletion permission is deferred by the owner.

Regression evidence: actual native-source tests for 250/251 limits, all PO deletion
states, all line revisions, foreign/shared identities, stale previews, competing
approval/deletion locks, no deletion emails, approved-modification rollups and
read-only partial-write recovery. Requests tests retain exact IDs, phase scoping,
Edit/View eligibility and guarded Get recovery. Browser card QA covers long vendor
names, large amounts and 380px viewport without card overflow. Native Development
compilation and reopened token readback passed before Creator promotion.
Full repository validation and Pages build passed before main/Production.

Production QA on Bluebonnet Crossing Phase 01 (budget 4410926000001671002)
saved and reopened test PO 4410926000005148040 with 250 EA/manual lines at
$0.22 each ($55 total), submitted it once and completed its one CFO approval.
Creator recorded one sent approval to rbelliveau@wbdevelopment.com, and the
owner confirmed inbox receipt. No budget modifications were created.
The original draft 4410926000005159046 was preserved.

The native deletion preflight exposed a Creator runtime failure caused by using
`captured` both as an Approval_Route_Snapshot record iterator and a function-result
map. Dedicated record variables remove that native type collision; a source
regression detects record/function-result aliases that the JS runtime cannot
model. PreviewDelete failures include an exception diagnostic in the existing
audit response without initiating writes. The corrected function compiled and
matched reopened native tokens before its single-component Stage/Production
promotion to Creator 9.70. Unrelated pending Creator components were excluded.
Production PreviewDelete then succeeded for the approved test PO: 500 line
records across saved/submitted revisions, two receipts, one route, one approval
and zero modifications. Permanent deletion remains a separately confirmed test
action; a successful preview does not claim that those records were removed.

PO approval notifications use `Notifications@wbdevelopment.com` as their From
address, matching the app's existing contract/pro forma notification sender.
This is a one-function Creator change (`sendPurchaseOrderEmail`) with no widget,
form, field, API or permission changes. The native-source send regression checks
the sender, exact single test recipient and recorded-delivery duplicate guard.
An already recorded approval email is not resent by changing its sender.
The Development editor compiled the sender change and its reopened source matched
the repository function. Only that function was selected from the 18 pending
components and promoted through Stage to Production V9.71. Optional deployment
notification recipients were removed. The existing recorded test email was not
resent; the owner has not yet checked a new inbox message from this sender.
Full repository validation and the Pages build passed. This backend-only change
keeps the existing Budget Manager Production 122.29.20 mapping.
Sender-only rollback: restore `sendPurchaseOrderEmail` from commit 77660f2 and
republish that function; no widget or record rollback is needed.

Rollback: map Budget Manager Production to 122.29.18 and rebuild Pages, and restore
the prior Creator functions from that main commit. Restoring code does not restore
permanently deleted records. No cross-record transaction or automatic replay is claimed.

## PO editor title and spacing (122.29.22)

The PO status moves into a compact pill beside Purchase Order in the navy title
card. The Line items/count row is removed, so the vendor/date fields lead directly
into the ledger. The last row has 9px bottom padding to match the column heading's
9px top padding; ordinary rows retain 2px padding. The 250-line validation and
add/duplicate guards remain in place. Hide the record status pill during progress
and in the Saved POs list; restore it when returning to an individual PO.

Changed files: `src/app/po-ui.js`, `purchase-orders.css`, the HTML version markers,
widget config/hash manifest, existing PO entry renderer regression, design/module
guides, immutable 122.29.22 release and Development/Production mappings. No Creator
forms, fields, functions, Custom APIs or permissions change. Only the frontend
deployment is required; no Creator publication is needed.

Browser QA uses the actual editor and stylesheet with local-only data: status in
the header, no heading/count row, direct field-to-ledger ordering, matching 9px
outer padding, and compact ordinary rows with one and eleven lines. The proposed
budget-item/sub-line modal is a separate interactive mockup, not part of this
production implementation. Its local Save/Cancel, item totals and 320px layout
were checked. Rollback: restore Budget Manager Production 122.29.20 and rebuild
Pages at the same permanent widget URL.
Full repository validation and the Pages build passed before main/Production.

## PO editing, row actions and captured approvers (122.29.28)

Optional Payment_Request.PO_Description is surfaced in the PO editor and compact
Excel packet. Vendor/add-vendor move into the navy title; Request date, Date needed
and Description lead the body. The editor keeps a stable viewport-bounded height.
Row/Excel mode provides atomic validated range paste, copy, fill-down, keyboard
navigation and range Undo within the existing 250-line limit.

Requests rows use attachment-style preview, eligible edit, download and red trash
icons. Delete opens the existing child-record preview; Cancel returns to Requests.
Captured approver initials are green/amber/red/muted for Approved/Pending/Rejected/
Not Sent. The mini modal displays names, roles, sent/responded dates and statuses.
List returns validated captured summaries; only opening a chain triggers one Get.
Drafts do not invent a captured chain.

Creator changes: optional multiline PO_Description, poValidatePayload, poSnapshot,
poApprovalBundle, managePurchaseOrder, sendPurchaseOrderEmail and new shared
poExcelWorkbook. Download is a read-only action on the existing scoped API, with
the same Excel generator as email. No Custom API, permission or routing-policy
change. Old widgets omitting Description preserve saved text; explicit empty text
clears it. Production frontend rollback is 122.29.26 (prior mapping); Development
rollback is 122.29.27. Restore prior functions from bee8ffdc, retaining the new
optional field and any saved descriptions.

## PO spreadsheet fixes and role circles (122.29.30)

The Row / Spreadsheet toggle replaces the Excel editing label. Typed cell edits
now join range paste and fill-down in Undo history; double-click edits keep arrow
keys inside text, and keyboard focus updates the active cell. Vendor creation uses
navy text on a pale-blue button in the title. Captured approval circles show their
recorded role (VP/CFO/COO); the tooltip and detail modal retain person and status.
No form, field, function or API change is needed. Production frontend rollback:
Budget Manager 122.29.28; preserve saved POs and their captured approval routes.

Validation: actual-source grid/Requests regressions and full `npm run validate`,
`npm run build:pages` passed. Browser checks covered range paste, exact calculated
amounts, typed Undo preserving pasted rows, fill-down/Undo, rejected formula paste,
double-click text arrows and Row/Spreadsheet switching. Native Development policy
Preview resolved VP → CFO → COO from the territory VP and active CFO/COO assignments.
The existing Creator 9.79 already contains the required PO functions. This release
promotes Budget Manager 122.29.30 and ordered Settings Manager 1.5.2; no additional
Creator schema or function deployment is required for these presentation fixes.

## Saved PO loading and absolute email links (122.29.31)

Saved PO View/Edit now shows Loading purchase order until its scoped snapshot and
vendor roster have both arrived. The independent reads run in parallel; no blank
entry fields or $0 totals flash before the saved data. Failure shows Retry load
and Close. Existing identity, stale reply, readonly and unknown-write guards stay
in force. Frontend rollback is 122.29.30.

`sendPurchaseOrderEmail` uses an absolute HTTPS Creator page URL for Development,
Stage or Production, retaining the budget and PO IDs. Relative `zoho.appuri` caused
Gmail to redirect to an invalid host. The function signature, recipient, attachment,
send stamp and duplicate guard are unchanged. Publish this one native function
through Stage to Production; GitHub Pages cannot deploy Deluge. Emails already
delivered retain their old link; use the corrected PO page URL without recreating
the PO or altering approval state. Backend rollback: prior function at 98c3f6d2.

Validation: full `npm run validate` and `npm run build:pages` passed. Actual-source
regressions cover waiting for both independent reads, hidden draft fields and
false totals, read-only load failure/retry and exact HTTPS email URLs in all three
environments with the delivery duplicate guard intact. Local browser slow-read
and failed-read/retry tests loaded the saved amount with zero writes. The native
email function compiled and its reopened token fingerprint matches the reviewed
source (768875516daab2dc). The approved Development demo-user permission change
lets demouser_1 open the pending VP PO and exposes Approve PO & mods.

## PO review after an over-budget submission (122.29.32)

The October 13 critical report came from Review PO immediately after Submit.
The acknowledged $50,065 reserved PO carried a $100 pending modification, but
the dialog rendered against its pre-submit balance with zero pending mods.
That mixed snapshot triggered the strict pending-modification invariant.

Get and Review PO now start the automatic balance refresh before revealing
calculations for a replacement saved snapshot. Allocations use balances only
when that read is loaded; checking or failed reads remain unverified. A balance
read generation rejects older replies. Exact-cent reconciliation still rejects
inconsistent loaded balances. No native data, policy, function or API contract
changes are needed for this frontend patch. Rollback: Budget Manager 122.29.31.

Regressions reproduce the report's amount/shortfall, verify the immediate review
and post-refresh formula, late pre-submit replies and failed reads, and preserve
the strict domain invariant. The local browser fixture simulates Submit and
Review with a real captured VP → CFO → COO bundle without Creator writes/mail.
Native email URL correction from 122.29.31 is published in Creator Stage and
Production 9.80, selecting only sendPurchaseOrderEmail.

Validation: full npm run validate and npm run build:pages passed. The browser
Submit → Review test retained the $50,065 total and captured chain immediately,
then displayed $49,965 available and +$100 modification without console errors.

## Legal-style PO results and parallel Summary (122.29.34)

The PO editor no longer supplies the large worksheet dimensions to progress and
success. The separate progress presentation matches Legal's 540px navy dialog,
slim bar, numbered stage chips, explicit outcome, collapsed Saved items and
pinned Done/Review PO actions. Unknown replies alone expose Check status, with
the existing controller's read-only recovery. Pending Close/Escape and duplicate
write locks, focus, inert background, exact identities/counts and email warnings
remain. Resolved vendor names appear in the progress context.

Get, vendor roster and budget Balances now start together. The saved PO and its
Summary reveal atomically after these parallel reads; a failed balance read
still opens the saved PO with truthful unavailable figures. Confirmed save or
decision responses preload fresh balances while the terminal result is shown.
Review PO uses that run's refreshed result rather than starting another read;
late replies retain actor/dialog/read-generation guards. The strict pending-mod
invariant stays intact. No write is replayed to speed up or demonstrate the UI.

Changed UI: po-progress.js, po-ui.js, purchase-orders.css and widget asset entry.
No forms, fields, functions or Custom APIs change; no Creator deployment is
required. Development and Production use 122.29.34. Rollback: restore mapping
122.29.32 without changing saved POs, captured approvals or native email helpers.

Validation: full npm run validate and npm run build:pages passed. Actual-source
regressions cover parallel Get/vendor/Balance dispatch and atomic publication,
post-write warm Review, late replies, failed balances, strict pending-mod math,
compact result sizing and truthful success/warning/unknown controls. Browser QA
verified the 540px result, collapsed saved items, pending Escape lock, lost reply
and read-only Check status with one simulated write, immediate warm Summary and
the 390px layout. All approval actions for screenshots used local disposable
simulation; no native approval or notification was replayed.

## Single PO chain and attached budget modifications (122.29.35)

Saved POs display the captured approval chain only in the bottom section; the
upper budget context retains Available and Modification/Remaining but omits its
duplicate role flow. Unsaved drafts retain their read-only approval preview.
Attached modification rows are grouped in a pale amber panel titled Attached
budget modifications, with their existing item names, amounts and statuses.
No modification panel appears when none are linked. Approval notes and actions
remain in the captured-chain section.

UI-only changes: po-ui.js, purchase-orders.css and widget version entry. No forms,
fields, backend functions or Custom APIs change; no Creator deployment required.
Rollback: Budget Manager 122.29.34. Existing exact balance/approval, save/recovery
and routing guards remain. Verify a saved PO with/without attached modifications
and the unchanged draft route preview, then full validation and Pages build.

Validation: the existing focused PO suite, full npm run validate and Pages build
passed. Browser checks showed one bottom chain, zero upper approval flows, the
attached-modification heading/item/amount/status, and the unchanged draft route
preview with zero writes.

## Direct PO deletion and phase breadcrumb (122.29.36)

Requests trash opens the compact delete confirmation immediately. Use the
cached exact PO ID, budget ID and revision only for scoped PreviewDelete; do
not first load the PO worksheet, vendors or balances. Disable Delete until
verified child counts arrive. Cancel remains available during this read; late
responses cannot reopen or unlock a subsequent dialog. Existing server delete
permission, revision and child-record guards remain authoritative.

All phase editor tabs use Territory / Project / Phase 01, without repeated
project names or editor-mode suffixes. Preserve custom phase names.
Frontend-only: no forms, fields, functions or Custom APIs change. No Creator
promotion is required. Regression checks exercise direct preview, cancellation,
stale replies, failure/retry and all breadcrumb rendering paths. In-app testing
is left to the user by request. Rollback: Budget Manager 122.29.35.

## Vendor modal and contextual approvers (122.29.37)

Vendor creation uses native DATA.addRecords on Vendors: Vendor_Name (required),
Vendor_ID, Contact_Name and Primary_Phone. Existing native form permissions and
validation remain authoritative. Exact acknowledged ID determines selection;
unknown replies never retry automatically. The PO worksheet is retained.
Desktop height is 944 px with viewport cap and internal matrix scrolling.
An Approvers card below Summary uses the existing read-only PreviewApprovals
action, including all territory Dev Mgr recipients when the PO creates mods.
Native changes are approvalConfigurationSnapshot, resolveApprovalRoute and
managePurchaseOrder, saved in Development and published through Stage to
Creator Production 9.84 (PO approvers and Territory Dev Mgr).
No existing PO records, submitted routes or native permissions are changed by
this release. Rollback: Budget 122.29.36 and Settings 1.5.4.

## PO submitters remain approvers (2026-10-14)
Purchase Order routing always allows the submitter to remain a manual approver in their assigned position, including existing rules stored as Deny. It never auto-approves or skips that step. Other workflows are unchanged. Settings 1.5.7; native resolveApprovalRoute, manageApprovalPolicies and poApprovalBundle. See docs/po-submitter-manual-approval-2026-10-14.md.

PO submitter execution correction: poApprovalBundle, poActorResponse and handlePurchaseOrderApproval also allow the authenticated assigned submitter through captured-chain validation and manual decision. No automatic approval; duplicate people and current-step checks retained. Creator promotion left to the user. See docs/po-submitter-execution-fix-2026-10-14.md.

## Failed PO submission recovery (122.29.39)
Explicit Recover PO verifies the exact terminal submission receipt, current PO and initial captured approval chain before releasing only its original phase lock. Business records, amounts and approvals stay unchanged; no email or automatic deletion. An uncertain response exposes read-only Check recovery. Creator managePurchaseOrder and handlePurchaseOrderApproval changes are saved in Dev for user promotion. See docs/po-failed-submit-recovery-2026-10-14.md.

## Connected Rail request list (122.29.40)
Requests uses one newest-first list of PO, Check, Wire and standalone budget modification rows. Exact same-budget PO ID/revision references nest child modifications under their PO once; unmatched mods remain standalone. One shared grid aligns labels, approvers, dates, amounts, statuses and fixed icon slots. Parent payment and child budget delta remain separate; native aggregates and permissions are unchanged. PO children do not trigger standalone approval-chain repair. Frontend only; no new functions or Custom APIs. Rollback: Budget 122.29.39. PMP shorthand is recorded in root AGENTS.md; Creator promotion is left to the user.

## Immediate PO child refresh and compact actions (122.29.41)

Successful submitted PO saves, approval decisions and deletions refresh request
headers and native budget modifications before the final Requests repaint. New
children appear without leaving or reloading the phase. Draft saves refresh only
headers. Late navigation/actor replies cannot repaint another view; display-read
failures retain Retry and do not replay the successful mutation. Available icons
pack together at the right of the shared action column, without empty pencil slots.
Frontend only: no forms, fields, functions or Custom APIs change, and no Creator
promotion is required. Regression coverage includes both read-completion orders,
approval/deletion refresh, drafts, failed/stale reads and action permissions.
Rollback: Budget 122.29.40. See docs/po-request-refresh-2026-10-14.md.

## CFO attached modification visibility and curved rail (122.29.42)

Submitted PO children use the existing authenticated managePurchaseOrder Get
snapshot as well as report data. This fixes the CFO seeing her own modifications
but missing another submitter's children when the native report is limited to
own records. Get reads are bounded to three, cached with the phase's request
state and refreshed after saves/decisions. Exact PO, phase, revision and child
identities are required; failed child reads retain the PO with Retry. Supplement
only the Requests display, keeping report-backed financial aggregates unchanged.
Shared connectors use continuous 2px gold trunks with rounded SVG elbows.
No Creator forms, fields, functions or Custom APIs change; no promotion required.
Tests cover restricted reports, duplicate/stale data, malformed identities,
read failures, actor changes, bounded concurrency and connector geometry.
Rollback: Budget 122.29.41. See docs/po-cfo-child-visibility-2026-10-14.md.

Verified older Submitted/Reserved POs with Not Configured approval state and no
captured bundle now show "Approval history unavailable for this older PO."
after exact successful PO/budget/revision matching. They remain read-only, with
no inferred modification link, repair or critical automatic report. Denied reads,
modern malformed bundles/revisions and child mismatches retain errors and Retry.
The two audited Development snapshots and actual-source regressions are recorded
in [the exact replacement patch](../../docs/po-legacy-history-display-2026-10-26.md).
Frontend only; no Creator deployment or data change. Rollback: Budget 122.29.74.
The PO modal's prospective approver panel also follows its existing composition
grant: hide it for a read-only foreign Draft or legacy Submitted PO rather than
showing Checking approvers when no forecast request is authorized. New/own Draft
forecasts and saved captured approval chains retain their existing behavior.

## Request attachment tabs (122.29.54)

PO, Budget Mod and saved Check/Wire Details / Attachments tabs reuse the Budget file workspace. One Attachment record keeps its Budget parent and at most one same-Budget Payment_Request or Budget_Modification lookup. Budget files show and can change the request association; linking an existing file makes no copy. Request deletion retains Budget files and clears its link. Native Development fields/reports, three functions and three workflows are saved for user promotion; the API registration is unchanged. Check/Wire creation remains Preview Draft. Approval/admin cleanup follows in 122.29.55 below. See [contract, verification and rollback](../../docs/budget-request-attachments-2026-10-19.md). Rollback: Budget 122.29.51.

## Budget Mod row tools (122.29.55)

The approved Row tools mockup is implemented: View, Attachments, Resend Email,
Edit and Delete on standalone Budget Mod rows; Approve / Reject / Close in the
detail modal. Draft Submit and rejected Revise & Resubmit remain available.
Edit keeps its prefilled composer; Delete first opens an explicit confirmation
with record identity and retained Budget-file consequence. Cancel restores the
row opener. Same-Budget, current approver/admin and PO-child isolation guards
are checked again at click time. Amounts and captured routes are unchanged.

No forms, fields, Deluge functions or API contracts change in this release.
The user reports promoting the earlier native functions. Browser inspection of
Microservices confirmed all required endpoints already exist and are enabled;
no duplicate APIs were created. See [handoff and verification](../../docs/budget-mod-row-tools-2026-10-19.md).
Rollback: Budget 122.29.54.

## Single Budget/request admin permission (122.29.56)

Edit_All_Budgets now displays Edit/Delete All Budgets/Requests. The retired
Edit_Delete_All_Modifications control is hidden on native User Access create/edit
and no longer grants widget or native admin access. Existing values are retained
without copying or enabling any user's global grant. Owned Budget editing stays
available; request deletion requires the authenticated global grant. PO row,
modal and direct delete openers and native PreviewDelete/Delete/CheckDelete agree.
Modification_Admin guards update/delete using the same authenticated permission.
Both access functions keep modAdmin only as a compatibility alias of editAll.

Development field/workflow and getUserAccess, getUserAccessLean, modificationAdmin,
managePurchaseOrder changes are for the user to promote. Existing API names and
arguments remain. Saved Check/Wire details retain viewing/attachments without a
new deletion workflow. Other Budget archive and file deletion rules are unchanged.
[Contract, tests and rollback](../../docs/budget-request-permissions-2026-10-19.md).
Rollback: last live Budget 122.29.54; retain native authorization guards.
