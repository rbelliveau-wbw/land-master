# Payment request and vendor metadata

Read from live Creator on 2026-10-06. This focused record supersedes the older
export's missing Payment Request/Vendor names for this frontend flow.

- Form `Payment_Request`, report `All_Wire_Requests`; the Production report is
  available and was empty at inspection.
- `Request_Type`: required Drop Down, choices `Check`, `Wire`, `Purchase Order`.
- `Request_Date`, `Date_Needed`: required Date fields.
- `Budget`: required Add Budget lookup; `Budget_Item`: required Budget Item lookup.
- `Department`: Drop Down, derived from selected item.
- `Accounting_Project_Code`: required lookup; `Element`: text, Development 5;
  `Final_Accounting_Code`: text.
- `Request_Amount`: required USD Currency.
- The complete live form builder has no Vendor lookup, paid/closed status,
  remaining amount, or payment linkage field. No field was added or changed.
- Form `Vendors`, report `All_Vendors` are available in Production.
- `Vendor_Name` is required; `Contact_Name` and `Primary_Phone` are optional.
  Other existing native vendor fields remain owned by the Vendors form.

The request mock remains preview-only. Selecting a vendor does not create or
submit a Payment Request. Add Vendor opens the existing native Vendors form in
the authenticated runtime's environment; Refresh Vendors reloads the full
counted report and preserves the request draft.

Issued PO commitment comes from `All_Wire_Requests` filtered by the exact
`Budget`, `Budget_Item`, and `Request_Type == "Purchase Order"` as requested by
the owner. On 2026-10-06 the owner approved counting every PO's full
`Request_Amount`, irrespective of paid status. Revised Final minus POs Issued is
Available Budget; subtract the new request from that amount. GP Actuals are
reference-only, avoiding a second deduction of invoiced PO amounts. No
paid/closed field or inferred unpaid balance is needed. Permission, count,
projection and malformed amount failures remain unavailable and block preview.
