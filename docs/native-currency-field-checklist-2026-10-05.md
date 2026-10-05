# Native Creator financial field checklist — October 5, 2026

All native edits and promotion belong to the user. Check live properties before applying these recommendations. This is the full 230-field list, including downstream totals; it does not claim every field is currently too narrow.

Use Max Digits 19 for verified financial numeric destinations; increase capacity only. Retain existing higher decimal precision. Minimum places below are floors, not instructions to reduce a field. A blank/unknown historical property is not a default. For unverified newer field types, confirm the existing field and numeric type first; do not create fields.

The priority incident is `Land_Installments.Cost`: Development currently has Max Digits 10 / Decimal Points 2, while `12500109.92` needs 11 characters. Production stored `12500109.9`. Follow the [investigation, targeted function change and native tests](systemic-currency-native-handoff-2026-10-05.md). The older PF-only checklist is superseded by this broader capacity review.

## Add_Budget

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Acres` | decimal | Unknown — check live | 6 |
| `Add_l_Grand_Total` | USD | Unknown — check live | 6 |
| `Budget_Grand_Total` | USD | Unknown — check live | 6 |
| `Const_Cost_to_Date` | USD | Unknown — check live | 6 |
| `Construction_Cost` | USD | Unknown — check live | 6 |
| `Development_Direct_Costs` | USD | Unknown — check live | 6 |
| `Engineering_Costs` | USD | Unknown — check live | 6 |
| `Equiv_LF_of_Street` | decimal | Unknown — check live | 6 |
| `Land_Cost` | USD | Unknown — check live | 6 |
| `LI_Land_Cost` | USD | Unknown — check live | 6 |
| `Lot_Price` | USD | Unknown — check live | 6 |
| `Other_Revenue` | USD | Unknown — check live | 6 |
| `Prelim_Budget_Grand_Total` | USD | Unknown — check live | 6 |
| `Subcontract_Construction_Cost` | USD | Unknown — check live | 6 |
| `Subcontract_Engineering_Costs` | USD | Unknown — check live | 6 |
| `Unapproved_Final_Budget_Grand_Total` | USD | Unknown — check live | 6 |

## Add_Pro_Forma

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Amount_per_Extension` | USD | Unknown — check live | 6 |
| `Const_Cost_FF` | USD | Unknown — check live | 6 |
| `Construction_Cost_Addl` | USD | Unknown — check live | 6 |
| `Construction_Cost_Base` | USD | Unknown — check live | 6 |
| `Construction_Overhead` | percentage | Unknown — check live | 6 |
| `Construction_Overhead_Total` | USD | Unknown — check live | 6 |
| `Earnest_Money` | USD | Unknown — check live | 6 |
| `Engineering_Cost_Lot` | USD | Unknown — check live | 6 |
| `Engineering_Overhead` | percentage | Unknown — check live | 6 |
| `Engineering_Overhead_Total` | USD | Unknown — check live | 6 |
| `Entitlement_Cost` | USD | Unknown — check live | 6 |
| `Entitlement_Engineering_Addl` | USD | Unknown — check live | 6 |
| `Est_Lots_per_Acre` | decimal | Unknown — check live | 6 |
| `Ft_St_per_Lot` | decimal | Unknown — check live | 6 |
| `Gross_Sales` | USD | 12 / unknown (historical export) | 6 |
| `Interest` | percentage | Unknown — check live | 6 |
| `Interest_Total` | USD | Unknown — check live | 6 |
| `IRR` | percentage | Unknown — check live | 6 |
| `Land_Cost` | USD | Unknown — check live | 6 |
| `Land_Cost_Acre` | USD | Unknown — check live | 6 |
| `Land_Sale` | USD | Unknown — check live | 6 |
| `Lot_Size_Ft` | decimal | Unknown — check live | 6 |
| `MUD_Revenue` | USD | Unknown — check live | 6 |
| `Net_Profit` | USD | 12 / unknown (historical export) | 6 |
| `Overhead` | percentage | Unknown — check live | 6 |
| `Overhead_Total` | USD | Unknown — check live | 6 |
| `Profit_Share` | percentage | Unknown — check live | 6 |
| `Profit_Share_Total` | USD | Unknown — check live | 6 |
| `Reimbursed_Fees` | USD | 12 / unknown (historical export) | 6 |
| `Reimbursements` | USD | Unknown — check live | 6 |
| `ROI1` | percentage | Unknown — check live | 6 |
| `Sale_Price_FF` | USD | Unknown — check live | 6 |
| `Total_Acres` | decimal | 5 / unknown (historical export) | 6 |
| `Total_Expenses` | USD | 12 / unknown (historical export) | 6 |
| `Total_Income` | USD | 12 / unknown (historical export) | 6 |
| `XIRR` | percentage | Unknown — check live | 6 |

