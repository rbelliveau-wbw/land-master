# Comment email and Post feedback correction — October 21, 2026

## Recipient preparation

The first comment-email release used a JavaScript-escaped regular expression
in Deluge. Native Creator execution confirmed that it rejected the valid Julie
King address. The correction uses a backslash-free pattern. A temporary,
read-only check returned `oldRecipientAccepted: false` and
`correctedRecipientAccepted: true`; it read no comment and sent no email, and
the temporary branch was removed before publication.

Owner resolution now follows the existing native patterns in
`createBudgetAttachmentRecord`, `getUserAccess`, and
`Send_Proforma_Approval_Email_With_Context`: iterate lookup records and use each
record's `ID`. This applies to Contract, Pro Forma, Budget and the union of
Project phase owners. The saved author's username/email alias remains excluded;
recipient addresses remain deduplicated. Existing functions and Custom APIs are
updated in place. No notification form workflow or additional endpoint is added.

Regression tests inspect the raw Deluge pattern without JS literal unescaping
and use record-shaped owner lookups. The Budget/Project Julie + Robby scenario
resolves Julie once and excludes Robby, including duplicated Project phase owners.
No failed comment was reposted and no real owner email was sent during testing.

## Post feedback

The shared Post button retains its width and one **Posting…** state throughout
the native write and required thread refresh. A 650 ms minimum affects only
display; native requests start immediately. Reduced motion skips this minimum
and the rotating spinner. A verified acknowledgement shows one **Posted** check
for 1,400 ms, or until the user starts a new draft. Post/email results remain
succinctly inside the existing modal.

An acknowledged save followed by a read failure remains a saved comment, clears
the submitted draft and identifies the refresh failure. Unknown writes retain
their drafts and prevent replay, including when switching parents or reopening.
Timers are scoped to the current parent/actor and cancelled on component destroy.
The new composer appearance options remain previews until the user chooses one.

## Reuse rule

`AGENTS.md` now explicitly requires inspecting and reusing proven functionality
first, following established native patterns, checking real field/lookup shapes,
and reporting native verification limits. A separate implementation needs a
concrete reason when an existing contract cannot be reused.

## Release and rollback

Pro Forma **1.80.130**, Contract Management **1.62.26**, and Budget **122.29.66**
contain the shared Post feedback and updated shared asset references. Roll back
their environment mappings to 1.80.129, 1.62.25 and 122.29.65 respectively. Keep
the corrected recipient handling when rolling back frontend presentation.

Complete `npm run validate`, `npm run build:pages`, shared comment browser
regressions, native Deluge compilation and native recipient-pattern execution
passed. Creator **9.110 — Fix owner comment email recipients** is published in
Stage and Production; Environments reports no remaining Development changes.
The package modifies the single existing notification builder. API names,
authentication, user scopes and function bindings remain unchanged.
