# Report loading states

Repository-wide rule for applicable surfaces; see [scope and exceptions](README.md).

**Standing user direction, October 27, 2026:** always use the Data Insights
Forecasts loading appearance for report loading screens. Lot Sales must match
it. Use the Forecasts surface as the visual reference for future work in any
module; do not introduce another loading banner or spinner design.

## Appearance

Center a compact white card horizontally and vertically in the report viewport,
with a navy indeterminate ring and a short `Loading [report]…` label. The reference
uses a 14px radius, 20px 25px padding, 15px gap, a pale-blue 48px circular emblem,
and a 30px ring with a 3px border. Keep the Forecasts navy/pale-blue colors,
subtle border and shadow. Do not add a yellow loading bar, invented percentage,
bottom-aligned label, explanatory paragraph or artificial minimum display time.

Insights shares one implementation in
[insights.css](../../widgets/lot-sales-explorer/src/app/insights.css):
`insights-loading`, `insights-loading-card`, `insights-loading-emblem` and
`insights-loading-ring`. Both Forecasts and Lot Sales use those classes. Keep
their appearance shared instead of copying independently maintained styles.

## Behavior and accessibility

Show the card for the real pending read, including all required pages and
history. Hide it on completion, failure, cancellation or permission reset;
an older request must never change a newer request's loading state. A retry
uses the same card. Retain the module's real access/completeness gates and
export locks. Do not reveal partial data or retain rows after access is lost.
Preserve an authorized mounted report on refresh wherever the existing guards
allow it; this design does not change a module's data lifecycle.

Use a polite status announcement, hide decorative geometry from assistive
technology, and set the report's `aria-busy` accurately. Exact received/total
counts may remain accessible without adding visible text to the card. The ring
rotates only while visible and pending; reduced motion uses a static ring.
Keep actual errors and retry actions visible after hiding the loader.

## Adoption and verification

Insights 1.6.7 adopts this shared surface for Lot Sales and Forecasts. Other
modules inherit the rule for applicable future work; this is not a claim that
their existing loaders have already been converted. Multi-record writes retain
their required [transfer progress](transfer-progress.md) or
[approval progress](approval-progress.md) dialogs.

Check desktop centering, matched visual tokens, reduced motion, all pending
phases, completion/error/retry, access denial/reset, stale replies and export
locks. Follow [interaction motion](interaction-motion.md) and
[number transitions](number-transitions.md) where applicable.
