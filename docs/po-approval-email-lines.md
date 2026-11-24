# Purchase Order Approval Email Lines

Approval requests show the first 10 lines from the current PO revision. The email and the PO Lines worksheet use Cost Code, Vendor, Description, Qty, UOM, Unit Price and Total. The attachment retains every line and the existing detailed and supplemental worksheets. Quantity cells remain numeric and use General formatting. The email attachment is an Excel XML workbook with the .xml extension. The in-app download continues to produce .xlsx.

Request subjects, totals, unit prices and the net modification amount use thousands separators. Supplemental outcome messages insert the formatted family total literally to preserve the surrounding HTML.

Creator functions are poExcelWorkbook, sendPurchaseOrderEmail and renderPurchaseOrderOutcomeEmail. The changes read the existing Payment_Request vendor, amount, line count and revision and the current PO_Item cost code, description, quantity, UOM, unit price and amount. There are no schema, Custom API, routing or recipient changes.

Regression coverage includes standard and supplemental requests, escaping, more than 10 lines, numeric quantities, missing manual pricing, exact links and duplicate-send prevention. Release requires publishing the three functions together in Creator. Roll back by publishing their prior function bodies together.
