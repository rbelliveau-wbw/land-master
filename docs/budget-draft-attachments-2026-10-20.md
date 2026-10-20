# Budget draft attachments and Link to Record

Budget Manager **122.29.57** lets users select or drop files in a new Budget
Modification or managed Purchase Order before creating its native record. Files
remain in memory until the parent creation response identifies its exact saved
ID. The original File objects then upload through the existing Budget attachment
flow, with both Budget and request lookups. Selecting or cancelling files makes
no native writes. A page reload discards unuploaded local files.

PO Save draft and Submit retain their existing business meaning. A Budget Mod
still submits through its existing Settings approval chain; this increment does
not change routing, email contents, reservations or approval timing. Saved
Check/Wire request attachments remain supported. Their existing new-request
Preview Draft flow remains a preview, not a newly introduced payment-save API.

## Saved identity and recovery

The queue records each file's confirmed destination and outcome. A successful
parent save is never repeated to retry its files. Uploaded entries are skipped;
only definitively unsent/rejected files may retry. Unknown native outcomes stop
the queue and use the existing exact Attachment-ID/parent read-only Check status
path. Checking never starts the next upload; Upload remaining files is explicit.
An unknown child-create ID cannot be guessed or recreated. Actor, environment,
Budget, navigation and attachment permissions gate subsequent requests.

An unidentified Budget Mod creation response retains its local model and files
and blocks another create from that retained draft. It does not attach files to
an inferred new record. PO lost-response recovery uses its existing token-based
read-only controller; file upload starts only after a verified parent snapshot.

PO progress and Budget Mod approval progress remain locked while queued uploads
are active. Terminal results distinguish a saved request from incomplete files.
The saved request's Attachments tab retains remaining files for review/retry in
the current page session. Native FILE acknowledgement plus the captured exact
Attachment/Budget/request identity confirms a successful upload. A subsequent
list refresh failure does not turn that save into an unknown write.

Queued file rows use the existing explicit request-attachment-files keyed motion
adoption. Remove restores keyboard focus to Choose Files. Tabs retain the mounted
request form, its typed values and pending-work Close/Escape guards.

## Choose and review

Every Budget request/file association picker now uses **Link to Record**. Choose
a same-Budget request (or a Budget-only file when opened from a request), press
**Review link**, inspect the file and its Budget/request destinations, then
**Save**. Selecting, searching, Back, Cancel and Escape perform no writes. Budget
only removes the request association while keeping the original Budget file.
No file is copied or moved. The title remains Link to Record in both steps.

## Native impact

No new Creator field, report, function, workflow or Custom API is required, and
there is nothing to promote in Creator for this increment. It uses the already
promoted Attachment.Payment_Request / Attachment.Budget_Modification lookups,
All_Attachments report, Create_Budget_Attachment_Record and the existing native
file upload API. Existing permissions and request-deletion file retention remain.

Changed code: Budget widget.html, request-attachments.js/.css, po-ui.js and
po-progress.js. Focused queue and real desktop-renderer regressions accompany
full repository validation and the Pages build. Browser tests simulate native
writes; they do not create, submit, upload to, or delete live business records.

Rollback the Budget Production mapping to **122.29.56**. Leave the existing native
attachment fields, saved records and permission guards intact.
