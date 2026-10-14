# CFO PO child visibility and curved request rail

Budget Manager 122.29.42 fixes attached budget modifications missing for another
submitter's PO. The October 11 Development export gives CFO report View on
Budget_Modification/All_Budget_Modifications but omits module Viewall. That
matches the reported own-record visibility. The old list relied exclusively on
that report even though the authorized PO modal already receives the full bundle.

The phase load now uses existing managePurchaseOrder Get snapshots for submitted
managed POs, with at most three concurrent reads and existing request-cache
lifecycle. Exact PO/budget/revision and captured child identities must match.
Verified child rows supplement only the request list, override stale same-ID
report data and never duplicate an already visible child. Preserve real report
dates; do not fabricate missing dates or alter report-backed financial caches.
Failures keep the parent visible with unavailable/Retry. Actor, generation and
navigation guards prevent stale publication and stop queued child reads.

The connector uses a 2px gold trunk and rounded SVG elbows. The last trunk ends
relative to its child's center, avoiding a clipped/disconnected corner.

Changed files: Budget widget HTML, PO/request regression scripts, payment-request
and module documentation, version metadata, immutable release and environment
mapping. Uses existing Get only: no Creator forms, fields, functions, Custom APIs
or permissions change, and no Creator promotion is required.

Regressions cover CFO report subsets, other submitters' children, duplicate/stale
metadata, exact IDs/revisions/statuses, failed Get, three-read concurrency,
profile changes and connector geometry. Run focused PO tests, npm run validate
and npm run build:pages. Leave native record testing to the user.

Rollback: restore Budget Manager mapping 122.29.41. Native records are unchanged.
