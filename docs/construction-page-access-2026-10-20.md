# Construction page and access — October 20, 2026

Native Development access changes are saved and independently reopened.
Hosted release and live role-test evidence are recorded separately below.

- Legal and Construction remain separate Creator pages using the same widget.
  A page variable fixes the module. There is no in-widget switch, cross-module
  record navigation or fallback to Legal after a Construction permission failure.
- Dev/Land Acq - Proforma & Budgets and CFO gain the Construction page and the
  ability to submit requests and view all Construction requests/actions. Existing
  request/action fields, Review and templates stay read-only for submitters.
  The user explicitly retained file uploads and comments for submitters.
- The new Construction Budgeting profile receives only the Construction module
  page. It can submit, accept/reject, edit requests, maintain/reorder/complete
  actions, manage templates, archive/delete eligible requests and manage files.
  Standard completed-record locks and comment author/time rules remain.
- Existing individual Construction grants and unrelated profile grants remain.
  No actual employee is reassigned to the new profile without a named user.

## Native access matrix

| Capability | Dev/Land Acq and CFO addition | Construction Budgeting |
|---|---|---|
| Construction page | Allow | Allow; all other module pages denied |
| Contract form | Preserve existing grants | Add; View/Edit/Delete through Construction Requests only; View all/Modify all |
| Contract Actions | Preserve existing grants | Add; View/Edit/Delete through Construction Actions only; View all/Modify all |
| Attachment | Preserve existing grants | Add; View/Edit/Delete through Construction Attachments only; View all/Modify all |
| Comment Log | Preserve existing grants | Add; View/Edit through Construction Comments; author/time validation retained |
| Subdivision / Project context | Preserve existing grants | Read through All Subdivisions / All Projects; View all; no changes |
| User Access / settings / other business forms | Preserve existing grants | No direct form/report access |
| Native API access needed by widget SDK | Preserve existing grants | Allow required operations only |

New scoped reports are `Construction_Requests`, `Construction_Actions`,
`Construction_Attachments` and `Construction_Comments`. Their independently
reopened native sources are in
[`creator/schema-changes/construction-page-access-2026-10-20/reports/`](../creator/schema-changes/construction-page-access-2026-10-20/reports/).
Requests/actions filter `Work_Module == "Construction"`; files/comments filter
`Contract1.Work_Module == "Construction"`. No Legal reports are changed.

The Construction page will opt into these reports with a page variable so the
hosted widget remains compatible with the previously published Creator page
until the user promotes the new native components.

## Backend authorization

`hasConstructionPermission(user, editRequired)` reads the existing explicit
User Access grants and Creator's authoritative `permissions.profileForUser`.
Construction Budgeting grants edit and submit. Dev/Land Acq - Proforma & Budgets
and CFO grant submit. A missing or failed profile lookup adds no grant.
The helper does not grant Legal or other module permissions.

The full and lean User Access functions use the helper; their existing
Development wrappers delegate unchanged. Contract/action validation and the
attachment/comment authorization paths use the same helper. A Construction
Budgeting profile is also blocked from creating/editing Legal records, Legal
templates and unrelated files/comments through shared form/custom-API paths.

Changed functions: `hasConstructionPermission`, `getUserAccess`,
`getUserAccessLean`, `createContractAttachmentRecord`,
`deleteContractAttachment`, `getContractAttachmentPreview`.
Changed validations: `Field_Validations_Contrac`,
`Construction_Contract_Actions_Validation`, `Construction_Attachment_Validation`,
`Validate_Comment_Log`. Existing APIs retain their names and payloads.

Three event-only deletion validations close access through existing shared
Legal reports: `Construction_Action_Delet`, `Construction_Attachment_D` and
`Construction_Comment_Dele`. Construction actions/templates and attachments
require the Construction editor grant and an open parent. Construction comments
retain the module's author/time-checked soft delete. Legal behavior is retained.
No scheduled delete is added. The complete native function/workflow captures are
listed in [the Development deployment record](../creator/schema-changes/construction-page-access-2026-10-20/deployment.json).

Creator's formatter removed a grouped condition during initial compilation.
The saved helper uses nested checks, and independent complete-body comparisons
preserve literals and parentheses. CFO has no profile-based editor grant.

Creator documents the native profile lookup for usernames and email addresses:
[profileForUser](https://www.zoho.com/deluge/help/misc-statements/get-specified-user-permission.html).

## UI and verification scope

Suggest beside Request Name fills the existing subdivision/budget-type name
without saving or changing other draft fields. Creation buttons say Submit.
Construction action forms, drill-downs, grids and proposal forms omit assignment
pickers. Completion/save no longer requires a Construction assignee and does not
overwrite historical assignments. Legal keeps its assignment controls and rules.

Required Development tests use Dev/Land Acq submission/read-only access and
Construction Budgeting review/edit/template/file/action access. Test records are
isolated Development fixtures; Production business records are untouched.

PMP publishes the hosted release/main and Production mapping. Native Creator
changes remain in Development for the user to promote. Hosted rollback is
Contract Management 1.62.10; additive reports/profile are handled separately.
