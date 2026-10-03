# Milestone Gantt SDK v2 increment

Release `1.1.2` established the individually tested Creator SDK v2 migration. Candidate `1.1.5` additionally adopts the [cross-widget failure-envelope correction](creator-sdk2-response-hardening.md); the normal native measurements below belong to `1.1.2` until the new candidate is tested and recorded separately. Both use the byte-identical shared `creator-data.js` adapter and the same native environment runtime as Land Master. The runtime uses one fresh `UTIL.getInitParams()` handshake per connection attempt. An unavailable SDK, malformed context, missing actor, unknown environment, or five-second handshake timeout leaves editing unavailable with a visible connection error. Refresh retries a failed handshake. A late response cannot revive the expired attempt; cached loader context cannot skip initialization. No demo data is supplied.

`All_Subdivisions` and `All_Milestones` retain full-field reads and the existing initial barrier. `DATA.getRecordCount` and cursor-based `DATA.getRecords` must agree before either collection replaces the current snapshot. The shared adapter keeps IDs as strings, bounds concurrent SDK requests to three, and rejects missing/duplicate IDs, repeated cursors, and incomplete results. Refresh generations reject older publications. Existing selection, sequence ordering, local links, date mapping, and Dry Utilities/Punch List staging remain in the widget. Null date baselines now compare equal to null drafts, so wholly unscheduled milestones do not become phantom edits.

Refresh freezes date drag/resize, link changes, subdivision and zoom selection, reset, and save before the first read. Each callable editing entrypoint checks the same readiness gate. Refresh cannot start during a draft, drag, save, unresolved native write, open result dialog, or uncertain save result. A failed read retains the last complete collections and disables editing until a successful retry.

## Date-write contract

The committing Save action immediately opens the [required transfer progress dialog](../knowledge/design/transfer-progress.md) and captures immutable record IDs and date ranges before any asynchronous work. A fresh exact-ID preflight checks every destination against its originally read Creator dates. Dates already matching the intended range are verified without a write. A changed or unreadable destination prevents the whole remaining write set from being sent.

Native writes call `DATA.updateRecordById({report_name, id, payload:{data:{Start_Date, End_Date}}})` once per intended destination. The default Creator workflows remain enabled; no envelope retry or workflow suppression is added. A transport acknowledgement requires native code `3000`, the exact expected string `data.ID`, no error/status failure including beside that ID, and either a direct record result or exactly one per-record result. Competing top-level data/results, duplicate or nested record results, malformed, mixed, or lost responses are uncertain and never trigger automatic replay. Raw response/code details remain available to diagnostics. The raw update helper is private; actual public Save and Refresh actions enforce the controller's readiness and captured-date flow.

Acknowledgement alone does not count as saved. A fresh exact-ID read must return both persisted dates matching the captured range before its count or local saved baseline advances. If a defensive later draft differs from the captured range, that draft remains dirty. Explicit permission/not-found rejections retain the failed draft and can be reviewed after dismissal. An uncertain outcome stops later sends and locks further editing and writes. The widget offers **Recheck Saved Dates**, which only reads and reconciles the original intended ranges; it cannot resend. Recheck waits for an outstanding native update to settle. A mismatching or unavailable read remains uncertain and requires destination review; reloading the page is not a safe replay strategy.

The mounted dialog patches truthful stage/per-record states, counts only persisted matches, and keeps the terminal result visible until dismissal. Display pacing is about 560 ms per stage and never delays requests; reduced motion skips pacing. Close/Escape remain blocked while work or display settlement is active. The background is inert, focus is trapped and restored, and status/progress have accessible labels. Failed preflight labels subsequent stages **Not sent**.

## Validation and native gate

Run from the repository root:

```sh
node scripts/test-milestone-gantt-sdk-v2.mjs
node scripts/test-creator-data.mjs
node scripts/test-runtime-context.mjs
node scripts/validate-widget-javascript.mjs
```

The new VM suite executes the actual widget mapping, dates, event entrypoints, complete controller, canonical SDK adapter/runtime, and mounted progress view. It replaces only timeline layout rendering with a spy. Cases include a 12,017-record complete cursor read; failed/stale snapshot publication; input attempts during pending refresh and save; queued draft capture; strict native success shapes; failed preflight; partial rejection; matching persisted preflight without replay; failed/mismatching readback; lost native response and read-only reconciliation; five-second connection timeout, late response and fresh retry; missing context/actor; single event binding; reduced/non-reduced progress; close/Escape/focus; and null date baselines.

The candidate passed its normal authenticated Creator Development read/controls gate: 37 subdivisions and 56 milestones completed in four tracked requests, with first usable render at 901 ms and 45,272 estimated serialized response bytes. All 37 subdivision labels and the 12 selected baseline bars (record ID, dates/position and displayed label) matched SDK1 exactly. Link toggle/restoration, Reset, Week/Compact zoom, Today and Refresh passed; Refresh completed with eight cumulative requests and no pending or failed requests. This establishes the exercised normal Development gate. Native subdivision deep links, forced failure/retry, reduced roles and date writes remain unperformed. Production promotion targets a read-only comparison against its previous 348 subdivisions, 2,677 milestones and 12 selected baseline bars; its result is recorded separately in the live ledger.

The Production read/controls gate also passed: 348 subdivisions and 2,677 milestones completed in six tracked requests, first usable at 1,056 ms with 1,217,993 estimated serialized response bytes. All 348 choice IDs/labels and the 12 selected baseline bars matched SDK1 exactly. Link toggle/restoration, Reset, Week/Compact, Today and Refresh passed. Refresh retained the bars and completed at 12 cumulative requests with no pending or failed requests and Save disabled for no edits. These are observed timings, not a controlled speed comparison.

The available native browser automation exposes DOM operations but cannot perform the widget's pointer drag/resize date edit. Dates have no editable text control in this widget. The local actual-function write/readback fixture establishes the transport and state contract; it is not a live native date-write claim. A human or browser capability supporting pointer dragging is needed for that reversible native date-write gate. Do not add a date control solely for automation.

Official native contracts: [initialization](https://www.zoho.com/creator/help/js-api/v2/get-init-params.html), [record count](https://www.zoho.com/creator/help/js-api/v2/get-record-count.html), [cursor records](https://www.zoho.com/creator/help/js-api/v2/get-records.html), and [update by ID](https://www.zoho.com/creator/help/js-api/v2/update-specific-record.html).

## Release and rollback

This increment changes frontend transport/state and adds the required multi-record progress UI; it does not change Creator schema, workflows, or permanent widget URLs. Root release coordination creates the immutable candidate and changes environment mappings after the appropriate gate. The latest verified rollback is immutable `1.1.2`; it does not undo any dates already persisted in Creator. Preserve an uncertain result and verify its actual destination dates before any manual correction or retry.
