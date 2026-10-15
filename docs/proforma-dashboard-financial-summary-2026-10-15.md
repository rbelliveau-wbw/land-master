# Pro Forma dashboard financial summary — 1.80.109

The dashboard puts Gross Profit alongside ROI, IRR and XIRR, and replaces its
standalone Net Profit card with construction cost per street LF and sale price
per lot front foot. The rates keep their dark-blue emphasis and leave the lower
assumptions strip. Scenario summary, comparison and sensitivity profit labels
also say Gross Profit. Efficiency and sensitivity behavior are outside this
release.

Peak Cash Out sits beside the monthly cash-flow controls. It shows the absolute
value of the existing full-schedule peak cumulative deficit before overhead,
interest and profit share. Missing/incomplete schedules show — and complete
schedules without a deficit show $0. Cash Position snapshots and the existing
Positive Cash Flow month/date remain in their original card.

Previous/Next retains 24-month windows beginning in January and resets both
matrix and timeline horizontal offsets. All four flow views use the same
navigation. Vertical offsets and expanding/collapsing rows within a period keep
their previous behavior.

## Scope

- Changed files: Proforma Manager `src/app/widget.html`, its widget config,
  `manifests/widgets.json`, the immutable `releases/proforma-manager/1.80.109/`
  assets, Development/Production mappings, the focused flow regression check,
  and module/design/release documentation.
- Existing fields read: `Add_Pro_Forma.Net_Profit`, `ROI1`, `IRR`, `XIRR`,
  `Const_Cost_FF` and `Sale_Price_FF`; calculated monthly aggregates provide peak
  funding. No form/field definitions, persisted values, functions or Custom APIs
  change. No Creator deployment is required.
- The dashboard label does not rename `Net_Profit` in Creator or change numeric
  exports, the editor, the main list, approval documents or return calculations.

## Verification

- `node scripts/test-proforma-flow-total.mjs`: card grouping, promoted rate
  rounding with fractional inputs preserved, cash snapshot/positive-cash
  regressions, peak-deficit magnitude, no-deficit/empty/incomplete schedules,
  and Previous/Next scroll resets on all four flow views.
- Desktop browser: rendered widget summary, pricing, peak funding, horizontal
  reset on both directions and all flow tabs, retained row expansion/scroll.
- Required repository checks: `npm run validate` and `npm run build:pages`.

## Release and rollback

Development and Production map Proforma Manager to `1.80.109`; Stage retains its
existing release. Permanent Creator widget URLs remain the same. To roll back,
map the affected environments to `1.80.108` in `deploy/environments.json` and
allow the Pages deployment to complete.
