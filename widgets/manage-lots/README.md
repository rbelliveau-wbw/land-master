# Manage Lots

Standalone Zoho Creator widget for visually selecting eligible subdivision lots and creating a `Builder_Takedown` without leaving the widget.

## Eligibility

A lot is selectable only when it is open, not archived, and has no existing Builder Takedown. Eligibility is checked once while rendering and again immediately before submission.

## Creator contracts

- Reports: `All_Subdivisions`, `All_Builders`, `All_Lots_All_Fields`
- Create form: `Builder_Takedown`
- Primary fields: `Subdivision1`, `Builder1`, `Lots`, `Name`, `Entered_Date`, `Purchase_Date`, `Tax_Method`, `Tax_Status`, `Status`

Version `0.1.0` is an initial development scaffold. Production promotion is intentionally deferred until Creator testing confirms that existing Builder Takedown workflows accept the SDK payload.

