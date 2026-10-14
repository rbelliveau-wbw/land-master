# Compact approval rules and direct PO deletion

Release Budget Manager 122.29.36 and Settings Manager 1.5.4 to Development and
Production. Requests trash opens the compact delete confirmation directly,
without loading the full purchase order. Breadcrumbs show Territory / Project /
Phase 01. Approval Rules use compact horizontal rows, Legal-style animated drag
reordering, icon removal controls and the compact Legal result dialog. New rules
are active on Save Rule; existing rules expose Active for later deactivation.

Changed runtime files: Budget po-ui.js, purchase-orders.css, widget.html; Settings
approval-admin.js, approval-admin.css, widget.html. No Creator forms, fields,
functions, permission settings or Custom API contracts change. Existing
Manage_Purchase_Orders PreviewDelete and Manage_Approval_Policies SavePolicy /
Publish / Check operations retain their server guards. No Creator promotion is
required.

New-rule creation saves and verifies the native Draft before a separately
tokened Publish. Unknown replies stop further writes; Check is read-only. A
recovered Draft requires explicit Activate Rule. Confirmed failed activation
retains the saved record identity for correction without duplicating the rule.

Validation: focused actual-source regression suites cover direct-delete reads,
loading cancellation, stale replies, metadata guards, all breadcrumb paths,
three-step compact layout, stable-key animated drag/keyboard reordering,
mandatory CFO, Title Case, default activation, lost replies and explicit recovery.
Full npm run validate and npm run build:pages passed before promotion.
In-app testing is left to Robby by explicit request; no live records or approval
emails are changed for this release.

Rollback: restore Development/Production mappings to Budget Manager 122.29.35
and Settings Manager 1.5.3. Saved rule changes are native records and require
editing Active or the route separately; rolling back widget assets does not
rewrite policy data.
