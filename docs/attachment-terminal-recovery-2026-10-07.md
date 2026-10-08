# Attachment verification and recovery UI

Contract 1.61.31 and PF 1.80.92 use the working Budget saved-file check: exact
captured record and parent, one saved file, matching filename and native path.
An unrecognized settled upload reply is reconciled with fresh saved metadata.
Uploading does not depend on a separate file download, preview response encoding,
or a full-byte comparison. Empty, wrong-parent, mismatched and unreadable records
remain errors. No second create or upload is issued by reconciliation.

PF deletion checks an exact-ID counted collection. Zero confirmed matching rows
verifies deletion; reading an already deleted record by ID is unnecessary and can
reject even when deletion succeeded. Permission/read failures remain errors.

PF and Tax remove the global recovery popup. A settled uncertain operation no
longer makes the entire page inert or prevents access to navigation and the audit
log. Contract terminal attachment runs release their global workflow slot while
retaining their local status and read-only recovery in history. Requests still in
flight and duplicate uncertain writes remain guarded. Existing workflow result
dialogs, permissions, native backend functions, and lot protections are preserved.
Budget's working attachment logic and production version are unchanged.

Regression checks exercise actual widget/controller sources: root/data upload
responses, scalar/object file fields, failed reads, wrong parents/files, pending
and changed-session responses, no replay, PF deleted-ID rejection avoidance,
terminal navigation/audit access, and existing module workflows. Full repository
validation and Pages build are required before promotion. These fixtures do not
perform live Creator writes; publication checks verify deployed static assets.

Rollback production mappings to Contract 1.61.30, PF 1.80.91 and Tax 19.17.11 and
rebuild Pages. No Creator schema, Custom API or Deluge deployment is required.
