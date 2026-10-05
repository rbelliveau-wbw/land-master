
# Contracts Module

## Compact Contract creation and setup diagnostics (1.60.54)

Contracts/Legal startup no longer reads `All_Pro_Formas_All_Fields`. That report
supplies pending LOI reviews from `Add_Pro_Forma`; ordinary Contract records,
actions, pricing and setup do not require it. The Review tab or an LOI token deep
link loads only the pending-LOI criterion on demand. Denied/unavailable LOIs show
one local **LOI reviews unavailable** cue while the complete Contract snapshot
stays usable. Unknown LOI counts remain explicitly incomplete, and stale/denied
LOI rows cannot support decisions. The former full-report fallback is removed.
Post-decision Contract refresh remains usable even when the separate LOI refresh
fails. Existing LOI report permissions and `Review_LOI_Request` decision API remain;
no profile grant or backend/schema change is made. Users who need to review LOIs
still need the existing report permission until a narrower authorized backend
reader is provided. `scripts/test-contract-loi-permissions.mjs` checks ordinary
startup, denied Review, token deep links, allowed pending reviews, stale scope,
read-only retries.

The release also verifies settled delete results against the exact requested
record. A complete fresh preflight must return that record before one delete is
sent. If Creator returns a validation error or loses the acknowledgement after
deleting, a complete targeted fresh read proving absence completes the UI delete.
A pending native request, conflicting returned ID, changed session, denied or
incomplete verification cannot count as success. A failed deletion that leaves
the target present remains an error. Existing delete permissions, completed
locks and backend workflows are unchanged. `contractDeletePreflight`,
`contractDeleteResponseConflict`, `contractNativeMutation` and the delete
readback branch implement this; `scripts/test-contract-delete-verification.mjs`
includes the actual Delete confirmation/UI with a post-delete validation error.

Review Queue membership requires Proposed. Current creation routes proposal-only
users there and users with edit access directly to New; changing that default is
awaiting the user's routing decision. Separately, the exported parent approval
workflow can remove a Proposed parent from Review during child creation. The
prepared [workflow replacement and handoff](../../docs/contract-create-review-queue-2026-10-05.md)
preserves Proposed parents. This separate backend candidate requires comparison
with the live workflow, native Creator compilation and authorized publication.
It is not part of the frontend release and has not been deployed.

Contract creation shows one short status and a progress bar, without field names,
internal destination keys, operation counts or numbered stages. When the parent
was verified but follow-up setup stopped, the terminal title says **Contract
created** and the status says **Setup needs review.** Complete verified setup
says **Saved and ready.** An uncertain parent still warns that the contract may
have saved. The existing terminal acknowledgement, retained drafts, duplicate
protection, pending Close/Escape lock, focus trap and background isolation remain.
Pricing, file batches and approval-send dialogs keep their established presentation.

The October 5 error in 1.60.52 stopped at `ncSeed`'s first approval through
`contractWorkflowStep` and `contractReadback`; the parent, pricing and action were
already verified. The user subsequently confirmed the created record. The old
generic error did not identify which saved field was absent or different. The
replacement readback names missing, different or unreadable fields and distinct
record-count/identity failures, without logging captured or saved values. Exact
string IDs and the existing comparison/payload semantics are retained. This is a
diagnostic improvement, not a claimed repair of the unknown production mismatch.

The committed Creator export includes all seven approval payload fields in
`All_Contract_Approvals`; `Approval_Sequence` is private. Current report/profile
omissions or workflow-altered values remain possible. Exported approval workflows
can set approval Status to Approved when Approval_Action is Approve, and the
parent auto-approval workflow can set Contract.Status to Approved while no child
has a status other than Approved/Not Sent. The widget does not skip or modify
those workflows. A targeted live read of the failed approval is needed to establish
the actual field/cause. The screenshot alone does not prove it.

**Check status** only re-reads retained unknown destinations. It never creates
another contract, resumes unsent approval rows or sends the final parent update.
Resolving one unknown row does not mean complete setup succeeded.

