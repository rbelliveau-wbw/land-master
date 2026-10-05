# Systemic currency native handoff — 2026-10-05

Native Creator promotion remains with the user. This inventory prepares the complete financial destination review; it does not claim these properties have been changed or that every module has the same save failure.

The user subsequently reported that the `Land_Installments.Cost` Max Digits 19 correction is now in Production. That report is distinct from the read-only Development evidence below. No independent Production property inspection or successful native financial save after that promotion has been performed in this task. Previously trimmed stored values remain unchanged until an explicitly initiated, fresh save writes the correct draft.

## Incident evidence and limits

The live Production Taylor Farms purchase installment was read as 12500109.9 while the retained widget draft expects 12500109.92. Opening the native record confirms the discrepancy is already present outside the widget. The widget can display .92 after a small in-memory installment drift adjustment; its draft match indicator is not persisted verification.

Read-only Development builder inspection by the root investigation found Land_Installments.Cost with Max Digits 10 and Decimal Points 2. These are Development properties, not verified Production properties. The written decimal has eight integer digits, a separator and two fractional digits (11 characters), or 12 with a negative sign. The specific [Deluge insert documentation](https://www.zoho.com/deluge/help/data-access/add-record.html) states that Currency, Decimal and Percent insert values exceeding Max Digits or Decimal Points are trimmed from the right. A 10-character destination can therefore turn 12500109.92 into 12500109.9, exactly matching the saved incident. The broader Max Digits page describes strict validation; these sources differ, so the task-specific insert behavior is the strongest documented mechanism for this path. Read-only live Development proforma_save inspection confirms all three installment collections use .toString().toDecimal(), without an explicit rounding operation. Production capacity and the Production function were not directly inspected, and no repaired live write test has occurred. The documented mechanism plus the observed capacity/value strongly supports native destination truncation, while complete Production verification remains pending.

## Increase-only promotion rule

For financial currency, decimal and percentage destinations, recommend Max Digits 19, the documented supported upper limit. Keep higher existing capacity if the live platform ever supports it. Preserve current Decimal Points; do not reduce them. Computed money totals need at least 2 places; this broader inventory recommends 6 for financial currency destinations so reused inputs/rates/monthly allocations retain additional precision. Entered amounts, unit prices, rates, percentages, acreage and monthly allocations should retain at least 6, preserving 7/10/15-place fields already present in the export. Existing whole-percent Budget_Item.Percent_Complete is a completion business rule and is not automatically changed.

Verify that the largest positive and negative intended value fits with the selected Decimal Points: integer characters + separator + fractional characters + optional minus sign. Capacity expansion cannot restore decimals already lost. No amount should be rounded to satisfy a narrow field; no verification tolerance should accept changed cents.

The [full field checklist](native-currency-field-checklist-2026-10-05.md) lists every native financial destination by form. The [machine-readable inventory](systemic-currency-native-inventory-2026-10-05.json) includes schema type, exact evidence, export properties where explicitly present, destination surface and proposed minimum. Null native properties mean unknown; they are not defaults. Source-only newer fields have type null until native confirmation.

## All-module destination checklist

| Creator form | Modules | Financial fields | Persisted destination surface |
| --- | --- | ---: | --- |
| `Add_Pro_Forma` | proforma-manager | 36 | Custom save and recalculated header |
| `Land_Installments` | proforma-manager | 2 | Custom save: purchase, sale and PID/MUD installments |
| `Proforma_Item` | proforma-manager | 2 | Custom save: entered amount and unit rate |
| `Construction_Curve` | proforma-manager, settings-manager | 1 | Custom save / Settings curve editor |
| `Proforma_Months` | proforma-manager | 25 | Monthly SDK writes and native recalculation |
| `Proforma_Phase` | proforma-manager | 3 | Phase SDK/custom save |
| `LOI_Worksheet` | proforma-manager | 5 | LOI custom save |
| `Add_Budget` | budget-manager, proforma-manager | 16 | Header SDK writes / Pro Forma transfer / native rollup |
| `Budget_Item` | budget-manager, proforma-manager | 9 | Item SDK writes / Pro Forma transfer / native rollup |
| `Budget_Category` | budget-manager, proforma-manager | 7 | Native category rollup and Pro Forma transfer |
| `Budget_Months` | budget-manager | 18 | Native budget monthly calculation |
| `Budget_Import_Item` | budget-manager | 3 | Import reconciliation SDK writes |
| `Property` | land-master, tax-center | 5 | Property SDK create/edit |
| `Subdivision` | land-master | 10 | Subdivision SDK create/edit |
| `Lots` | land-master, manage-lots, contract-management | 11 | Lot SDK edit / Contract completion / native takedown calculations |
| `Builder_Takedown` | land-master, manage-lots | 24 | Takedown SDK create/edit and native rollup |
| `Additional_Items` | land-master, manage-lots | 2 | Additional item SDK create/edit |
| `Takedown_Template` | manage-lots | 15 | Template-driven takedown input: inspect native template source too |
| `Contract` | contract-management | 3 | Contract SDK create/edit / native total rollup |
| `Contract_Pricing` | contract-management | 2 | Pricing SDK create/edit |
| `Tax_Parcel_Year` | tax-center | 18 | Tax SDK create/edit and native calculated taxes |
| `Tax_Rate` | tax-center | 1 | Tax rate SDK create/edit |
| `Settings` | settings-manager | 9 | Settings SDK edit |
| `Lot_Mix_Row` | proforma-manager | 2 | Current source contract; native schema confirmation required |
| `Budget_Modification` | budget-manager | 1 | Current source contract; native schema confirmation required |

The inventory contains 230 fields. Budget_Category and Budget_Months contain downstream native rollups, so their capacity must be checked even when the frontend edits only Budget_Item. Takedown_Template contains template inputs copied into saved takedowns. Milestone Gantt writes dates/counts and has no monetary write destination; Insights (lot-sales-explorer) is read only for financial data. Shared destinations are reviewed once, including Lots used by three modules.

## Schema gaps and precision that must survive

Generated JSON omits required fields in the historical export. Raw export verifies Contract_Pricing.Price_per_Ft as USD, Additional_Items.Amount as USD, Budget_Import_Item.Cost as USD with 4 places and Max Digits 14, and Tax_Rate.Tax_Rate as percentage with 7 places. These names/types were not invented from labels.

Preserve explicit higher precision: Property.cost_per_acre_FT has 15 places, Budget_Import_Item.Percent_Complete 15, Tax_Parcel_Year.Cumulative_Tax_Rate 10, Tax_Rate.Tax_Rate 7, and Lots.Escalator / takedown interest rates 6. Proforma_Phase.Total_Lots is deliberately excluded as an integer count despite its exported decimal type.

Current source-only destinations requiring a fresh native schema check include Budget_Item.Per_Unit, Budget_Modification.Amount, Settings.COO_Approval_Threshold, Tax_Parcel_Year.Assessed_Offer and Assessed_Final, Proforma_Item.Per_Unit, Lot_Mix_Row pricing fields, newer phase rates and newer monthly sales/escalator fields. Use the exact names in the inventory; do not create missing fields as part of a capacity change.

## Backend conversion review

The current committed Creator functions contain no .toFloat() conversion. The Pro Forma installment insert writes Cost using .toString().toDecimal() for all three collections; item amounts/rates use .toDecimal(). Budget modifications convert Amount to decimal; Pro Forma-to-Budget transfer retains rates and rounds the computed payable amount to cents. Counts, month indexes and record IDs use integer conversion intentionally.

The prior persisted whole-dollar Construction_Cost_Base assignment has already been removed in the repository proforma_save function. Read-only live Development function inspection still found that .round(0) assignment, confirming native promotion is pending there. Apply only this delta in the existing function, preserving unrelated newer code:

```deluge
// Replace:
pf.Construction_Cost_Base=header.get("Construction_Cost_Base").toDecimal().round(0);
// With:
pf.Construction_Cost_Base=header.get("Construction_Cost_Base").toDecimal();
```

Remaining whole-dollar presentation conversions found in PF_AI_Review, PF_Packet_Money and PF_Build_LOI_Document produce summaries/document text, not persisted financial fields. In particular LOI Land_Cost_Written, Earnest_Money_Written and Amount_per_Extension_Written currently round to whole dollars while their numeric merge values retain decimals. That is a separate document-content precision concern and must not be represented as the cause of the installment save failure.

## Verification before completion

1. Record the actual Development and Production Max Digits/Decimal Points for each destination; compare live Save_PF/proforma_save with the committed targeted assignments.
2. Test disposable records with 12500109.92, -12500109.92 and supported six-place inputs/rates. Include the higher precision fields above without reducing their precision.
3. Verify entered child fields, parent totals and downstream monthly/takedown/budget totals against fresh native reads. Test an additional-cost-only Pro Forma save, Contract parent + pricing setup, Budget edit/import/modification, Property/Lot edit, Tax edit and Settings rate/curve edit.
4. Reload and compare the stored amount, not the healed draft or formatted totals. Confirm all intended destinations and the modal terminal result, with no blind replay of uncertain inserts.
5. Promote Creator changes using the user's normal process. Frontend/main/Pages promotion does not promote native Creator field or function settings.

Rollback keeps expanded capacity and precise stored data. Do not shrink Decimal Points after precise records exist. Restore a prior frontend release only if needed; inspect retained drafts before correcting previously rounded real records.

Official references: [Deluge insert task](https://www.zoho.com/deluge/help/data-access/add-record.html) documents trimming beyond field capacity for native insertions; [Max Digits](https://help.zoho.com/portal/en/kb/creator/developer-guide/forms/add-and-manage-fields/articles/understand-max-digits) documents the 19-character upper limit and separator/minus accounting; [Decimal Points](https://help.zoho.com/portal/en/kb/creator/developer-guide/forms/add-and-manage-fields/articles/set-decimal-points) documents rounding of existing values when precision is reduced.
