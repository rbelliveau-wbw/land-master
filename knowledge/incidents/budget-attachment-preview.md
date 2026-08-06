
# Budget Attachment Preview

## Problem

PDF files downloaded correctly but rendered blank or forced a download inside the widget.

## Failed approaches

- `ZOHO.CREATOR.API.readFile`
- blob URLs
- direct Creator download URLs
- Creator stock report preview URLs

## Successful fix

Store one file per `Contract_Version` record using `Budget` and `File_field1`, then stream the PDF through the `Get_Budget_Attachment_Preview` Custom API to the in-widget viewer.

## Regression test

Upload a PDF, preview it without downloading, close/reopen the viewer, download it, and confirm the bytes match the uploaded file.
