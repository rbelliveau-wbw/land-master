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
Both were initially saved as Draft, with no reservation or modification. Development vendors
`4410926000005162018` (Site Services) and `4410926000005162020` (Materials)
were created for these tests. No Production data was changed by these tests.

The $35 PO was then submitted as Demo User 3 and approved as Demo User 5.
Submission revision `2627431a-c4ab-4fd1-a394-e7c6fac40318` has two current
children `4410926000005162046` and `4410926000005162048`; the original draft
children remain historical. Route snapshot `4410926000005162050` and approval
row `4410926000005162052` captured the CFO. Native `Sent_Date` confirmed one
notification to Robby's email on October 12. The final state is Approved with
Reserved commitment and zero budget modifications. The $20 PO remains Draft.
This verifies native sending, not independent inbox receipt or native Excel rendering.

## All-budget CFO configuration

Settings Manager 1.5.1 removes Test CFO, test budget and amount controls.
Editing/saving a policy strips the legacy override from a detached copy;
captured route snapshots and historical audit data keep their original values.
`manageApprovalPolicies` rejects new SavePolicy/Publish overrides, while legacy
interrupted Draft reconciliation remains supported. This is an additional
Creator function change beyond the four email/profile functions above.

Development policy `4410926000005174032` is Published for all companies,
territories and departments, with ordinary CFO role `4410926000005174026`
and global assignment `4410926000005174048` to Demo User 5. Its existing
User Access routing flag is enabled; no edit/approval grants changed.
Native Preview without any budget ID successfully routed a $5,000 PO to
rbelliveau@wbdevelopment.com. Normal self-approval denial applies; the old
test exception does not apply to future submissions. Modification approvers
remain configurable separately; this test policy contains only CFO.

Production policy `4410926000005148030` was saved Published for all companies,
territories and departments with its budget override removed. Global CFO
assignment `4410926000005162060` uses role `4410926000005148006` and Robby's
Production User Access record `4410926000004465004`. Existing approval/edit
grants remain unchanged. Routing is enabled and the approver email is now
rbelliveau@wbdevelopment.com (the old shared approval email was legal@).
These are environment-specific configuration records; publishing code does
not copy Development policy IDs into Production.

Regression includes ordinary global routing across companies and amounts,
rejection of new test overrides, preservation of captured routes and legacy
recovery, plus the native parent/children/email/decision test above.
Rollback Settings to 1.5.0 and restore manageApprovalPolicies from 288d7d0.
