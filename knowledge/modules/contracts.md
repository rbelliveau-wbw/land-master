

## Save policy — October 8, 2026

Acknowledged successful saves no longer compare refreshed editable/calculated
fields with the submitted payload. Record identity/count, real API errors,
preflight and duplicate-send guards remain; explicit unknown-reply recovery is
read-only. This supersedes earlier automatic field-equality requirements. See
[implementation, regressions and rollback](../../docs/automatic-save-check-removal-2026-10-08.md).
## Full User Access owner names

Owner pickers and displays prefer User_Access.Full_Name, preserving original
record IDs and login/email permission identities. Blank names keep the existing
fallback. See [scope, verification and rollback](../../docs/owner-full-names.md).

# Contracts Module

## Proposal access and manual Acquisition (1.61.34)

`Propose_Contract_Changes` permits ordinary action edits, completion/reopening,
reordering and proposed Contract/action creation without `Edit_Contracts`.
Inline saves now share that permission; new grid actions from proposal-only
users are Proposed. Contracts returns to the established full access API while
the lean endpoint's affected-user Production parity remains unverified.
Approve/Delete/Archive/Templates and completed-contract locks remain separate.
Acquisition is available for manual creation without Project or Subdivision;
stale scope is cleared and excluded from save/setup. New parents remain Proposed
for Legal review. Frontend only; no Creator publication. See
[diagnosis, regression scope and rollback](../../docs/contract-proposal-access-2026-10-08.md).
Rollback Production to 1.61.32.

## Attachment uploads in the existing workspace (1.61.29)

Contract attachments accept either documented root or data file receipts and
keep exact saved child/parent/path verification. Uploads now show a spinner and
inline errors/Check status in the original mounted attachment modal; the extra
Contract-fields dialog is removed for file batches. Native failure causes remain
visible, and read-only create recovery repeats the email-flag predicate. Pending
requests, duplicate guards and unknown/no-replay behavior remain. No Creator
deployment is needed. See [diagnosis, regressions and rollback](../../docs/contract-attachment-upload-response-2026-10-07.md).

## Fresh Lot ownership checks (1.61.29)

The picker refreshes complete scoped Lots and the complete authorized Contract
snapshot together. Another Contract's `Lots1` membership blocks selection across
all statuses, archived/rejected records and Master/Amendment relationships; a
foreign `Lots.Contract1` now also blocks it. The exact edited Contract may retain
its own selection/link. Missing or malformed association fields leave availability
unavailable. Direct toggle/block selection recheck ownership and subdivision scope,
and fresh create/edit save verification stops newly claimed Lots before any write.

Each picker refresh captures a new generation alongside its actor, navigation,
draft/editor and subdivision scope. Only the latest refresh may publish results
or change loading/error state. Older same-draft successes cannot replace newer
claims, and older failures cannot unlock a pending newer read or replace its
successful result. Existing immutable captures, persisted verification and
unknown-response/no-replay handling remain.

The temporary all-status unassociated backfill selection remains. Selecting a
Sold Lot does not authorize transfer changes: the existing native completion
source preserves the whole Sold/date-protected Lot. The user accepted the separate
daily fill of a blank `Contract_Schedule` by subdivision/builder; that exception
and native workflows remain unchanged. The accepted minimum blocker is another
parent Contract's `Lots1`, now supplemented by the reverse-link check. Source,
fixtures and deployment records were audited; current live native source was not
inspected. Global uniqueness under simultaneous submissions is not claimed.

Affected frontend functions: `contractLotScopeCurrent`, `ncLoadPickerLots`,
`lpVerifyClaimRows`, `lpClaimedBy`, `lotPickable`, `lpPruneDisallowed`,
`lpSelectBlock`, `lpToggle` and `clpValidateLots`; state adds `S.lpLoadGeneration`.
Existing `Contract.Lots1`, `Lots.Contract1`, exact IDs and subdivision scope are
read/validated; parent save and native transfer payloads are unchanged. No form,
field, backend function, Custom API or native workflow changes; no Creator
deployment is needed.

