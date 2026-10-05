# Creator refactor: benefits and remaining work

## Delivered and checked

- Budget and Land Master load the first screen before deferred data. Independent
  reads share bounded concurrency, counts and complete cursor reads.
- Budget's list attachment/comment badges resolve in the background. Land Master
  retains project links and groups instead of putting all subdivisions in Unlinked.
- All nine widget sources and the published Production mappings use Creator
  SDK 2.0, including Settings 1.3.7. Their adapters keep
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
- Manage Lots 0.9.20 adds flat newest-first takedowns, Builder filtering, amber
  Scheduled tags and complete read-only details. Entered Date and Close Date
  pills use Entered_Date and, by the user's explicit decision, Purchase_Date.
  Native Production retained all 857 takedowns and the first record's 25 lots.
- Insights 1.5.42 displays the first two years while loading complete history in
  the background. Its authorized read-only Production gate matched the two-year
  and all-history baseline exactly: 218 rows, 249 months and all 25,527 lots.
  One run reached usable results at 3,289 ms and complete history at 7,903 ms,
  with 38 successful requests; this is not a controlled speedup measurement.
- Pro Forma's separate native Dev gate preserves all 23 list records and all
  132 editor fields across eight sections. Its additional costs use the verified
  Proforma Item report for loading and persisted save verification.
- Legal's native Dev gate preserves its complete 21-contract snapshot and
  106 actions, exact visible rows, CCR details and original-author file preview.
  Background comment counts update accessible labels without rebuilding drafts.

The native evidence and boundaries are in the
[live ledger](creator-performance-live-ledger.md). Timings use different data
sets and releases; no controlled percentage speedup is claimed.

## Current validation boundaries — 2026-10-05

- Settings 1.3.7 uses the confirmed Template Action rule. Native Development
  preserved all 23 scalar fields and both selected-ID sets, with 16 Action
  choices. Native Production preserved all 22 prior scalar values/types and
  both selected-ID sets; the extra control is Current_Batch. It showed 15
  checked-template Action choices, retained seven selected Actions and showed no
  Actions-unavailable warning. No native write was performed.
- Insights' Dev actors lack dashboard access. The user authorized read-only
  Production verification instead, and that gate passed without permission
  changes. Historical failed gates remain recorded in the live ledger.
- Concurrent Pro Forma 1.80.73 and Legal 1.60.51 releases are retained. The
  further Legal stale-template/orphan-option repair is in progress; it is not a
  released successor yet.
- Native read parity does not prove unperformed writes, uploads, approvals or
  bulk updates, or reduced-permission roles without an available test session.
  Creator promotions reserved for the user remain separate,
  including the other chat's Development Validate_Comment_Log Contract1 fix.

All nine Production SDK2 releases passed their available native gates. CI
37337304335 and Pages 37337304073 succeeded for published main commit `9c02d3a`.

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

See [the focused batch writeup](startup-refinements-2026-10-04.md) for before/after request counts, atomic lazy Pro Forma options, lean Legal access, Tax null-aware Arbitrate counts, Territory-fill removal and the Takedowns report/detail design. Insights' recent-year display passed the user-authorized Production check; no controlled latency percentage or native Dev Insights graph pass is claimed.
