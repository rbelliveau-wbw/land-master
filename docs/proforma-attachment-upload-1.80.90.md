# Pro Forma attachment upload and inline progress — 1.80.90

This frontend release repairs native file receipt handling and keeps attachment progress in the original Attachments dialog or panel. Selecting files no longer opens an additional “Save Pro Forma” dialog. Ordinary Pro Forma Save retains its existing compact progress dialog, failed-save draft retention and automatic verified-success dismissal.

## Evidence and cause

The reported attachment result verified `Create_Proforma_Attachment_Record`, then marked the native `FILE.uploadFile` operation for `All_Contract_Versions` as needing review. Creating an empty attachment child is only the first step; it does not prove a file upload succeeded. The screenshot did not include the complete raw upload response, so it cannot establish that exact live response shape.

The old `pf-controller.js` upload validator accepted only `code: 3000` with `data.filename` and `data.filepath`. Zoho's [SDK2 upload documentation](https://www.zoho.com/creator/help/js-api/v2/upload-file.html) shows that representation and identifies the underlying API as REST 2.1. The [REST 2.1 upload documentation](https://www.zoho.com/creator/help/api/v2.1/upload-file.html) shows the filename/path at the response root. A root receipt was reproducibly quarantined by the old validator despite an applied file and matching persisted content. Separately, its object-only persisted-field verifier rejected scalar file paths/download URLs that the widget's attachment display already handles. Both incompatibilities are covered by actual-source native transport fixtures.

## Exact changes and boundaries

| Source/function | Behavior |
| --- | --- |
| `pf-controller.js` — `uploadReceipt`, `upload` | Accepts exactly one documented root or nested `data` filename/path receipt with success code 3000. Rejects missing/malformed metadata, root plus data duplicates, competing result/protocol wrappers and explicit failure metadata. This handling is specific to FILE upload; generic save/custom API parsers remain unchanged. |
| `attachmentParent`, `persistedFile`, `verifyFile` | Requires the exact string child ID and `Pro_Forma` parent before upload and on fresh counted readback. Reads a single persisted object, literal path, or download URL with exactly one filepath parameter. Conflicting aliases, wrong path/name, multiple files and missing filepath remain failures. A scalar field without a separate filename must match the acknowledged exact path; verification still compares every captured byte through the existing preview-first/native-read path. Lost-response recovery requires the captured filename and content and performs reads only. |
| `verifyFile` | Checks the captured Creator actor/environment before reading and again after delayed binary reads, preventing a late response from being accepted under a changed session. |
| `begin`, `snapshot`, `retain`, `pf-progress.js` | Attachment runs and retained attachment reviews route to the inline surface. Their terminal workflow closes automatically; unresolved operations continue to block another send. The generic Save dialog and global ordinary-save recovery remain unchanged. |
| `widget.html` — `pfAttachmentStatusHtml`, `syncPfAttachmentTransfer`, `uploadPfAttachments` | Mounts an accessible live status, reduced-motion-aware spinner and named per-file results. Stage updates patch those nodes without replacing the original modal shell, file input or stage status. A child-created result is not marked Added until upload, fresh parent/path and captured bytes verify. Previously verified files remain Added; the failed file needs review and later files remain Not sent. |
| `recheckPfAttachments`, `pfAttachmentInlineEvent`, `openPfAttachmentModal`, `closePfAttachmentModal` | Provides an explicit read-only Check saved attachments action. Terminal Close and reopening the same captured parent can pass the document capture gate while writes remain blocked. The pending native/verification request locks, modal focus trap, return focus and captured user/environment/parent scope remain enforced. |

The native target stays `Contract_Version` / `All_Contract_Versions`, parent field `Pro_Forma`, file field `File_field1`. Creator forms, fields, Custom APIs and native functions are unchanged. There is no alias replay, guessed child, automatic upload retry or cleanup/delete of a created child after an uncertain upload.

## Regression evidence

- `scripts/test-proforma-attachment-native-receipts.mjs` executes the full current widget/controller/progress scripts. It covers root/data receipts, scalar/object/URL/singleton persisted fields, conflicting envelopes and buried failures, wrong path/parent/bytes, actor/environment change during binary verification, mounted modal/input/status across delayed stages, actual document-capture routing for terminal Close/same-parent reopen/read-only recheck, mixed batch Added/Needs review/Not sent results and ordinary Save dialog behavior.
- `scripts/test-proforma-sdk-v2-file-delete.mjs` imports that focused suite and retains lost-response/deadline/no-replay/read-only recovery, exact file target/parent/binary checks and deletion batches above 200 records.
- `scripts/test-proforma-attachment-presentation.mjs` retains actual click/drop/picker, permission, busy, modal context, stale chooser, file metadata and cached creator presentation checks with inline terminal expectations.
- `scripts/test-proforma-save-speed.mjs` verifies ordinary Save and Dashboard, failed/unknown retention and automatic verified-success dismissal. Its request-budget checks remain unchanged.

These are deterministic native transport and DOM fixtures, not a live browser layout or Production upload. No real attachment was created, uploaded or deleted for this patch. Production success still requires a new user-selected file through the existing Creator session; an earlier uncertain upload should be checked through read-only recovery before another send.

## Promotion and rollback

Promote the validated immutable frontend `proforma-manager` release `1.80.90` through `deploy/environments.json` Production mapping, including the changed `pf-controller.js`, `pf-progress.js` and widget assets. No Creator deployment is required. Rollback maps Production to immutable `1.80.89`; it restores that frontend's upload validator and extra attachment result dialog without changing existing Creator records or files.