The actual-widget selection regression covers both association directions,
own-owner editing/new scope, all-status and family claims, malformed/missing
columns, direct/block guards, changed actor/draft, overlapping refreshes and
zero-write rejected create/edit. Existing backfill, picker, pricing, SDK2 scope
and transfer tests remain. Release gates include the complete Contract SDK2
aggregate, `npm run validate`, `npm run build:pages`, diff checks and exact
source/immutable-release/Production-output checks. User-authorized main and
Production promotion maps Contract Management to **1.61.29**; permanent Creator
URLs and Development/Stage mappings are retained. Rollback Production to
**1.61.26**, without native or data changes. See the [complete audit and release
scope](../../docs/contract-lot-selection-safety-2026-10-07.md).

## Pricing confirmation reduced another 10% (1.61.18)

Following user review, scale the pricing-only black success banner to 90% of
1.61.17: text, checkmark, padding, gap, radius and shadow shrink together.
Keep the existing colors, top-center position, nonblocking status and 3.5-second
dismissal. Wider adoption is still a proposal awaiting the user's selection.

Changed files: widget HTML/config, manifest, immutable release 1.61.18,
Production mapping, transfer-progress guide, module notes and widget README.
CSS only: no frontend function, Creator form/field, backend function, Custom
API or payload changes; no Creator deployment required. Verify desktop/320px
dimensions are about 90% of 1.61.17, plus existing pricing loading/save/recovery
regressions. Required repository validation and Pages build pass before
promotion. Rollback Contract Management Production to 1.61.17.

## Pricing success banner reduced by 30% (1.61.17)

The user reviewed the black pricing-save confirmation and requested it 30%
smaller. Scale its text, icon, padding, gap, radius and shadow to 70% of the
1.61.16 sizes. Black/white styling, position, 3.5-second dismissal and scope
remain unchanged. Other success banners await approval before wider adoption.

Changed files: widget HTML/config, manifest, immutable release 1.61.17,
Production mapping, transfer-progress guide, module notes and widget README.
CSS only: no frontend function, Creator form/field, backend function, Custom
API or payload changes; no Creator deployment required. Verify rendered width
and height are about 70% of 1.61.16 at desktop/320px, plus the existing pricing
save/recovery and loading tests. Required repository validation and Pages build
pass before promotion. Rollback Production to Contract Management 1.61.16.

## Pricing loading, retained screen and scoped success banner (1.61.16)

Change Lots & Pricing paints unresolved selected Lot metadata as a neutral
**Loading lot pricing…** state. Start that state before the first modal paint,
then begin the scoped read after mounting the editor. Full cached values remain
visible during refresh, and edits survive that refresh. Highlight a genuinely
missing price only once its selected Lot sizes are known. A failed read stays
neutral with an unavailable message; late reads cannot replace the picker,
reopen a cancelled editor or repaint another editor.

Verified pricing saves close the editor and refresh the originating list, board
or detail screen with its filters, expanded rows and scroll preserved. Verified
read-only Check status recovery behaves the same way. Contract creation still
opens the newly created record. Pricing-save success alone uses a black banner
with white 22px text, a centered 32px mint SVG check and doubled padding; it
remains at the top center and dismisses after the existing 3.5 seconds. This
is the user's one-implementation trial, pending verification before any wider
success-banner rollout. Errors and other success banners retain their styles.
Unknown saves retain their captured draft and one-send/read-only recovery rules.

Changed files: widget HTML/config, widget manifest, Production mapping,
immutable release `1.61.16`, `test-contract-pricing-loading.mjs` and its SDK
suite import, transfer-progress/style guides, this module and widget README.
Affected frontend functions: `ncPricingUnresolved`, `ncSyncSeq`, `ncSyncSteps`,
`ncLotsBlock`, `ncLoadPickerLots`, `clpOpen`, `contractWorkflowClose`,
`contractWorkflowFinish`, `contractWorkflowRoutineRecheck` and `banner`.
Existing Contract, Lots and Contract_Pricing forms/fields and native pricing
payloads are unchanged; no backend function or Custom API changes, and no
Creator deployment is required.

