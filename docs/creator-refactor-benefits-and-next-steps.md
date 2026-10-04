# Creator refactor: benefits and remaining work

## Delivered and checked

- Budget and Land Master load the first screen before deferred data. Independent
  reads share bounded concurrency, counts and complete cursor reads.
- Budget's list attachment/comment badges resolve in the background. Land Master
  retains project links and groups instead of putting all subdivisions in Unlinked.
- Budget, Land Master, Pro Forma, Legal, Insights, Gantt, Manage Lots and Tax Center use Creator SDK 2.0. Their adapters keep
  string record IDs, native environment routing and permission failures distinct
  from verified empty results.
- The lean access response preserves permissions and original uploader names
  without the full Pro Forma owner scan. Full access remains available to callers
  that require those owner maps.
- Budget, Pro Forma and Legal share the attachment design. Budget and Pro Forma
  open attachments from the main list without leaving it. Original uploaders use
  the saved Added User and an exact User Access full-name match. Creator 9.35
  exposes that system field to both Quick View and Detail View readers.
- Focused component guides, an AGENTS.md lookup rule and an automatic documentation
  discovery/link check make future standardization easier to maintain.
- Tax Center requires a complete unique-ID result before editing. Its SDK2
  release passed native Dev parity for all 228 IDs, editable values and rendered
  cells, then matched a fresh complete 152-row Bexar baseline in Prod.
- Manage Lots passed Dev list/lot/takedown parity and reads 348 subdivision
  choices, 186 AR05 lots and 857 takedowns in Prod. Unknown create outcomes keep
  the draft and prevent another blind submission.
- Pro Forma's separate native Dev gate preserves all 23 list records and all
  132 editor fields across eight sections. Its additional costs use the verified
  Proforma Item report for loading and persisted save verification.
- Legal's native Dev gate preserves its complete 21-contract snapshot and
  106 actions, exact visible rows, CCR details and original-author file preview.
  Background comment counts update accessible labels without rebuilding drafts.

The native evidence and boundaries are in the
[live ledger](creator-performance-live-ledger.md). Timings use different data
sets and releases; no controlled percentage speedup is claimed.

## In progress

- Insights 1.5.40 remains on SDK2 in Prod. The stricter 1.5.41 candidate is held:
  all four existing Dev User Access records have Lot Sales Dashboard disabled,
  preventing the required authorized Dev data read. No permission was changed.
- Settings remains on SDK1 in Prod. The current Actions form has Template Action
  instead of the former Contract Template field; the picker rule requires the
  user's answer before changing its meaning.
- Pro Forma 1.80.69 and Legal 1.60.48 passed their individual native Dev gates
  and are promoted through the Production mapping. Final deployed Production
  read checks are recorded in the live ledger. Concurrent Legal and Land work
  from the other chat is preserved.

## Further improvements found during the work

1. Add a live metadata preflight for report fields and permission contracts.
   The missing Added User and removed Contract Template field show why a valid
   export alone cannot prove today's report output.
2. Return a small attachment/comment summary per visible parent, including the
   original-author identity, rather than loading full file metadata just to count
   badges. Preserve complete/error distinctions and exact parent scopes.
3. Move repeated attachment/comment markup and spacing into a shared code
   component with module adapters. Markdown defines the design; shared code and
   behavioral checks would enforce more of it.
4. Add a persisted operation ID and server reconciliation contract for bulk
   writes. That would let Tax and other modules recover safely across a browser
   reload instead of relying only on the current session's unknown-outcome hold.
5. Measure the same first-usable boundary on the same data and role before each
   loading change. Keep estimated serialized response bytes separate from actual
   network transfer bytes, and include slow/error responses in the measurements.
6. Continue moving expensive relationships and complete histories behind the
   views that need them, while keeping counts, permissions and editing preflight
   authoritative. Test reduced-permission roles independently of the current
   administrator session.


## Incremental startup/report batch — 2026-10-04

See [the focused batch writeup](startup-refinements-2026-10-04.md) for before/after request counts, atomic lazy Pro Forma options, lean Legal access, Tax null-aware Arbitrate counts, Territory-fill removal and the new Takedowns report/detail design. Insights' recent-year display fix is code-tested but its Production verification hold remains. No controlled live latency percentage or authorized Dev Insights graph pass is claimed.
