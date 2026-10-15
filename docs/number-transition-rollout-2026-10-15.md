# Repository number transition rollout

User request: implement Sliding push in every applicable place called out in the
[inventory](number-transition-opportunities-2026-10-14.md), then push main and
Production. The earlier Forecast, Insights and Pro Forma releases are retained.

| Widget | New Development / Production | Production rollback |
| --- | --- | --- |
| Budget Manager | 122.29.43 | 122.29.42 |
| Manage Lots | 0.13.2 | 0.13.1 |
| Contract Management | 1.62.4 | 1.62.3 |
| Tax Center | 19.17.15 | 19.17.14 |
| Land Master | 8.16.2 | 8.16.1 |
| Milestone Gantt | 1.1.10 | 1.1.9 |
| Settings Manager | 1.5.9 | 1.5.8 |

## Coverage

- Budget: item/category/department/phase/project financial totals and rates,
  summary and comparison matrices, preliminary/final/modified/revised/GP/HCSS
  values, read-only metrics, modification/payment previews, PO totals and
  cost-code commitments/remaining balances, project phase rows and activity counts.
- Manage Lots: live receipt components and tax shares, per-lot amounts, additional
  items, interest-day totals, selection/block/subdivision/status counts, read-only
  lot values, lot hover financial facts and saved takedown details/counts.
- Legal: report/type/status counts, action progress and summary counts, selected
  lots/size mixes/differences, closing quantities/durations, parent-child counts,
  review queues, confirmed completion quantities and attachment/comment badges.
- Tax: loaded portfolio/protest financial values, separate server matching counts,
  sidebar/facet/selection/pagination counts, subdivision financial summaries,
  saved prior-year numeric comparisons and actual batch verification counts.
- Land: module/matching/selection/pagination counts, read-only report quantities,
  project/subdivision summaries, related-record counts, existing calculated
  read-only numeric fields and transfer totals, import review/result quantities
  and real bulk-save counters.
- Gantt: milestone/scheduled/unsaved totals, existing numeric duration labels and
  verified destination counts. Dates, bar positions and sequence identities stay
  under the original timeline behavior.
- Settings: construction-curve percentage totals and blank-default counts.

Only existing quantitative outputs participate. Editable input values, precision,
caret/focus, IDs, codes, years, dates, account/parcel identifiers and sequence
labels retain their existing behavior. No new dashboard, derived business value
or fabricated progress is introduced. All financial calculations, rounding,
native payloads, permissions and acknowledgement/recovery rules remain intact.

## Implementation and changed files

Canonical `shared/number-transitions.js/css` and `shared/number-surfaces.js`;
matching copies and HTML startup wiring in the seven widgets; stable identity
attributes in Manage Lots receipt/hover/detail markup and Tax record/group rows;
sync/adoption/browser scripts and package commands; widget config/manifest,
immutable releases and environment mappings; design/inventory/module guides.

The observer collects explicit quantity families after original rendering and
coalesces the visual work into a frame. It disconnects during its own decoration,
uses one current snapshot, and leaves unrelated/ambiguous records still. First,
unknown and equal values remain static; an equal redraw of an already running
push resumes the remaining 420ms rather than cancelling or extending it. Values
are the real formatted output immediately; the outgoing pseudo-element has empty
accessible alternative text. Reduced motion shows the final value immediately.
No business request waits for animation.

No Creator forms, fields, functions, reports or Custom APIs change. The existing
module contracts and workflow/save policy remain authoritative. No Creator
deployment is required. Permanent widget URLs and Stage mappings are unchanged.

## Verification

`npm run test:numbers:browser` uses actual module documents/renderers with inert
data and blocked external calls. It checks Budget totals and real PO edits with
zero writes, real receipt quantity/fee inputs and focus/precision, Legal counts,
Tax financial/server basis isolation, Land read-only quantities, Gantt duration
versus date/sequence identities, Settings curve totals, signed rapid replacement,
unknown/record/equal/loading behavior, reduced motion and a bounded 2,000-cell
update. Desktop screenshots are inspected. Existing full `npm run validate`
checks cover the modules' math, payloads, permission and save/approval/recovery
contracts. `npm run build:pages` verifies all hosted paths. Source adoption checks
confirm each standalone copy and startup map; they do not claim visual QA alone.

Rollback an affected Production mapping to its tabled predecessor and rebuild
Pages. Keep Development on its latest complete immutable release per repository
policy. Releases include their own helper copies, so older immutable releases
are unaffected by future changes to the shared source.
