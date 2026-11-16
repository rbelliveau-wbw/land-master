# Purchase Order Register

Budget Manager 122.29.153 adds Purchase Order Report under Requests. The Full
Register retains all ten requested columns, with no With Supplements button.
Supplements appear immediately beneath their exact original in sequence order,
indented in the PO Number column and with their incremental amounts. A missing
or filtered original is labeled Original PO Outside Results; it is never
silently invented or associated through a matching vendor or number.

The report reuses the complete permission-scoped Requests index and report
snapshot. Switching views adds no API calls. Search, status and date order
remain local. Existing request creation and record actions are unchanged.
The table scrolls horizontally to preserve readable 14px text.

## PO Number

The prior implementation used Creator record IDs as references. The owner
requested optional Single Line `Payment_Request.PO_Number`, labeled PO Number,
maximum 255 characters, with no default or automatic numbering. Strings retain
leading zeroes. Existing records are not backfilled. Supplements display their
original's number plus Supplement and its existing sequence; they never create
a business PO number. Unassigned numbers display Not Assigned and a separately
labeled record reference.

The existing native All_Wire_Requests snapshot supplies PO_Number after the
field/report change is promoted. Managed-header merges preserve that native
value when the current API does not supply a number. No Deluge function or
Custom API change is needed. No widget save writes or clears PO_Number.

## Other Columns

Vendor, amount, request date and PO description reuse existing fields. Requested
By resolves the captured submission identity against the existing accessible
user roster; unavailable identities remain Not Recorded. PO Approved By lists
actual approved steps, roles and decision dates; it does not imply that an
incomplete chain is fully approved. Missing approval reads display Unavailable.
Coding Approved By, Entered In GP and PO Closed display Not Recorded because
this change does not create those business workflows or infer them from approval.

## Validation And Rollback

Regression coverage includes out-of-order supplements, exact parent/phase
matching, missing parents, leading-zero numbers, HTML escaping, approval dates,
read-only operation, native-number preservation and Requests index behavior.
Browser verification uses synthetic records; no financial request or email is
created. Native field/report configuration is verified in Development and left
for the owner to promote. The report itself is released through GitHub Pages.
Rollback: restore production budget-manager mapping to 122.29.149 and rebuild
Pages; the additive unused text field can remain without changing existing POs.
