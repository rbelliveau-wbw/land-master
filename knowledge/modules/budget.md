
# Budget Module

## Scope

Budget landing, phase/category/item editing, HCSS and GP actuals, preliminary/unapproved/final states, approval tracks, attachments, PDF generation, and Proforma comparison.

## Approval tracks

- Development track locks Development and Engineering.
- Construction track locks Construction.
- Both tracks can be active independently.
- Finalization moves the applicable Unapproved amounts into Final and clears workflow-owned Unapproved values according to current Deluge logic.

## Attachments

Attachments use one `Contract_Version` record per file:

- lookup: `Budget`
- file field: `File_field1`

The working in-widget PDF preview uses `Get_Budget_Attachment_Preview`.

Do not replace it with `ZOHO.CREATOR.API.readFile`, blob URLs, direct Creator download URLs, or Creator stock preview links; those approaches previously produced blank pages or downloads instead of embedded previews.
