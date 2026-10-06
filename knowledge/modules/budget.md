
# Budget Module

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

The named dialog traps keyboard focus, makes the background inert, and restores the original paperclip focus and page scroll on close. Preview and Delete confirmation remain nested existing surfaces; Escape dismisses the active child first. Preview deletion resolves the exact retained child ID rather than relying on a stale file index. Existing `Contract_Version.Budget`/`File_field1` create, FILE verification, upload/delete failure guards and `Get_Budget_Attachment_Preview` PDF route are unchanged. No Creator schema, report, permission, function or API deployment is required.

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

Archive writes `Add_Budget.Archived`. Delete permanently removes the selected budget's `Budget_Approvals`, `Budget_Modification`, `Budget_Item`, `Budget_Category`, `Budget_Months`, `Contract_Version`, and `Comment_Log` children before removing `Add_Budget`. Existing `Budget_Import_Item` history is retained and its deleted-item lookup assignments are cleared. The confirmation modal lists the seven deleted child object types. `All_Budgets` must expose `Archived`; `getUserAccess` must return `budgetDeleteArchive`; Custom API `Manage_Budget` is POST/OAuth2/All users with `{budgetId, action, userAccessId}`. Rollback: Creator prior app version and widget `122.27.11`.

## Attachment and comment actions (122.27.5)

Project comments are 30% larger. Each phase now shows a Legal-matching paperclip attachment count followed by its comment count; both phase controls match Legal at 28.75px with the same hover treatment. The Actions column is sized for all four controls and lets count badges render without clipping. Attachment counts load from the existing `Contract_Version.Budget` records and open the phase's existing Attachments workspace. Rollback: `122.27.4`.

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

Attachments use one `Contract_Version` record per file:

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

### COO approval threshold (added 2026-08-14)

`Settings.COO_Approval_Threshold` (currency, Budget Settings section of the single-record
`Settings` form) gates a third approval step on Budget Modifications: when a modification's
Amount exceeds the threshold, `createBudgetModification` / `submitBudgetModification` (and the
`modificationAdmin` repair rebuild) append a COO row (Sort 3, placeholder recipient
rbelliveau@wbdevelopment.com, editable in the widget) after VP and CFO. Empty/0 disables the
extra step. The chain traversal in `sendModificationEmail` handles any chain length unchanged.

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

- Submitting a modification requires `Edit Owned Budgets` (ownership-scoped via `canEditBudget`),
  trumped by `Edit/Delete All Modifications` (`canSubmitMod`).
- `Edit/Delete All Modifications` (User_Access decision box, link name
  `Edit_Delete_All_Modifications`; returned by `getUserAccess` as `modAdmin`) additionally grants:
  edit/delete of ANY modification and approve/reject/recipient-edit on ANY Modification-type
  approval row (`canAdminMods`, `canEditApprovalRow`).

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