Changed files: Contract widget HTML/progress component/config, widget manifest,
immutable release 1.60.54, SDK2 test entry, focused regression scripts,
widget README, transfer-progress/module guides and production environment mapping.
No forms, fields, backend functions or Custom APIs change in the frontend. The separate proposed
parent workflow candidate requires Creator deployment. Existing approval
fields checked: Contract1, Approver, Approval_Sequence, Type1, Status,
Reminder_Interval_Days and Approval_Email. Frontend functions changed:
contractWorkflowSnapshot/ncSubmit presentation stage, contractReadback and its
diagnostic helpers; LMContractUIPreparation renders the compact create variant.

Regression covers typed exact success, omitted private sequence, persisted
Approved status, unreadable checkbox, different approver, row identity/count,
privacy, partial-save retention, one-send protection, read-only recheck, concise
terminal copy, pending/recheck close locks, focus/accessibility and unchanged
pricing/file presentation. Rollback: restore the production mapping to 1.60.53.
No data rollback is part of this frontend release. The user authorized main and
production promotion on October 5, 2026.

Full `npm run validate` (including prevalidation) and `npm run build:pages` pass.
The full Contract SDK2 suite includes the five new create-progress, setup,
delete, LOI-permission and workflow-candidate checks. Browser preview checks pass
for desktop and 390px layouts, centered X, pending Escape lock, partial created
outcome and complete verified success. No live Creator writes, emails, permission
grants were performed. Production is mapped to 1.60.54 through the stable URL.
Native profile/LOI availability,
the original approval mismatch and backend compilation remain unverified.

## Lot action checklist visibility (1.60.53)

New Lot (Master) and Lot (Amendment) forms show the editable Actions panel immediately after Type selection. The prior staged form hid the already seeded checklist until a contract name was entered. Rendering and subsequent stage updates now keep actions visible independently of location, Builder and name. Checked-template membership, type selection, sort order, draft edits and progressive scope/terms/pricing behavior are retained.

Changed files: Contract widget source/config, widget manifest, immutable release 1.60.53, production environment mapping, Project flow regression script, widget README, and Contract/style documentation. Existing Contract_Actions.Template_Action, Type_field, Contract1, Contract_Action and Sort_Order are read as before. No forms, fields, functions, Custom APIs or Creator deployment change. Regression covers both types with distinct seven-action templates, initial/incomplete/named forms, name clearing, retained draft edits and unchanged scope/terms gates. Rollback: restore Contract Management 1.60.52 through the production environment mapping. The user authorized main and production promotion on October 5, 2026.

Full `npm run validate` and `npm run build:pages` pass against the latest main checkout. The regression exercises actual whole-widget initialization, checked template seeding and the mounted form; stage updates retain the edited action input. Earlier local work was based on an older checkout, so the production change is reapplied to 1.60.52 as 1.60.53. No live Creator write or email test is performed for this presentation fix.

## Second Closing candidate — October 5, 2026

Lot closing terms now have Initial Closing, one-time Second Closing, and
Subsequent Closings in the candidate source. New or edited applicable closing
terms require positive whole second lots and whole second days of zero or more;
untouched legacy terms survive unrelated edits. Existing no-scope Master shells
retain their creation behavior. The explicit Copy to Subsequent action stages
the current second pair once; it does not save or keep the tiers linked.

Completion copies terms only when creating a missing Takedown Schedule.
Contract edits never synchronize an existing schedule. Existing Lot fill-only
claims/pricing, completed-owner scope, and approval recipients remain in place.
Details, exports, completion progress and existing approval-email content display
the stored second terms without inventing values for legacy records.

See [the behavior and regression contract](takedown-schedule.md) and
[native activation instructions](../../creator/workflows/takedown-second-closing.md).
Both forms' additive fields are verified in Development; all dependent backend
functions/actions compiled, were saved and reopened. Both Contract report quick
layouts are Save/reload-verified, and Forecast bindings were audited without a
page change. Fresh saved-record readback and widget deployment remain pending. The older
editable-term notes below describe historical two-tier releases.
Rollback: Development mapping `1.60.52`; current main Production mapping `1.60.54`. Retain entered second values.
Local immutable candidate `1.61.2` passed full repository validation and the
Pages build; it is not mapped or uploaded. Frozen `1.61.0` and `1.61.1` remain unchanged.

