# Supplemental Purchase Orders

Reuse Payment_Request and PO_Item. A Supplemental record stays Request_Type
Purchase Order and stores only its new lines and incremental amount. Existing
records with no original link remain Original without a data backfill.

There is one business PO number: the original PO number. A supplement creates
an internal approval/request record for its own lines and decisions, never a new
PO number. UI, emails and exports show the original PO number with a separate
Supplement 1/2 sequence; internal IDs address records and deep links only.

The original must be an approved, reserved managed PO with Construction or
Development type. Vendor, budget/phase, type and original linkage are fixed.
New rows may use existing cost codes/elements. The existing signed net budget
change threshold applies only to the supplement's own validated modifications:
VP → CFO, adding COO at $10,000. Earlier PO amounts/modifications are excluded
from that threshold. Two independent $6,000 net increases each follow VP → CFO.

## Data And Validation

The five additive fields and exact native function set are declared in
[the schema contract](../creator/schema-changes/po-supplemental.json). A root
counter assigns Supplement 1, Supplement 2, etc. under the existing phase lock; it is the only
metadata changed on an original. Amounts, revisions, lines and approvals on
the original remain unchanged. Deleting a supplement does not reset the counter.

poSupplementContext captures references to the original and earlier approved
supplements: exact ID, revision, line count and amount. It reads their immutable
PO_Item rows and validates their native approval bundles, ownership, scope,
counts and exact totals. It does not call poSnapshot recursively. The baseline
is capped at 100 source records and 16,000 metadata characters; errors block
the write, never truncate the approval context. The existing 250-line limit is
per editable request, not the consolidated view.

Save/Submit recheck the fresh baseline under the phase lock, fixed scope,
combined currency capacity, fresh addition identities and current permissions.
Stale drafts explicitly Refresh Approved Lines before saving. Original and
other supplements remain consumed commitments; only the current supplement's
own reservation is added back on resubmission. Existing exact pricing, dates,
department, finalization, item eligibility, element funding and reallocation
reason/donor checks remain in force. No separate financial write copies the
approved supplement into the original.

Multiple drafts are allowed; only one unresolved submitted supplement per root
may proceed. Rejected supplements retain reservations, matching current POs.
The existing global-admin preserve-approval amendment exception applies to
the supplement's own additions, with exact retained approval IDs and fresh
baseline checks. Previously approved lines and inherited scope remain locked;
ordinary users retain the normal reject/resubmit rules. Creator-only
creation rights retain their existing own-unsubmitted-draft restriction.

The captured approval context includes the original ID, supplement number and
baseline. poApprovalBundle verifies that binding. Every decision verifies the
baseline before using the existing sequential approval/finalization flow.
Deleting the original cascades to all its supplements in every supported state.
One exact preview captures every parent, revision, all-revision line, operation,
approval, route and PO-created modification. The confirmation lists supplement
sequence/status/amount and the reserved commitment being released; drafts do
not inflate that release amount. A separate cascadeSupplements confirmation
flag prevents older widgets from silently cascading without showing the scope.

The same global delete grant and active-phase rules apply. One phase lock
protects the entire family; membership, revisions and states are rechecked
before any deletion. All captured children are removed before their parents,
with the original last. Existing Budget file preservation and financial rollups
apply to every member. Lost-reply CheckDelete verifies every captured parent
and child and never replays Delete. An individual earlier supplement still
cannot be removed while later supplements depend on it.

## Widget And Packets

The global Add menu and Requests New Request include Supplemental Purchase
Order. Choose an active budget, then an approved original PO. The approved PO
review also has Create Supplement after the native capability is available.
The editor locks inherited fields, shows all previously approved lines outside
the editable grid, and marks new rows. Previously Approved, This Supplement
and Proposed/Revised Approved Total remain distinct. Original review lists
related supplements and the revised approved total; each request retains its
own financial amount and status. Requests rows show the original / S sequence.

