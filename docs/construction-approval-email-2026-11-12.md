# Construction Approval Email

Construction approval emails show an Unapproved summary by budget category
and cost element, followed by cost-code totals and element details. The summary
uses Labor, Equipment, Materials, Subcontractor, Other, and Total, matching the
requested matrix. The detail columns are Preliminary, Unapproved, HCSS Actuals,
and GP Actuals. Unapproved cells are highlighted. Open Approval Page appears
above the tables.

Element amounts reuse the read-only budgetElementExportRows contract. A missing
allocation stays unavailable (—), never an invented zero. Hide a detail row
only when all four known amounts are zero. Parent totals remain authoritative;
incomplete summary element columns remain unavailable while Total still shows
the saved Unapproved total. No financial records, approval routing, recipients,
permissions, exports, or Custom API contracts change.

Deployment: publish sendApprovalEmail through Creator Stage and Production.
No widget release or Pages mapping change is required. Regression checks cover
signed values, zero rows, missing allocations, category/overall totals, HTML
escaping, Construction scope, Development compatibility, and delivery stamping.
Rollback: restore the prior sendApprovalEmail body from the parent commit and
publish it through Creator. Existing emails are unaffected; future sends and
existing Resend actions use the published template.