Legal 1.60.51 displays native comment validation alerts as readable text.
`Validate_Comment_Log` in Creator Development now accepts and preserves
`Contract1`; Production promotion remains with the user. See
[verification and rollback](../../docs/comment-save-sdk2-hotfix-2026-10-05.md).

## Creator SDK2 candidate 1.60.48

The whole widget uses native DATA/FILE/UTIL, a fresh authenticated handshake,
counted complete cursor reads and exact string IDs. Its existing full access,
degraded permission policy, original uploader names and Legal45 Project/Territory
and staged lot-entry rules are preserved. The user confirmed Template_Action
as the current checked-template flag on October 5. Legal 1.60.52 applies that
flag with Type_field and an empty Contract1 parent, replacing the removed
Actions Contract_Template assumption. Unchecked ordinary/orphan actions are
excluded from templates; incomplete or malformed fields remain unavailable
with retained drafts and blocked template-dependent writes. The separate
Builder approval predicate and legacy Lot type fallback remain unchanged.

Captured writes require exact persisted verification. Partial or unknown results
retain drafts and confirmed stages, block replay and offer only supported
read-only reconciliation. File operations retain exact parent/child/path and
byte checks. Approval Send/Check/Repair preserves its original recipients and
meaning; no native email send is claimed. Refresh is atomic and preserves drafts.
No Creator form, field, function, API or permission change is required.

Deferred comment badge updates patch the mounted number, recent state, title and
accessible label together, preserving button identity, focus and typed drafts.

Regression: `scripts/test-contract-sdk-v2.mjs` runs eight actual whole-source
suites for counted reads, labels, inline saves, setup/pricing/lot completion,
files, captured approval flows and uncertainty. Synthetic financial and email
boundaries supplement the separate native Dev read/file/controls gate required
before Production. Rollback: the immutable Legal45 release.

## Project lookup and staged Lot creation (1.60.45)

Lot (Master) creation starts with Type and required Project, then reveals Builder and name. Optional subdivisions appear after the name and are scoped to the chosen Project. Lot terms appear after subdivision selection, lot selection after the stated total, and pricing after lots are selected. The next unfinished card and required input use yellow guidance inspired by Tax Parcel Year; completing an input moves the emphasis without replacing the name field while typing. Other contract types retain their existing flow.

Territory and Status move to the title card for both Lot types. An Amendment also displays its subdivision-derived Project and matching Parent Master there. Territory comes from the Master's Project or the Amendment's subdivisions (falling back to their actual Project when subdivision Territory is blank). One Project is required per Lot contract, using a single-select lookup. A unique same-Project/same-Builder Master is automatically linked. The business rule expects at most one match; defensive duplicate handling retains a single-select parent picker. No match leaves the parent blank. Selected subdivisions must resolve to one Project and Territory; unresolved or conflicting sources block new creation and changed scope. Unchanged legacy scope remains editable for terms-only changes. Master subdivisions remain optional.

The Lots & Pricing editor exposes Master Project, derives changed scope, and retains its completed-owner and fill-only protections. Completed-owner Project/Territory writes are restricted to the active editor's derived values. Parent matching refreshes before a live write. Created or changed Project, Territory and Parent_Contract values are read back and verified; omitted report fields do not count as success.

Changed files: Contract widget source/config, immutable release 1.60.45, widget manifest/dependency inventory, focused Contract tests, package test registration, and Contract/style documentation. Existing fields used: Contract.Project, Territory, Parent_Contract, Builder and Subdivision1; Project.ID, Project_Name, Project_Code, Territory, Company1, County and City; Subdivision.Project and Territory. Existing report All_Projects is newly read by this widget. No functions or Custom APIs change and no new schema is needed. Creator report configuration must expose Project/Territory/Parent_Contract on All_Contracts1 and Territory on All_Projects/All_Subdivisions; if the live configuration already exposes them, no Creator deployment is required. The older generated export predates Project Territory; the established Land Master Project editor already uses that field. Native form workflows are unchanged.

