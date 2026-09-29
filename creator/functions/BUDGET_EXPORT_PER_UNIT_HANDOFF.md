# Budget Export PDF and Excel: Creator Development update

The `exportBudgetSnapshot` function in Creator Development now includes saved `Budget_Item.Unit` and `Budget_Item.Per_Unit` values in the **PDF** and **Excel** files created from the Budget Manager widget's Export dropdown. The update was saved in Creator on 2026-09-29 and the two columns and row values remained present after a fresh editor load.

The existing `Export_Budget_Snapshot` Custom API and widget request `{budgetId, exportType}` stay the same. The live function source was patched against its current body so other live changes were retained; `creator/functions/exportBudgetSnapshot.dg` carries the equivalent table changes for source control.

- Regular PDF: the line-item table adds **Unit** and **Cost per Unit** immediately after Budget Item. Its ten column widths total 100%. Empty source fields render blank.
- Excel: the Budget Detail worksheet adds the same two columns in the same position. Cost per Unit is a numeric cell with the existing Money style; an empty source field remains an empty cell.
- Automatic `APPROVED_PDF`: this function also serves `generateApprovedBudgetPDF`; its original eight-column layout and row content are retained by the `isApprovedExport` guard. This separate approval export is outside the widget dropdown change.

Before Creator promotion, test a priced row and a manual row through both widget Export choices; inspect the attached PDF and `.xls` file for column alignment, currency, and blanks. Also generate an approved-budget PDF to confirm its table remains unchanged. The local structural regression is `node scripts/test-budget-export-per-unit.mjs`; the Creator editor accepted the save, but no export was executed against a budget record. Promote only the `exportBudgetSnapshot` function after the two `Budget_Item` fields are present in the target environment. Creator promotion remains with the owner.
