# PO draft editing and temporary test CFO — October 11, 2026

Robby authorized a Production PO test in Bluebonnet Crossing - Phase 01,
email only to `rbelliveau@wbdevelopment.com`, acting as the test CFO. He will
restore Julie as approver after testing and retains Creator promotion control.

## Frontend releases

Budget Manager 122.29.14 adds Edit PO / View PO to the phase Requests tab and
locks a saved editor until the exact PO Get finishes. Native Production testing
found that `All_Wire_Requests` has no exposed columns; its custom projection
returns “None of the fields supplied in the 'fields' key exist.” The successor
122.29.15 reads the scoped report with all fields and merges the authoritative
`Manage_Purchase_Order` List with the Vendors response by exact string IDs.
It does not read every PO's lines just to render Requests. Saved PO actions
continue to use Get and its exact phase/revision checks. Save refreshes Requests.

Settings Manager 1.4.5 adds an explicit PO-only Test CFO setting and Budget ID
to route Preview. Test CFO stores an optional `poTestCFO` object in the existing
`Approval_Policy.Steps_JSON`. It does not change shared `User_Access` emails,
grants, routing flags, role assignments or existing approval chains.

## Exact test configuration

- Workflow: Purchase Order; one active CFO / Always / enabled step.
- Policy rules: Self_Approval Deny; Duplicate_Person Reject.
- Test budget: `4410926000001671002` (Bluebonnet Crossing - Phase 01).
- Test person: `4410926000004465004` (Robby Belliveau / wbdevelopment).
- Test email: `rbelliveau@wbdevelopment.com`.
- Maximum test amount: `55.00`; no linked modification or budget-line overrun.
- Existing draft PO: `4410926000005159046`, amount `55.00`.

```json
{
  "budgetId": "4410926000001671002",
  "userAccessId": "4410926000004465004",
  "email": "rbelliveau@wbdevelopment.com",
  "allowSelfApproval": true,
  "maxAmount": "55.00"
}
```

Only application-owner configuration saves/publishes may store this setting.
The server and local preview require exact string IDs, a single valid email,
an existing login identity, one CFO step, a positive maximum at most $55, and
the exact budget/no-overrun context. A different budget, higher amount or
modification fails closed. Normal PO routes still exclude the submitter and
require distinct people. Test routes capture the entire exception in the
immutable snapshot; approval decisions read that verified evidence, never a
client-supplied permission flag. Test emails are marked `[PO TEST]`.

## Creator handoff

Save/compile these five existing functions in Development, then the user
promotes them through Stage to Production:

1. `resolveApprovalRoute`
2. `manageApprovalPolicies`
3. `poApprovalBundle`
4. `handlePurchaseOrderApproval`
5. `sendPurchaseOrderEmail`

Existing APIs `Manage_Approval_Policies` / `_DEV` and
`Manage_Purchase_Order` / `_DEV` retain their bindings. No new function, form,
field or API is introduced. A Pages deployment does not publish Creator code.
The test policy must remain Draft until all five functions reach Production.
After promotion, publish the policy, preview the exact $55 context, and require
exactly one CFO row for Robby/email before submitting the saved PO once.

The approval snapshot uses existing `Approval_Route_Snapshot.Context_JSON`,
`Route_JSON`, `Execution_JSON` and existing `Budget_Approvals` execution fields.
Final no-modification approval skips budget rollup writes; the test changes
only PO and its operation/lock/approval records plus PO routing configuration.

To restore normal CFO routing, end the test policy's effective window and start
the next policy version at the same boundary. The end must be later than the
test start; a test beginning today can end tomorrow at the earliest. Disable
Test CFO in the successor and configure Julie's existing active CFO assignment.
Publish the non-overlapping successor, then Preview using its effective date
because Preview resolves published policies. Existing captured test POs retain
their historical route.

## Verification and rollback

Focused regression covers native report blank rows, authoritative PO merge,
saved draft editing, status/permission handling, fresh save reloads, superseded
reads/Get replies, scoped test routing, rejected malformed test evidence, normal
self-approval denial, one recipient, and no unrelated budget writes. Required
gates are `npm run validate`, `npm run build:pages`, CI and Pages deployment,
plus the native Production screenshots recorded with this task.

Rollback frontend mappings to Budget Manager 122.29.13 and Settings Manager
1.4.4, then rebuild/deploy Pages. Creator rollback restores these five function
sources from commit 37f9ca8 in Development and promotes a new Creator version.
Do not delete historical PO/approval records or alter the permanent widget URLs.

## Native evidence status

Production draft Get succeeds with vendor 2-C Equipment, LLC and one $55 line
on C_CB01-4110-5. Its available budget is $103,950 with $103,895 remaining.
The initial Submit click was blocked before execution by automatic approval
review because no published PO routing policy existed and self-approval was
forbidden. No submission or email resulted from that attempt. The user then
explicitly authorized the scoped Test CFO behavior described above.

Creator promotion and actual email delivery must be recorded separately from
source tests and compile success. Never claim mailbox delivery from code tests.