Regression: required Master Project, no-subdivision Master, same-Project phases, wrong Project or Builder, unique/multiple/absent parent matches, changed fresh parent data, missing report columns, failed/retried Project loads, type switches, terms-only legacy editing, draft cancellation, all-status lot claims and fill-only completion. Focused scripts and mocked desktop/390px browser checks cover the widget; live Creator persistence has not been exercised. The user authorized main/production promotion and then requested skipping the remaining checks, including the live Dev/Land Acq and CFO profile audit. Prior focused checks and the Pages build passed; full prevalidation encountered an unrelated Manage Lots release-version guard. Production mapping is promoted to 1.60.45; CI and Pages run the required checks during deployment. Profile and report field permissions remain unverified. Rollback: restore Contract Management 1.60.44 through the environment mapping; no data migration or schema removal is needed.

## Attachment creator labels and compact modal (1.60.43)

Attachment rows use only Creator `Contract_Version.Added_User` for Added by, across the file modal, attachment page, approval file list and detail file card. The recorded creator username/email is matched case-insensitively and exactly against the already loaded User Access roster; one unambiguous match uses its `fullName` / `Full_Name`, including composite first/last names. Domains and username suffixes are retained, and account aliases are used only when actually supplied by the roster. Missing or conflicting matches retain the genuine native creator display; absent or malformed creators show —. `Modified_User`, a record ID and the current signed-in actor never substitute for the creator. The attachment modal omits its explanatory preview footer and retains the existing upload area, file-info styling, Preview/Download/Delete buttons and Legal-only Email toggle. SDK1 transport, access policy, 50 MB limit, preview formats, upload/delete and email behavior are unchanged. No extra roster/report requests, forms, functions or Custom APIs are introduced by this frontend. The existing access API must provide the roster full names, and the file report must expose `Added_User`; unavailable data is never inferred. `scripts/test-contract-attachment-presentation.mjs` exercises actual renderers, exact identity joins, composite names, ambiguity/missing cases, escaped text, string IDs, file-input/drop delegation and retained controls/styles. Native gates should confirm creator/full-name availability and modal appearance. Rollback: restore Contract Management 1.60.42 through the environment mapping.

## Bolder rounded Lot branches (1.60.42)

Lot family branch strokes increase from 2px to 3px, use a deeper blue, and end with a 9px rounded elbow. The matching family rail increases from 3px to 4px. Existing row tints, indentation, filtering, collapse controls and status colors are retained. Changed files: Contract widget source/config, immutable release 1.60.42, manifest, production mapping and style/module documentation. No forms, fields, functions or Custom APIs change; no Creator deployment required. Verify single/multiple children, rounded final branch, collapse/expand and report scrolling, then run repository validation and Pages build. Rollback: restore production Contract Management 1.60.41 and redeploy Pages.

## Lot family branch rows (1.60.41)

The Lot report groups each visible Master with its linked Amendments. Masters show a matching Amendment count and a separate keyboard-accessible collapse control; nested rows use blue branch connectors, a shared left rail, and subtle blue surfaces. Child rows no longer repeat the Master name when it is visible above them. Filtered children retain their parent label when the Master is outside the results, even if that family was collapsed. Unlinked Amendments remain standalone. Family collapse survives rerenders and remains separate from action/details expansion; hidden drill rows do not dim the report. Board parent labels and status colors are unchanged.

Changed files: Contract widget source/config, immutable 1.60.41 release, widget manifest, production mapping, style guide and existing Lot type regression script. Existing Contract.ID, Contract_Type and Parent_Contract are read only. No forms, fields, functions or Custom APIs change; no Creator deployment required. Regression: multiple families and children, collapse/expand, filtered-out Master, optional/unrecognized parent, retained Board label, action drill, focus, and narrow report scrolling. Required repository validation and Pages build pass before promotion. Rollback: restore production mapping to Contract Management 1.60.40 and redeploy Pages.

## Inline Contract header and Lot type editing (1.60.40)

The detail Edit page aligns Back, contract identity, Edit/Attachments/Approvals and summary fields in one horizontal header, scrolling on narrow screens. Its Lot Type picker opens the existing staged Lot editor with Master/Amendment choices; Parent Master appears only for Amendment, remains optional and filters to same-builder Masters. Save writes only changed Contract type/scope/parent fields when lots/pricing are unchanged; incomplete existing lot terms do not block that edit. Converting a Master already referenced by children is blocked after a fresh read. Switching to Master clears the parent. Completed-owner editing stays confined to the active Lot editor and cannot change unrelated types or reopen status. Open in Creator is removed from the detail header and available in the three-dot menu only to Robby's existing identity aliases.

