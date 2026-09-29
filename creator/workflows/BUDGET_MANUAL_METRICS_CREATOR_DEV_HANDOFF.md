# Budget manual metrics and per-unit pricing: Creator Development handoff

## Applied in Development (2026-09-29)

The following changes were saved and verified in the live **Development** app today:

- Created the optional `Budget_Item.Unit` Drop Down and `Budget_Item.Per_Unit` Currency fields with the settings below. `Unit` has the three choices `Acre`, `LF`, and `Lot`.
- Added `Unit` and `Per_Unit` to the `All_Budget_Items` report quick-view layout, once each. The current widget's `getAllRecords` call reads quick-view fields, so both columns are required for saved values to reload.
- Edited `Hide_Disable_Fields_Budge` to remove the three `disable` statements for `Acres`, `Equiv_LF_of_Street`, and `Lot_Total_Residential`.
- Edited actions 2 and 3 of `Update_Budgets_w_Projects1` to remove the three `Budget_Category` quantity assignments and three `Add_Budget` quantity assignments, respectively. The schedule remains suspended in Development.

The two workflow patches in this directory record the intended edits. The historical `creator/raw/` export predates current live edits, so use the live actions as the source if any further edits are needed. The owner will promote the selected Creator components through Stage and Production; a widget release does not promote Creator fields, reports, or workflows. **A real SDK record-fetch test has not yet been performed.**

## Fields

The existing `Add_Budget` fields `Acres` (decimal), `Lot_Total_Residential` (number), `Equiv_LF_of_Street` (decimal), `Lot_Price` (USD), and `Land_Cost` (USD) remain the budget header inputs. `Lot_Price` and `Land_Cost` were already manual; the first three were made editable by the on-load and schedule changes above.

The two optional persisted `Budget_Item` fields now match the live `Proforma_Item` form:

| Field name | Link name | Creator type | Settings |
| --- | --- | --- | --- |
| Unit | `Unit` | Drop Down | Choices `Acre`, `LF`, `Lot`; no default; Allow Other Choice off; Alphabetical Order off; not mandatory. |
| Per Unit | `Per_Unit` | Currency | USD, display `1,234,567.89`, max 10 digits, 2 decimal points; no initial value; not mandatory. |

The Per Unit switch is widget-only. With the switch on, the widget stores `Unit`, `Per_Unit`, and the calculated `Prelim_Budget_Ttl`; with it off, the source inputs are cleared and `Prelim_Budget_Ttl` is manually editable. The Creator fields alone do not calculate that total. The report quick-view change has been saved; confirm a real `All_Budget_Items` SDK response includes both fields when an item record is available.

## Creator navigation and verification

In the Land Master Development builder, use **Design → Forms → Budget Item → Open Form Builder** for fields and **Design → Reports → All Budget Items** for the quick-view layout. Use **Workflow → Form workflows → Add Budget → Hide/Disable Fields - Budget** for the load action. Use **Workflow → Schedules → Update Budgets w/ Projects Info - Budget** for the three schedule actions. The edits above were saved and inspected in Development. Still verify direct Creator form entry for the five header fields, a real `All_Budget_Items` SDK record response, and widget save/reload of both per-unit source inputs and the calculated preliminary amount. Development schedules are suspended, so retest schedule behavior after promotion in an environment where it executes.

Creator promotion should select only the changed `Budget_Item` fields, the `All_Budget_Items` report, and the two workflow components. Review the component list before publishing; do not include unrelated Development changes.
