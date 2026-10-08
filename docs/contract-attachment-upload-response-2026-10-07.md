# Contract attachment uploads — 1.61.29

The October 7 report from Production 1.61.26 stopped at the captured attachment
record creation step; the file-upload destination was not sent. Its message was
replaced by a generic review warning, so the original native cause is unavailable.
This is separate from the earlier Contract creation Approval_Sequence mismatch.
The patch retains the underlying operation, native/readback phase, redacted cause
and error code in the inline error and audit. It does not infer that an uncertain
create failed or repeat it.

The FILE uploader previously required filename/path under `response.data`.
[Zoho's SDK example](https://www.zoho.com/creator/help/js-api/v2/upload-file.html)
uses that shape; its underlying [REST 2.1 example](https://www.zoho.com/creator/help/api/v2.1/upload-file.html)
places those fields at the response root. The published SDK 2.0 forwards the
UPLOAD_FILE response unchanged. The smallest compatibility fix accepts exactly
one of these documented containers, with native success code 3000 and nonempty
string filename/path. Failed, malformed, competing or mixed replies remain
unknown. Success still requires the exact saved child ID, Contract parent and
acknowledged file path. The earlier logs did not include the raw FILE receipt,
so attributing their upload failure to this shape mismatch is an inference.

Initial attachment creation and read-only recovery now use the same predicate,
including Email_Attachment=true. A successful create recheck restores its
captured child/parent association; it does not send the remaining file upload.
Unknown outcomes retain the original child and inputs. No second create/upload,
alternate write or cleanup delete follows an ambiguous response.

Attachment uploads keep the original attachment modal mounted. A compact spinner
and polite status replace the extra Contract-fields progress/result dialog.
Verified results patch the file list and count in place; errors and read-only
Check status stay beside the files. Pending native calls and checking block Close,
Escape, duplicates and conflicting actions. A settled review can be dismissed
and reopened only for its captured Contract without clearing the review. The
internal per-file ledger and unsent/unknown distinction remain. Other Contract
creation, approval and Lot-completion progress dialogs are unchanged.

Verified batches finish from their exact per-file ledger and merged saved rows.
An unrelated whole attachment-report refresh cannot leave a verified upload
spinning indefinitely. Existing backfill/lot-selection changes ship in the same
frontend release; see the [Lot safety audit](contract-lot-selection-safety-2026-10-07.md).

Changed frontend functions include contractUploadAcknowledgement,
contractFileReadback, contractAttachmentError, createContractAttachmentRecord,
recheckContractAttachment, addVersionFiles, attachmentModalRows,
contractAttachmentPaint/Refresh/Finish/Recheck, workflow begin/paint/finish,
contractControls, openModal and closeOverlays. Existing Contract_Version fields
are ID, Contract1, File_field1 and Email_Attachment. Existing Custom APIs are
Create_Contract_Attachment_Record and Delete_Contract_Attachment. Native forms,
fields, workflows and APIs are unchanged; no Creator deployment is required.

Regression checks execute the actual widget and native fixtures:

- scripts/test-contract-attachment-verification.mjs: both documented receipts,
  failed/conflicting/malformed replies, exact saved parent/path, create/recheck
  email-flag parity, captured parent restoration, cause redaction and no replay.
- scripts/test-contract-sdk-v2-files.mjs: native file bytes and actions, mounted
  modal/input/status, spinner, duplicate/close/deadline/actor locks, hidden extra
  dialog, inline read-only recovery and zero uncertain cleanup.
- scripts/test-contract-attachment-presentation.mjs: original file surfaces and
  provenance; the full Contract SDK2 aggregate includes the new verification.
- npm run validate and npm run build:pages are required release gates.

These are offline source/fixture checks. No live attachment, Contract or Lot was
created, changed or deleted to test the patch. Previously uncertain children are
not automatically repaired or removed. Rollback the Production frontend mapping
to 1.61.26; retain and review any saved attachment before another upload.
