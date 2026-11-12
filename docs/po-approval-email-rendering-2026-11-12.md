# PO Approval Email Rendering Repair

The supplemental approval email replaced a sentence in the complete regular PO
HTML using Deluge replaceAll. Dollar-formatted baseline/proposed totals were
interpreted as regex replacement syntax, returning null. Appending Budget Element
Details then produced the literal null plus the remaining table, losing the
review link and main request. Reproduced in Zoho's public Deluge runner with
$123,456.00 and $223,456.00: default replacement returned null; literal replacement
returned the complete div. Reference: https://www.zoho.com/deluge/help/functions/string/replaceall.html.

The shared function now prepares regular/supplemental text and assembles the
same template once, without replacements on the finished body. It includes the
saved request description and current-revision line descriptions, escaped for
HTML. Review Purchase Order uses the saved supplement ID and budget ID, while
the displayed reference retains the original PO and supplement number. Excel,
budget element details, recipients, approval order and duplicate-send protections
are preserved. No email approval is performed by clicking the link.

Changed function: creator/functions/sendPurchaseOrderEmail.dg. Affected forms and
read fields: Payment_Request.PO_Description/PO_Original/PO_Supplement_Number/
PO_Supplement_Baseline/PO_Amount_Exact and PO_Item.Description/Cost_Code/
Final_Amount_Exact/Purchase_Order/Revision/Line_Order. No schema or Custom API changes.
Creator promotion is required and is left to the user. No live notice was sent
or resent as part of verification. The old malformed email stays in recipient
inboxes; the fix affects subsequent sends after Creator promotion.

Regression evidence: shared regular/supplemental header/button, exact saved
destination in all environments, descriptions with dollar signs/ampersands/HTML
and multiline text, stale revision exclusion, attachment preservation and
existing delivery failure/unknown/no-repeat checks. The existing offline email
harness models the observed native null replacement. Browser previews verify
rendering; Outlook delivery remains a post-promotion check.

Rollback: restore sendPurchaseOrderEmail from commit 623648d8 and publish through
Creator. Widget-only rollback is Budget Manager 122.29.139.

Development verification: saved, compiled, reopened and copied the native editor
source (15835 bytes; SHA-256 13178e46e73c541dc9157aade70cb1cd0dac558e86acc0bd79cd752c0e3b33fc).
The complete existing email regression suite passed with this actual native
readback substituted for repository source. Creator Production stays at 9.187;
this one function remains for the user to promote. Production read-only review
of Somerset Supplement 1 confirmed PO description TEST . need more valves and
line description valves. No request or approval state was changed.
