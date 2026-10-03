# Creator refactor: benefits and remaining work

## Delivered and checked

- Budget and Land Master load the first screen before deferred data. Independent
  reads share bounded concurrency, counts and complete cursor reads.
- Budget's list attachment/comment badges resolve in the background. Land Master
  retains project links and groups instead of putting all subdivisions in Unlinked.
- Budget, Land Master, Insights, Gantt and Manage Lots use Creator SDK 2.0. Their adapters keep
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

The native evidence and boundaries are in the
[live ledger](creator-performance-live-ledger.md). Timings use different data
sets and releases; no controlled percentage speedup is claimed.

## In progress

- Manage Lots 0.9.17 passed exact Dev list/lot/takedown parity and is promoted in
  Prod. The native Prod check loaded 348 subdivision choices, 186 AR05 lots
  (79 available, 107 unavailable) and 857 takedowns with no audit errors.
  Regression checks retain drafts, block repeat creates after an unknown outcome
  and require exact saved lot claims.
- Tax Center must require a complete unique-ID result before editing. Its SDK2
  candidate needs the individual native Dev gate before publication. The existing
  Prod SDK1 search returned 151 unique rows against an expected 152; this is a
  documented failure, not a complete baseline.
- Tax 19.17.5's real Dev gate matched all 228 IDs and editable values but caught
  blank grid labels from a skipped existing enrichment step. Candidate 19.17.6
  restores enrichment on search publication and verified recovery; it remains
  Dev-only until a new individual native check passes.
- Insights 1.5.40 remains on SDK2 in Prod. The stricter 1.5.41 candidate is held:
  all four existing Dev User Access records have Lot Sales Dashboard disabled,
  preventing the required authorized Dev data read. No permission was changed.
- Settings remains on SDK1 in Prod. The current Actions form has Template Action
  instead of the former Contract Template field; the picker rule requires the
  user's answer before changing its meaning.
- Pro Forma and Legal remain SDK1 in Prod pending their separate migrations.
  Legal also has concurrent work from another chat that must be retained.

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