Files: Contract widget source/config, immutable release, widget manifest, production mapping, style guide and Contract regression scripts. Fields: existing Contract.Contract_Type, Parent_Contract and Subdivision1 only; no schema/functions/Custom APIs change, no Creator deployment. Regression: staged conversion/cancel, optional/mismatched parent, required Amendment subdivisions, Master parent clearing, linked-child guard, unchanged pricing/lots, completed-owner bounds, private Creator menu and desktop/narrow header. Full validation and Pages build required. Rollback: widget 1.60.38.

## Compact Lot hover cards (1.60.38)

Removed the generic backfill availability/preservation footer from the shared Lot picker hover card, covering new contracts and Change Lots & Pricing for both Master and Amendment types and all Lot statuses. Contract claim and On Hold warnings remain, along with Robby's private top banner and all selection/completion protections. Frontend only: no forms, fields, functions or Custom APIs change; no Creator deployment. Verify hover details and blocked/hold warnings with the existing regression suite and Pages build. Rollback: widget 1.60.37 through the production mapping.

## Lot Master and Amendment (1.60.36–1.60.37)

The native Lot choice is renamed Lot (Master), with no bulk record migration. Lot (Amendment) is added to Contract and action-template type choices. UI dropdowns, filters, creation, Lots & Pricing, exports and completion handle both types in the same Lot main-list section. Master subdivisions are optional and reveal lot selection/pricing when selected. Amendment subdivisions are mandatory; its Parent_Contract lookup remains optional and accepts only Masters with the same Builder/Counterparty. Linked Amendments appear indented below their Master with an Amendment badge and parent name.

Creator deployment includes Contract.Parent_Contract, All_Contracts1 quick/detail fields, choice updates, Complete_Lot_Contract and seven Contract workflows. A Master without subdivisions/lots completes without schedules or Lot writes. All existing parent-claim backfill and fill-only Lot protections remain. Regression and rollback details: `docs/contract-lot-master-amendment.md`; widget rollback 1.60.35, prior Creator V9.21 bodies, retaining new schema when used.

## Temporary all-status backfill (1.60.35)

All Lots in the selected contract subdivisions are selectable regardless of Status or the Lot record Contract1 lookup. Only another Contract.Lots1 selection blocks assignment, including archived/rejected contracts. The edited contract does not block its own lots. Status colors remain descriptive; locks and hover messages identify parent contract claims. Both new-contract creation and Lots & Pricing save refresh parent claims before writing. Completion uses the same parent-only conflict rule. Populated Lot fields and links are still preserved; an orphaned existing Lot.Contract1 is never replaced. Robbys private banner describes the temporary rule.

Affected forms/fields: Contract.Lots1; Lots.Contract1 is filled only if blank. Creator deployment: Complete_Lot_Contract behind the existing API; native workflow delegates unchanged. Regression: every status, blank/unknown status, legacy Lot lookup, own/other/archived parent claims, refreshed claims and failed reads, preserved pricing/builder/status/links. Validation and Pages build required. Rollback widget 1.60.34 and Creator V9.20.

## Owner backfill and fill-only completion (1.60.34)

Owners of Lot contracts may use Change Lots & Pricing after Complete. General editors keep their existing open-contract access; completed non-owned contracts and unrelated completed-contract writes remain locked. The write exception is scoped to the active Lots & Pricing session, the same contract, its lot/count/takedown fields and pricing rows. Saving selected lots to a completed contract fills only an absent Lots.Contract1 link; no pricing, builder, status, size or schedule is rewritten by backfill. Removed lots retain existing Lot data and links.

Unassigned Sold lots are selectable alongside Open lots. Both Lots.Contract1 and other contracts' Lots1 associations block reuse, including archived/rejected contracts. Existing lots on the edited contract can remain selected. Save refreshes the selected subdivisions and rechecks eligibility; link backfill rereads each target lot. A missing Contract1 report column is unknown, so it cannot authorize Sold selection or a link write. Scheduled/Contracted lots remain unavailable for new selection.

