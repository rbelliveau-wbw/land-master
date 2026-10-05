# Request diagnostics and empty comment repair

All nine widgets now carry the same live `#lm-performance` JSON log. It remains
readable through a progress overlay and samples locally every 500 ms while a
request, queue or marked operation is active. Sampling stops at idle. The log
retains 500 completed requests and 250 stage/queue events for the current page;
reload begins a new session. It makes no logging network calls.

Each request has a sequence number, task, explicit read/write kind when supplied
by the caller, queue/start/completion times, queue delay, native-call duration,
response byte count or decoded native error code. Active/queued requests show
elapsed time, rate-limit reason and remaining delay. The log does not include
request payloads, response records, private record IDs or native error text.
Existing module stage marks remain available. SDK completion is separate from
each module's persisted business verification; this log cannot certify a save.

Pro Forma also retains three Save runs in `#pf-save-audit`, with its detailed log
inside the pending Save dialog and in Copy log after settlement.

The shared reader now recognizes native no-records envelopes inside
`responseText`, `cause`, `response`, `result`, `details` and `output`. It still
confirms completeness against the independent exact scoped count. Denied,
malformed, conflicting, cancelled or positive-count incomplete reads fail.
Pro Forma caches verified empty conversations and retains failed loads to stop
its recursive badge retry. Explicit conversation reopening can retry errors.

Production measurement before repair: Taylor Farms' temporary one-cent
Inspection Fees rate edit saved in 143.223 s with 79 failed comment reads and
three long request-budget waits. The totals rebuild itself took 5.677 s.
Restoring the original rate saved in 178.837 s with 77 failed comment reads;
the totals rebuild took 5.201 s. Both saves verified. Original rate $20.00,
land cost $12,500,109.92 and net profit $46,210,091.08 were restored.

No native Creator form, field, workflow, function or Custom API changes are
required. Request scheduling, native writes and persisted-save verification
remain unchanged. All source copies receive the reader/log correction.

Regression checks cover wrapped empty results, real denials, count mismatches,
terminal pagination, bounded failed badges, explicit recovery, local live log
sampling/retention, privacy and the complete module suites. Production rollout
and rollback versions are recorded in the release mapping.

## Production versions / rollback

| Module | Release | Rollback |
| --- | --- | --- |
| budget-manager | 122.28.22 | 122.28.21 |
| land-master | 8.15.5 | 8.15.4 |
| lot-sales-explorer | 1.5.44 | 1.5.43 |
| milestone-gantt | 1.1.7 | 1.1.6 |
| settings-manager | 1.3.10 | 1.3.9 |
| manage-lots | 0.10.3 | 0.10.2 |
| tax-center | 19.17.10 | 19.17.9 |
| proforma-manager | 1.80.82 | 1.80.81 |
| contract-management | 1.61.6 | 1.61.5 |
