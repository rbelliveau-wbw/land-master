# Base and combined construction rates — Proforma Manager 1.80.112

Const. Cost / LF shows two values in the dark-blue pricing card: Base and
Base + Add’l. Base displays the existing `Const_Cost_FF` input. Base + Add’l
divides the current calculation's `Construction_Cost_Base` plus
`Construction_Cost_Addl` by `Total_Street_LF`, preserving the card's street-foot
basis. Sale Price / FF stays in the same card.

Display rounding happens after division; inputs, totals and monthly rows are
not modified. Credits reduce the combined rate. An incomplete schedule or
missing/nonpositive street length displays — for the combined rate.

## Scope and verification

- Changed files: Proforma Manager `src/app/widget.html`, widget configuration,
  `manifests/widgets.json`, immutable `releases/proforma-manager/1.80.112/`,
  Development/Production mappings, `scripts/test-proforma-flow-total.mjs` and
  module/design/release documentation.
- Existing fields read: `Const_Cost_FF`, `Construction_Cost_Base`,
  `Construction_Cost_Addl` and `Total_Street_LF` from the current model/calculation.
  No form or field definitions, persisted values, Creator functions or Custom
  APIs change. No Creator deployment is required.
- Regression: combined construction rate, final-only rounding, zero additional
  costs, construction credits, absent/nonpositive street length, incomplete
  schedules, original base/sale pricing, previous card layouts and January reset.
- Checks: focused flow regression, desktop browser verification, full
  `npm run validate`, `npm run build:pages`, CI/Pages deployment and exact
  production release verification.

## Release and rollback

Development and Production use `1.80.112`; Stage and permanent Creator URLs
stay unchanged. Roll back by mapping the affected environments to `1.80.111`
and allowing Pages to deploy.
