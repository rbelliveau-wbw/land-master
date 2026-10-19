# Request list

Repository-wide rule for applicable surfaces; see [scope and exceptions](README.md).

The phase Requests tab uses the selected Connected Rail layout: one newest-first
list of Purchase Orders, Check requests, Wire requests and budget modifications.
Keep one shared column grid so type pills, names/descriptions, approvers, dates,
amounts, statuses and icon actions line up across request types. Omit separate
Budget Modifications/Payment Requests headings and modification summary tiles.
Keep aligned columns on narrow screens with list scrolling; preserve keyboard
focus and action names.

Keep the action column shared, but pack only available icons together at its right
edge with 6px gaps. Do not reserve blank slots for an unavailable Edit or other
action. Linked modifications use that same right edge.
Saved request paperclips open their Attachments tab and show scoped file counts.
Saved Check/Wire rows also offer a read-only View action. Keep file associations
separate from approval administration; see [Attachments](attachments.md).

PO-created modifications sit immediately beneath their owning PO, with a fixed
indent and branch connector. Match exact PO identity, current revision and phase
using the stored PO reference; never use a vendor name or reason-text match.
Unmatched modifications remain standalone rows. The child displays item/code,
signed budget change and its approval relationship to the PO. Its budget increase
is separate from the parent payment amount. Keep underlying aggregates unchanged.
All rows use actual saved data; missing dates are last in the sort and show a dash.

Use a 2px warm-gold trunk with rounded SVG elbows into each child. Keep the last
trunk end relative to the child's center so rounded joins stay continuous at any
row height. Connectors are decorative and do not intercept pointer events.

The modification report may expose only records created by the current profile.
For submitted managed POs, the phase load reads the existing authenticated Get
snapshot with at most three requests in flight. Render its verified captured
children together with report rows, once per exact child ID. Preserve actual
report dates when available; missing dates stay unknown. Keep these supplemental
rows out of financial report caches. Failed child reads retain the PO and expose
an explicit unavailable/Retry state; changed actor/phase replies cannot publish.

After an acknowledged submitted PO save, approval decision or deletion, refresh
both request headers and budget modifications from native reads before the final
Requests repaint. Draft saves only refresh request headers. Retain navigation,
phase and actor guards; failed display reads expose the existing Retry state and
never replay a successful write.

# Payment request cards

Managed POs in Budget's phase Requests tab use the approved Soft rail row: PO pill,
vendor, captured approver circles, request date, amount, status and actions on one
horizontal line. Omit column headings and repeated Purchase Order text. Use a
white surface, blue left rail, fine border, 9px corners and compact padding.
Request dates use MM/DD/YYYY; unavailable dates show a dash. Keep Date needed in
the request-date tooltip. Currency is green and tabular; statuses keep their palette.

Use the attachment-style 28px square eye, eligible pencil, download and red trash
icons, with accessible names, tooltips and visible keyboard focus rings. Preserve
exact PO identity, edit eligibility and phase scope. On narrow screens keep the
row horizontal with internal scrolling; truncate vendor names with a full tooltip.
Check, Wire and legacy PO rows share the request-list presentation while retaining
their existing behavior and permissions. Do not invent unavailable row actions.

Captured approvers use their recorded role (VP, CFO, COO) in connected 28px circles: green Approved, amber
Pending, red Rejected and muted Not Sent. Show every captured step; drafts with
no recorded route show a dash. Hover outlines the clickable chain. Its compact
read-only modal shows names, roles, sent/responded dates and statuses; a targeted
Get refreshes only the selected PO. Escape, backdrop and Close restore focus.
List supplies approval summaries. Submitted PO child completeness is verified
during the bounded phase load, never by a render-triggered request.

The PO title card contains Purchase Order, status, phase, Vendor and Add New
Vendor. The vendor link opens the existing form in the current Creator environment.
Body fields are Request date, Date needed and optional PO Description (1000
characters). The viewport-bounded editor height stays stable after row changes,
with internal scrolling. Keep 9px padding above ledger headers and below the last
row, and 2px between rows. Omit the Line items/count heading. Retain 250-line guards.
Closing the PO workspace must remove its card, Summary and backdrop together and
restore focus immediately. Mark the composite overlay `data-lm-motion-exit="none"`
so shared motion never redraws a detached, differently sized or styled copy on
Close, X or Escape; retain the opening fade and pending-write close locks.

Row / Spreadsheet mode supports validated TSV range copy/paste, fill-down, keyboard
navigation and local range Undo. Shift-click/Shift-arrows select, Ctrl+C/V copies
and pastes, Ctrl+D fills down, F2 edits, and Tab/Enter moves between cells. Item name
remains derived and immutable. Paste validates eligible cost codes, UOM, ELEM and
exact decimals atomically, up to 250 rows. Formulas and imported formatting are
unsupported. Structural row changes clear range Undo history. Downloads use the
same compact SpreadsheetML .xls generator as the PO email attachment.