Regression covers cold/partial/full cache, delayed and failed reads, genuine
missing prices, preserved entered values, picker/cancel isolation, verified
save from list/board/detail, filter/scroll retention, native one-write pricing
readback, unknown-write retention and read-only recovery, scoped success/error
styles, desktop/320px layout and the existing auto-dismiss duration. Full
repository validation and Pages build are required before promotion. Rollback:
restore Contract Management Production to `1.61.15` and redeploy Pages.

## Escalator in shared Lot Pricing rows (1.61.15)

The creation and Change Lots & Pricing tables include **Escalator %** between
Price / ft and Base price. Enter percent points directly: `5` is 5% and `5.25`
is 5.25%. The optional per-size value accepts up to two fractional digits,
retains explicit zero and blank, and rejects invalid values without rounding.
Existing pricing values load into the draft; the captured creation and pricing
reconciliation payloads save the existing `Contract_Pricing.Escalator` field.
Changing only the Escalator still saves the pricing row, and an untouched value
is preserved. Percent-formatted native readback is verified numerically.

`Complete_Lot_Contract` already copies `Contract_Pricing.Escalator` directly to
eligible `Lots.Escalator` only when the Lot value is null. Existing zero and
populated values remain unchanged, together with existing prices and lot size.
The frontend continues using that guarded transfer and persisted verification;
no backend function, workflow, form, field or Custom API is added or changed.
No Creator deployment is required.

Changed files: widget HTML/config, widget manifest, Production mapping,
immutable release `1.61.15`, focused pricing-escalator regression, validation
chain, style guide, this module and widget README. Regression covers create
and existing-contract saves, per-size draft/reopen behavior, Escalator-only
changes, percent-point and formatted readback, blank/zero preservation,
two-decimal validation, null-only Lot propagation and narrow table layout.
Full repository validation and Pages build are required before promotion.
Rollback: restore Contract Management Production to `1.61.14`.

## Clear lot-completion confirmation (1.61.14)

Lot completion uses the selected Clear summary design with no explanatory lead
below the heading. Contract identity, the selected lot count and contract pricing
sit above the changes on completion. Eligible lots become Contracted; schedule
creation/reuse and the actual open actions closing today are separate outcomes.
Existing prices and lot sizes remain preserved, and eligibility rules expand
below the protected-lot notice. Multiple size/price groups, missing pricing,
unmatched sizes and no attached lots retain their distinct summaries. The group
count is not a promise that every selected lot will change.

Changed files: widget HTML/config, widget manifest, Production mapping,
immutable release `1.61.14`, transfer-progress guide, this module and widget README.
Affected frontend functions: `lotCompletionPreview`, `lotCompletionSummaryHtml`,
`lotCompletionPreviewPaint` and `lotCompletionDialog`. Existing Contract, Lots,
Contract_Pricing and Contract_Actions fields are read for presentation; no field,
backend function, Custom API, payload, permission or completion rule changes.
No Creator deployment is required.

Regression covers immediate disabled Checking, fresh readiness, failed checks,
Cancel, stale context/selection, duplicate clicks, no writes before confirmation,
safe Lot transfer verification, no/multiple pricing groups, zero actions, long
names, narrow layout and the centered close icon. Full validation and Pages
build are required before production promotion. Rollback: restore Contract
Management Production to `1.61.12`.

## Normal request timing (1.61.12)

At the user's request, Contracts removes its artificial 40-request-per-61s
budget. The live 1.61.11 audit measured 61.286s total, including about 55s of
budget waiting and about 6s of native work. Contracts now explicitly selects
the shared scheduler's normal timing (`maxRequestsPerMinute: 0`). Max-three
concurrency and recovery from actual Creator throttle responses remain; writes
are never automatically retried. Exact persisted verification, the creation
fixes, live audit and five-second green confirmation remain unchanged.

