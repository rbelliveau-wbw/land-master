# Budget Approval Email

Construction and Development approval emails show an Unapproved summary by
budget category, followed by cost-code totals and element details. Elements
appear in numeric order: (1) Labor, (2) Materials, (3) Equipment,
(4) Subcontractor, (5) Other. Construction detail shows Preliminary,
Unapproved, Final, HCSS Actuals, and GP Actuals. Development detail shows
Preliminary, Unapproved, HCSS Actuals, and GP Actuals. Open Approval Page
remains above the tables. The Construction Budget box shows the same saved
Unapproved Total as the summary, including a known $0. If an item total is
unavailable, the box shows a dash in place of a partial total.

Construction item and element rows qualify when Preliminary, Unapproved,
or Final contains a nonzero amount. Actuals remain visible on qualifying
rows. Development uses all its displayed detail columns for this check.
Null values do not qualify a row for display, but remain unavailable (—) in
retained rows. Negative credits and small nonzero values remain visible.
Hide zero/null-only summary categories and totals, and omit empty tables.
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
