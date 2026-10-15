# Number transitions

Robby selected **Sliding push** on October 14, 2026. When an input changes a
displayed quantity, fade/slide the previous value left and bring the actual new
value in from the right. Use 420ms, 16px travel and
`cubic-bezier(.22,.7,.25,1)`. Animate the value, retaining its label and units.

Use stable record/field/scope keys. Never animate first appearance, equal values,
unknown values, dates, record IDs, years or unrelated records. Preserve the real
final value immediately for assistive technology, copying and exports. Hide the
outgoing visual from assistive technology. Do not count through intermediate
numbers or delay requests, acknowledgements, validation or focus. A new update
replaces any running transition with the newest real value. Reduced motion uses
immediate final values. Editable inputs retain their native value/caret; animate
their dependent displays instead.

Forecast Manager 1.6.2 implements this in `number-transitions.js` and
`number-transitions.css`: builder/year totals, selected month/year totals, matrix
counts, subdivision/schedule balances, inventory counts, schedule progress text,
monthly sold/forecast ratios, numeric terms and recent-sales counts. Read-only
Sold/Scheduled cells animate on refresh. Scope keys include subdivision and view;
ordered native-summary fingerprints prevent cross-schedule reconciliation.
Unsupported native HTML keeps the established isolated fallback.

Desktop browser fixtures verify initial/equal suppression, acknowledged-save
matrix/summary changes, text/value parity, signed rapid updates, preserved
editable/date text and reduced motion. Existing save/assignment/recovery guards
remain authoritative. Other widget adoption is pending; see the
[complete opportunity inventory](../../docs/number-transition-opportunities-2026-10-14.md).
