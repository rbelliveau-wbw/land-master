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

## Data Insights control changes — user direction October 15, 2026

Measure selection is a primary transition trigger in Data Insights. Animate the
same subdivision/month, selected-period, group and report-total display when
switching among all seven measures, including Base Price → Lot Count. Preserve
record/group/month identity; treat measure, date basis, lot status and the
selected-period range as display context rather than excluding those changes.
A changed context can animate even when the formatted value happens to match.

Each outgoing/incoming visual contains its own complete formatted value, sign
and units. Dollars therefore leave as dollars while the real count enters as a
count. This is a slide/fade replacement; never calculate intermediate values
between metrics. Labels, accessible names, DOM text and CSV use the new measure
immediately. First/unknown values, unrelated records, dates and years retain
their existing suppression; reduced motion updates immediately.

Insights 1.5.51 also covers period/status/date-basis filters, group/report totals,
filter selection counts and picker badges, month-count pills, detail-tab counts
and pagination, actual loading counts, inventory/lot details and dormant Budget
basis/scope/summary/project/row/category displays. Budget navigation and requests
remain disabled. Complete-history and revalidated-permission refresh gates stay
authoritative. This supersedes 1.5.50's metric/unit/basis exclusions.

Forecast Manager 1.6.4 implements this in `number-transitions.js` and
`number-transitions.css`: builder/year totals, selected month/year totals, matrix
counts, subdivision/schedule balances, inventory counts, schedule progress text,
monthly sold/forecast ratios, numeric terms and recent-sales counts. Read-only
Sold/Scheduled cells animate on refresh. Scope keys include subdivision and view;
ordered native-summary fingerprints prevent cross-schedule reconciliation.
Unsupported native HTML keeps the established isolated fallback.

Desktop browser fixtures verify initial/equal suppression, acknowledged-save
matrix/summary changes, text/value parity, signed rapid updates, preserved
editable/date text and reduced motion. Existing save/assignment/recovery guards
remain authoritative.

Data Insights 1.5.50 implements the same motion for comparable monthly/period
measures, group/report totals, frontage and data-quality counts, subdivision
inventory and builder counts, lot detail numbers, and the dormant Budget
summary/project/row/category displays. Its number-transitions.js/css preserves
the existing currency/percentage units, signed values, typography and immediate
final text. Keys include metric/unit, status/date basis, month or period,
record/group identity and Budget basis. Refresh comparisons wait for complete
history and matching revalidated dashboard/revenue permissions; denied or changed
access discards the prior numbers. The Budget dashboard stays disabled.

Desktop fixtures verify real text/CSV parity, filtered and refreshed counts,
group/detail updates, unknown/initial/equal suppression, metric/basis identity,
rapid signed changes, permissions and reduced motion. No calculation, API or
Creator deployment changes. Other widget adoption is pending; see the
[complete opportunity inventory](../../docs/number-transition-opportunities-2026-10-14.md).
