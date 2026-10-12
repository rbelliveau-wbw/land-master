# Purchase order Development profiles and approval email

Creator Custom APIs run as `wbdevelopment` in Development View-as even when the
widget's authenticated initialization identifies a demo user. Live audit proved
Development + owner identity with Demo User 3's claimed User Access ID.

`managePurchaseOrder` and `handlePurchaseOrderApproval` accept that selected
existing User Access record only when the native environment is Development and
the native caller is the application owner. They still require a unique login
row and exact claimed ID. Edit grants, budget ownership, approver assignment,
submitter separation, phase locks and duplicate-send guards apply to the selected
actor. Native Added_User remains the real caller; operation Actor captures the
profile. Stage/Production and other callers retain strict authenticated identity.
`poActorResponse` projects approval display hints for the selected Dev actor
after successful authenticated calls. Receipt proofs remain actor-independent.

A denied Check/Wire report no longer hides independently authorized managed POs.
The Requests tab explicitly marks Check/Wire unavailable for that profile while
showing saved PO cards. Other read failures and denied PO APIs still fail closed.

Approval email comes from Notifications@wbdevelopment.com to only the captured
active approver. It summarizes phase, vendor, amount, dates, line count and budget
modifications, and links to the PO. Full details attach as a legitimate Excel
SpreadsheetML `.xls`, matching the native budget-export format, not XML renamed
as `.xlsx`. Title is 22pt high, summary rows 18pt, headers 20pt, ordinary rows
18pt with wrapping for long item names/descriptions. Exact IDs remain text,
amounts/quantity are numeric, dates are typed, the total uses SUM, and the first
seven rows freeze. Modification detail gets a second sheet only when needed.

Affected forms: Payment_Request, PO_Item, PO_Operation, PO_Phase_Lock,
Budget_Approvals, Approval_Route_Snapshot, User_Access, Vendors (existing fields).
No form or field additions. Backend publication requires the four functions:
managePurchaseOrder, handlePurchaseOrderApproval, poActorResponse (new),
sendPurchaseOrderEmail. Existing Manage_Purchase_Order/Manage_Purchase_Order_DEV
bindings remain. No security scope expansion.

Regression: both named Dev profiles saving a parent and two line children on
Carlile Hills; selected actor receipts; small Dev/Land Acq submission and CFO
decision; only Robby's captured email; no budget modifications; denied separate
report, non-permission failures, missing PO grant, native compile and workflow
state verification. Frontend checks execute real loader with denied report and
failed PO list independently, plus existing identity and stale-session cases.

Rollback frontend to 122.29.22. Restore the three pre-change native functions
from main a8d148aa; poActorResponse becomes unused. Do not replay submissions or
email notification after an ambiguous reply; retain read-only recovery.

## Native Development save evidence

Carlile Hills Phase 01 budget `4410926000005122080`, October 12, 2026:

| Profile | Actor | PO | Amount | Child IDs | Check receipt |
| --- | --- | --- | --- | --- | --- |
| Dev/Land Acq, demouser_3 | 4410926000004487016 | 4410926000005162026 | $35 | 4410926000005162028, 4410926000005162030 | verified |
| CFO, demouser_5 | 4410926000004579002 | 4410926000005162036 | $20 | 4410926000005162038, 4410926000005162040 | verified |

Both native saves and actor-scoped read-only Check returned `success:true`,
`writeState:verified`, exact parent/budget IDs and two distinct children.
Both remain Draft, with no reservation or modification. Development vendors
`4410926000005162018` (Site Services) and `4410926000005162020` (Materials)
were created for these tests. No Production data was changed by these tests.

Development has no existing PO policy/assignments. A new inactive Draft test
policy `4410926000005174032` captures CFO role `4410926000005174026`,
Demo User 5, Robby's email, this budget and maximum $55. Its existing native
test mode also permits self-approval within that scope; the planned test uses
Demo User 3 as submitter and Demo User 5 as approver. Publication is awaiting
action-time approval. Do not claim live approval/email delivery until that
test has completed.