The top amber backfill banner appears only for Robby's signed-in Creator identities (`rbelliveau@wbdevelopment.com`, `rbelliveau`, `wbdevelopment`). It explains completed-owner editing, unassigned Sold selection and fill-only completion.

Complete_Lot_Contract now fills only blank Base_Price, Escalator, Builder1, Status, Contract1 and Contract_Schedule. Zero prices/escalators, Open/Scheduled/Sold statuses, existing builders and links are preserved. Lot_Size and all other Lot fields are untouched. A blank status uses Close_Date, then Purchase_Date, then Contracted. The widget repair pass uses the same rule, rereads target lots, skips omitted fields and reports repair failures. Conflicting contract associations stop server completion before schedule/lot writes. Existing multi-phase schedule naming and overlap detection from the live Development function are retained.

Creator deployment required: `Complete_Lot_Contract` behind the existing Custom API and Contract on-success `Set_Lot_Base_Price_Builde`. The native workflow delegates to the guarded function and no longer recalculates populated statuses. No new forms, fields or APIs. The existing Create Takedown Schedule 2 workflow was audited: it creates missing schedules only and does not write Lots. `mode: Check` is read-only only after the new function is published; never send it to an older function, which ignores the mode. Test targets: owner/non-owner, save guard, existing associations, Sold selection, numeric zero, all statuses, omitted report fields, failed repairs and repeated completion. Required checks: full validation and Pages build. Rollback: widget 1.60.32 plus the previous live function/workflow bodies (rollback restores their overwrite behavior).

Deployment verified October 1, 2026: Creator Stage and Production V9.20 include only the guarded function and native Contract workflow. The live Contracts Lots report already exposes Contract and Contract Schedule. Widget 1.60.34 is promoted through the stable Production URL.

## Contract owner lot editing (1.60.31)

For an open Lot contract, Change Lots & Pricing is available to a listed Contract.Owner even without User_Access.Edit_Contracts. General editors retain access. Both entry points and the open/save handlers use the same check; completed contracts stay locked. Ownership is matched by the signed-in User_Access row ID from Get_User_Access. Frontend only; no Creator form, field, function, or Custom API change, and no Creator deployment. Regression: owner, non-owner, general editor, unresolved user, completed contract, and save. Rollback: `1.60.30` via the production mapping.

## Scheduled lots in the picker (1.60.30 candidate)

Scheduled lots appear as a distinct locked state in the Lot Contract picker. Only Open lots remain selectable. No Creator form or API change is needed for this widget display; the Creator status and workflow changes are tracked in `creator/workflows/scheduled-lot-status.md`. Regression: Open selection, Scheduled/Contracted/Sold locking, claims, and picker counts. Production remains on 1.60.29; rollback: 1.60.29.

## Lot editor heading and action icon (1.60.27)

Change Lots & Pricing shows the contract name as the modal title, with the operation in the smaller label above it. The modal close button and action-row Add Note button use centered SVG symbols instead of font glyphs. Frontend only; no Creator form, field, function, or Custom API change. Regression: long contract names, modal close/cancel/save, and Add Note alignment and click behavior. Rollback: `1.60.26` via the production mapping.

## Legal LOI rejection progress (1.60.26)

After the existing confirmation, Reject LOI opens the Contract progress modal with Legal rejection, Pro Forma return, and Acquisition notification phases. `Review_LOI_Request` supports targeted `CHECK_REJECT` using the original token while Pending or the exact Legal note after rejection. Success verifies `LOI_Legal_Status=Rejected`, the note, and cleared token. The write response reports a notification only after sendmail succeeds; no persisted notification stamp exists, so an ambiguous response ends in a warning and never triggers a blind resend. One automatic retry is allowed only if the targeted check still finds Pending Approval, within the 20-second deadline. Creator deployment: `Review_LOI_Request`; no new fields or Custom APIs. Regression: success, no Acquisition email, email failure after status write, ambiguous response, stale token, retry, focus/Tab/Escape, duplicate click. Rollback: widget `1.60.25` and prior function body.

## Send for Approvals progress (1.60.25)

