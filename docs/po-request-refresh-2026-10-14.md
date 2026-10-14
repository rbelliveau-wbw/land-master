# PO request refresh and compact icons

Budget Manager 122.29.41 fixes a stale Requests cache after a successful PO
submission: the parent refreshed but its attached budget modification appeared
only after reloading. The saved callback now refreshes both request headers and
the existing budget workflow/modification reports, waits for both reads, then
repaints the current Requests list. Submitted approval decisions and deletion use
the same path; draft saves refresh headers only.

Existing generation, navigation, phase and actor guards remain authoritative.
Read failures keep the existing unavailable/Retry state without replaying any
write or converting a successful PO save into a failed submission.

The shared action column now right-aligns a compact group of available icons.
There are no blank slots for missing Edit/Delete actions. Names, approvers,
dates, amounts and statuses retain their aligned columns, including child rows.
Native permissions, accessible names and action handlers are unchanged.

Changed: Budget widget HTML, actual-source request regressions, widget/release
metadata, deployment mapping and request/module documentation. No Creator forms,
fields, functions or Custom APIs change; no Creator promotion is required.

Regression coverage: new child visibility in either read-completion order,
draft versus submitted refresh, approval/deletion callbacks, failed/stale reads,
and available parent/child icons. Run focused PO tests, full repository validation
and the Pages build. Native record testing is left to the user.

Rollback: map Budget Manager back to 122.29.40. Saved records are unaffected.
