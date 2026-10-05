# Pro Forma save timing diagnostics 1.80.81

Taylor Farms now saves its correct currency value but is reported to take over
60 seconds. This release instruments the current save without changing it.

The shared Creator adapter retains per-request identifiers and monotonic queue,
dispatch and completion timestamps. Its snapshot exposes running and queued
task names, the configured 45-request/61-second rolling limit, current dispatch
count, remaining wait and whether the wait follows a native throttle. It does
not publish request arguments, record IDs, credentials or response data.

PF saves retain three locally sampled diagnostic runs. A collapsed Save log is
accessible within the pending modal and keyboard focus trap. Copy log appends
the retained diagnostic runs. Logging performs no Creator calls, replays no
writes and stops its timer after success or failure. Other widgets receive the
additive source adapter metadata but their immutable Production releases remain
unchanged.

Affected Creator forms/fields: none changed. Existing PF Save reads/writes are
unchanged. Functions/APIs: no body or registration changes; user continues to
own native Creator changes. Production widget rollback: 1.80.80.

Verification: virtual-clock pacing distinguishes 61-second queued waits from
7-second active requests; whole-save fixtures retain logs during verification
and after success and exclude financial payloads/private IDs. Full repository
validation and Pages build are required before promotion. A Production change
and restoration on Taylor Farms is explicitly authorized by the user; measured
results and restoration evidence are kept locally, outside the public repository.