## Additional_Items

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Amount` | USD | Unknown — check live | 6 |
| `Total` | USD | Unknown — check live | 6 |

## Budget_Category

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Acres` | decimal | Unknown — check live | 6 |
| `Actual_Total` | USD | Unknown — check live | 6 |
| `Add_l_Cost_Total` | USD | Unknown — check live | 6 |
| `Budget_Total` | USD | Unknown — check live | 6 |
| `Equiv_LF_of_Street` | decimal | Unknown — check live | 6 |
| `Prelim_Budget_Total` | USD | Unknown — check live | 6 |
| `Unapproved_Final_Budget_Total` | USD | Unknown — check live | 6 |

## Budget_Import_Item

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Cost` | USD | 14 / 4 (historical export) | 6 |
| `Cost_to_Complete` | USD | Unknown — check live | 6 |
| `Percent_Complete` | percentage | 16 / 15 (historical export) | 15 |

## Budget_Item

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Add_l_Cost` | USD | Unknown — check live | 6 |
| `Budget_Ttl` | USD | 16 / unknown (historical export) | 6 |
| `Cost_to_Complete` | USD | Unknown — check live | 6 |
| `HCSS_Actuals` | USD | Unknown — check live | 6 |
| `Per_Unit` | Unverified — check existing field | Unknown — check live | 6 |
| `Percent_Complete` | percentage | unknown / 0 (historical export) | 0 |
| `Prelim_Budget_Ttl` | USD | 16 / unknown (historical export) | 6 |
| `PROJ_Actual` | USD | Unknown — check live | 6 |
| `Unapproved_Final_Budget_Ttl` | USD | Unknown — check live | 6 |

## Budget_Modification

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Amount` | Unverified — check existing field | Unknown — check live | 6 |

## Budget_Months

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Admin_Cost` | USD | Unknown — check live | 6 |
| `Budget_Cost` | USD | Unknown — check live | 6 |
| `Carry_Charge` | USD | Unknown — check live | 6 |
| `Cash_Flow` | USD | Unknown — check live | 6 |
| `Construction_Cost` | USD | Unknown — check live | 6 |
| `Cost_to_Date` | USD | Unknown — check live | 6 |
| `Development_Cost` | USD | Unknown — check live | 6 |
| `Engineering_Cost` | USD | Unknown — check live | 6 |
| `Final_Cost` | USD | Unknown — check live | 6 |
| `Land_Cost` | USD | Unknown — check live | 6 |
| `Other_Revenue` | USD | Unknown — check live | 6 |
| `Points` | USD | Unknown — check live | 6 |
| `Profit` | USD | Unknown — check live | 6 |
| `Profit_Share` | USD | Unknown — check live | 6 |
| `Revenue` | USD | Unknown — check live | 6 |
| `Subcontract_Construction_Cost` | USD | Unknown — check live | 6 |
| `Subcontract_Engineering_Cost` | USD | Unknown — check live | 6 |
| `Total_Cost` | USD | Unknown — check live | 6 |

## Builder_Takedown

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Additional_Fees_Per_Lot` | USD | Unknown — check live | 6 |
| `Addl_Fees_Subtotal` | USD | Unknown — check live | 6 |
| `Base_Price_Subtotal` | USD | Unknown — check live | 6 |
| `Builder_Tax_Subtotal` | USD | Unknown — check live | 6 |
| `Earnest_Money_Total` | USD | Unknown — check live | 6 |
| `Interest_Rate_1` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_10` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_11` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_12` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_2` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_3` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_4` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_5` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_6` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_71` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_8` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_9` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Subtotal` | USD | Unknown — check live | 6 |
| `Percent_of_Appraisal` | percentage | unknown / 6 (historical export) | 6 |
| `Tax_Per_Lot` | USD | Unknown — check live | 6 |
| `Total` | USD | Unknown — check live | 6 |
| `Total_Tax_Subtotal` | USD | Unknown — check live | 6 |
| `Total_w_Additional` | USD | Unknown — check live | 6 |
| `WBW_Tax_Subtotal` | USD | Unknown — check live | 6 |

## Construction_Curve

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Percent_Cost` | percentage | unknown / 3 (historical export) | 6 |

