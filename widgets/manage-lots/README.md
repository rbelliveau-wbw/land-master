# Manage Lots

Standalone Zoho Creator widget for visually selecting eligible subdivision lots, creating a `Builder_Takedown`, and viewing existing subdivision takedowns without leaving the widget.

## Views and selection

- **Lots** uses a searchable subdivision multi-select and groups the resulting lots by subdivision and then by their text-capable `Block` value. Because `All_Lots_All_Fields` does not currently expose `Block`, the widget also derives it from `Lot_Code` (for example, `AAA-B01-L012` becomes Block 1). Letter and alphanumeric blocks remain supported.
- Available lots can be selected individually or by holding the pointer and dragging across them. Selected lots use a high-contrast blue state with a check marker and remain staged until the takedown is created.
- A new Builder Takedown remains limited to lots from one subdivision even when several subdivisions are visible.
- **Builder Takedowns** reads `All_Builder_Takedowns`, groups rows by subdivision, and displays each linked lot as a separate code/status chip. This view is intentionally read-only and exposes no update or delete actions.

## Eligibility

A lot is selectable only when it is open, not archived, and has no existing Builder Takedown. Eligibility is checked once while rendering and again immediately before submission.

## Creator contracts

- Reports: `All_Subdivisions`, `All_Builders`, `All_Lots_All_Fields`, `All_Builder_Takedowns`
- Create form: `Builder_Takedown`
- Primary fields: `Subdivision1`, `Builder1`, `Lots`, `Name`, `Entered_Date`, `Purchase_Date`, `Tax_Method`, `Tax_Status`, `Status`

Version `0.3.0` adds searchable multi-subdivision filtering, subdivision grouping, and scannable Builder Takedown lot details.
