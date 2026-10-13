# PO editor and Requests release 122.29.28


Optional Payment_Request.PO_Description is surfaced in the PO editor and compact
Excel packet. Vendor/add-vendor move into the navy title; Request date, Date needed
and Description lead the body. The editor keeps a stable viewport-bounded height.
Row/Excel mode provides atomic validated range paste, copy, fill-down, keyboard
navigation and range Undo within the existing 250-line limit.

Requests rows use attachment-style preview, eligible edit, download and red trash
icons. Delete opens the existing child-record preview; Cancel returns to Requests.
Captured approver initials are green/amber/red/muted for Approved/Pending/Rejected/
Not Sent. The mini modal displays names, roles, sent/responded dates and statuses.
List returns validated captured summaries; only opening a chain triggers one Get.
Drafts do not invent a captured chain.

Creator changes: optional multiline PO_Description, poValidatePayload, poSnapshot,
poApprovalBundle, managePurchaseOrder, sendPurchaseOrderEmail and new shared
poExcelWorkbook. Download is a read-only action on the existing scoped API, with
the same Excel generator as email. No Custom API, permission or routing-policy
change. Old widgets omitting Description preserve saved text; explicit empty text
clears it. Production frontend rollback is 122.29.26 (prior mapping); Development
rollback is 122.29.27. Restore prior functions from bee8ffdc, retaining the new
optional field and any saved descriptions.

Validation: native function save/reopen, local editor browser range paste/copy/fill/
Undo and unchanged footer position after row deletion; domain/controller/request
renderer/backend-source regressions and full repository validation/Pages build.
Native deployment and Dev/Production UI evidence are recorded below after release.

Limits: TSV values only (no formula engine or formatting import). Workbook remains
Excel-compatible SpreadsheetML .xls, matching existing email attachment. Existing
submitted routes remain captured; tests do not submit, approve or send email.

Release evidence (2026-10-13): full npm validation and Pages build passed. Native
Creator Download returned a verified compact .xls for Carlile Hills Draft
4410926000005162036. Native List returned the captured approved CFO step with
Full_Name, sent/responded dates; the Draft returned an empty chain. Creator
Stage and Production both completed version 9.79, selecting nine PO components
(PO Description and eight functions, including pending ordered-route functions).
Unrelated Theme and All Wire Requests changes were excluded. No PO was submitted,
approved, deleted or emailed during these checks.
