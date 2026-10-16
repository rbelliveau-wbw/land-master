# Number transitions

Repository-wide rule for applicable surfaces; see [scope and exceptions](README.md).

Robby selected **Sliding push** on October 14, 2026. When an input changes a
displayed quantity, fade/slide the previous value left and bring the actual new
value in from the right. Use 420ms, 16px travel and
`cubic-bezier(.22,.7,.25,1)`. Animate the value, retaining its label and units.

**Standing design direction, October 15, 2026:** this is the default design
language in every module wherever keyed inputs update displayed numbers. Apply
it to live derived values, financial summaries, counts, monthly matrices,
measure/basis/scenario choices, filter changes and authoritative saved refreshes.
It is not limited to Forecast Manager or Data Insights. New numeric surfaces
should adopt it, and existing surfaces should adopt it when changed. Keep the
adoption inventory truthful; this rule does not claim all modules are implemented.

Use stable record/field/scope keys. Never animate first appearance, equal values,
unknown values, dates, record IDs, years or unrelated records. Preserve the real
final value immediately for assistive technology, copying and exports. Hide the
outgoing visual from assistive technology. Do not count through intermediate
numbers or delay requests, acknowledgements, validation or focus. A new update
replaces any running transition with the newest real value. Reduced motion uses
immediate final values. Editable inputs retain their native value/caret; animate
their dependent displays instead.

**Field-exit rule, October 15, 2026:** after typing begins in an editable text or
numeric field, retain each dependent display's last committed visual while that
field is being edited. On Tab, blur or navigation to another control, show the
latest calculated result with one Sliding push. A renderer must never hide a known old number or replace its held visual with
a blank. Capture the baseline before original field handlers run, retaining it
through repeated and nested renders even when a comparison map is empty. New
numeric slots without a prior value remain readable/static.
**Layout rule, October 16, 2026:** while a value is held, its old formatted text
alone determines the wrapper's width and baseline. The hidden incoming value
must not move, widen or reflow that display. Do not estimate numeric widths with
character counts or `ch`; currency signs, separators and proportional fonts
make those estimates inaccurate. At commit, overlay the real old/new text in
one grid cell so their natural sizes determine the transition area without
per-cell layout reads. Preserve left/center/right alignment and read-only input
overlays. [Layout and Insights footer correction](../../docs/number-layout-and-insights-footer-2026-10-16.md).
Hold the **complete formatted result**, including percentage/scientific suffixes,
unknown-result placeholders and semantic sign color, in ordinary fields and
subform rows alike. Do not split a scalar into numeric fragments that let its
suffix or unknown state escape the hold. Keep the old sign color on the outgoing
visual while the real new value inherits its current color. Clip overflow at
each numeric wrapper (`overflow:clip`): paint clipping alone does not prevent
translated children or hidden outgoing text from enlarging a table's scroll
area. Fitting tables must keep identical viewport/totals geometry throughout a
measure transition; genuine long-period overflow must remain scrollable.
[Subform and scroll regression evidence](../../docs/number-subforms-and-scroll-2026-10-16.md).
This follows Budget's visible-old-value behavior; see the
[blanking regression correction](../../docs/number-old-values-visible-2026-10-15.md).
Repeated keystrokes never show intermediate calculated amounts. Reduced motion
uses the same field-exit boundary with an instant replacement. Native input
values, exact precision/carets, calculations, validation, saves, requests,
accessible DOM text, copying and exports still update on their original timing.
Focusing a field without typing does not hold unrelated responses. Explicit
measure/basis/scenario/filter choices remain immediate. Preserve the visual
baseline through existing native change handlers and synchronous editor
replacement/focus restoration; permission and record resets cannot inherit it.

All ten widgets load the canonical `shared/number-edit-commit.js`. Keep these
standalone copies synchronized. Insights measure changes reuse the current
complete authorized report and mounted numeric slots; never aggregate history,
rebuild rows or force a layout per cell merely to change the selected metric.
See [field-exit rollout and measured performance](../../docs/number-field-exit-2026-10-15.md).

Keep the stable key on the record/field/display slot. A selected measure, basis
or scenario can be display context rather than a different identity: animate
its replacement even when the rounded number happens to match. Both visuals
retain their own complete sign, currency/percentage units and formatting, so a
dollar value leaves as dollars and a count enters as a count. Never count through
intermediate values between measures. Editable inputs keep their native value;
use derived displays or a presentation layer for calculated read-only inputs.

This guide is linked from root AGENTS.md so future repository work discovers the
standing rule. Module documentation records actual coverage and pending adoption.

## Repository rollout — October 15, 2026

The [inventory](../../docs/number-transition-opportunities-2026-10-14.md) now records
adoption in all ten widgets. Budget 122.29.43, Manage Lots 0.13.2, Legal 1.62.4,
Tax 19.17.15, Land Master 8.16.2, Gantt 1.1.10 and Settings 1.5.9 use the canonical
`shared/number-transitions.js/css` and explicit `shared/number-surfaces.js` map.
The standalone copies are synchronized before validation. Preserve Forecast,
Insights and Pro Forma's existing engines and coverage.

The new adapter observes existing displayed output after original handlers run,
coalescing presentation in one animation frame. It never reads or writes Creator
data. It uses complete formatted values, record/field/month/display identity,
actor/permission isolation and a bounded current-display snapshot. Ambiguous keys
stay static. Unknown values remove their prior numeric sample. Native input
values/carets and date/identity labels remain unchanged. Equal re-renders during
a running push resume its remaining time rather than cancelling or restarting it.
Reduced motion applies immediately. Existing spatial/FLIP/progress behavior is
retained; only the existing numeric labels participate.

Desktop fixtures exercise actual documents/renderers in all seven new modules,
real PO/receipt edits, scope isolation, signed/unknown/equal/rapid values, loading,
reduced motion and bounded updates in a 2,000-cell report. See
[coverage and release evidence](../../docs/number-transition-rollout-2026-10-15.md).

## Pro Forma — 1.80.113, October 15, 2026

Apply the same transition to live editor totals and calculated read-only prices,
dashboard/scenario results, assumptions, headroom/sensitivity, monthly matrices
and previews, phase pricing/takes/allocation, LOI quantities, list/filter/activity
counts and Budget-transfer review totals. Scope by Pro Forma, field, child-row
identity and actual month. A phase/record identity change starts still; refreshes
of that same displayed quantity can animate. Draft identities live in a WeakMap,
never in saved payloads. Native editable values and carets remain authoritative.
Keep all currency signs, accounting parentheses and percentage units in each
visual. Display replacement never changes financial math, exports, permissions,
approval routes, transfer acknowledgements or API timing.

Real desktop input events must be decorated after the original field handler;
capture-listener microtasks can run before the target handler. The browser
fixture covers native typing and LOI updates as well as scoped render refreshes.
See [Pro Forma rollout evidence](../../docs/proforma-number-transitions-2026-10-15.md).

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

Insights 1.5.52 scopes the loading indicator to the banner's direct message
child. Never style every descendant span's pseudo-element as a loading dot:
the number-transition wrappers use their own ::before for outgoing values.
Loading progress must show one dot, the exact latest received/total counts and
unclipped numeric transitions, including rapid updates and reduced motion.

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
