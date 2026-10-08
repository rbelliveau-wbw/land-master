# Budget attachment upload receipts — 122.28.31

The October 7 Production report from Budget Manager 122.28.30 confirms that
`Create_Budget_Attachment_Record` returned child `4410926000005116006` for
Budget `4410926000005064390`. The next FILE upload failed in
`budgetUploadSuccess` with “Creator did not confirm the uploaded file.”
The report does not include the raw FILE acknowledgement, so the exact native
response remains unverified.

The existing parser accepted only `code:3000` with `data.filename` and
`data.filepath`. That matches the [SDK v2 sample](https://www.zoho.com/creator/help/js-api/v2/upload-file.html).
The same SDK task is based on REST v2.1, whose [documented sample](https://www.zoho.com/creator/help/api/v2.1/upload-file.html)
returns `filename` and `filepath` at the response root. Rejecting that valid
shape is a likely explanation of the reported failure.

`budgetUploadReceipt` now accepts exactly one of those metadata containers.
It requires success code 3000 and nonempty string filename/path values, and
rejects malformed, failed, mixed or duplicate metadata. Informational metadata
remains allowed; failures in nested native metadata are rejected. The SDK wrapper
normalizes root metadata to the existing `data` shape without changing the
native response. Existing `data` acknowledgements remain intact.

A rejection containing filename/path evidence remains unknown even when its
code normally means missing report. It cannot trigger an alias upload or empty
child cleanup. Plain, definite missing-report rejection retains its existing
documented alias behavior.

Success still requires a fresh exact child-ID/Budget-parent read and the saved
filename/path matching the acknowledged upload. A denied read, changed parent,
missing field or mismatched filename/path stays unresolved. The existing inline
spinner, duplicate/delete/close guards, retained review state and read-only
Recheck remain in the Budget attachment workspace. No new dialog is introduced.

Changed functions: `budgetUploadReceipt`, `budgetUploadSuccess`,
`budgetUploadError` and `sdkUploadFile`. Existing forms/fields are
`Contract_Version.Budget` and `Contract_Version.File_field1`; the existing Custom
APIs are `Create_Budget_Attachment_Record` and `Delete_Budget_Attachment`.
No form, field, function or Custom API schema changes and no Creator deployment
are required.

Regression: `node scripts/test-budget-sdk-v2-startup.mjs` covers both documented
receipt shapes, harmless metadata, duplicate/malformed/failed acknowledgements,
one native upload, no uncertain alias replay, exact persisted verification,
wrong stored filename/path, and acknowledged-root-path read-only recovery.
`node scripts/test-budget-attachment-presentation.mjs` verifies existing inline
loading/review controls and attachment modal scope. These are offline source
regressions; no live upload or existing child record was modified.

Rollback: restore the Production frontend Budget Manager mapping to 122.28.30
and rebuild Pages. Retain any existing attachment child pending review; do not
recreate or delete it solely because its earlier upload result was unknown.
