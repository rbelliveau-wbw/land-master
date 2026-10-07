# Contracts 1.61.26 and Insights 1.5.46

Review Accept commits directly, without a confirmation or progress modal.
Decline retains its confirmation. The clicked row shows Accepting while the
widget blocks duplicate writes. Fresh proposed actions are verified before the
parent enters New; a failed or unknown child leaves the parent Proposed.
Preflight reads have a 30-second limit; late responses cannot resume a decision.

Proposed status is read-only in contract detail and list, including for reviewers.
Acceptance requires a confirmed `ctApprove` grant from Get User Access Lean,
which reads User_Access.Approve_Contracts. Missing access results no longer grant
approval. The native update adapter reads the current exact Contract status before
a status write, rejects an ordinary Proposed exit, and checks queue access again
at review dispatch. This controls the widget; Creator's own report permissions
and native form authorization are unchanged.

Creation closes the editor and opens a separate navy progress dialog with three
stages, a verified-item bar, collapsed saved-item results, and a persistent terminal
outcome. Close/Escape remain unavailable during native requests. Open contract
dismisses verified success and opens the created Proposed record. Errors stay in
the dialog. Check status reads retained destinations without replaying writes or
resuming unsent setup. Definite rejection returns to the retained editable draft.
The existing audit and critical-error reporter remain, once per failed run.
Routine Lots & Pricing saves retain their existing button/banner treatment.

The completion confirmation uses one heading. Complete and Proposed list pills
share the dropdown's full column width, 31px height, padding and text sizing.

The main report nests children of every type under their parent. A parent excluded
by filters appears as a clearly labeled context row and does not inflate the match
count. Missing parents retain an independent child with its parent reference.
Family collapse applies across types. Counted hierarchy badges display each child
type and its count in the same palette as the main report type groups.

Assign Parent and new-contract Parent pickers use wider wrapped options, type
groups, counterparty pills and Territory. Search matches names, type, counterparty
and Territory, hides empty groups, and retains keyboard navigation. Parent eligibility,
Master nesting protection and the Lot Amendment same-Project/same-Builder rule
remain unchanged.

Insights publishes no sales report until its reference data and complete counted
Lot history are ready, for every period and Hide Empty choice. Loading and failed
history leave an empty report and disabled export; retry publishes only a complete
snapshot. Existing date bases, financial definitions, cursor/count checks, access
gates and stale-generation checks remain unchanged.

## Scope and deployment

Changed: Contracts widget.html/contract-progress.js and config; Insights
sales-app.js/widget.html and config; focused SDK, creation, review, family, lot-type
and Insights startup tests; module/design documentation; manifests/widgets.json;
production mappings; immutable releases 1.61.26 and 1.5.46.

Contracts reads existing Contract.ID, Status, Parent_Contract, Contract_Type,
Builder and Territory; acceptance writes Contract.Status and
Contract_Actions.Status, preserving exact IDs and persisted readback. Creation's
existing Contract, Contract_Actions, Contract_Approvals and Contract_Pricing fields
and payloads remain. Insights reads the existing Lot/Subdivision/Project/Builder
reports without changing requested fields or calculations. No new form, field,
function or Custom API; no Creator backend publication is required.

Required checks: npm run validate and npm run build:pages. Focused executable
fixtures cover direct Accept/Decline, queue denial/degradation/revocation,
stale Proposed status, child-before-parent verification, one-send/unknown recovery,
bounded reads, creation pending/terminal/error states, retained private audit,
all-type hierarchy/context/collapse, picker search/keyboard and complete-history
loading/failure/retry/cancellation. Browser checks cover actual dialog layout,
centered X, matching status dimensions, grouped Parent options and hierarchy.
Production smoke checks are read-only; no business record is created or accepted
for testing.

Rollback: restore production mappings to Contracts 1.61.25 and Insights 1.5.45,
then rebuild and publish Pages. No data migration or Creator rollback is needed.