## Contract

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Earnest_Money` | USD | Unknown — check live | 6 |
| `Earnest_Money_Per_Lot` | USD | Unknown — check live | 6 |
| `Total_Contract_Price` | USD | Unknown — check live | 6 |

## Contract_Pricing

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Base_Price` | USD | Unknown — check live | 6 |
| `Price_per_Ft` | USD | Unknown — check live | 6 |

## Land_Installments

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Cost` | USD | 10 / 2 (Development live) | 6 |
| `Percent1` | percentage | 5 / unknown (historical export) | 6 |

## LOI_Worksheet

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Amount_Per_Acre` | decimal | Unknown — check live | 6 |
| `Amount_Per_Extension` | decimal | Unknown — check live | 6 |
| `Earnest_Money` | decimal | Unknown — check live | 6 |
| `Estimated_Price` | decimal | Unknown — check live | 6 |
| `Total_Acres` | decimal | Unknown — check live | 6 |

## Lot_Mix_Row

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Lot_Size_Ft` | Unverified — check existing field | Unknown — check live | 6 |
| `Price_LF` | Unverified — check existing field | Unknown — check live | 6 |

## Lots

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Additional_Fees` | USD | Unknown — check live | 6 |
| `Additional_Tax` | USD | Unknown — check live | 6 |
| `Appraised_Value` | USD | Unknown — check live | 6 |
| `Base_Price` | USD | Unknown — check live | 6 |
| `Builder_Tax` | USD | Unknown — check live | 6 |
| `Earnest_Money` | USD | Unknown — check live | 6 |
| `Escalator` | percentage | unknown / 6 (historical export) | 6 |
| `Interest1` | USD | Unknown — check live | 6 |
| `Total` | USD | Unknown — check live | 6 |
| `Total_Tax` | USD | Unknown — check live | 6 |
| `WBW_Tax` | USD | Unknown — check live | 6 |

## Proforma_Item

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Add_l_Cost` | USD | Unknown — check live | 6 |
| `Per_Unit` | Unverified — check existing field | Unknown — check live | 6 |

## Proforma_Months

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Additional_Markup_Income` | Unverified — check existing field | Unknown — check live | 6 |
| `Base_Lot_Sales` | Unverified — check existing field | Unknown — check live | 6 |
| `Cash_Flow` | USD | Unknown — check live | 6 |
| `Cash_Flow_with_Interest` | USD | Unknown — check live | 6 |
| `Cash_Flow_with_Overhead` | USD | Unknown — check live | 6 |
| `Construction_Cost_Addl` | USD | Unknown — check live | 6 |
| `Construction_Cost_Base` | USD | unknown / 6 (historical export) | 6 |
| `Construction_Overhead` | USD | Unknown — check live | 6 |
| `Engineering_Overhead` | USD | Unknown — check live | 6 |
| `Entitlement_Engineering` | USD | unknown / 6 (historical export) | 6 |
| `Entitlement_Engineering_Addl` | USD | unknown / 6 (historical export) | 6 |
| `Escalator_Applied_Pct` | Unverified — check existing field | Unknown — check live | 6 |
| `Escalator_Interest_Accrued` | Unverified — check existing field | Unknown — check live | 6 |
| `Escalator_Percentage` | Unverified — check existing field | Unknown — check live | 6 |
| `Finished_Lot_Sales` | USD | Unknown — check live | 6 |
| `Interest` | USD | Unknown — check live | 6 |
| `Land_Cost` | USD | Unknown — check live | 6 |
| `Land_Sale` | USD | Unknown — check live | 6 |
| `Overhead_Cost` | USD | Unknown — check live | 6 |
| `PID_MUD_Revenue` | USD | Unknown — check live | 6 |
| `Profit_Share` | USD | Unknown — check live | 6 |
| `Reimbursed_Fees` | USD | Unknown — check live | 6 |
| `Reimbursements` | USD | Unknown — check live | 6 |
| `Running_Cash_Flow` | USD | Unknown — check live | 6 |
| `Running_Cash_Flow_with_Interest` | USD | Unknown — check live | 6 |

