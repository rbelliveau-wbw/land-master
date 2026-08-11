# Manage Lots

Standalone Zoho Creator widget for visually selecting eligible subdivision lots, creating a `Builder_Takedown`, and viewing existing subdivision takedowns without leaving the widget.

## Views and selection

- **Lots** groups records by their text-capable `Block` value. Because `All_Lots_All_Fields` does not currently expose `Block`, the widget also derives it from `Lot_Code` (for example, `AAA-B01-L012` becomes Block 1). Letter and alphanumeric blocks remain supported.
- Available lots can be selected individually or by holding the pointer and dragging across them. Selected lots use a high-contrast blue state with a check marker and remain staged until the takedown is created.
- **Builder Takedowns** reads `All_Builder_Takedowns` for the selected subdivision. This view is intentionally read-only and exposes no update or delete actions.

## Eligibility

A lot is selectable only when it is open, not archived, and has no existing Builder Takedown. Eligibility is checked once while rendering and again immediately before submission.

## Creator contracts

- Reports: `All_Subdivisions`, `All_Builders`, `All_Lots_All_Fields`, `All_Builder_Takedowns`
- Create form: `Builder_Takedown`
- Primary fields: `Subdivision1`, `Builder1`, `Lots`, `Name`, `Entered_Date`, `Purchase_Date`, `Tax_Method`, `Tax_Status`, `Status`

Version `0.2.0` adds resilient block grouping, drag selection, a Pro Forma-aligned visual system, and a read-only Builder Takedowns report view.