The original PO download opens with all approved lines and the revised approved
total once it has approved supplements; its Original Lines sheet retains the
original request. Pending/rejected additions stay out of this vendor-facing total.
The supplemental request worksheet and Budget Elements remain incremental. Supplemental
Excel packets also contain All PO Lines, with original/prior rows and NEW
additions, source references and explicit approved/proposed totals. Approval
emails explain the delta and full-line worksheet. Outcome notifications retain
their captured-recipient, Activity claims and no-replay behavior and identify
the supplement. Reuse current attachments and compact progress/recovery UI.
New numeric targets join the shared field-exit/Sliding push registry.

## Creator Installation And Promotion

November 12 update: all eleven functions are now saved, compiled and reopened in Development. The formatter-safe repairs and remaining owner publication are recorded in [the native installation repair](po-supplemental-native-repair-2026-11-12.md). The following paragraph records the original November 11 handoff state.

PMP promotes repository assets only. The five fields were saved and reopened
successfully in Development. poSupplementContext was created and Save/Done
completed, but its persisted-source recheck and remaining function installation
were interrupted by repeated agent-owned browser timeouts. Do not treat those
remaining functions as installed or natively compiled.

Before owner publication, confirm the additive fields, then save/compile and
reopen these functions in dependency order:

1. poValidatePayload and poApprovalBundle.
2. poSupplementContext, poSnapshot and poActorResponse.
3. poExcelWorkbook, sendPurchaseOrderEmail, renderPurchaseOrderOutcomeEmail,
   buildPurchaseOrderOutcomeEmail and handlePurchaseOrderApproval.
4. managePurchaseOrder.

No new Custom API or audience change is needed. Existing managed validation
already blocks interactive native PO creation/editing. Publish only these five
fields, the new helper and ten changed functions through Stage to Production.
Preserve unrelated pending Creator changes. Until that publication,
SupplementChoices/PrepareSupplement cannot satisfy po-supplemental-v1; the
widget cannot fall back to creating an ordinary PO.

After publication, verify Capabilities, SupplementChoices and PrepareSupplement
through the authenticated existing API, using an approved original. Verify a
Development save/reopen and full-line workbook without financial approval or
email, followed by the normal owner-approved native workflow test. Desktop
browser verification was unavailable during this task after the editor timeouts;
the checked-in isolated fixture is scripts/fixtures/po-supplemental.html.

## Verification And Rollback

scripts/test-po-supplemental.mjs executes actual Deluge bodies with native-shaped
records, including Save/Submit, sequential final approval, a second supplement,
same cost codes, $9,999.99/$10,000 routing, delta-only repeated $6,000 routing,
baseline/scope/row tampering, immutable originals, numbering, receipt recovery,
permissions, unresolved siblings, deletion dependencies and all-line workbook.
The revised original also round-trips through the production download handler
to XLSX, retaining exact original IDs, reused cost codes, literal dollar text,
separate original sheets and the revised approved amount.
Existing PO controller, requests, department, entry, reallocation, approval,
download and global Add suites remain required, as do npm run validate and
npm run build:pages. Local adapters do not prove native Creator compilation. All prevalidate,
validate and postvalidate checks passed locally, along with the final
supplemental/export regressions, stable-loader check and Pages build. The
unrelated existing Land Master HTML/manifest hash warning remains unchanged.

Impeccable audit/polish was applied to the affected desktop surface using its
Operate, audit, polish and craft-floor guidance and existing project design
guides. Previous-line scrolling is keyboard-focusable and labeled; prior lines
are read-only, additions use a text New badge, totals use tabular numerals and
family actions retain visible focus. Existing pickers, progress, recovery and
reduced-motion behavior are reused. Rendered visual QA remains unavailable due
to the in-app browser timeouts; no mobile or new live-presentation gate was added.

Hosted release: Budget Manager 122.29.136 in Development and Production.
Hosted rollback: Budget Manager 122.29.133 via the permanent environment mapping.
Before any supplements exist, restore the ten changed native functions from
91d781bc if necessary; retain the additive fields. Once supplemental records
exist, keep the supplemental-aware native accounting/link/deletion guards and
all saved records. Never remove fields, approved history or operation receipts
as part of a frontend rollback.