Changed files: widget HTML/config, widget manifest, Production mapping,
immutable release `1.61.12`, SDK fixture/create regression, this guide and
widget README. No forms, fields, native CRUD methods, backend functions or
Custom APIs change; no Creator deployment is required. Only the widget's
`LMData.configure` request-budget setting changes.
Regression runs a complete seven-action/two-approval creation with 39 recent
requests and confirms zero artificial waits, all 11 destinations verified,
one write each, max-three concurrency and the five-second banner. Existing
synthetic-budget tests still cover truthful queue timing and recovery.
Full `npm run validate`, `npm run build:pages`, focused creation regression,
design-doc discovery and exact source/release byte checks passed.
The accepted live test contract is retained for the user to test; no further
contract creation/deletion/acceptance is performed for this timing-only release.
Rollback: restore Contract Management Production to `1.61.11`.

## Creation settlement and live audit (1.61.11)

Native Production reproduction found the specific failure: the final setup
update wrote the first action title into the parent `Contract.Current_Action`,
but Creator returned that summary blank. The exported
`Write_Latest_Action_Appro` on-success workflow derives it from started or
completed children; new undated, incomplete actions therefore clear it. Exact
verification reported `different Current_Action` despite all seven action
rows and both approval rows saving. The retained unknown mutation then blocked
the UI and correctly withheld the green success banner.

Creation now verifies final `Contract.Status` routing without writing the
workflow-derived summary. Each child's title, sort, status, complete flag and
current flag still require exact verification; the widget already displays
the current child's title. The real confirmation path remounts the captured
creation editor before submitting, so Saving, Live audit log and read-only
Check status remain visible rather than referring to a detached button.
Native reproduction also recorded 21s and 32s request-budget queue waits;
these waits remain paced and are now visible, not mistaken for failed writes.
The final native Production run verified all 12 destinations in 61.286s and
showed the green **Contract created and sent to Legal for review** confirmation.
The matching replacement was accepted from Review; a fresh page reload confirmed
one matching contract with Status New, 97 selected lots, the saved pricing and
closing terms, seven actions and two Not Sent approval rows. The contract is left
open for the user's review. Acceptance only moved it into the pipeline; no
approval-email or signing action was performed. The captured audit and screenshots
remain local test evidence, outside published release assets.

Creation no longer reloads four whole-app reports after all intended writes have
already passed exact fresh persisted verification. Each verified row is merged
into the model by `contractWorkflowStep`; the captured ledger must be completely
verified before the five-second green Legal confirmation and normal UI return.
The prior extra reload had no deadline and could hold Saving and the global
interaction lock indefinitely after the parent appeared in Review on refresh.
This additional lock path is reproduced in a local SDK fixture; the native
failure above was observed before that unrelated full-report reload.

Creation's extra subdivision and parent/lot preflight reads now use the existing
30-second verification deadline, respecting the shared 40-per-61s request budget.
A late result cannot send further setup after the run has ended. A confirmed
parent with incomplete setup keeps the persistent Setup needs review warning;
unknown native mutations still retain Check status and never replay writes.

The save footer and existing audit panel show real elapsed time, verified counts,
active requests and queue waits. Audit/Copy/Clear/Close remain usable while writes
are locked. The live JSON diagnostic and Copy log retain three runs without raw
business values, recipients or approval tokens. Sampling adds no SDK requests.

Changed files: widget HTML/config, widget manifest, production mapping, immutable
releases `1.61.9` through `1.61.11`, create-progress regression and DOM fixture,
transfer-progress guide and README.
The final release wraps the save footer on narrow screens.
Affected frontend functions: `ncConfirm`, `ncSeed`, `ncSubmit`, `ncFixSubdivision`,
`lotRefreshMasterMatch`, `contractWorkflowStep`, `contractWorkflowRead`,
`contractWorkflowBegin/Finish/Paint/RoutineRecheck`, `contractControls`,
`renderAudit`, `auditToText`, and the `contractWorkflowAudit*` helpers.
Existing forms/fields are unchanged. The final parent update omits the
workflow-derived `Current_Action`; child payloads and exact comparisons remain.
No backend function, Custom API or Creator deployment changes.
Regression covers seven actions/two approvals under the real request budget,
the actual confirmation-to-submit path and the derived parent-summary reset,
visible/accessible queue diagnostics, one-send guards, no whole-report refresh,
five-second confirmation, hung subdivision read and no writes after late
settlement, plus existing unknown/partial reconciliation and approval/LOI flows.
Full `npm run validate`, `npm run build:pages`, CI and Pages deployment passed.
The native test additionally covers the confirmed creation banner, return from
Saving, Review acceptance and persisted state after reload.
Rollback: restore Contract Management Production to `1.61.8`.