The existing confirmation opens a progress modal as soon as Send now is clicked. It checks only the contract and selected `Contract_Approvals` row IDs through the existing `Send_Contract_Approvals` Custom API in `Check` mode, about once per second. `Repair` sends only unsent selected rows. Success requires the parent Contract status `Awaiting Approvals`, every selected row `Awaiting Approval`, and every row's `Last_Reminder_Date` stamped after the email helper succeeds, with recipient addresses present. Partial activation or missing delivery evidence ends in an email warning with Retry email; other unverified states end in an error with Try again. The modal stays open until dismissal and blocks duplicate sends. The DEV widget supplies `wbdevelopment` only for the Development `rbelliveau` access alias; Production keeps the logged-in username. The function still enforces `User_Access.Edit_Contracts`. No new Creator fields, reports, or Custom API registrations. Rollback: Contract Management `1.60.24` and the previous `Send_Contract_Approvals` body.

## Attachment and comment action size (1.60.19)

The contract-list attachment and comment controls are 15% larger. Their compact 28.75px size and hover behavior are shared with Budget phase attachment and comment controls. Attachments always show their count without a recent-activity glow; comments retain their existing seven-day activity signal. Rollback: `1.60.18`.

## Comment Log on contract rows (1.60.14)

Each Contract row has a Comment Log action using `Comment_Log.Contract`. It mirrors the count and seven-day recent-activity treatment used for Pro Forma, Project, and Budget discussions. The `Contract` lookup must be published on Comment Log, and `Validate_Comment_Log` must preserve it on edits. Rollback: `1.60.12`.

## Action popovers and Legal assignment filter (1.60.1)

Action Start, Due, and Done cells now exclusively open the widget quick-date popup while
retaining their native date inputs as value carriers. Contract action combo popovers follow
their trigger during view scrolling, so long assignee/status lists do not disappear. The
Contract Name cell uses a fixed counterparty subcolumn so builder pills align across rows.

Review includes an Assigned to me pill. It resolves the signed-in identity against existing
fields only: Add_Pro_Forma Acquisition_Email/Owner, Contract Current_Approver/Owner/
WBW_Point_Person, Contract_Actions Dev_Mgr, and Contract_Approvals Approver. The page narrows
while the Review tab badge stays global. Frontend only; no Creator deployment is required.
Rollback: 1.60.0.

## Editable lot count and takedown terms (1.58.1)

Change Lots & Pricing now includes three compact groups: contract total, initial takedown, and ongoing takedowns. The five inputs update existing Contract fields Number_of_Lots, Initial_Takedown, Initial_Takedown_Days, Subsequent_Takedown_Lots, and Subsequent_Takedown_Days. Draft values survive lot-picker navigation; Cancel and the close button discard them. Whole nonnegative numbers are validated; optional cadence fields may be cleared.

A live warning compares the stated total with unique selected lot IDs. The same warning appears beside Lot contract names in the list. Mismatch is advisory: the declared count remains independent of the lot selection. Count/cadence-only saves work even without selected lots and do not reconcile or delete pricing. Combined edits preserve the existing pricing flow and edit/completion locks. The attachment tooltip now reads Attachments.

Verified desktop form and 390px fit; regression tests cover mismatch/deduplication, number validation, clearing cadence, terms-only saves preserving pricing, and combined count/selection saves. No new fields, functions, Custom APIs, or Creator deployment are required. Rollback: 1.58.0 via production mapping.

## Lot picker, row details, and destructive-action access (1.58.0)

The lot picker now queries All_Active_Lots_Contracts_View by each selected Subdivision ID. The former app-wide cache stops at 5,000 rows and can omit entire subdivisions. Scoped results merge without discarding other subdivision lots; loading/errors are distinguished from a successful empty result. The native report, lot eligibility, claims, and completion rules remain unchanged.

Contract names have a paperclip/count opening the existing attachments modal. Lot contracts also show Number_of_Lots (or selected Lots1 count), Initial_Takedown / Initial_Takedown_Days, and Subsequent_Takedown_Lots / Subsequent_Takedown_Days. Attachment counts refresh when the modal repaints.

