# Purchase Order Approval Email Lines

Approval requests show the first 10 lines from the current PO revision. The email and the PO Lines worksheet use Cost Code, Vendor, Description, Qty, UOM, Unit Price and Total. The attachment retains every line and the existing detailed and supplemental worksheets. Quantity cells remain numeric and use General formatting. Proposed Budget Changes shows the saved reallocation reason beneath its cost code row when a reason exists.

PO approval emails and standalone Budget Modification approval and rejection emails attach genuine XLSX workbooks. Creator converts the typed workbook source with the same SheetJS library used by the in-app PO download. A conversion failure prevents sending and leaves the delivery unstamped. PO Activity records the preparation failure for the existing retry flow. The in-app download uses its existing contract.

Request subjects, totals, unit prices and the net modification amount use thousands separators. Supplemental outcome messages insert the formatted family total literally to preserve the surrounding HTML.

Creator functions are poExcelWorkbook, sendPurchaseOrderEmail and renderPurchaseOrderOutcomeEmail. The changes read the existing Payment_Request vendor, amount, line count and revision and the current PO_Item cost code, description, quantity, UOM, unit price and amount. There are no schema, Custom API, routing or recipient changes.

Regression coverage includes standard and supplemental requests, escaping, more than 10 lines, numeric quantities, missing manual pricing, exact links and duplicate-send prevention. Release requires publishing the three functions together in Creator. Roll back by publishing their prior function bodies together.

## Creator Release for XLSX Attachments

Publish `approvalWorkbookXlsx` (NodeJs with the `spreadsheetXml` string argument), `approvalWorkbookXlsxFile`, `sendPurchaseOrderEmail` and `sendModificationEmail` together. Install `creator/functions/approvalWorkbookXlsx.cjs` as the cloud function's entry point and upload `widgets/land-master/src/app/vendor/xlsx.full.min.js` into its `node_modules` folder. There are no schema, Custom API, recipient or widget dependencies to promote. The PO sender reads the verified `Budget_Modification.Reason` already included in the captured approval bundle.

Verify with a synthetic workbook through both Creator runtimes and reopen fixtures for PO and Budget Modification attachments. Check reason escaping, multiline text, supplemental worksheets, formulas, typed cells and failure before delivery. Roll back by restoring and publishing the prior two sender bodies.
