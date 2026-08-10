
# Proforma Module

## Scope

Pro forma creation and editing, phases/months, additional costs, purchasing company, seller/property LOI data, Writer-generated LOI documents, comparison views, and approvals.

## Approval flow

Current intended single sequence:

```text
VP → Legal → CFO → COO
```

Approval configuration is editable through the Proforma widget, subject to permissions and active-chain protections.

Pro Forma approval access is independent from Budget approval access:

- `Edit_All_Pro_Forma_Approvals` shows the Approvals navigation and editor tab, allows action on every Pro Forma approval row, and allows inactive-route configuration and flow cancellation.
- `Edit_Owned_Pro_Forma_Approvals` shows the Approvals navigation and editor tab, but allows approval actions only when the row's approver email matches the signed-in user's email (using the same full-email/username normalization as Budget approvals).
- Users with neither field do not see Pro Forma approval navigation, dashboard/list approval routes, or the editor Approvals tab, and direct approval routes/actions are blocked.
- Budget fields `Edit_All_Approvals` and `Edit_Owned_Approvals` do not grant Pro Forma approval access.

These two fields were added live after the currently committed Creator export. Refresh the `.ds` export to regenerate `creator/generated/fields/User_Access.json`; do not treat the older generated file as evidence that the live fields are absent.

Approval lock rules:

- Starting an approval flow locks the Pro Forma inputs.
- While any approval step has started, the Pro Forma cannot be unlocked; the approval flow must be cancelled first.
- Once every approval step is approved (or the Pro Forma lifecycle status is `Approved`), the Pro Forma is permanently locked and read-only.
- Cancelling an in-progress approval flow resets every approval row to `Not Sent` and restores the normal lock control.
- The LOI Worksheet remains editable under a manual input lock, but becomes read-only as soon as the approval flow starts. Its privileged save operation enforces the same rule server-side.
- `Submit LOI to Legal` is shown only after every approval step is approved, inside the Pro Forma row's three-dot action menu.

## LOI fields

Important Proforma LOI fields include:

`Acquisition_Email`, `Amount_per_Acre`, `Amount_per_Extension`, `Authorized_Signer_for_Seller`, `Broker_Buyer`, `Broker_Seller`, `Buying_Entity`, `CAD_ID`, `Closing_Days_Feas`, `Days_per_Extension`, `Earnest_Money`, `Extensions`, `Initial_Feasibility_Days`, `Property_City`, `Property_County`, `Response_Date`, `Seller`, `Seller_City_State_ZIP`, `Seller_Email`, `Seller_Phone`, `Special_Provisions`, `Street_Address`, and `Total_Acres`.

Always verify against `creator/generated/fields/Add_Pro_Forma.json` before implementation.

## Numeric precision

`Add_Pro_Forma.Land_Cost_Acre` is a whole-dollar Creator currency field. The widget normalizes it to zero decimal places before calculation and save, then rescales purchase installments to the resulting land cost. `proforma_save` also applies `.round(0)` as a server-side safeguard. This prevents Creator error `3002` during the workflow-triggering header update.

## Writer template

Current known LOI Writer merge template ID:

```text
6kuqna9b27e6fe95b4f75a3920de1ff048543
```

Connection name: `zoho_writer`.

## Primary action

The `New Pro Forma` action is the visually prominent primary action in the portfolio toolbar. Preserve its icon, high-contrast treatment, keyboard focus state, and responsive behavior.

## Attachments

Pro Forma attachments use one `Contract_Version` record per file, matching the Budget attachment pattern:

- parent lookup: `Pro_Forma` (the `Add_Pro_Forma` record ID)
- child report: `All_Contract_Versions`
- file field: `File_field1`
- create API/function: `Create_Proforma_Attachment_Record` / `createProformaAttachmentRecord`
- delete API/function: `Delete_Proforma_Attachment` / `deleteProformaAttachment`
- preview API/function: `Get_Proforma_Attachment_Preview` / `getProformaAttachmentPreview`

The widget exposes the attachment workspace from both Dashboard and Edit. It supports multiple-file upload, embedded PDF/image/text/media preview, download, and delete, subject to ordinary Pro Forma edit permissions. The persistent `Pro Forma List` action is the canonical route back to the portfolio.

The current committed Creator export predates the live `Contract_Version.Pro_Forma` field. Do not add it manually to `creator/generated/`; refresh the `.ds` export after the live Creator configuration is published.
