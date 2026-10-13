# Payment request cards

Managed Purchase Orders in Budget's phase Requests tab use the approved Soft
rail row. Keep PO pill, vendor, captured approver circles, request date, amount, status and actions on one
horizontal line. Omit column headings and repeated Purchase Order text. Use a
white surface, blue left rail, fine border and 9px corners with compact padding.
The request date sits between vendor and amount in MM/DD/YYYY; unavailable
dates show an em dash. Keep the date needed in the request-date tooltip.

Use green tabular currency and the established status badge palette. Edit PO and
View PO use the same compact outlined button with a small arrow icon and a visible
keyboard focus ring. Preserve the exact PO identity, existing edit eligibility,
and the same phase-scoped opening action.

Captured approvers use their recorded role (VP, CFO, COO) in connected 28px circles: green Approved, amber
Pending, red Rejected and muted Not Sent. Show every captured step; drafts with
no recorded route show a dash. Hover outlines the clickable chain. Its compact
read-only modal shows names, roles, sent/responded dates and statuses; a targeted
Get refreshes only the selected PO. Escape, backdrop and Close restore focus.

On narrow screens, keep the row horizontal and scrolling inside the card.
Truncate long vendor names and expose the full name in a tooltip.
Check, Wire and legacy PO cards retain their current
presentation and behavior. This is a display change; never add per-row requests
or infer absent dates to fill the design.

The PO line-item editor keeps 9px of padding above the column headings and below
the last row. Retain the compact 2px padding between entry rows and contain any
horizontal scrolling inside the ledger.
Show its status as a compact pill beside Purchase Order in the navy title card.
Omit the redundant Line items heading and line-count row above the ledger so the
header fields lead directly into the column headings. Keep the existing 250-line
validation and add/duplicate limit guards.

Keep budget context to the left of the PO total: Available and Remaining or
Modification on the first line, then ordered approver pills. Drafts use the
server's read-only route preview; submitted POs use their captured chain.
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
captured preview and existing deletion progress/recovery guards.

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
