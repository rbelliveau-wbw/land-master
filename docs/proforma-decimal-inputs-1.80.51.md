# Pro Forma decimal input preservation — 1.80.51

Dollar inputs retain their entered decimal digits on blur and in save payloads. Counts and calendar offsets reject fractions with a clear error. Street LF stays whole for this release by user instruction.

## Affected inputs and forms

| Form / input group | Decimal inputs preserved |
| --- | --- |
| Add_Pro_Forma | Total_Acres, Land_Cost_Acre, Engineering_Cost_Lot, Const_Cost_FF, Lot_Size_Ft, Sale_Price_FF, Land_Sale, Overhead, Engineering_Overhead, Construction_Overhead, Interest, Profit_Share; LOI Amount_per_Acre, Earnest_Money, Amount_per_Extension |
| Proforma_Installment | Cost and Percent1 for purchase, sale, and PID/MUD rows |
| Proforma_Item | Add_l_Cost and Per_Unit |
| Lot Mix | Lot_Size_Ft and Price_LF |
| Construction curve | Percent_Cost |
| Proforma_Phase | Annual_Escalator_Pct and Additional_Markup_Pct |
| LOI_Worksheet and Property editor | Monetary LOI terms and property Acres |
| Scenario Analysis | Dollar pricing/cost drivers, Total_Acres and Lot_Size_Ft |

Whole-number validation covers lot/phase/installment counts and indices, lot take counts, construction/engineering lengths and delays, month numbers and additional-cost phase/month ranges, feasibility/extension/closing days and LOI version numbers. Add_Pro_Forma.Total_Street_LF remains a Number field. Creator blocked conversion to Decimal because of existing function, workflow, and report dependencies; the conversion was cancelled.

## Implementation and deployment

- Widget: shared money display uses string grouping, with no two-digit rounding. Header/LOI save builders preserve raw input strings. Scenario inputs preserve decimals and reject fractional integer drivers.
- Creator: proforma_save removes `.round(0)` from Land_Cost_Acre and `.round(2)` from Total_Acres. An early guard rejects fractional integer payloads before record writes. Existing decimal conversions for money remain.
- Custom APIs: existing Save_PF (Development) and Save_PF1 (Production) continue to call proforma_save; no names or schemas change.
- Creator function deployment is separate from GitHub Pages. Only proforma_save is selected for the 9.24 Stage/Production promotion.
- Release: immutable proforma-manager 1.80.51, mapped to Development and Production. Stable Creator widget URLs stay the same.

Calculated financial totals and derived allocation/remainder calculations retain their existing precision rules. Creator's native Max Digits / Decimal Points validation also still applies. Live Land_Cost_Acre metadata is Currency, 14 digits / 2 decimal points. This change removes input normalization; it does not promise unlimited Creator storage precision or alter every native schema field. See [Creator numeric field validation](https://help.zoho.com/portal/en/kb/creator/developer-guide/forms/add-and-manage-fields/articles/fields-currency-understand).

Changed files: widget.html and widget.config.json; proforma_save.dg; decimal-input, precision-trigger, scenario, and JavaScript validation scripts; package.json; widget/environment manifests; immutable release; module and style documentation.

## Verification

Regression checks cover grouped dollar/numeric blur and focus, trailing zeroes, more than two decimal digits, negative values, raw header/child/LOI payloads, scenario amount/acreage preservation, rejection of fractional counts and Street LF, and exact fractional Sale_Price_FF workflow trigger payloads. Run the complete `npm run validate` and `npm run build:pages` checks before promotion. Creator compiler acceptance and environment version status verify function publication; no financial business record is created or modified for deployment QA.

## Rollback

Map proforma-manager back to 1.80.50 and redeploy Pages. For the backend, restore the prior proforma_save version from Creator version history or restore its previous body and promote it through Stage and Production. Review decimal-valued records first because the prior function and widget rounded Land Cost / Acre and acreage. No schema migration or record backfill is part of this release.
