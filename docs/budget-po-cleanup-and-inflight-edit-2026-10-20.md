# Budget Manager 122.29.59 — PO layout and in-flight edit

## Changes

- Add 4px beneath PO column titles (6px first-row top padding; subsequent rows
  keep 2px spacing).
- Draft attachment tabs use the standard attachment header/count, upload icon,
  drop zone, Choose Files and empty state. Remove the save-first paragraph.
  Three-column file rows reserve the icon column, give filenames a flexible
  middle column and keep remove at the right. Applies to PO, Budget Mod,
  Check/Wire drafts and retained pending-file rows. Preserve original bytes and
  upload only after exact parent creation; retry and permission guards remain.
- Routine PO progress caps at 540px. An editor-only :has(hidden sidebar) width
  rule had overridden the progress rule. All shared PO save/submit/decision/
  retry/delete progress modes now retain the compact shell. Budget/Legal routine
  approval shells already cap at 540px; actual destination-table layouts remain.
  Record the compact preference in both progress design guides.
- Attachment previews opt out of detached exit copies, keeping real close,
  focus and inert restoration immediate. The shared entry point covers Budget
  and request previews. Association uses a centered, rounded horizontal-chain SVG.
- Pending, reserved managed POs show a pencil only for authenticated
  **Edit/Delete All Budgets/Requests** users and a positive native capability.
  The fresh editor rechecks both; ordinary owners, approval grants and the
  retired modification permission cannot edit an in-flight PO.

## Explicitly approved in-flight behavior

Save changes keeps the existing approval people, execution IDs, decisions,
notes, sent/responded dates and current Pending step. It does not resolve a new
route or resend mail. It creates a new immutable PO line revision and a new
route-snapshot record carrying the exact existing execution IDs; the original
captured snapshot remains unchanged. Recalculate auto-modifications using fresh
balances excluding this PO's own reservation/credits. Reuse existing same-item
modification records, create newly needed ones, and mark no-longer-needed auto-
mods Rejected while retaining their records/files. The user explicitly chose
this behavior even when the edited amount/item changes the necessary auto-mods.
Approved POs remain read-only; existing Rejected resubmission is unchanged.

The native phase lock, current revision, authenticated actor and exact god grant
are rechecked before writes. The actual saved PO/bundle confirms destination
IDs/counts and retained decisions. Lost/partial writes retain their operation
receipt and lock for read-only Check/manual review; no blind amendment replay.
Scoped historical test-CFO submissions cannot be amended.

## Creator handoff — required for the pencil

PMP publishes the widget and repository source. It does **not** compile or promote
Creator functions. Update and compile these two function bodies in Development,
then promote them together to Production:

1. [managePurchaseOrder.dg](../creator/functions/managePurchaseOrder.dg)
2. [poActorResponse.dg](../creator/functions/poActorResponse.dg)

The existing managePurchaseOrder Custom API and payload argument are reused.
No new forms, fields, reports or Custom APIs are needed. List/Get supply the
native canEditInFlight capability; the published frontend keeps the Pending
pencil hidden against the old backend. The layout/icon/preview fixes work
without Creator promotion. Offline tests execute the checked-in Deluge bodies
against fixtures; they do not prove Creator compilation or native Production writes.

## Verification and rollback

Actual-source native tests cover a partly approved chain, amount changes,
reused/new/retired auto-mods, original immutable snapshots/lines, no email/reroute,
permission/actor/revision/archived denial and read-only Check. Desktop renderer
checks cover both god/capability gates, stale permission loss, retained decisions,
updated auto-mods, lost-response recovery, file layout in shipping CSS order,
6px row spacing, 540px progress, preview close without ghost copies, focus,
attachments, ordinary editing and reduced motion. Full validation/Pages build
and exact-commit CI/Pages monitoring complete PMP. No live business test writes.

Rollback the Budget Production mapping to **122.29.58**. If the native functions
have been promoted, restore their previous bodies together as necessary; retain
new saved revisions/route captures, approval rows and Budget files for review.