Keep budget context to the left of the PO total: Available and Remaining or
Modification on the first line. Drafts use the server's read-only route preview
with ordered approver pills. Saved POs show their captured chain once in the
bottom Approval chain section, without repeating the upper flow. Group linked
modification rows beneath an Attached budget modifications heading in a pale
amber panel, keeping their item names, amounts and recorded statuses.
CFO is required for every PO; a new modification can route VP → CFO → COO.
Show unknown budget/route data as unavailable. Keep Add New Vendor beside the
Vendor label, using navy text on a pale-blue solid button with adequate contrast in the navy title, and open
the existing vendor form in the current Creator environment.

Approval chains use a green heading and green completed steps/status pills;
Pending stays amber and Rejected stays red. Remove Saved POs and Refresh
balances from the footer; retain automatic balance reads. The Requests card
shows the native approval state when available, including Approved/Rejected.

PO deletion uses the attachment-style 28px red square trash icon. Its preview
matches the budget Delete dialog: centered red trash circle, compact title,
vendor/amount/phase identity, pink child-record list with exact counts, Cancel
and red Delete PO. Show all-revision line items, operation receipts, approval
routes, approval records and PO-created budget modifications, plus the release
of the commitment. Cancel, Escape and backdrop return to the same PO. Keep the
captured preview and existing deletion progress/recovery guards. From Requests,
open this compact confirmation immediately with a read-only PreviewDelete using
the row identity/revision. Do not open or fetch the worksheet, vendors or balances.
Keep Delete disabled until exact child counts arrive. Cancel, Escape and backdrop
return to Requests and restore its trash-button focus, including during loading.
Failures expose Retry preview; late reads cannot reopen a cancelled dialog.

The editing toggle reads Row / Spreadsheet. Spreadsheet Undo includes typed cell
edits as well as range paste and fill-down. Double-click or F2 edits a cell;
keyboard focus entering the ledger updates its active cell. Retain exact amounts,
atomic paste validation and the 250-line limit.

Saved PO View/Edit opens an explicit loading state. Hide entry fields, zero totals
and the Summary until the exact snapshot and vendor roster arrive together. Read
them in parallel. Failed loads show the error and Retry load; retain close/focus
handling and never expose a blank editable draft for a saved PO.

Review PO after a save or decision refreshes budget balances before rendering
calculations for the new saved snapshot. Show checking/unavailable figures until
the current read completes; an older balance reply cannot replace a newer one.
Retain exact-cent reservation and pending-modification reconciliation.

PO save/approval/delete progress uses Legal's compact 540px result dialog:
navy header and slim progress bar, numbered stages with colored chips, a clear
outcome, collapsed Saved items and a pinned footer. Done dismisses; Review PO
opens the saved record. Show Check status only for unknown replies. Keep pending
Close/Escape locks, focus handling, exact saved identities and notification
warnings. Saved PO and Summary read together in parallel; preload fresh balances
after a confirmed mutation so Review PO can reveal both together.

## PO vendor and contextual approval workspace (122.29.37)

Center the Vendor picker and Add New Vendor in the title card. Add New Vendor
opens its own nested navy dialog, with the underlying PO inert and focus trapped.
Use native Vendors creation, require one acknowledged exact ID, append that
record to the options and select it immediately without losing PO inputs.
Known native rejection retains the input; lost/malformed replies prohibit a
second create, including after closing and reopening the vendor dialog.

The desktop main card defaults to 944 px height (18% above 800 px), capped to
the viewport. Its outer body does not scroll; only the line matrix and lengthy
captured-chain section scroll internally. Keep delete/result card dimensions
isolated. Place a second navy/green Approvers card below Summary for drafts.
The existing debounced context preview determines CFO-only versus added roles
from actual balance shortfall. Show each resolved person, role, approval email
and order; present unavailable routing truthfully. Do not repeat the captured
saved chain in the draft preview card. Native managePurchaseOrder preview now
includes names and emails; no new fields or endpoints are needed.

Budget 122.29.38 removes the PO approver preview footer sentence; the route, recipient cards and approval behavior are unchanged. Frontend only, with no Creator promotion required.


## Budget Mod row tools (122.29.55)

Standalone Budget Mod rows put View, Attachments, Resend Email, Edit and Delete
in one compact icon group, in that order when available. Reserve room for all
five controls and their badges; keep the shared request columns aligned. Use
accessible action names, tooltips and the existing focus outlines. Omit unavailable
actions without leaving empty slots. Submitted decisions stay in the detail
modal: Approve, Reject and Close. Draft Submit and rejected Revise & Resubmit
retain their existing lifecycle actions.

Edit reuses the prefilled composer. Delete opens the exact modification's identity,
amount and approval history with a consequence, Cancel and Delete modification;
Cancel returns focus to the row trash control without writing. Budget files stay
under the Budget after request deletion. Recheck same-Budget identity, recorded
pending ownership and existing admin permissions on click. PO-linked modifications
retain their governing PO and own Attachments tab; never expose standalone tools
for them. Reuse existing native functions and shared modal/tab motion.
