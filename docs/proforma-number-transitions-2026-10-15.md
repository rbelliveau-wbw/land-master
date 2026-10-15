# Pro Forma numeric transitions — 1.80.113

Input-driven displayed quantities use the repository's Sliding push: the previous
formatted value leaves left and the actual new value enters right, over 420ms and
16px with `cubic-bezier(.22,.7,.25,1)`. Final values update immediately; there is
no numeric interpolation or request/acknowledgement delay.

## Coverage

- Editor live profit, returns, income/expense breakdown, counts and calculated
  fields; lot-mix prices and calculated per-unit additional-cost inputs.
- Dashboard KPIs, base/combined construction rates, assumptions, cash snapshots,
  positive-cash month, scenario comparisons/deltas, headroom and sensitivity.
- Monthly cash/inflow/outflow matrices, whole-schedule totals and phase/month
  previews, keyed by real month and row rather than visible column position.
- Phase lot prices, final sale/escalator prices, take counts, allocation and
  sidebar feedback; phase identities and calendar dates remain static.
- LOI estimated price, acreage/price checks and missing-data counts; selected
  allocation-month counts; main-list financial values, counts and filter badges;
  existing confirmed comment/attachment count displays.
- Budget-transfer header/footer, department/category/item totals and unit rates.
  Transfer planning, preflight, write guards and confirmed stages are retained.

Keys include Pro Forma and stable field/child/display identity. Draft identities
use WeakMaps and add nothing to saved models. Unknown/first/equal values stay
still; new records and phases never inherit another record's transition. Both
visuals retain their own sign, currency, accounting parentheses and percentages.
Reduced motion shows the final value immediately. Calculated read-only inputs
retain their native input/value and use an aria-hidden presentation layer;
editable inputs keep their original precision, caret, keyboard and focus.

All guides in `knowledge/design/` are now explicitly repository-wide rules for
their applicable surfaces, as requested October 15. Their reference widgets do
not limit their scope. The root AGENTS and index make the rule discoverable;
documented exceptions, permissions and business semantics remain authoritative.
Adoption evidence does not claim every older screen already matches every guide.

## Changed files and contracts

Widget `widget.html`, `budget-transfer-ui.js`, new `number-transitions.js/css` and
`number-views.js`; focused browser script/package command; widget manifest/config,
immutable release and environment mappings; root AGENTS, design guides/index and
Pro Forma module documentation.

No Creator forms, fields, functions or Custom APIs change. Existing Add_Pro_Forma,
Lot_Mix_Row, Proforma_Item, Proforma_Phase, Proforma_Month, LOI_Worksheet,
Land_Installments, Construction_Curve, Comment_Log and Attachment contracts are
consumed as before. Financial calculations, persisted values, automatic-save
comparison policy, approval routing/email/PDF/Writer behavior and exports are
unchanged. No Creator deployment is required.

## Verification and rollback

Desktop browser fixture: renderer text parity, native keyboard input and exact
precision/focus, immediate formatted totals, calculated read-only inputs, live
phase prices and phase isolation, LOI estimated-price typing, monthly previews,
scenario/matrix updates, list/count refresh, record isolation, signed rapid
replacement, unknown/equal suppression, reduced motion and Budget-transfer
preview edits. It uses inert data and never sends business writes. Screenshots
were inspected at desktop size.

Run `npm run test:proforma:numbers:browser`, `npm run validate` and
`npm run build:pages`. Production and Development use immutable `1.80.113`;
Stage remains unchanged. Rollback Production to `1.80.112` in
`deploy/environments.json` and rebuild Pages. Keep Development on its latest
complete release per repository policy. Permanent Creator widget URLs stay fixed.
