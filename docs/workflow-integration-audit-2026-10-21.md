# External workflow execution audit

Creator backend rollout and Settings Manager 1.5.17 add a durable execution log.
The approved October 21 Development export is the review baseline; business
field assignments, insert payloads, schedule times and existing exclusions are
preserved. The original EA04 missed-run cause was not established by its later
successful rerun.

## Contracts

- Form `Workflow_Run_Log`, report `Workflow_Run_Log_Report` (Workflow Log).
  Each run records workflow/system, status, start/finish/duration, stage,
  external reference, received/processed/created/updated/skipped/failed counts,
  message, details, failure notification acknowledgement and notification error.
- `Settings.Workflow_Log_Failure_Recipients` is a multi-select lookup to
  `User_Access`, exposed on `All_Settings`. Email resolves `Approver_Email`
  for every selected person, independently of approval roles or enabled flags.
  Missing emails are recorded; no configured recipients is an explicit error.
- `workflowRunLog(map)` uses fixed Creator create/update endpoints through
  `workflow_audit_admin`. Development and Stage send the native environment
  link name; Production omits the environment header. Unknown environments fail
  closed. A successful write requires one native acknowledgement for the exact
  record identity. Ambiguous writes are never replayed automatically.
- These API writes commit independently of the importing transaction. The
  `Finalize_Workflow_Run_Log` form workflow stamps terminal times and sends
  failure mail in that independent transaction. A native rollback test proved
  that inline native log writes would otherwise disappear with caller errors.
- `Workflow_Log_Timeout` runs once, 30 minutes after each run's `Started_At`.
  It marks only still-Running entries Timed Out, triggering the same failure
  notification workflow. It never reruns an import. A platform-wide outage or
  a schedule that never starts requires Creator/platform monitoring; this
  in-application watchdog cannot execute while Creator itself is unavailable.
- `analyticsExportRows` starts an asynchronous export, checks the same job up
  to 12 times, and waits ten seconds only between pending responses. It downloads
  only after completion (1004); pending 1001/1002 are bounded, all other terminal
  statuses fail. HTTP errors, missing jobs/data, wrong job IDs, unexpected empty
  results and missing selected columns fail before processing. Only explicitly
  empty-valid query views permit an empty result.
- Workflow actions rethrow failures after recording Failed or Partial. Partial
  means writes were attempted/completed before the error; Creator may roll back
  native operations. Check destination records before retrying. Counts do not
  guarantee that an interrupted transaction committed.
- Missing external mappings and missing budgets remain intentional exclusions
  with separate counts. Duplicate/broken mappings and duplicate destinations
  are errors. Inactive workflows retain their inactive status. The budget
  project workflow retains three actions, each with its own identified run.

## Settings UI

Automation contains Workflow Log Failure Recipients. Workflow Log loads lazily
through the existing authenticated SDK2 counted reader, for Today / 7 / 30 days
in America/Chicago. It supports date/time sort, failures-only, search, 50-row
display pages and full native report access. No backend paging cap truncates
the selected date range. Actor/environment changes and denied access clear
private history. Transient refresh errors retain authorized prior results.
Messages/details are escaped. No log mutation API is exposed by the widget.

The feature registers shared tab/panel/row/feedback motion and keyed numeric
transitions for row counts/durations and displayed totals. IDs/dates stay still;
refresh preserves mounted results, open details and input focus. Existing
Settings autosave acknowledgement and recipient lookup identity gates remain.

## Verification and rollback

Focused fixtures execute the actual Deluge transport/logger with mocked HTTP,
checking completion gating, bounded pending results, HTTP/schema errors,
environment isolation, exact acknowledgement identity and no write replay.
Preparation checks compare every original native field expression and insert
payload, selected columns, schedules, function return shapes and request counts.
Widget fixtures cover lazy complete reads, Chicago cutoffs, AM/PM ordering,
filters, paging, HTML escaping and permission/identity resets.

Native Development checks include a completed nonempty GP Analytics export,
the rollback experiment, independent terminal timestamps, captured missing-email
errors, and successful shared administrator logger creation/update. Import
actions are compiled in Creator; imports are not bulk rerun to test logging.

Rollback the frontend mapping to Settings Manager 1.5.16. Backend rollback must
restore the individually reviewed baseline actions/functions; leave log history
intact. Do not delete the form or disconnect the logger while audited callers
still reference it. The OAuth grant has form-create/report-update scopes;
application connection access is limited to Land Master, while helper endpoints
are fixed to the audit form/report. OAuth itself is not scoped to one form.
