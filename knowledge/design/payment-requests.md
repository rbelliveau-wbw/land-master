# Payment request cards

Managed Purchase Orders in Budget's phase Requests tab use the approved Soft
rail row. Keep PO pill, vendor, request date, amount, status and action on one
horizontal line. Omit column headings and repeated Purchase Order text. Use a
white surface, blue left rail, fine border and 9px corners with compact padding.
The request date sits between vendor and amount in MM/DD/YYYY; unavailable
dates show an em dash. Keep the date needed in the request-date tooltip.

Use green tabular currency and the established status badge palette. Edit PO and
View PO use the same compact outlined button with a small arrow icon and a visible
keyboard focus ring. Preserve the exact PO identity, existing edit eligibility,
and the same phase-scoped opening action.

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
Vendor label, using the same pale-blue dashed treatment as Add line, and open
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
