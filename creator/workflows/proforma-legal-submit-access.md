# Pro Forma completion and Legal submission (2026-09-30)

Creator changes are saved in **Development only**. The user will promote Creator; widget Production release is separate.

## Form and report

- `User_Access.Submit_to_Legal_Module`: Decision box, display name **Submit to Legal Module**, under **Proformas**, initial value unchecked, not mandatory. Live Development component ID `4410926000005008077`.
- `User_Access_Report`: include the new field in Quick View columns and Detail View. Existing user grants remain unchanged. Missing or false permission denies submission.
- The checked-in generated export predates this field. This verified live change record supplements it until the next Creator export; do not regenerate metadata from an old export.

## Functions and APIs

- `getUserAccess` returns `pfSubmitLegal`; `getUserAccessDev` delegates to it.
- `Create_LOI_Contract` checks the signed-in user's dedicated grant before any Writer merge, Contract, action, or version write. It also requires all existing PF approval rows Approved (parent Approved is accepted only when no rows exist), `Lock_Inputs=true`, not archived/not already LOI in Progress, and a purchasing company in the current LOI Worksheet. The existing shared `PF_Build_LOI_Document` merge and Contract creation implementation is retained; preflight runs before it. Development now uses that shared merge path, matching current main and Word export.
- `Submit_LOI_For_Legal_Approval` applies the same dedicated grant to the legacy submission entry point. `Review_LOI_Request` remains a downstream caller of `Create_LOI_Contract`; its caller also needs the dedicated grant when creating the Contract.
- `Handle_Proforma_Approval_Action` sends `Completed` to `Send_Proforma_Approval_Email_With_Context` only after every row is Approved and parent Status becomes Approved. A missing sort-order successor cannot finalize an incomplete route. A notification failure returns an explicit warning without undoing approval. Pending-status guards prevent repeated final decisions from sending duplicate notifications.
- `Send_Proforma_Approval_Email_With_Context` uses the existing navy email, summary, LOI context, sender, and PDF. Completion recipients are deduplicated approver addresses. The approver table lists role, email, approval status and response date. Its Open Pro Forma link targets `Proforma_Management1?proformaId=<id>&view=dashboard`. Completion preserves each original `Sent_Date`.
- Existing Custom API signatures are unchanged. No new Custom API is needed.

## Widget and verification

The Dashboard header and list menu share the same permission/eligibility predicate. Submission checks the grant again before confirmation and before the API call; the server checks authoritative access and record state. Submission uses the existing progress modal. Required LOI term gaps remain warnings with the existing confirmation. Request Purchasing Entity is removed from the three-dot menu.

Regression: granted user with eligible record; no grant or missing flag; partial approval; unlocked/archived/already submitted PF; missing buying entity; duplicate click; final approval with repeated recipient, missing recipient, or mail failure; next-approver and rejection routing. Tests use offline records and mail fixtures; no real approval, Legal submission, or email was executed for QA.

Rollback widget: map Development and Production to `1.80.45`. Creator rollback requires reverting the changed functions separately; retain the new field and current grants unless deliberately reversing the access policy.

## Owner permission split (1.80.48)

Retire User_Access.Owner_Edit_Send_Approvals from the form and report, and remove its flag from getUserAccess and the widget. Creator's Field References view showed no remaining dependencies after getUserAccess was updated. Field deletion remains subject to Zoho's irreversible-data-loss confirmation. The user confirmed only two super administrators held the retired grant and already hold the replacement grants; no User Access record assignments are migrated.

Edit_Owned_Proformas grants record editing, approval-route configuration, recipient changes, and Owner-list changes only while the signed-in user is already an owner. Existing dedicated owner-management and approval-administrator grants retain their scope. Ownership changes remain blocked while locked or approvals have started, including when submitted as part of a normal save. Removing oneself from the Owner list removes owned-record access on subsequent actions.

Send_Pro_Formas_for_Approvals remains a separate grant: the sender must own the PF or also have Edit All Proformas. The live Development Start_Proforma_Approval_Chain was read and verified to already enforce this rule; it does not reference the retired field. No approval-send grant is inferred from editing or ownership alone.

Additional changed Creator functions: getUserAccess, proforma_save (update_owners and normal-save preflight), Update_Proforma_Approval_Recipient, and Manage_Proforma_Approval_Config. Custom API signatures remain unchanged. Verify owner/non-owner, locked/approved/active-approval PFs, dedicated administrators, send-only users, spoofed userAccessId, and normal-save owner changes. Regression script: scripts/test-proforma-owner-permissions.mjs.
