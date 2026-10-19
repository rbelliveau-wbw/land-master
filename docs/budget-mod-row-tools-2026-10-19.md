# Budget Mod row tools — October 19, 2026

Budget Manager **122.29.55**, approved Row tools variant. Repository main,
Development and Production publication is authorized by PMP; Creator promotion
remains with the user.

## Behavior

Standalone Budget Mod rows show View, Attachments, Resend Email, Edit and Delete
when permitted. The pending detail footer is Approve / Reject / Close. Draft
Submit and rejected Revise & Resubmit remain. Existing rejection notes and
approval progress are unchanged. Edit opens the original composer with saved
amount, reason, reference and effective date. Delete opens the selected record
and amount with a clear consequence and explicit confirmation; Cancel returns
to the row without writes. Budget files remain after deletion. PO-created mods
stay controlled by their PO and expose no standalone admin tools.

The existing permission rules are applied while rendering and again on click.
Stale, foreign-Budget and PO-linked admin/resend controls cannot issue a write.
All record identities stay strings. No financial calculations or captured
approval routes change. The existing shared modal and attachment-tab motion,
pending upload locks, inert background and focus restoration are retained.

## Creator and Custom APIs

No new forms, fields, functions, workflows or API contracts are required for this
button cleanup. The attachment fields/report/workflows remain documented in
[the attachment handoff](budget-request-attachments-2026-10-19.md).

After the user reported promoting the native functions, authenticated browser
inspection of Microservices on October 19 confirmed these existing APIs Enabled,
POST, OAuth2, All users, key/value JSON, standard response, and the correct
Land Master function binding:

| API | Function | Request arguments |
| --- | --- | --- |
| Create_Budget_Attachment_Record | createBudgetAttachmentRecord | budgetId |
| Modification_Admin | modificationAdmin | action, modificationId, budgetId, modType, amount, reason, reference, effectiveDate |
| Manage_Purchase_Order | managePurchaseOrder | payload |
| Create_Budget_Modification | createBudgetModification | itemId, modType, amount, reason, reference, effectiveDate, track |
| Submit_Budget_Modification | submitBudgetModification | modificationId |
| Send_Modification_Email | sendModificationEmail | modificationId, action |

Create_Budget_Attachment_Record_DEV also has the correct Land Master DEVELOPMENT
binding and unchanged budgetId argument. The registry lists the other matching
DEV APIs as Ready to invoke. The existing attachment budgetId string carries the
versioned JSON envelope; it does not need separate request arguments or APIs.
Internal routing helpers and form workflows do not need public endpoints.
No API was duplicated, authentication changed, business record mutated or email
sent during browser inspection. Function promotion was reported by the user;
a live upload/approval test remains the user's production test.

## Verification and rollback

Actual-source rail tests cover action order, permission subsets, exact Budget
scope, PO isolation, unchanged lifecycle actions and read-only rendering. Desktop
Chrome uses shipped detail/composer/file renderers and event handlers to verify
prefilled Edit, Cancel focus, explicit deletion confirmation, exact native
payloads captured by fixtures, denied stale controls, attachments on all four
request types, keyboard/inert handling, upload locks and reduced motion.

Local npm run validate and npm run build:pages passed. The request attachment /
row tools desktop fixture, Connected Rail, Settings routing, PO request and PO
dismissal regressions passed. All 22 source/release files are identical and both
Development/Production build mappings select 122.29.55. CI, Pages and fresh live
asset verification remain the required publication completion gates.
Rollback the Budget environment mapping to **122.29.54**. No Creator rollback or
attachment-data deletion accompanies this frontend rollback.
