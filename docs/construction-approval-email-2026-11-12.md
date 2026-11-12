# Budget Approval Email

Construction and Development approval emails show an Unapproved summary by
budget category, followed by cost-code totals and element details. Elements
appear in numeric order: (1) Labor, (2) Materials, (3) Equipment,
(4) Subcontractor, (5) Other. Detail columns remain Preliminary, Unapproved,
HCSS Actuals, and GP Actuals. Open Approval Page remains above the tables.

Show a numeric row only when at least one displayed amount is nonzero.
Null values do not qualify a row for display, but remain unavailable (—) in
retained rows. Negative credits and small nonzero values remain visible.
Hide zero/null-only items, summary categories, totals, and empty tables.
An item heading is retained to identify any nonzero child allocation even
when its parent totals net to zero. Native parent totals remain authoritative;
unknown allocations are never inferred or converted into displayed zeroes.

The same row filter applies to the single-item element details in modification
emails and the selected-item element details in PO approval emails. Their
shared export helpers and Excel/download attachments retain all five elements.
Modification detail text is 14px. Approval routing, recipients, delivery stamps,
permissions, financial records, and Custom API signatures are unchanged.

Changed Creator functions: sendApprovalEmail, sendModificationEmail,
sendPurchaseOrderEmail. Deployment requires saving these functions in Creator
Development, promoting the selected functions through Stage and Production,
and checking the published release. No widget release or Pages mapping changes
are needed. The user explicitly authorized agent promotion on November 12.

Regression: execute the actual Deluge email-rendering bodies with native lookup
shapes; cover 1–5 ordering, positive/negative/tiny nonzero values, zero/null-only
rows, empty items/categories/tables, saved totals with unknown allocations,
Construction/Development scope, HTML escaping, PO isolation, and delivery stamps.
Related delivery/permission/export checks preserve existing contracts.

Rollback: restore these three function bodies from the parent of this change
and promote only those functions through Creator. Existing emails are unaffected;
future sends and Resend actions use the published template.
