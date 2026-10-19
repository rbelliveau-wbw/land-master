# Budget request attachments — 122.29.54

Purchase Orders, Budget Modifications and saved Check/Wire requests have Details
and Attachments tabs. A request file is one existing `Attachment` child linked
to the Budget and exactly one request. It opens through the existing Budget PDF
preview, download and Delete paths. No file copy, second upload, approval email,
new approval route or financial change accompanies association.

The Budget Attachments list shows the associated request and opens its files.
Its searchable association picker can choose a same-Budget PO, Check, Wire or
modification, or Budget only. A request can link an unassociated existing Budget
file. Request-row paperclips show verified counts; failed/incomplete reads show
unknown instead of zero. PO-created modifications remain part of their PO's
approval; their own file tab exposes no independent approval/admin actions.
Authorized supplemental PO children remain accessible without changing financial
report caches.

Unsaved requests must be saved before adding files. The existing Check/Wire
composer remains Preview Draft; this release does not introduce payment
submission. Existing saved requests can be opened from their row and receive files.

## Creator promotion handoff

All changes below were made and saved in **Development** through the authenticated
browser. **The user promotes Creator.** No Production/Stage Creator promotion,
business-record mutation, approval decision or email test was performed.

- `Attachment.Payment_Request`: optional single lookup to `Payment_Request.ID`.
- `Attachment.Budget_Modification`: optional single lookup to `Budget_Modification.ID`.
- `All_Attachments`: both request fields in Quick View and Detail View; original
  Added User remains projected. Existing fields are preserved.
- `All_Wire_Requests` (all rows from `Payment_Request`): Request Type, Request
  Date, Date Needed, Budget / Phase, Cost Code / Budget Item, Request Amount and
  Vendor added in both Quick View and Detail View; Department added in Quick
  View. Existing PO Description remains.
- Functions: `createBudgetAttachmentRecord`, `modificationAdmin`,
  `managePurchaseOrder`. Native Save compiled; reloaded function text confirmed
  the intended changes. Creator reformats existing PO expression parentheses;
  the PO deletion patch matches the saved native source exactly.
- Workflows: `Keep Budget Files - Payment Request` (`Keep_Budget_Files_Payment`),
  `Keep Budget Files - Budget Modification` (`Keep_Budget_Files_Budget_`), both
  **Deleted → Successful record deletion**; and `Validate Budget Request
  Attachment` (`Validate_Budget_Request_A`), **Created or Edited → Validations
  on form submission**. Saved action bodies were verified in the native editor.

The deletion hooks only clear the deleted request's lookup. Budget, file bytes,
record ID, original author and date remain. Explicit API deletion handlers do the
same because Deluge deletes do not rely on form-event dispatch. Native Attachment
validation prevents two request parents and a mismatched Budget; it derives a
missing Budget from the chosen request. It leaves unrelated Legal/Pro Forma
attachments alone.

The [live contract](../manifests/budget-request-attachments.json) records these
observations. `creator/generated` remains tied to its committed October 11 DS
export and has not been falsely regenerated from UI observations.

## API and recovery

`Create_Budget_Attachment_Record` retains its existing function registration and
single string `budgetId` argument. A plain ID still creates a Budget-only file.
A versioned JSON envelope supports read-only Capabilities/Validate and
Create/Associate. Authenticated User Access and existing Budget edit/approval
rights gate writes. Development owner View-as matches the existing PO pattern;
ordinary users and Production retain their authenticated actor. IDs must be
strings and resolve to one exact same-Budget record. Both request lookups cannot
be populated. Associate compares expected prior links **before** changing them.

Capabilities safely detects Creator promotion readiness before reading new
report fields. An old native function rejects the envelope before inserting a
child; existing Budget-only attachments remain usable. New request tabs show
unavailable until promotion, with Retry.

A successful native acknowledgement confirms the saved identity without an
automatic editable-field comparison. FILE success keeps the original bytes and
does not require optional filename/path metadata. Unknown association/upload
replies retain captured inputs, prohibit replay and expose read-only Check
status. A failed display refresh cannot turn an acknowledged association into
an unknown save. Changed actor/navigation stops later FILE calls and cleanup.
No upload or association changes the original Added User.

## Verification and rollback

Focused actual-source tests cover same-Budget/exclusive string identities,
association without another child, native success, failed refresh, unknown reply
and read-only checking, permissions, parent retention, metadata-free FILE success
and changed actor/navigation. Desktop Chrome uses the shipped PO renderer and
file/tab module for all four request types, unsaved parents, retained global
file-action indices, keyboard tabs, pending Close, inert/focus restoration,
nested Preview/Delete cancel and reduced motion. Existing PO dismissal, request
rail, attachment presentation and routing regressions remain required.

Native compiler/editor saves and report projections were verified. Actual native
file upload/delete on business records remains for the user's promoted test.
Required repository validation and Pages build accompany the immutable release.
122.29.52 is the preserved, unpromoted packaging candidate. 122.29.53 adds
final focus/count feedback and concise readiness copy; 122.29.54 adds saved
date, amount and description to distinguish same-vendor association choices.
Roll back the repository Budget mapping to **122.29.51**; new optional fields can
remain. Preserve all Attachment records and their Budget/file/provenance fields.

The separate Budget Mod action cleanup is a **mockup only**. Existing Approve,
Reject, Resend Email, Edit and Delete controls and their permissions stay in place.

Final local verification passed: npm run validate, npm run build:pages, actual
request attachment desktop fixture, PO dismissal, shared interaction motion,
seven-module numeric rollout, Pro Forma numeric, Insights numeric/performance
and Forecast desktop suites. Source/release parity and Production build mapping
were verified for all 22 release files. The button mockup was rendered and
its local interactions checked with no console errors or desktop overflow.
