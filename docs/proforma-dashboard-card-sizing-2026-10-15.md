# Dashboard card sizing — Proforma Manager 1.80.111

Cash Position, Positive Cash Flow and Peak Cash Out share the same heading style
and 12px value size. Peak Cash Out stays below Positive Cash Flow. The returns
card uses two columns: stacked ROI / IRR / XIRR on the left and Gross Profit on
the right, aligned at the top. Return/profit values adapt to desktop card width
to keep both columns readable.

## Scope and verification

- Changed files: Proforma Manager `src/app/widget.html`, widget configuration,
  `manifests/widgets.json`, immutable `releases/proforma-manager/1.80.111/`,
  Development/Production mappings, the focused flow regression check and
  module/design/release documentation.
- No Creator forms, field definitions, persisted data, functions or Custom APIs
  change. No Creator deployment is required.
- Regression: two aligned return-card columns, consistent cash labels/values,
  desktop fit, snapshot/positive-cash/peak values, pricing, original cash controls
  and January resets across all four views.
- Verification: focused flow regression, rendered desktop checks, full
  `npm run validate`, `npm run build:pages`, CI/Pages and exact production asset
  verification.

## Release and rollback

Development and Production use `1.80.111`; Stage and permanent Creator widget
URLs stay unchanged. Roll back by mapping the affected environments to
`1.80.110` and allowing Pages to deploy.
