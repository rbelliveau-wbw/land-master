# Scoped Creator cache invalidation: implementation and test plan

Preparation only, 2026-10-02. Do not change the canonical helper or integrations until the current individual Production transport/permission gates pass. The existing integrations keep TTL zero; this plan does not enable persistent caching or change fresh-read requirements.

## Public behavior to preserve

Keep `LMData.invalidate(predicate)`, where the predicate receives read options and the existing complete query key. Report/criteria matching should use the normalized report name and original criteria, with field projection/custom cache-key variants handled consistently. The key continues isolating environment, runtime user and authenticated app. Invalidating a report scope may affect every projection of that scope; invalidating one exact criteria query must not affect other criteria.

No predicate means global invalidation. A predicate removes matching cached snapshots and matching in-flight deduplication entries, so a subsequent affected read starts a new authoritative request. Unaffected cache and in-flight entries remain reusable. Earlier callers continue receiving their complete result unless explicitly cancelled; invalidation must prevent that affected result from writing cache after the invalidation. A late old result must never delete or overwrite a newer in-flight/cache entry for the same key.

`fresh:true` continues bypassing both cache and in-flight reuse. Fresh reads, including eligibility and persisted verification, still participate in invalidation's stale-cache-write guard if a caller explicitly supplied a test TTL. Failed/incomplete/denied/cancelled reads never cache. Default concurrency, string-ID/count/cursor validation, error code/cause/response/permission flags and bounded telemetry remain unchanged.

## Suggested internal approach

Track a small active-read token containing the query key, snapshotted options and an invalidated flag for every read, including fresh/cancellable reads. Match invalidation against active tokens and cached/in-flight entries; flag matching active tokens, delete matching reusable entries, and leave other entries intact. A successful finish may cache only when its token is still valid. Keep promise-identity guards when cleaning up an in-flight entry. Remove active tokens when reads settle so a growing epoch map is not retained for every historical query.

This replaces the current global generation/in-flight clearing behind a scoped predicate while preserving global invalidation. Snapshot options needed by the predicate before requests begin, so later caller changes cannot alter the scope of an already-running read. Resolve matching entries before applying invalidation so a throwing predicate cannot leave a partly applied scope. Do not expose raw criteria, user identifiers or record contents in invalidation telemetry.

## Behavioral tests before adoption

| Scenario | Required assertion |
| --- | --- |
| Two independent reports A/B in flight; invalidate A | New B caller reuses B's existing promise without another count/page; new A caller starts a new request. Both original callers may still finish. |
| Different criteria/projections on the same report | Criteria-specific invalidation affects only matching criteria; report-wide invalidation covers all its projections/custom keys. |
| Positive-TTL A/B test fixtures | Invalidate A removes A while B stays a cache hit. Real integrations retain TTL zero. |
| Old affected A finishes after invalidation | Old complete rows resolve to its caller but cannot populate reusable cache. A subsequent read obtains native data. |
| New A finishes before old A | Late old completion cannot remove newer in-flight state or replace newer cache. Verify actual returned row identities, not only call counts. |
| Fresh A in flight with an explicit test TTL | Invalidation blocks stale caching; a later fresh read bypasses cached/in-flight data and makes authoritative native requests. |
| Identity/environment/app isolation | Scoped/global operations cannot cause reuse across users, environments or apps; an old identity's completion cannot populate a new identity's cache key. |
| Denied/partial/repeated cursor/rejected retry | Raw error fields and failed-read no-cache behavior remain; next valid read works. |
| Cancellable queued/in-flight/cache reads | Explicit cancellation stays distinct from invalidation and cannot publish rows/cache; queue concurrency remains bounded. |
| No predicate / no matching entry / throwing predicate | Global removes all reusable entries and blocks every active stale write; no-match preserves unrelated work; throwing predicate makes no partial invalidation. |
| Cleanup and copy identity | Completed tokens are released, unaffected dedup still works after repeated cycles, and all three published source copies match canonical bytes after sync. |

Integration adoption remains a separate increment. Invalidate the affected resource scope before a write begins; retain invalidation on uncertain/partial outcomes. Resource/navigation generations must stop older model results from being rendered even though the original read promise may resolve. Refresh only dependencies whose business totals, reverse relationships or workflow outputs changed, and keep eligibility/save verification fresh.