## Closing summaries, creation confirmation and delete feedback (1.61.8)

Legal/Contracts uses stacked `Initial: N lots / D days`, `Second: N lots / D days`,
and `Cont'd: N lots / D days` summaries in contract rows, expanded previews, and
the detail header. The shared formatter preserves saved values, explicit zeroes,
legacy records without a Second Closing, and the existing missing-cadence cue.
The total lot count and mismatch warning remain separate from the schedule.

Contract creation shows a larger green success banner for five seconds after
complete persisted verification. It says the contract was sent to Legal for
review only when the saved parent is Proposed. Other saved statuses get a
generic creation confirmation. Pending, partial and uncertain creation never
announces success; complete read-only reconciliation can show the same banner.
Old success timers are cancelled before any replacement banner.

Deletion checks fresh counted absence of the exact preflighted string ID even
when Creator's settled reply contains a conflicting, numeric or lowercase ID.
Verified absence completes the UI delete without an error or a retained write
lock, and never changes the target ID or replays deletion. A conflicting reply
is retained as an audit warning. Still-present, denied, incomplete, pending or
changed-session verification remains an error/unknown outcome. This addresses
the reported successful deletion followed by a conflicting-response UI error;
the original response shape was not supplied. Subdivision values in the expanded
preview inherit the other detail values' font; label styling targets direct
children only.

Changed files: widget HTML/config, widget manifest, closing-summary, delete and
create regression checks, record-detail and transfer-progress guides, widget
README, immutable release `1.61.8`, and the production environment mapping. The display reads existing
Contract fields `Initial_Takedown`, `Initial_Takedown_Days`, `Second_Closing_Lots`,
`Second_Closing_Days`, `Subsequent_Takedown_Lots`, and `Subsequent_Takedown_Days`.
No Creator forms, fields, backend functions, Custom APIs, or workflows change;
no Creator deployment is required. Frontend functions: `lotClosingSummary`,
`lotClosingSummaryHTML`, `contractTitleExtras`, `drillRow`, `renderDetail`,
`banner`, `contractCreatedBanner`, `contractWorkflowFinish`,
`contractWorkflowRoutineRecheck`, `ncDemoCreate`, and `contractNativeMutation`.
Regression covers all three displays, legacy blanks, zero days, absent cadence,
and existing closing-term validation/copy/save behavior, conflicting delete
replies with persisted absence versus retained/unknown targets, one-send guards,
pending/unknown create outcomes, timer replacement and five-second confirmation.
Rollback: restore the
Contract Management Production mapping to `1.61.6`.

Verification: full `npm run validate` (including prevalidation), `npm run
build:pages`, focused delete/create regressions, and exact immutable-release /
production-output byte checks pass. Routine presentation checks use the local
whole-widget harness; no live Creator records or approval emails were sent.

## Save feedback and completion readiness (1.61.5)

Ordinary Contract creation and Lots & Pricing saves use the existing action
button for **Saving…**, followed by a short result banner. They do not open the
Captured Mutation progress/result overlay. Verified success returns to the
record. An uncertain write retains the captured draft and ledger, blocks another
send, and changes the same button to **Check status**. That action only verifies
retained unknown destinations; it cannot send unsaved setup or replay a write.
Verified parent creation with unfinished setup remains **Contract created.
Setup needs review.** Subdivision repair is part of that same captured ledger.
Actual multi-record Lot transfer, file and approval dialogs retain their controls.

Routine failures retain the actual diagnostic error and verified/unverified
destinations in the audit and queue the existing critical-error email report.
Each run reports its failure once; the reporter uses one configured API request
and does not retry an alternate endpoint after an uncertain acknowledgement.
Native response wrappers are parsed before claiming report success. Email
delivery is not established by the local tests.