## Proforma_Phase

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Acres` | decimal | Unknown — check live | 6 |
| `Additional_Markup_Pct` | Unverified — check existing field | Unknown — check live | 6 |
| `Annual_Escalator_Pct` | Unverified — check existing field | Unknown — check live | 6 |

## Property

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Acres` | decimal | 16 / 4 (historical export) | 6 |
| `Construction_Acres` | decimal | unknown / 4 (historical export) | 6 |
| `cost_per_acre_FT` | USD | 16 / 15 (historical export) | 15 |
| `Original_Acres` | decimal | 16 / 4 (historical export) | 6 |
| `Purchase_Price` | USD | Unknown — check live | 6 |

## Settings

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Admin_Cost` | percentage | 3 / unknown (historical export) | 6 |
| `Capital_Cost` | percentage | 3 / unknown (historical export) | 6 |
| `Construction_Markup` | percentage | 3 / unknown (historical export) | 6 |
| `Construction_Sub_Markup` | percentage | 3 / unknown (historical export) | 6 |
| `COO_Approval_Threshold` | Unverified — check existing field | Unknown — check live | 2 |
| `Engineering_Markup` | percentage | 3 / unknown (historical export) | 6 |
| `Engineering_Sub_Markup` | percentage | 3 / unknown (historical export) | 6 |
| `Points` | percentage | 3 / unknown (historical export) | 6 |
| `Profit_Share` | percentage | 3 / unknown (historical export) | 6 |

## Subdivision

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Acres` | decimal | Unknown — check live | 6 |
| `Admin_Cost` | percentage | Unknown — check live | 6 |
| `Capital_Cost` | percentage | Unknown — check live | 6 |
| `Construction_Markup` | percentage | Unknown — check live | 6 |
| `Construction_Sub_Markup` | percentage | Unknown — check live | 6 |
| `Engineering_Markup` | percentage | Unknown — check live | 6 |
| `Engineering_Sub_Markup` | percentage | Unknown — check live | 6 |
| `Equiv_LF_of_Street` | decimal | Unknown — check live | 6 |
| `Points` | percentage | Unknown — check live | 6 |
| `Profit_Share` | percentage | Unknown — check live | 6 |

## Takedown_Template

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Additional_Fee` | USD | Unknown — check live | 6 |
| `Interest_Rate_1` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_10` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_11` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_12` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_2` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_3` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_4` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_5` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_6` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_7` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_8` | percentage | unknown / 6 (historical export) | 6 |
| `Interest_Rate_9` | percentage | unknown / 6 (historical export) | 6 |
| `Percent_of_Appraisal` | percentage | unknown / 6 (historical export) | 6 |
| `Tax_Per_Lot` | USD | Unknown — check live | 6 |

## Tax_Parcel_Year

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Acres` | decimal | unknown / 4 (historical export) | 6 |
| `Appraised_Value` | USD | Unknown — check live | 6 |
| `Arbitration_Value` | USD | Unknown — check live | 6 |
| `Assessed_Final` | Unverified — check existing field | Unknown — check live | 6 |
| `Assessed_Offer` | Unverified — check existing field | Unknown — check live | 6 |
| `Assessed_Value` | USD | Unknown — check live | 6 |
| `Circuit_Breaker` | USD | Unknown — check live | 6 |
| `Cumulative_Tax_Rate` | percentage | 16 / 10 (historical export) | 10 |
| `Final_Value` | USD | Unknown — check live | 6 |
| `Market_Value` | USD | Unknown — check live | 6 |
| `Notice_FMV` | USD | Unknown — check live | 6 |
| `Prior_Year_Appraised_Value` | USD | Unknown — check live | 6 |
| `Prior_Year_Market_Value` | USD | Unknown — check live | 6 |
| `Prior_Year_Structure_Improvement_Market_Value` | USD | Unknown — check live | 6 |
| `Protest_Value` | USD | Unknown — check live | 6 |
| `Settlement_Offer_Value` | USD | Unknown — check live | 6 |
| `Structure_Improvement_Market_Value` | USD | Unknown — check live | 6 |
| `Total_Taxes_Due` | USD | Unknown — check live | 6 |

## Tax_Rate

| Field link name | Verified schema type | Recorded Max Digits / Places | Minimum places |
| --- | --- | --- | ---: |
| `Tax_Rate` | percentage | unknown / 7 (historical export) | 7 |

[Exact schema evidence and machine-readable recommendations](systemic-currency-native-inventory-2026-10-05.json). Counts, IDs, month indexes and integer completion business rules are excluded. Expanding a field cannot restore cents already lost. Verify a saved native record before considering a repair complete.
