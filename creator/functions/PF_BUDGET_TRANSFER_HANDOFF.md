# PF costs to Budgets — 1.80.49

This is a widget, two Deluge functions, and a dedicated Custom API. No form workflow or `proforma_save` change is part of this feature. Normal PF Save never initiates a transfer.

## Creator handoff

The following functions are saved and compiler-checked in Land Master Development. Publish them through the normal Creator environment promotion:

- `PF_Budget_Transfer_Plan(map ctx, map mapping)` returns map.
- `PF_Budget_Transfer(string payload)` returns string.

Development Custom API `PF_Budget_Transfer_DEV` uses POST, OAuth2, All users, `application/json`, **Key and Value**, parameter `payload` (string), **Standard** response, Land Master **Development**, namespace Default, function `PF_Budget_Transfer`. It is independent of Save_PF and all existing save APIs. The function enforces the authenticated user's existing `Edit_All_Budgets` or `Edit_Owned_Budgets` grants for every destination; request data cannot select the acting user.

After publishing the functions, configure Production Custom API **PF_Budget_Transfer** with the same settings, selecting the **Production** Land Master application. The widget will remain preview-only in Production until that endpoint exists and returns capability version 1. Do not point the Production endpoint at Development. Stage can use `PF_Budget_Transfer_STAGE` if this widget release is later promoted there; this release changes only Development and Production widget mappings.

`Budget_Item.Unit` (Lot/Acre/LF) and `Budget_Item.Per_Unit` already exist in Development from the separate Budget per-unit work. Publish those fields with their existing Budget Manager support if they have not yet reached Production. This request adds no fields and does not change their workflows. Permanent widget URLs stay unchanged.

## Transfer contract

- The PF list three-dot menu opens **Send Costs to Budgets**, with a Project picker from `All_Projects`, phase tabs, and one selected phase breakdown. An already linked Project is preselected only when unique. Users can choose a one-to-one phase/subdivision mapping. Numeric subdivision Phase labels suggest matches only when unique.
- PF Phases must equal the count of subdivisions related through `Subdivision.Project`. Exactly one saved `Proforma_Phase` row per phase is required; its `Total_Lots` is the destination lot count, and all allocations must sum to PF Lots.
- Each mapped subdivision must already have exactly one active Budget. No Budget or template lines are created. Every Budget must be empty of line costs, totals, rates, actuals, active approvals, and modifications. Budget/category locks and existing edit permissions block the entire send.
- Engineering base = Engineering_Cost_Lot × PF Lots / Phases → Engineering `2101 Design`. Construction base = Const_Cost_FF × Total_Street_LF / Phases → Construction `3100 Full Construction Roll-Up`.
- Acres and Total Street LF are divided evenly and rounded to the destination fields' two decimal places. Lot Price = Lot_Size_Ft × Sale_Price_FF; Land Cost = Land_Cost_Acre, unchanged per Budget. Lots come from saved phase rows, not an even division.
- Additional fixed costs with explicit Across Phases, Engineering End, Construction Start, or Construction End ranges are divided by the number of included phases and applied only to those Budgets. Match by exact Cost_Code and Department with a valid destination category. Missing/duplicate additional targets, incomplete rates/ranges, and conflicts on a rate-bearing line are excluded. Missing/duplicate base lines block Send.
- Category Reimbursements and Item_Name starting with **Impact Fees** overrides application/range and spreads fixed totals across all phases. Reimbursement values remain credits. Each individual Impact Fees item maps to its own corresponding Budget line.
- Per-unit rows keep Unit and Per_Unit. Budget quantities determine Preliminary amounts (Lot/Acre/LF); source total amounts do not override that math. Rates are not divided by phase count.
- Applicable Description notes append to existing destination Description notes without dropping them. Unmigrated notes remain visible with their source outliers. Specific Months is **Not Migrated** and is excluded from destination writes.
- Project.Proforma is set after destination values and totals verify successfully. Previewing or changing a selection does not modify records.

Preview returns a server-computed plan and a SHA-256 token of the saved source, destinations, permissions, and selected mapping. Send reloads and recomputes those records, rejects a changed snapshot, writes only server-selected targets and amounts, rolls up categories and parent totals, and verifies quantities, amounts, rates, notes, and the Project lookup. Budget final/approved costs are untouched. There is one apply POST with no automatic transport retry. Deluge offers no transaction across these records; a partial or uncertain result disables sending until the user inspects the targets and reopens the dialog.

## Changed files and dependencies

- PF widget `widget.html`, `budget-transfer-ui.js`, `budget-transfer-model.js`, `budget-transfer.css`; widget config and release `releases/proforma-manager/1.80.49`.
- The two functions above; this handoff and the PF module documentation; Custom API/widget dependency manifests; Development/Production release mappings.
- Allocation/parity regression script and its synthetic fixture/local preview server; existing Deluge test translator export; package validation command.
- Read source: Add_Pro_Forma, Proforma_Phase, Proforma_Item, Project, Subdivision, User_Access, Add_Budget, Budget_Category, Budget_Item, Budget_Approvals, Budget_Modification.
- Written fields: Add_Budget.Lot_Total_Residential, Acres, Equiv_LF_of_Street, Lot_Price, Land_Cost, Prelim_Budget_Grand_Total; Budget_Category quantities and Prelim_Budget_Total; Budget_Item.Unit, Per_Unit, Prelim_Budget_Ttl, Description; Project.Proforma.
- Widget reports: All_Projects, All_Subdivisions, All_Budgets, All_Budget_Categories, All_Budget_Items, existing PF/phase/item/approval reports. Creator functions query forms directly.

## Regression and rollback

Run `npm run validate` and `npm run build:pages`. The allocation test executes both the widget model and actual translated Creator planner on synthetic records, checking phase lots, uneven saved allocations, fixed ranges, per-unit Lot/Acre/LF math, notes, three Impact Fees credits, Specific Months exclusions, ambiguous/conflicting lines, missing/existing Budgets, count/label mismatches, costs, locks, approvals, modifications, and edit permissions. Browser checks cover phase tabs and search pickers, duplicate mapping rejection, success, and an uncertain send without a second apply.

No real financial transfer is used for verification. After Creator publication, preview an intended PF/Project pair, review outliers and phase mapping, and use the explicit Send action when ready.

Widget rollback: map Development and Production to **1.80.48** and rebuild Pages. Do not delete or clear real Budget costs to undo a transfer automatically. Disable the dedicated transfer endpoint if needed; normal PF Save remains independent. Restoring source prices or notes requires reviewing the affected Budgets and the verified/partial response.
