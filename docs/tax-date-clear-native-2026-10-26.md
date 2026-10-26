# Tax Center native date clearing and request pacing — October 26, 2026

## Production evidence

The reported Company is `WBW Single Development Group, LLC-Series 125`,
Tax Year 2026, with 135 matching `Tax_Parcel_Year` records. The authorized
field is `Arbitration_Notice_Received` (ARB Notice Rcvd). Other date columns
and financial fields are outside the data-change scope.

Production started on Tax Center 19.17.27. An individual clear of parcel
`541817-2026` (record `4410926000003406410`) acknowledged the literal payload
`{"Arbitration_Notice_Received":""}`. The explicit empty-string repair from
19.17.23 is present in 19.17.27; there is no evidence that native Creator requires
a different null representation.

The native 135-destination bulk clear reproduced a separate, actionable failure:
93 destinations completed, three needed read-only review and 39 were not sent.
The native reply was HTTP 429 / Creator 2955, "You have reached your API call
limit for a minute. Please try again after sometime." A subsequent read-only
recheck confirmed the three retained dates, bringing the confirmed total to 96
without replaying any write. The automatic critical report supplied by the user
also identifies `Production counts failed` with this same native error.

## Smallest safe repair

Tax Center already uses the shared Creator request adapter, but had not opted
into its existing per-user request budget or safe throttle handling. Each bulk
destination uses an update plus a fresh counted record read, so concurrency alone
does not limit the number of requests per minute. Counts after the batch share
the same native allowance.

Reuse `LMData.configure({maxRequestsPerMinute:45,readRetryOnThrottle:true})`
for Tax Center, mark its direct count requests read-only, and mark mutations as
writes. The shared adapter allows one delayed retry of a read after Creator 2955;
it never replays a write. Keep the complete selection preflight, exact string
destination IDs/counts, captured payloads, native acknowledgement and retained
partial/unknown results.

The existing 30-second verification deadline must allow known budget/throttle
idle time. Reuse the existing Contracts rule: extend the deadline only while the
shared scheduler reports a positive budget wait and no active native request.
An actually pending request retains its timeout and late reads cannot publish
or cause another write after expiry. No automatic editable-field comparison is
added after an acknowledged save.

If a write has already received a valid acknowledgement, a later verification
permission/read error retains that write as unknown. It cannot be mistaken for
a rejected write and become eligible for resend. Definite native write rejection
before acknowledgement retains its existing behavior.

This deliberately retains the current SDK endpoints and per-destination ledger.
Changing to native multi-record updates would require a different response and
partial-result contract; that is unnecessary for this focused repair. Large
batches can take longer while honoring the shared minute budget.

## Release scope

- Frontend: Tax Center 19.17.28; permanent Creator widget URL unchanged.
- Code: `widgets/tax-center/src/app/widget.html` and `tax-controller.js`.
- Regressions: Tax SDK fixtures and focused request-pacing tests.
- Data contracts: existing `Property` and `Tax_Parcel_Year` fields and reports.
- Creator functions, Custom APIs, schema and permissions: unchanged.
- Creator backend publication: not required.
- Rollback: restore Tax Center Production mapping to 19.17.27 and rebuild Pages.
  Data clearing is separate from frontend rollback.

## Verification

Focused tests must establish production rate configuration, a 135-destination
batch spanning request windows, native-shaped HTTP 429 and returned 2955 count
recovery, one-time writes, queue-aware verification deadlines, real pending
timeouts, late-read cancellation, exact identity/count checks and explicit
empty-date submission. Run `npm run validate` and `npm run build:pages` before
promotion. Native completion requires a full page reload, the same Company/year
Search, and inspection of both pages of the fresh 135-record snapshot.

## Completed production verification

Production commit: `da1619190209b905511ccc748e5674b211ec4bc9`.
[Pages deployment](https://github.com/rbelliveau-wbw/land-master/actions/runs/40338962579)
and [CI](https://github.com/rbelliveau-wbw/land-master/actions/runs/40338962462)
both succeeded. Full local validation passed before and after incorporating the
concurrent Budget release; the merged Pages build passed. Browser asset URLs
confirmed that native Creator loaded Tax Center 19.17.28.

A full reload and Company/year Search confirmed the 96 recovered destinations
remained cleared. Of the 39 unsent records, only three still contained ARB dates:
`541793-2026`, `541796-2026`, and `541791-2026`. Only those three were selected
for the final native clear under 19.17.28. The mounted result confirmed 3 / 3
destinations, with no throttle error.

Another complete page reload and fresh Search returned 135 unique records:
100 on page one and 35 on page two. All 135 `Arbitration_Notice_Received` inputs
were empty. Comparing both pages against the fresh pre-final-clear snapshot
found no changes to `Notice_Received`, `Protest_Deadline`,
`Protest_Hearing_Date`, or `Arbitration_Hearing_Date`.

The desktop task evidence is saved under
`reports/2026-10-26-tax-date-clear/` in the parent workspace, including the
reproduced throttle screenshot, successful final-three ledger/screenshot,
both final page screenshots, all 135 reloaded date values, exact patch and
validation/build logs. No new automatic post-acknowledgement value comparison
was added to the product; this was an explicit manual persistence check.

## Feasible batch size

The existing complete parcel selection limit is 800 matching records. The
advancing-clock regression executes 135 complete saves across minute windows;
the production data check confirms 135 cleared records. An 800-record live
write has not been tested. With the current four-request save/check path and
45-request budget, sustained throughput is approximately 10–11 records per
minute before other count activity and native latency. Allow roughly 12–15
minutes for 135 updates and around 75 minutes for 800. These are estimates,
not a new timeout or completion guarantee.
