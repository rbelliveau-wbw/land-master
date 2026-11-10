# Construction Budgeting PO Attachments

Construction Budgeting can add original files to every Purchase Order, regardless
of creator, Budget owner or PO status. Budget editing remains read-only. New PO
files queue locally and upload after the existing parent save/submit handoff.
Saved and legacy PO attachment tabs use the same permission.

The reported denial came from three checks: the widget required general Budget
edit/approval rights; `createBudgetAttachmentRecord` denied this profile; and
Construction Attachment Validation rejected Budget/request links. Native
Attachment Add permission was already enabled. No profile checkboxes changed.

## Implementation

Reuse `Create_Budget_Attachment_Record` / `createBudgetAttachmentRecord(string
budgetId)` and the proven `constructionReviewActor` identity resolver. The
existing Capabilities response adds `canAttachPO`; `canWrite` retains its general
meaning. Only trusted, actor-scoped capability plus an exact PO context enables
the picker. Missing/old backend capability fails closed. New drafts opt into a
read-only capability/file load so the picker can resolve before parent creation.

Create/Validate require an actual `Payment_Request` of type Purchase Order under
the exact Budget. Associate is excluded from this profile's new grant. Native
`Construction_Attachment_V` permits those exact PO/Budget pairs and an empty
API-created file row's first FILE upload. Existing file parents cannot move, and
another user's populated file cannot be replaced. Existing contract attachment
guards remain intact. Delete and Link Budget File still require the original
general permissions. No new form, field, function or Custom API is introduced.

Affected forms/fields: `Attachment.Budget`, `Payment_Request`, `File_field1`,
`Contract1`, `Pro_Forma`, `Budget_Modification`, `Added_User`; read-only
`Payment_Request.Budget` / `Request_Type` and User Access identity/profile.
Native FILE acknowledgement and unknown-reply no-replay handling are unchanged.

Changed sources: Budget `widget.html`, `request-attachments.js` and CSS;
`createBudgetAttachmentRecord.dg`; `Construction_Attachment_Validation.dg`;
profile regressions and capability/permission documentation.

## Verification And Deployment

November 10: both modified native scripts compiled in Creator Development and
were independently reopened. Every source token, including parentheses and
string literals, matched checked-in code. Native read-only execution as Demo
Construction on CAR01 (whose owners exclude that actor) returned
`canWrite:false, canAttachPO:true`; Validate allowed an existing
PO and denied Budget-only uploads. Native profile Add/View/Edit/Delete/More
settings were read without modification.

Desktop verification in the agent-owned browser used actual shipped attachment
controller, renderer and permission helper with sample records. A new draft
changed from Checking Attachment Access to enabled Choose Files and queued an
original local file. A foreign submitted PO offered upload and preview/download,
without Delete/Link Budget File. Check and old-backend cases remained disabled.
No native file record, financial submission or email was created by these checks.
Actual native FILE transfer remains a live verification limitation.

`scripts/test-po-attachment-profile.mjs` executes actual Deluge sources against
native-shaped lookups and covers all PO states, foreign creator/owner, exact
parents/IDs, blank and duplicate actors, Development-only preview, immutable
links, foreign-file replacement denial, legacy PO context and unchanged general
grants. Existing request/draft/Construction regressions also pass. Full release
checks: `npm run validate` and `npm run build:pages`.

Budget **122.29.128** is the immutable hosted release for Development and
Production. PMP leaves Creator Production promotion to the user: promote the
saved function and existing validation workflow together. No schema addition or
Custom API re-registration is required; permanent widget URLs stay unchanged.
Until Creator promotion, Production continues to deny this profile's uploads.

Rollback: map Budget Production to **122.29.127** and rebuild Pages. Restore the
two native scripts from commit `b4051ba8` if rolling back native promotion. No
records or fields need deletion. The schema-change package records the native
handoff and evidence.