The completion confirmation opens immediately with **Checking…** disabled while
fresh Contract, pricing, action and selected-Lot reads finish. Readiness patches
the mounted confirmation. Cancel, a changed actor/selection/data generation,
failed reads or a missing backend capability cannot enable completion or reopen
the cancelled confirmation. Selected Lots are read in bounded exact-ID batches;
every returned set must match its captured IDs without omissions, duplicates or
unrelated rows. This reduces verification requests without weakening preserved
price, size, builder, lifecycle or foreign-link checks. Contract reads use the
existing rolling request budget and throttle recovery for read-only requests;
writes are never retried. Verification allows time for scheduler budget waits
without extending the deadline for a hung native request. With 74 selected Lots,
25-ID batches use six count/read requests per pass: 18 for the three existing
verification passes, or 24 including the completion preview, versus 444 in the
former three passes of individual Lot reads.

The Lot count & closings section uses compact equal cards with visible Lots/Days
captions and full timing tooltips/accessibility labels. Copy to Subsequent sits
beside the heading and remains a one-time draft copy. Desktop, 800px and 390px
previews confirm aligned inputs, 4/2/1 columns and no horizontal overflow.

This release changes frontend source, its immutable assets, tests and guides.
No Creator forms, fields, report permissions, functions, workflows or Custom API
registrations change. The existing safe native transfer capability is still
required; a frontend promotion does not publish it. Regression covers ordinary
save/create success, known partial and unknown writes, delayed/duplicate clicks,
read-only status checks including subdivision repair, one-request email handling,
immediate/cancelled/stale confirmation and exact Lot batches. Required release
checks are full repository validation and the Pages build. Rollback: map Contract
Management Development and Production to `1.61.4`; retain Stage and saved data.

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
Rollback: Development mapping `1.60.52`; prior Production mapping `1.60.56`. Retain entered second values.
Local immutable candidate `1.61.4` passed full repository validation and the
Pages build; the user authorized Production mapping to `1.61.4` through Git and retained responsibility for Creator promotion. Frozen `1.61.0`, `1.61.1` and `1.61.2` remain unchanged.

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

