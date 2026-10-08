# Attachment saved-state reconciliation — October 7, 2026

Production releases: Budget 122.28.32, Contract 1.61.30, Pro Forma 1.80.91.

## Reported failures and corrections

Budget's 7:32 PM audit confirmed child creation for `4410926000005116008`,
followed by an unrecognized FILE reply and a later complete attachment list
containing the uploaded PDF. The upload catch already inspected the exact
child, but recorded the observed file and always threw the original reply error.
That inspection now completes the upload when its existing exact child,
Budget parent, single persisted path and filename predicates pass in the
captured session. An acknowledged path or name mismatch still needs review.

Contract's 7:36 PM audit identified the creation blocker explicitly:
`The new attachment email flag was not verified.` The child existed, but FILE
was never sent because creation required `Email_Attachment` to be true. Email
selection is independent of uploading. Creation and read-only create recovery
now verify the exact returned child and Contract parent, preserving whatever
Email value Creator returns instead of requiring or rewriting that value.

Pro Forma's screenshot showed a persisted PDF with an unrecognized filename/path
reply. Its upload controller now runs its existing fresh parent/path/name and
captured-byte verification once after a settled, unrecognized reply. A lost
reply can likewise resolve through persisted evidence without a second FILE
call. Contract has the same automatic read-only resolution using exact saved
identity, filename/path and captured bytes. Empty, wrong-parent, ambiguous,
unreadable, mismatched-byte and changed-session results remain unresolved.

All modules follow create once, upload once, inspect the saved child, and show
success when their persisted verification passes. A native call still physically
pending or a timed-out verification cannot authorize continuation. Read-only
recovery remains available; it cannot replay FILE, insert another child, or
delete a possibly saved attachment. Only filename/path response metadata is
parsed; no guessed response envelope is treated as successful by itself.

The existing attachment modal retains the spinner/status and recovery controls.
No additional progress dialog is introduced. Existing failed attempts may have
left empty child records; this release does not delete or guess their files.

## Budget phase-row layout

Remove the direct Approvals button from `renderProjList`. The existing approval
workspace and handlers retain their grants and behavior. The fixed Actions
column reserves 220px for the remaining menu, View, attachment and comment
controls, with a 7px gap, non-shrinking controls and wrapping as a fallback.
Long phase names retain their independent wrapping cell; other table columns
and financial calculations keep their existing behavior.

## Verification and rollback

Actual-source regressions cover Email off/omitted creation followed by FILE,
root/data/unrecognized/lost replies with saved files, exact parent and child,
filename/path and byte mismatches, unreadable evidence, pending/deadline locks,
manual recovery and no duplicate create/upload/delete. Required repository
validation and Pages build run before publication. Offline fixtures do not
constitute a live Creator upload.

Affected frontend files: three widget HTML files, Budget `budget-layout.css`,
Pro Forma `pf-controller.js`, existing attachment regression scripts, release
metadata, documentation and Production mappings. No Creator forms, fields,
functions or Custom APIs change; no Creator backend deployment is required.

Rollback Production mappings to Budget 122.28.31, Contract 1.61.29 and Pro Forma
1.80.90, then rebuild Pages. Older immutable releases are preserved.
