# PO Rejection Review And Email Validation

Budget Manager candidate **122.29.131** reloads the saved PO when Review PO
returns from a rejected approval decision. Existing Get and Balances readers
restore saved reallocation amounts, reasons and reservations before enabling
Save Draft / Resubmit PO. Read failures retain Unavailable / Retry. No decision,
notification or other write is replayed.

Production PO `4410926000005902060` was inspected read-only in the agent-owned
browser. Reopening Edit PO restored its saved Valley Gutter reason and enabled
both Save Draft and Resubmit PO. No records were changed or emails retried.

Both PO mail functions used a whitespace-escaped regex that can exclude the
literal `s` in native Deluge. Samuel's valid address failed while Julie's passed.
The functions now reuse the explicit character-class validator already used by
buildConstructionRejectionNotification and buildContractCommentNotification.
Contact lookups, immutable plans, attempt history, deduplication and unknown-send
protection remain. Missing Territory Construction PM configuration is separate;
this fix does not assign contacts automatically.

## Changes And Deployment

Changed sources: po-ui.js; sendPurchaseOrderEmail.dg;
sendPurchaseOrderOutcomeEmail.dg; existing UI/backend regressions; widget version,
immutable release and Development mapping; Budget and approval-progress guides.
No forms, fields or Custom API registrations change. Existing
Manage_Purchase_Order and Handle_Purchase_Order_Approval contracts remain.

The button fix needs the widget release. Email validation requires saving and
publishing both changed functions in Creator. Production is not promoted by
this task. Native compilation and inbox delivery remain unverified; no live
email-send test was performed.

## Regression And Rollback

Actual-source tests cover a rejected mixed increase/decrease with reserved PO
spend, missing decision-response plan, restored persisted reason, both buttons
enabled and explicit resubmission retaining amounts/reason. Restoration calls
only Get and Balances. Email regressions require the native-proven validator,
cover the configured addresses and malformed inputs, and run the existing
outcome/request, duplicate-send and retry checks.

Verification passed: focused PO reallocation UI/save and outcome-email backend
regressions, full `npm run validate` (using bundled Python),
`npm run build:pages`, and `git diff --check`.

Rollback the widget mapping to **122.29.130** and rebuild Pages. Restore the two
mail functions from the prior commit independently; retain Activity Log history,
recipient selections and duplicate-send claims.
