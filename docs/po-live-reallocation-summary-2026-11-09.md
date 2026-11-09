# Live PO Reallocation — 122.29.122

Allocation edits updated Reallocation but left Summary on native balances and
Approvers without the net Bud Mod. All three panes now use the current existing
reallocation plan. Summary shows Bud Mod separately, includes changed donor
elements without PO lines and applies the signed change to Remaining. PO Details
and Approvers update immediately; Approvers retains Gross Changes for routing.

For Valley Gutter, Labor −$13,991, Materials −$19,578 and Subcontractor +$33,320
produce a −$249 Bud Mod. Item and Subcontractor Remaining both become $0. The
PO payment total stays unchanged; a later Materials decrease of $19,500 shows
−$171 and $78 remaining. Reset restores the automatic funding projection.

## Scope And Deployment

Changed source: `po-ui.js`, `purchase-orders.css` and widget version markers;
regression: `scripts/test-po-summary.mjs`; documentation: Budget module and
payment-request design guide. Config/manifest, immutable 122.29.122 and the
Development/Production mappings complete the release. Stage remains unchanged.

No Creator deployment is required. No forms, fields, native functions, Custom
APIs or permissions change. Existing PO header/line, Budget Item/component
balance and Budget Modification data are read through the unchanged contracts.
Native balances, expectations, saved records, approval policy and write payloads
are unchanged. Approved modifications are not projected twice. Unknown balances
stay unknown and invalid plans retain unfunded warnings and existing save gates.

## Regression Evidence

Actual-source tests cover native-shaped string IDs and exact cents, automatic
funding, signed offsets, zero-net transfers, repeated edits, reset, invalid and
approved plans, unavailable balances, unchanged native values/payment total,
the actual allocation input callback, mounted Summary/PO/Approvers updates,
caret preservation and no extra approval reads for an unchanged route.

Desktop verification in the agent-owned browser used the actual widget assets
and a local fixture matching the Valley Gutter numbers. It verified −$249/$0,
then −$171/$78 while Approvers stayed open, preserved active input, unchanged
$33,320 payment total and Reset. No Creator financial Save/Submit was performed.
Required gates: `npm run validate` and `npm run build:pages`.

Existing numeric surface identities retain Sliding push field-exit motion;
Summary preserves disclosure, scroll and focus. No new interaction pattern or
native data path was needed: the existing reallocation planner/adapter and
Summary renderer are reused.

## Rollback

Set only Production Budget Manager back to **122.29.121** in
`deploy/environments.json` and deploy Pages. Development retains the latest
complete release. No Creator or data rollback is needed.
