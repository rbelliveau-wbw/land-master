# Pro Forma Manager 1.80.11 — Additional Costs focus

The Additional Costs editor no longer rebuilds its entire pane when a cost or per-unit value loses focus. It updates the affected row's cost guidance, application lock, and construction phase inputs in place. This keeps the next clicked cost input mounted and focused, so a single click is enough to start typing.

This is a frontend-only change to the Pro Forma Manager widget. It affects the Add_l_Cost, Unit, Per_Unit, Cost_Application, and construction phase controls on the Additional Costs tab. No Creator form, function, workflow, or Custom API changes are required.

Regression checks: enter costs in consecutive rows with one click each; enter a new cost and select Cost Application; enter a Construction cost and edit phases; clear a cost and confirm its application/timing fields clear; edit a per-unit rate then click another cost; use Construction/Development, Search, and Hide Empty after editing a cost. npm run validate and npm run build:pages verify the released widget.

Rollback: map production Pro Forma Manager back to 1.80.10 in deploy/environments.json and rebuild Pages.
