# Attachment form and report rename — October 11, 2026

The shared Creator file form is now `Attachment`; the report is
`All_Attachments`. The former link names were `Contract_Version` and
`All_Contract_Versions`. Contracts, Budget and Pro Forma must use the new names
for existing files, counts, creation, upload, preview, download and deletion.

| Widget | Rename release | Previous production release |
| --- | --- | --- |
| Contract Management | `1.61.45` | `1.61.43` |
| Budget Manager | `122.29.16` | `122.29.15` |
| Proforma Manager | `1.80.101` | `1.80.99` |

The latest October 10 production `.ds` predates the rename. The complete
[post-edit October 11 Development export](../creator/exports/Land_Master_2026-10-11-development.ds)
confirms `Attachment` / `All_Attachments` and the preserved field link names.
Live Creator Development checks and that captured snapshot are the authority
for the renamed form/report. The metadata manifest records the snapshot hash.

Generated attachment metadata is refreshed from that Development snapshot.
Unrelated generated schema retains its established baseline rather than taking
an application-wide metadata migration in this rename. The
[metadata manifest](../creator/generated/application.json) records the August 6
baseline and the targeted October 11 Development overlay. Historical notes,
baselines and earlier immutable releases retain their original names. Refresh
the Creator export after promotion rather than rewriting historical schema.

## Preserved fields and contracts

| Surface | Preserved field link names |
| --- | --- |
| Attachment identity and file | `ID`, `File_field1`, `Date_field1` |
| Original file creator | `Added_User`; existing `Added_Time` / `Modified_Time` projections |
| Legal parent and approval inclusion | `Contract1`, `Email_Attachment` |
| Budget parent | `Budget` |
| Pro Forma parent | `Pro_Forma` |
| Contract's existing related-file lookup | `Contract.Contract_Versions` |

`Contract.Contract_Versions` is a field on `Contract`, not the old file form
name. Its link name remains unchanged. Existing record IDs, parent criteria,
file limits, access rules, email decisions and native upload acknowledgements
retain their established meaning. The existing Custom API names and payloads
stay unchanged.

## Affected surfaces

- Contract Management, Budget Manager and Proforma Manager widget attachment
  report/form constants, related reads, writes and deletion summaries.
- Shared attachment presentation and current module/agent documentation.
- Creator functions `createContractAttachmentRecord`, `deleteContractAttachment`,
  `getContractAttachmentPreview`, `createBudgetAttachmentRecord`,
  `deleteBudgetAttachment`, `getBudgetAttachmentPreview`,
  `createProformaAttachmentRecord`, `deleteProformaAttachment`, and
  `getProformaAttachmentPreview`.
- Creator attachment-producing and consuming workflows: `Create_LOI_Contract`,
  `Review_LOI_Request`, `exportBudgetSnapshot`, `manageBudget`,
  `Send_Contract_Approvals`, and `Send_Contract_Approval_Email`.
- Existing create/delete/preview Custom APIs for each module, Budget export
  and management, and Contract approval APIs continue targeting those functions.
  Production/Development alias routing is preserved.

| Module | Existing attachment Custom APIs |
| --- | --- |
| Contracts | `Create_Contract_Attachment_Record`, `Delete_Contract_Attachment`, `Get_Contract_Attachment_Preview` |
| Budget | `Create_Budget_Attachment_Record`, `Delete_Budget_Attachment`, `Get_Budget_Attachment_Preview` |
| Pro Forma | `Create_Proforma_Attachment_Record`, `Delete_Proforma_Attachment`, `Get_Proforma_Attachment_Preview` |

Related API paths are `Create_LOI_Contract`, `Review_LOI_Request`,
`Send_Contract_Approvals`, `Export_Budget_Snapshot` and `Manage_Budget`, retaining
their existing environment aliases and request/response contracts except the
renamed `Attachment` key in the Budget deleted-child count map.

