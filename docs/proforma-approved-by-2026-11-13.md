# Pro Forma Packet Approval Header — November 13, 2026

The first-page identity band now shows **Approved By:** with two columns of
approval roles, assigned names and actual statuses, matching the approved mockup.
Approval text is 8.4 PDF points, matching the adjacent date/status metadata.
Names resolve from User_Access.Full_Name using Approver_Email or User; unmatched
addresses remain visible as email addresses. Approved is mint, Rejected is pale
red, and other statuses are pale blue. Route order remains Sort_Order.

Six entries fit in the header. Long identities and additional route entries are
preserved in the Owners And Approval Details continuation pages. Owner wrapping
and project-title truncation keep the two header areas separate. A completed
packet labels its current step Fully Approved.

## Delivery

The existing Handle_Proforma_Approval_Action completion path was inspected in
Creator Development. After every route row is Approved, it sets the parent to
Approved and calls Send_Proforma_Approval_Email_With_Context with Completed.
That helper requires every row to be approved with an address, deduplicates
addresses without regard to case, and sends the newly generated PDF to every
approver, including the final approver. It omits approval/denial action links.
Mail failure produces a notification warning without reversing final approval;
replaying a completed decision cannot resend it. No routing/email changes were
needed. No real approval was changed or completion email sent for testing.

## Deployment And Scope

Only PF_Build_Proforma_Approval_PDF requires a Creator update. The download API
Get_Proforma_Approval_PDF and approval email helper reuse it. No fields, forms,
Custom API registrations or widget assets change; no widget release/mapping is
required. Existing Add_Pro_Forma, Budget_Approvals and User_Access are read only.

Creator Development had newer PDF presentation than the repository mirror before
this change. The live edit inserts only this header feature and preserves that
incumbent formatting; do not replace the complete live builder from the older
repository mirror. The checked-in diff records the feature and matching identity
header layout without importing unrelated live layout work.

## Validation And Rollback

Focused actual-source fixture checks cover two-column coordinates, size, names,
real statuses, parent scope, long names and routes. Existing completion-email
checks cover all recipients, deduplication, final approver inclusion, attachment,
incomplete routes, send failures and duplicate-send prevention. Full repository
validation, Pages build, PDF rendering and Creator compilation are required.
Greptile is unavailable because the pinned CLI is signed out.

Rollback: restore the previous builder from Creator Production **9.195**, or
reverse only this feature's inserted approval block and identity-header changes.
Keep the completion-email functions and existing newer live PDF styling intact.
