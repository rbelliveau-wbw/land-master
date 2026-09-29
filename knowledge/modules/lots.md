# Lots status contract

The `Lots.Status` choices are **Open**, **Contracted**, **Scheduled**, and **Sold**. Derive status in this order:

1. `Close_Date` present: Sold.
2. `Purchase_Date` present and no `Close_Date`: Scheduled.
3. A real builder assigned and neither date present: Contracted.
4. Otherwise: Open. Creator's `Placeholder` builder represents an unassigned lot and remains Open.

The Builder Takedown purchase-date workflow assigns Scheduled, including when the date is in the future. The close-date schedule assigns Sold once the purchase date arrives, and also reconciles Scheduled lots that have no close date. Clearing a takedown's dates returns a lot to Contracted when it still has a real builder, or Open otherwise. Mass lot updates and completed Lot Contracts recalculate status with the same precedence.

Monthly `Forecast.Scheduled_Lots` counts Scheduled lots by Purchase Date. `Forecast_Year.Total_Contracted_Lots` has the Creator display name **Total Scheduled/Contracted Lots** and counts both unsold builder inventory states. Contract schedule assignment also covers Scheduled lots.

Manage Lots allows a lot into a new Builder Takedown only when it is Open, unarchived, and absent from another takedown. It displays Scheduled in existing takedown lot details. Land Master offers Scheduled in the lot editor. Contract Management shows Scheduled as a locked lot in its picker. The Data Insights tab still needs a separate status and filter update.

Creator Development workflows and forms changed for this status are listed in `creator/workflows/scheduled-lot-status.md`. Production has not received this Creator change. Before production promotion, reconcile existing lots with `Purchase_Date != null && Close_Date == null`, then review monthly and annual forecast counts. Development schedule execution is currently suspended, so scheduled reconciliation has not run there automatically.