User_Access.Delete_Archive_Contracts is explicitly named by the user and is exposed as ctDeleteArchive by creator/functions/getUserAccess.dg. Archive/Unarchive and the new Delete menu action require a known, found access response with this flag true. Missing flags and failed access reads deny these actions even when general editing is allowed. Handlers and the parent-contract SDK mutation helpers repeat the check. Delete uses the existing exact-ID SDK path and an in-widget confirmation; completed-contract locks remain enforced. Creator's native record permissions and relationship constraints still govern deletion; the widget does not manually cascade through child records.

Creator deployment required: confirm the boolean User_Access.Delete_Archive_Contracts field exists, then publish the updated getUserAccess function behind Get_User_Access in the applicable Creator environments. GitHub Pages cannot publish Deluge. Until then, destructive controls remain hidden. No new Custom API is introduced; approval tokens and LOI review behavior are unchanged.

Validation: scripts/test-contract-picker-access.mjs covers scoped queries, string IDs, preserved cached rows, errors, deny-by-default permission combinations, exact-ID delete requests, unauthorized delete invocation, attachment click behavior, and lot/cadence summaries. Full repository validation and Pages build are required. Rollback widget: 1.57.1 via the production mapping. The additive getUserAccess response key is backward compatible.

## New contract and lot-picker presentation (1.57.1)

New Contract is the enlarged main modal title; the redundant Create Contract heading is removed. New-contract dropdowns use white backgrounds and visible borders. Choose lots builds its subdivision choices from the contract selection and resolves names from loaded Subdivision records, then lot lookup display names, including when there are no lots. Async loads repaint the custom combo rather than inserting native option elements into its button. Existing Subdivision.Subdivision_Name and lot subdivision lookups are read only; no fields, functions, Custom APIs, or Creator deployment changes. Regression checks cover no lots, ID-only lookup, display-name fallback, missing names, and allowed-subdivision scope; also verify contract creation, dropdown selection, and Choose lots after loading. Rollback: `1.57.0`.

## Scope

Contracts, contract versions, schedules/actions, approvals, attachments, and LOI legal review.

## LOI review

The current contract widget supports token-based legal review using `tokenId`. Preserve token validation, review status, legal note, and Proforma/Contract linkage.

## Attachments

`Contract_Version` is also used by Budget attachments. Confirm the correct parent lookup (`Contract1` versus `Budget`) before changing shared attachment logic.

Contracts use one `Contract_Version` record per file with `Contract1` as the
parent lookup and `File_field1` as the upload field. Attachment record creation,
deletion, and exact-byte reads use these Custom APIs first:

- `Create_Contract_Attachment_Record` → `createContractAttachmentRecord`
- `Delete_Contract_Attachment` → `deleteContractAttachment`
- `Get_Contract_Attachment_Preview` → `getContractAttachmentPreview`

`Get_Contract_Attachment_Preview` supplies the same base64 bytes to both the
in-widget preview and download paths. The function must verify both the
`Contract_Version.ID` and `Contract1` parent before returning a file.

## Lot picker unavailable cues (1.60.32)

Sold and unavailable tiles use darker slate gray; Contracted and selected lots use deeper blue. Unavailable lots carry a diagonal texture and centered SVG lock, with aria-disabled metadata. Legend and hover colors match. Existing Legal eligibility, claims, drag/select-all and hover behavior remain unchanged: only unclaimed Open lots can be selected, including On Hold flags.

Release QA: widget.html, widget.config.json, manifests/widgets.json, deploy/environments.json and module/style documentation, plus immutable release 1.60.32. No forms, fields, functions, Custom APIs, permissions or Creator backend deployment change. Browser checks covered unavailable click rejection, eligible selection/select-all, hue/texture/icons and hover details; full validation and Pages build required. Rollback: 1.60.31.


## Startup/report refinement — 2026-10-04

Legal 1.60.50 uses the existing Get_User_Access_Lean API and its Get_User_Access_Lean_DEV POST alias. Legal flags and the original-author/full-name roster match the full API; unused Pro Forma owner scanning is omitted. Whole-source permission/owner/attachment/approval regressions remain required. No Creator deployment; rollback 1.60.48.

Evidence and further improvements: [startup refinements](../../docs/startup-refinements-2026-10-04.md).
