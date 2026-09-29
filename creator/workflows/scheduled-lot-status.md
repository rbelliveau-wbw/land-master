# Scheduled lot status — Creator Development change record

Updated 2026-09-28 in the **Development** Creator application. The committed August `.ds` export and generated metadata predate these live edits; do not import them over this change without refreshing the export.

## Forms

- **Add Lots** (`Lots.Status`): added `Scheduled` between `Contracted` and `Sold`.
- **Contracts Management Search** (`Status` multi-select): added `Scheduled`.
- **Lot Search** (`Status` multi-select): added `Scheduled`.

## Deluge workflows saved in Development

- `Set_Lot_Code_if_Manual_Up` — Add Lots on success: recalculates Status with Close Date, Purchase Date, real Builder, then Open precedence. Preserves Lot Code generation.
- `Write_Purchase_Date_Build` — Builder Takedown on success: writes Purchase Date and text, then recalculates Status with the same precedence.
- `Set_Close_Date_Lots1` — scheduled Lots reconciliation: closes due purchase dates as Sold, marks dated unclosed lots Scheduled, advances Open lots with real builders to Contracted, reverts Scheduled lots whose dates were cleared, and retains the Placeholder assignment for Open lots.
- `Clear_Lots_Fields_on_Dele` — Builder Takedown deletion: clears takedown financial/date values and returns the lot to Contracted or Open according to its remaining builder.
- `Clear_Lot_Fields_if_Remov` — Builder Takedown lot removal: same reset for removed lots.
- `Set_Lot_Base_Price_Builde` — completed Lot Contract workflow: after `Complete_Lot_Contract`, reconciles the contract's lot statuses from dates and builder. The repository copy of the called `Complete_Lot_Contract` function also uses this precedence, but that global function edit has **not** been applied live; this workflow currently performs the live reconciliation.
- `Mass_Update_Lots_Mass_Upd` — after mass field updates, recalculates each lot's Status. This covers builder assignment through Mass Update Lots.
- `Update_Actual_Lots_Foreca1` — monthly forecast: Scheduled_Lots uses Status Scheduled and Purchase Date with no Close Date; Actual_Lots uses Status Sold and Close Date.
- `Update_Sold_Contracted_Fo1` — annual forecast: Total Scheduled/Contracted Lots includes both Contracted and Scheduled for real builders.
- `Create_Forecasts_Mass_Cre` — both Builder and Planning creation actions include Scheduled in the new Forecast Year's Total Scheduled/Contracted Lots.
- `Update_Contract_Schedule_` — adds Scheduled lots with no Contract Schedule to schedule assignment.

## Verification and release

The three form choice lists were reopened and confirmed in Development. The workflow scripts were reopened and confirmed after saving. Scheduled workflows are suspended in Development, so no automatic run or record backfill was observed. No Production Creator deployment was made. Widget candidate releases are Manage Lots `0.7.3`, Land Master `8.11.8`, and Contract Management `1.60.30`. Their Production rollback releases are `0.7.1`, `8.11.7`, and `1.60.29`, respectively. Data Insights UI and filters are intentionally deferred to the next task.

Regression scenarios for promotion: create/edit lots across all four status states; set, clear, and move a Builder Takedown purchase date; remove a lot from or delete a takedown; complete a Lot Contract; mass assign a builder; let due purchase dates close; verify contract schedule assignment, monthly Scheduled_Lots/Actual_Lots, and annual Total Scheduled/Contracted Lots. Roll back Creator scripts and choice additions from the prior exported version if necessary, and revert the three widgets to the Production versions above.
