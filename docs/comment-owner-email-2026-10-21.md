# Comment owner email and compact UI — October 21, 2026

## Behavior

All shared comment entry points in Legal, Construction, Pro Forma and Budget
(both phase and Project conversations) use the global `postRecordComment`
function through `Post_Record_Comment` / `Post_Record_Comment_DEV`. A successful
call creates one comment and sends one email to the other record owners.
The draft is cleared only after the existing native acknowledgement and exact
record identity checks. An unknown reply blocks another create; there is no
automatic replay or email retry. Edits/deletes retain the native author-only
24-hour validation and send no email.

The composer says **Posting emails the other record owners.** Post and email
results stay in the same modal: **Comment posted · Owners emailed.** Email
failure retains the saved comment and says **Comment posted · Email failed.**
No extra success/progress modal was added. If the endpoint is definitively
missing (9350/9360) during the separate Creator promotion, the old native create
remains available and shows **Comment posted · Owner email unavailable.**
An ambiguous or permission-denied API response never falls back to another create.

Owner sources are `Contract.Owner`, `Add_Pro_Forma.Owner`,
`Add_Budget.Budget_Owner`, and the union of phase Budget owners for
`Project` (`Add_Budget.Subdivision1.Project`), matching the Project owner UI.
`User_Access.Approver_Email` is preferred, with a genuine email in `User` as
fallback. Addresses are case-insensitively deduplicated. The saved author's
username and resolved email are excluded, including Creator's authenticated
admin username/email alias. There are no caller-supplied recipients or author.

The read-only `buildContractCommentNotification` helper builds escaped HTML
from the persisted comment. It supports all four parent lookups despite its
legacy function name. Links follow the real Creator environment and exact
string ID; Development/Stage subjects are marked as tests. No real owner email
was sent while testing.

## Creator changes and permissions

The single new `Notify_Contract_Comment_O` form workflow was deleted. No new
notification form workflow remains. Existing comment validation/deletion
workflows were preserved.

Saved and independently reloaded in Development:

- `buildContractCommentNotification(string commentId)` — map, read only.
- `postRecordComment(string parentField, string parentId, string commentText)` —
  string JSON, contract `record-comments-v1`, one insert followed by guarded mail.
- Text page variable `recordView` on Legal, Construction and Proforma_Management1.
- Text variables `recordView` and `projectId` on Budget_Management1.

No forms, stored fields or report columns were added. Comment fields remain
`Contract1`, `Pro_Forma`, `Budget`, `Project`, `Comment`, `User`, `Author_Name`,
`Edited`, `Deleted`, and Creator's native author/time fields.

The function derives the actual actor/profile from Creator. Existing posting
profiles are Write, Administrator, Dev/Land Acq - Proforma & Budgets, Contract
Mgmt, CFO and Construction Budgeting. Read and Accounting - Lot Management
are rejected. Construction Budgeting remains Construction-only;
`hasConstructionPermission` is checked for every Construction comment, and
Complete Contracts are read-only. Existing report/form grants and author edit
rules remain authoritative for reading and subsequent edits/deletes.

The live application roster was audited: 16 existing comment-enabled users and
two administrators, excluding the two Accounting - Lot Management users.
The new API uses **Selective users**, OAuth2, POST, application/json, Key and
Value (`parentField`, `parentId`, `commentText`) and Standard response. The
Development binding is Land Master Development → Default → postRecordComment.
Newly assigned comment users must also be added to this selective API scope.
The user explicitly approved enabling the feature for existing comment users.

The user separately authorized native Creator promotion. After the stale publish
preparation lock cleared, version **9.107 — Comment owner email and record links**
was published to Stage and Production. The seven-component package contains both
global functions, the four page variable changes and Creator's required User
Access dependency. Unrelated Crew changes were not selected.

`Post_Record_Comment_DEV` and `Post_Record_Comment` are saved and independently
reloaded in Microservices: Enabled, OAuth2 POST, Selective users (18), JSON
Key and Value, Standard response, and their respective Development/Production
Land Master → Default → postRecordComment bindings. Production was bound only
after its published function appeared. No live comment or owner email was used
as a test. Future comment users must be added to both selective API scopes.

## Deep links

Email Open comments and View record in main list links use `recordView=comments`
or `recordView=list`, plus `contractId`, `proformaId`, `budgetId` or `projectId`.
Legal/Construction clear local list filters, expand the authorized exact record
and optionally open its existing conversation. The page's module boundary and
Construction grants still apply. Link consumption prevents refresh reopening a
closed conversation. Legacy contract detail and LOI token links retain precedence.
Pro Forma reveals the exact main-list row. Budget reveals the already expanded
Project/phase table. Links do not save Assigned to Me preferences or parent data.

## Other requested UI updates

The selected Offer PSA/LOI pill is navy with white text. Forecast Manager's
heading is **Builder Forecasts** and the matrix has no minimum height; its
bottom border follows short tables while maximum-height scrolling remains.
Legal/Construction parent rows no longer have a child-family collapse button.
Matching children stay visible beneath the parent with their type counts and
branch connectors; the separate action/details expansion is preserved.
Forecast calculations, native writes and exports are unchanged.

## Verification and rollback

Offline tests execute the checked-in Deluge bodies against fixtures for all four
parents and Creator environments, author exclusion, recipient deduplication,
escaped content, permission denials, Complete/Construction boundaries and saved
comment retention after mail failure. Actual Pro Forma transport tests verify
the Custom API path, exact string IDs, single create, explicit rejection and
unknown-response quarantine. Legal/Construction startup links are exercised in
the actual widget harness; desktop tests verify the existing comment modal,
inline post/email results, failed drafts and duplicate keyboard blocking.
Desktop Forecast regressions include compact-table geometry and the new title.
Final `npm run validate`, `npm run build:pages`, shared comment desktop checks,
Legal/Construction table and AI Review checks, and Forecast desktop regressions
passed. Child-family regression checks cover both modules, stale collapse state,
filtered parent context and retained child counts.

Releases: Pro Forma 1.80.129, Contract Management 1.62.25, Budget 122.29.65,
Forecast 1.7.18. Roll back the respective Development/Production mappings to
1.80.128, 1.62.24, 122.29.64 and 1.7.17 and rebuild Pages. Older widgets use their
existing native comment creates. Keep the additive page variables; disabling
the new Custom APIs stops their notification path without altering comment
history or reinstating the deleted workflow.
