# Tax save activity and batch Retry — 19.17.32

## Problem and behavior

The save dialog looked frozen during a native update. A subsequent screenshot
showed the app's 30-second write deadline retaining all 135 records as unknown.
Retrying the old Check updates action read each record separately, requiring
405 requests for 135 records; recovered Saved rows retained stale timeout text.

Active stages now show a rotating ring while saved counts remain based on real
confirmation. Reduced motion retains a static ring and Running label. Recovery
is labeled Retry at the user's explicit request. It shows a spinner, Checking
saved changes…, busy semantics and duplicate/dismissal locks while checking.
Pending Retry stays hidden during the original save. A physically pending write
retains its native lock even after timeout; the dialog shows that it is waiting.

Bulk native updates now have a separate 120-second default deadline. Individual
writes retain their 30-second default. These are application wait limits, not
claims about Creator's server limits. Workflows are preserved. Slow or lost
replies never trigger an automatic resend.

The new controller `recheckBatch` reuses the existing counted complete-scope
reader, then the proven wrapped 25-ID lookup only for missing captured selected
IDs. A same-scope 135-record check uses three calls, replacing 405 per-record
calls. Only explicit recovery compares captured editable values. Exact IDs,
count validation, actor/generation checks, held native/read slots and actual
read failures remain. Unmatched records stay unknown. Successful records lose
their old errors and the report refreshes to the recovered entered date.

## Impact and rollback

- Widget/version: Tax Center 19.17.32.
- Source: `tax-progress.js`, `tax-controller.js`, `widget.html`; focused tests,
  module/design documentation and immutable release/configuration.
- Forms/fields: existing Tax and Property fields only; no schema change.
- Creator functions, Custom APIs, workflows and permissions: unchanged.
- Frontend deployment: Development and Production mappings, permanent URLs.
- Creator backend publication: not required.
- Rollback: map Tax Center to 19.17.31 and rebuild Pages.

## Verification and limits

Focused tests cover a valid 45-second acknowledgement, real 120-second timeout,
held native locks, no replay, 135-row three-call recovery, partial 15/120 recovery,
entered dates, cleared stale errors, filter departures, failed reads and stale
actors. The actual-widget browser suite covers rotating activity without fake
count progress, reduced motion, Retry activity/locks, an ambiguous entered-date
save followed by three-read recovery and refreshed report input.

The failed browser attempt's retained ledger is not accessible in the connected
tab. A separate fresh production read showed 135 blank ARB Notice fields; that
does not confirm the user's intended date or reconcile the original attempt.
No production write was resent. Runtime timeout and recovery behavior are
verified with native-shaped fixtures; live release/loading evidence is recorded
after deployment.
