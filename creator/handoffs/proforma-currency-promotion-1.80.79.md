# Pro Forma currency promotion — 1.80.79

Widget promotion is authorized. Creator promotion is intentionally left to the user.
No native schema or function edits were performed for this release.

## Read-only native inspection on October 5

Production inspection of the Taylor Farms installment through its native
report, detail view and edit form confirmed Amount is `12500109.9`, while the
widget draft contains `12500109.92`. No record was updated. The Development form
builder currently shows `Land_Installments.Cost` (Amount) as USD with **Max
Digits 10 / Decimal Points 2**. Production field properties were not independently
read from a Production schema snapshot.

The native Development `proforma_save` function was read without saving or
executing it. All three installment insertions use `.toDecimal()` without
whole-dollar rounding. Its `Construction_Cost_Base` assignment still contains
`.round(0)`, so the repository correction below has not been applied there yet.

[Zoho's Deluge insertion contract](https://www.zoho.com/deluge/help/data-access/add-record.html)
states that Currency and Decimal insertions trim excess digits from the right
when Max Digits or Decimal Points is exceeded.
[Max Digits includes the separator and negative sign](https://help.zoho.com/portal/en/kb/creator/developer-guide/forms/add-and-manage-fields/articles/fields-currency-understand).
`12500109.92` needs 11 characters; trimming it to 10 yields `12500109.9`, exactly
the observed saved value. This is a verified capacity defect in Development and
a mechanism consistent with the Production loss. A native save/read test after
the capacity change is still required before claiming repair.

The green balance label compares the editable draft, which reconciles a
sub-dollar remainder on load; it cannot certify native persistence. The next
widget release labels that result "Draft installments match" explicitly.
Never reduce the draft to `.90` or widen verification to accept the lost cents.
See the [all-module native inventory](../../docs/systemic-currency-native-handoff-2026-10-05.md)
for the remaining financial destinations.

## Required Creator changes

1. In the existing proforma_save function, replace only this assignment:

```deluge
pf.Construction_Cost_Base=header.get("Construction_Cost_Base").toDecimal().round(0);
```

with:

```deluge
pf.Construction_Cost_Base=header.get("Construction_Cost_Base").toDecimal();
```

The repository function already contains the replacement. Do not replace a newer
native function wholesale; preserve all unrelated code and existing Save_PF routes.

2. Expand the fields listed below. Max Digits includes the decimal separator and negative sign, so
large values need room for both the integer and fractional parts. Use Max Digits
16; keep any existing greater decimal precision. Computed header totals retain at
least 2 decimal places; entered amounts/rates and monthly allocations retain at
least 6. Never shrink an existing field or round stored values to make them fit.

The checklist is complete for the ordinary financial save: header, installments,
items, lot pricing, curve percentages, phases and monthly amounts. It uses the
widget field contract and includes existing phase-sales v2 fields. Verify native
properties before promotion; historical exports omit defaults and newer fields.

### Add_Pro_Forma

| Field | Max Digits | Minimum Decimal Points |
| --- | ---: | ---: |
| Total_Acres | 16 | 6 |
| Land_Cost_Acre | 16 | 6 |
| Sale_Price_FF | 16 | 6 |
| Engineering_Cost_Lot | 16 | 6 |
| Const_Cost_FF | 16 | 6 |
| Lot_Size_Ft | 16 | 6 |
| Land_Cost | 16 | 2 |
| Land_Sale | 16 | 6 |
| ROI1 | 16 | 2 |
| IRR | 16 | 2 |
| XIRR | 16 | 2 |
| Est_Lots_per_Acre | 16 | 2 |
| Ft_St_per_Lot | 16 | 2 |
| Earnest_Money | 16 | 6 |
| Amount_per_Extension | 16 | 6 |
| Gross_Sales | 16 | 2 |
| MUD_Revenue | 16 | 2 |
| Reimbursements | 16 | 2 |
| Reimbursed_Fees | 16 | 2 |
| Total_Income | 16 | 2 |
| Entitlement_Cost | 16 | 2 |
| Entitlement_Engineering_Addl | 16 | 2 |
| Construction_Cost_Base | 16 | 2 |
| Construction_Cost_Addl | 16 | 2 |
| Total_Expenses | 16 | 2 |
| Net_Profit | 16 | 2 |
| Overhead | 16 | 6 |
| Engineering_Overhead | 16 | 6 |
| Construction_Overhead | 16 | 6 |
| Interest | 16 | 6 |
| Profit_Share | 16 | 6 |
| Overhead_Total | 16 | 2 |
| Engineering_Overhead_Total | 16 | 2 |
| Construction_Overhead_Total | 16 | 2 |
| Interest_Total | 16 | 2 |
| Profit_Share_Total | 16 | 2 |

### Land_Installments

| Field | Max Digits | Minimum Decimal Points |
| --- | ---: | ---: |
| Percent1 | 16 | 6 |
| Cost | 16 | 6 |

### Proforma_Item

| Field | Max Digits | Minimum Decimal Points |
| --- | ---: | ---: |
| Add_l_Cost | 16 | 6 |
| Per_Unit | 16 | 6 |

### Construction_Curve

| Field | Max Digits | Minimum Decimal Points |
| --- | ---: | ---: |
| Percent_Cost | 16 | 6 |

### Lot_Mix_Row

| Field | Max Digits | Minimum Decimal Points |
| --- | ---: | ---: |
| Lot_Size_Ft | 16 | 6 |
| Price_LF | 16 | 6 |

### Proforma_Months

| Field | Max Digits | Minimum Decimal Points |
| --- | ---: | ---: |
| Land_Cost | 16 | 6 |
| Land_Sale | 16 | 6 |
| Finished_Lot_Sales | 16 | 6 |
| Construction_Cost_Base | 16 | 6 |
| Construction_Cost_Addl | 16 | 6 |
| Entitlement_Engineering | 16 | 6 |
| Entitlement_Engineering_Addl | 16 | 6 |
| PID_MUD_Revenue | 16 | 6 |
| Reimbursements | 16 | 6 |
| Reimbursed_Fees | 16 | 6 |
| Cash_Flow | 16 | 6 |
| Cash_Flow_with_Overhead | 16 | 6 |
| Cash_Flow_with_Interest | 16 | 6 |
| Running_Cash_Flow | 16 | 6 |
| Running_Cash_Flow_with_Interest | 16 | 6 |
| Engineering_Overhead | 16 | 6 |
| Construction_Overhead | 16 | 6 |
| Overhead_Cost | 16 | 6 |
| Interest | 16 | 6 |
| Profit_Share | 16 | 6 |
| Base_Lot_Sales | 16 | 6 |
| Additional_Markup_Income | 16 | 6 |
| Escalator_Interest_Accrued | 16 | 6 |
| Escalator_Percentage | 16 | 6 |
| Escalator_Applied_Pct | 16 | 6 |

### Proforma_Phase

| Field | Max Digits | Minimum Decimal Points |
| --- | ---: | ---: |
| Acres | 16 | 6 |
| Annual_Escalator_Pct | 16 | 6 |
| Additional_Markup_Pct | 16 | 6 |

## Why both incidents occur

The first screenshot names header Land_Cost. The second names Land_Installments.Cost.
A successful API write can be followed by exact readback failure if a destination
field loses precision. Expanding only the parent leaves installments, items or
monthly fields exposed. Read-only native inspection now verifies insufficient
capacity for this amount in Development, and the documented Deluge trimming
mechanism matches the observed Production loss. Production properties and a
live repair remain unverified. The widget retains drafts and prevents blind replay.

## Verification after promotion

Use a disposable Development record before promoting to Production:

- Save 236.44 acres × 52868/acre and verify header and purchase installment
  12500109.92, including cents. Verify all purchase, sale and PID/MUD receipts.
- Include amount 13456789.876543, unit rate 12.345678 and an additional cost
  with cents. Check the stored child fields and the rebuilt monthly schedule.
- Verify monthly Finished_Lot_Sales, Construction_Cost_Base and
  Entitlement_Engineering retain cents, including credits and cumulative flows.
- Save one additional-cost edit, reload and confirm every intended value; verify
  no repeated send, no retained review and automatic successful modal dismissal.

Changing capacity does not repair values already rounded. Review the retained
draft against the saved record before any real-record resave. Never derive lost
amounts from rounded display totals.

## Widget change, tests and rollback

1.80.79 shows currency cents, removes the whole-dollar monthly repair, limits
integer rounding to true counts, and retains expected/saved values for every
numeric header or custom-save child mismatch. Exact checks and no-replay guards
remain enforced. No new Creator forms, fields, functions or APIs are introduced.

scripts/test-proforma-currency-audit.mjs covers 71 checklist fields, 29 distinct
precision-loss cases, full formatted decimal saves in both transport contexts,
all existing monthly monetary payloads and positive/negative display cents.
The existing complete Save, phase, native lot-mix and financial preservation
regressions remain required. Native verification belongs to the user promotion.

Rollback frontend to 1.80.77 if required. Keep expanded Creator capacity and
the decimal backend assignment; do not shrink fields after precise values save.

## Creator reference

Capacity and decimal behavior follow the official [Max Digits documentation](https://help.zoho.com/portal/en/kb/creator/developer-guide/forms/add-and-manage-fields/articles/understand-max-digits) and [Decimal Points documentation](https://help.zoho.com/portal/en/kb/creator/developer-guide/forms/add-and-manage-fields/articles/set-decimal-points).

The [machine-readable checklist](proforma-currency-capacity-1.80.79.json) contains every field above.
