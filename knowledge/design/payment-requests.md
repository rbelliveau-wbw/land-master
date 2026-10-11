# Payment request cards

Managed Purchase Orders in Budget's phase Requests tab use the approved Ledger
card. Put Request / vendor, Amount, Status and the action in aligned columns,
with a pale blue heading strip, white surface, fine border and 12px corners.
Separate the request type from the wrapping vendor name. Show existing request
and needed dates below the vendor when available; omit missing dates.

Use navy tabular currency and the established status badge palette. Edit PO and
View PO use the same quiet outlined button with a small arrow icon and a visible
keyboard focus ring. Preserve the exact PO identity, existing edit eligibility,
and the same phase-scoped opening action.

At card widths below 420px, hide the heading strip and use two columns: vendor
beside amount, status beside action. Keep overflow inside the card and allow
long vendor names to wrap. Check, Wire and legacy PO cards retain their current
presentation and behavior. This is a display change; never add per-row requests
or infer absent dates to fill the design.

The PO line-item editor keeps 9px of padding above the column headings and below
the last row. Retain the compact 2px padding between entry rows and contain any
horizontal scrolling inside the ledger.
Show its status as a compact pill beside Purchase Order in the navy title card.
Omit the redundant Line items heading and line-count row above the ledger so the
header fields lead directly into the column headings. Keep the existing 250-line
validation and add/duplicate limit guards.