The fresh Development export confirms Creator automatically updated native
typed form references and schema, workflow and report bindings. Explicit text,
URLs and serialized response keys required browser edits. Three page snippets
were saved: `Forms_Reports`, `Contract_Mgmt` and `Approvals_HTML_Page`
(`html_snippet7`). `Forms_Reports` and `Contract_Mgmt` were also reloaded and
checked for zero retired form/report references. Six Creator functions were
saved through the browser: `exportBudgetSnapshot`, `manageBudget`, `Review_LOI_Request`,
`Send_Contract_Approvals`, `Send_Contract_Approval_Email` and `Create_LOI_Contract`.
These edits update comments, diagnostic text and the Budget deleted attachment
count key. Native Attachment on-add/on-edit captions and its success message
now use Attachment. The `Hide_Fields_set_Defaults_` workflow retains its link
name with an updated friendly label. Legacy attachment comments were updated
in inactive `Send_Reminder_to_Approver` (Send Reminder to Approvers - Contracts)
and report actions `Send_for_Approvals_Contra1` and `Send_for_Approvals`. The final
export audit confirms these three workflow bodies differ only in their comments.

Retired singular form/report bindings are absent from the captured Development
export. `Contract_Versions` persists as the existing Contract lookup/subform
field and its matching CSS selectors. The internal `attach_contract_version`
stage identifier is preserved across the LOI function and its Pro Forma
progress UI.

Widget attachment field metadata includes the preserved parent lookup types
and `Date_field1`, so exact parent verification also normalizes native lookup
objects to their string IDs after a direct-create fallback.

Repository widget releases and production mappings are published independently
from Creator. Browser edits apply to Creator **Development**; the user promotes
those Creator changes. Promotion must carry the `Attachment` / `All_Attachments`
rename and updated function references together. GitHub Pages cannot publish
Creator functions. Permanent widget URLs remain unchanged.

The promoted Production widget releases expect `Attachment` / `All_Attachments`
immediately after the Pages deployment. Until the user promotes the corresponding
Creator changes to Production, attachment reads/uploads can fail. Contract
Management includes the attachment report in its required startup snapshot, so
an absent `All_Attachments` report prevents the full Contracts workspace from
loading. Production widget publication does not itself close this Creator
promotion gap. Any later Stage Creator promotion also needs matching Stage
widget releases.

## Regression scenarios

- Read existing files and background counts through `All_Attachments` for each
  exact `Contract1`, `Budget` and `Pro_Forma` parent. Loading, verified-zero and
  unavailable states remain distinct; another parent's files stay excluded.
- Create and upload one file and multiple files in each widget. Confirm the
  captured child ID and parent, metadata-free `code:3000` success, surfaced
  native failures, unknown-reply recovery and duplicate-write protection.
- Preview and download existing/new PDF and other supported files; Budget
  keeps its existing `Get_Budget_Attachment_Preview` route. Delete the selected
  child only, refresh its count and preserve read-only users' restrictions.
- Keep original `Added_User` attribution and Contract Email switch behavior.
  Contract approvals attach only the current parent's checked files, including
  the `Date_field1` ordering fallback. LOI contract creation still attaches its
  generated document and retains `Contract.Contract_Versions` assignments.
- Budget snapshot PDF/Excel attachment generation uses the renamed form;
  deleting a Budget removes only that Budget's Attachment children.
- Run repository validation, the Pages build and focused attachment regressions
  before publishing. Record native Development compilation/read checks
  separately from production verification after the user's Creator promotion.

Repository verification uses `npm run validate`, `npm run build:pages` and
source/release asset parity for the 35 files in the final three widgets. Focused
regressions cover native API configuration, parent lookup object/string
normalization, complete scoped reads, FILE acknowledgements, read-only recovery,
delete scope, permissions and approval-email attachment selection. Automated
checks use fixtures and mocks. Browser verification saves configuration and
inspects exports; live business-record mutations and actual emails were not
executed as regression tests.

## Rollback

Previous production widget releases: Contract Management `1.61.43`, Budget
Manager `122.29.15`, Proforma Manager `1.80.99`. Restore the corresponding
`deploy/environments.json` mappings and redeploy Pages without changing the
permanent Creator widget URLs.

Those releases expect the former form/report names. Coordinate widget rollback
with restoring the prior Creator form/report link names and previous function
bodies; switching only widgets back after Creator promotion leaves attachment
operations incompatible. Preserve existing rows, IDs and parent fields through
either direction of the rename.

Budget rollback `122.29.15` retains the upstream saved Purchase Order editing
fix and its corrected production entry point incorporated before this rename
release. The upstream temporary PO test CFO documentation is retained with its
separate Creator promotion requirements.
