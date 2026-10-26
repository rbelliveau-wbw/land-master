# Tax Center native bulk saves and compact progress — 19.17.29

## Problem and change

The 19.17.28 request budget prevented Creator minute-limit failures, but the
bulk path still issued an update and three confirmation reads for every record.
135 identical edits therefore required roughly 540 calls. That is too slow for
an ordinary mass update. This release replaces that path with Creator SDK2's
native `DATA.updateRecords` operation.

Captured destinations with identical frozen payloads share a request, up to
200 records each. Criteria contain only the captured decimal string IDs joined
with OR; the Company/year filter is never sent as the write criterion. Different
per-record copied values remain separate groups. No workflow is skipped, and
`process_until_limit` is omitted so a request cannot silently process a subset.
The existing 800-record parcel selection limit remains.

Every result must identify the exact unique destination set with valid native
codes. Partial rejections and unknown responses retain their per-record results.
Writes are never automatically replayed. Confirmed, rejected and not-sent rows
remain distinct, and explicit recovery remains read-only. Fresh confirmation
reads use exact acknowledged ID chunks rather than editable filter criteria;
Company/Status edits can legitimately move successful rows out of those filters.
No automatic editable-field comparison is added after native acknowledgement.

135 identical edits now use one native update plus the counted preflight and
counted confirmation read, seven calls in the focused fixture. The 800-record
fixture uses four updates and 22 total calls when reads page at 200 rows.
These request counts replace the earlier per-record timing estimate; live
elapsed time is measured after deployment rather than promised from a mock.

The shared request limiter and safe read-only throttle recovery remain as a
fallback when other requests consume the user's minute allowance.

## Progress dialog

The dialog is 540px wide and capped at 620px or viewport height minus 48px.
Header, summary, three stages and footer stay visible. Results and detailed
errors scroll internally. The shell does not grow with the number of records.

Normal copy is plain language: "Saving changes", "135 selected records",
"9 of 32 records saved", "Checking records", "Saving changes", "Confirming
updates", and "Saved". Existing field labels replace database field names.
Actual failure details remain available inside the scrolling results area.
The controller's actual stages drive progress; there is no invented per-record
completion while a native batch is still running. Pending close locks, captured
rows, focus restoration, inert background and reduced motion remain intact.

## Scope and release

- Source: Tax `tax-controller.js`, `tax-progress.js`, HTML version marker.
- Tests: native batch fixture/suite, existing complete Tax SDK suites, rate
  pacing suite and browser progress regression.
- Design rule: Tax section in `knowledge/design/transfer-progress.md`.
- Existing reports: `All_Tax_Parcel_Years` and `All_Property`.
- Existing forms/fields: selected editable `Tax_Parcel_Year` and `Property`
  fields; the authorized live scenario clears only `Arbitration_Notice_Received`
  for Company Series 125, Tax Year 2026.
- Creator functions, Custom APIs, schema and permissions: unchanged.
- Frontend deployment: immutable 19.17.29, Development and Production mappings.
- Creator backend publication: not required.
- Rollback: map Tax Center Production to 19.17.28 and rebuild Pages.

## Regression and native verification

Fixtures cover 135/800 destinations, exact selected ID criteria, group/chunk
boundaries, different copied values, preserved workflows, unknown/malformed/
missing/duplicate/foreign result IDs, mixed per-record errors, stale actors,
scope/count changes, timeouts and late replies, no replay, filtered-field edits,
partial retries and read-only recovery. UI checks use the actual progress source
at normal and short desktop heights with 135 rows and a long actual error.

Required full validation/build, deployment and live elapsed-time evidence are
recorded on completion. Native testing uses the already-authorized empty ARB
Notice column for the same 135 Series 125 records, without introducing dates.

## Primary SDK contract

[SDK2 update records](https://www.zoho.com/creator/help/js-api/v2/update-records.html),
[REST update records](https://www.zoho.com/creator/help/api/v2.1/update-records.html),
and [native status codes](https://www.zoho.com/creator/help/api/v2.1/status-codes.html).
