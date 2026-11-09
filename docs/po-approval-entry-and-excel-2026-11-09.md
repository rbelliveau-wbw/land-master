# PO Review Links and Excel Downloads

Budget Manager `122.29.117` fixes two issues reported on the Eagle Prairie PO
`4410926000005902006`. Production and Development use the immutable release;
Stage remains unchanged. Permanent Creator widget URLs remain unchanged.

## Review Links

An existing email link supplies the PO and budget IDs without an opening intent.
An assigned approver with global editing permission therefore entered amendment
mode, where Save Changes correctly replaces decisions while editing. Default
saved-record opens now select review, and the email deep-link dispatcher passes
`view` explicitly. Existing approval queue and linked-PO opens inherit this safe
default. Explicit View, Attachments, Edit and Delete intents remain explicit;
new PO composition is unchanged. The captured native bundle still determines
approval authority. Opening a link performs no decision, email or financial write.

## Excel Downloads

The native Download API returns SpreadsheetML XML with an `.xls` filename. That
is not a BIFF `.xls` file, causing Excel's format/extension mismatch warning.
Reuse the existing `budgetWorkbookLibrary()` loader already used by full-budget
and snapshot exports. Read the authenticated saved XML and write genuine zipped
OOXML, downloaded as `Purchase_Order_<string ID>.xlsx` with its matching MIME type.
The XLML reader requires double-quoted attributes; normalize only XML tags so
apostrophes, quoted description text and escaped characters remain intact.

No additional API, authorization rule, record read or write is needed. Preserve
the exact PO/budget/API contract checks, actor/environment cancellation, duplicate
download guard and restored action on success or failure. Loading the workbook
library and reading the PO run concurrently. Do not fall back to a mislabeled
file when loading, parsing or writing fails. The existing native workbook and
email attachment contract is unchanged; this release changes the Requests
download, not previously sent attachments.

## Scope and Verification

- Source: `widgets/budget-manager/src/app/po-ui.js`, `widget.html` and version
  metadata. Focused regression tests, local PO fixture and module/design notes
  accompany the release.
- Affected forms/fields: read-only saved `Payment_Request` PO header,
  `PO_Item` current revision, captured approval bundle and exported element/mod
  data. No form, field, permission or schema changes.
- Affected APIs/functions: existing `managePurchaseOrder` Get/Download and
  `poExcelWorkbook` are consumed without any backend modification. Existing
  `handlePurchaseOrderApproval` decision and email delivery paths are unchanged.
- Creator deployment required: **No** for these two fixes.
- Regression: execute actual open/render/deep-link/decision code for the assigned
  CFO plus global editing rights; verify default review, explicit edit, denied,
  completed, unresolved and stale navigation cases, with no automatic decision.
- Execute the actual checked-in native workbook generator through the production
  download handler and bundled XLSX library. Reopen emitted ZIP/OOXML and verify
  numeric currency/dates, string IDs, mixed manual/calculated lines, escaped and
  quoted text, literal `=1+1`, SUM formula/total, merges/column widths/row heights
  and all five Budget Elements. Test malformed/foreign replies, duplicate/stale
  downloads, delayed/failed library loads and write errors.
- Independently import and render a generated workbook in the isolated artifact
  workbook environment. Desktop Excel interaction was stopped at user direction;
  no native Excel-open result is claimed. No real PO approval/submission or mail
  was performed during verification.
- Required repository checks: `npm run validate` and `npm run build:pages`.

## Rollback

Restore Production's Budget Manager mapping to `122.29.116` and rebuild Pages.
Keep the immutable `122.29.117` release and current Development mapping. There
are no native or data migrations to reverse. Rollback restores both reported
frontend behaviors, including the old XML-as-XLS download.