Historical behavior below: 1.61.29 retains all-status unassociated selection,
but both foreign association directions now block selection. The earlier
parent-only exception for a foreign Lot lookup is superseded by the current
[ownership checks](#fresh-lot-ownership-checks-16128).

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

## Currency display and editable precision (2026-10-05)

Legal currency summaries now show cents, including Contract pricing, lot base
prices, LOI amounts and Earnest/Total values. Price-per-foot money inputs preserve
all decimal digits through render, focus and blur; the formatter no longer rounds
an input to two decimals or converts its raw text through floating-point parsing.
Calculated base prices and count fields retain their existing numeric behavior.
Native grouped USD values display their full dollar amount rather than stopping
at a comma. No Creator function, field, workflow, permission or API changes.
Accounting parentheses, dollar-before/after-minus credits and Unicode minus
signs normalize to the same negative amount without altering decimal digits.
Malformed grouping, conflicting signs and incomplete parentheses remain invalid;
the currency formatter does not silently turn these into a positive value.

`scripts/test-systemic-currency-display.mjs` checks currency summaries, repeated
actual focus/blur formats, native grouped values, high-precision input text and
unchanged count formatting. The prior Production widget is the UI rollback;
these display checks do not establish native Production save correctness.

Native Contract currency/decimal readback and read-only recovery now compare
exact canonical decimal strings, including signed-dollar, accounting and Unicode
minus credit formats. Group separators and insignificant trailing zeros may
vary; lost cents, wrong signs, malformed grouping and neighboring values beyond
JavaScript Number precision remain different or unverifiable. Text identifiers
and lookup record IDs retain their existing exact-string comparisons.

Entered Price_per_Ft and Earnest_Money_Per_Lot values retain their decimal text
in actual native edit, add, Contract creation and pricing-seed payloads. The
Change Lots & Pricing draft and reconciliation also preserve and compare those
digits; calculated Base_Price, lot sizes and counts keep their numeric behavior.
Malformed inline monetary input is retained without sending a replacement zero.
Numeric calculation results written in exponent notation compare against their
equivalent decimal readback; exponent notation in entered money text is invalid.

The existing Contract SDK foundation, fields and workflow regressions exercise
actual native SDK payloads, create/edit readback and ambiguous-response recovery
without another write. They cover equivalent credits, missing cents, malformed
signs/grouping, high-precision differences, exact entered payload digits and
unchanged computed totals/counts. No Creator fields, workflows or API metadata
are modified; these fixtures do not establish live Production correctness.

## Routine success feedback — October 6, 2026

Routine contract/action/owner/status/template/file confirmations use the shared style. Pricing and action autosaves keep green field checks and add grouped success feedback under the existing revision and navigation guards. Lots and pricing saves and read-only recovery retain the originating screen. See [the shared design guide](../design/success-feedback.md) for sizing, wording, inline preservation and reuse. This rollout is frontend only and adds no forms, fields, backend functions, Custom APIs or verification requests.
# Parent Contract assignment (1.61.22)

All types now expose optional Parent Contract in the new flow and existing
contract left panel, menu and detail header. Any contract with children shows
a counted Master role badge and cannot be nested; existing type labels remain.
Only top-level contracts are eligible parents. The user's explicit exception
retains same-Project/same-Builder Lot Master matching for Lot Amendments.
Fresh checks and exact persisted verification protect set/clear and reject
self-links, stale child/parent/status changes, and missing report fields.

Changed files: Contract widget source/config/manifest and immutable release,
four native Contract workflow mirrors, Complete_Lot_Contract, focused tests,
SDK2 suite registration, and module/style/release documentation. Existing
Contract.Parent_Contract, ID, Contract_Type, Project, Builder, Subdivision1 and
Status are read; only Parent_Contract is written by the relationship editor.
No new Custom API or schema field. Creator deployment is required for lookup
criteria, native validation/visibility and Lot completion. Regression and
rollback details: [Parent Contract assignment](../../docs/contract-parent-assignment.md).

## Earlier Parent flow (1.61.25)

New contract Parent selection precedes Territory and Counterparty and inherits both. Read-only inherited values return to the prior draft when Parent clears. Status moves into the title row; optional label spacing is explicit. Existing-contract assignment and Lot Amendment matching remain unchanged. Fresh create preflight prevents writing changed inherited parent context. Frontend only; existing Contract.Territory, Builder and Parent_Contract fields, no new API or Creator publication. Regression and rollback: [Parent flow](../../docs/contract-parent-assignment.md#earlier-parent-flow--16125).

## Review and family report (1.61.26)

Accept acts directly in Review with confirmed Approval Queue access; Proposed
status is read-only in the editor and fresh ordinary status writes cannot release
it. Creation uses a separate persistent progress/result dialog. Completion has
one heading; locked status pills match dropdown dimensions. All-type children
stay under their parent, including context parents outside filters. Child-type
count badges share the report palette, and Parent pickers group types and show
counterparty pills in wrapped rows. No Creator backend deployment. Scope,
verification, limitations and rollback: [release notes](../../docs/contracts-review-and-insights-2026-10-06.md).

## Saved attachment reconciliation (1.61.30)

After a settled unrecognized/lost FILE reply, automatically verify the exact saved
child and parent/file before reporting failure. Never replay an upload from that
check. Contract uploads preserve the Email switch without requiring it to be on;
Budget phase rows omit the direct Approvals shortcut and reserve space for their
remaining controls. No Creator backend deployment is required. See
[regression evidence and rollback](../../docs/attachment-upload-reconciliation-2026-10-07.md).

## Attachment verification and recovery UI (1.61.31)

Global recovery notices no longer lock navigation after settled failures. Contract
and PF attachment uploads verify saved child/parent/file metadata using the
working Budget approach, without a download/byte-comparison gate. PF deletion
verifies absence using a counted collection rather than reading a deleted ID.
Pending requests and duplicate uncertain writes remain protected. No Creator
deployment is required. See [checks and rollback](../../docs/attachment-terminal-recovery-2026-10-07.md).
