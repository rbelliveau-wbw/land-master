
# Proforma Module

## Scope

Pro forma creation and editing, phases/months, additional costs, purchasing company, seller/property LOI data, Writer-generated LOI documents, comparison views, and approvals.

## Approval flow

Current intended single sequence:

```text
VP → Legal → CFO → COO
```

Approval configuration is editable through the Proforma widget, subject to permissions and active-chain protections.

## LOI fields

Important Proforma LOI fields include:

`Acquisition_Email`, `Amount_per_Acre`, `Amount_per_Extension`, `Authorized_Signer_for_Seller`, `Broker_Buyer`, `Broker_Seller`, `Buying_Entity`, `CAD_ID`, `Closing_Days_Feas`, `Days_per_Extension`, `Earnest_Money`, `Extensions`, `Initial_Feasibility_Days`, `Property_City`, `Property_County`, `Response_Date`, `Seller`, `Seller_City_State_ZIP`, `Seller_Email`, `Seller_Phone`, `Special_Provisions`, `Street_Address`, and `Total_Acres`.

Always verify against `creator/generated/fields/Add_Pro_Forma.json` before implementation.

## Writer template

Current known LOI Writer merge template ID:

```text
6kuqna9b27e6fe95b4f75a3920de1ff048543
```

Connection name: `zoho_writer`.

## Primary action

The `New Pro Forma` action is the visually prominent primary action in the portfolio toolbar. Preserve its icon, high-contrast treatment, keyboard focus state, and responsive behavior.
