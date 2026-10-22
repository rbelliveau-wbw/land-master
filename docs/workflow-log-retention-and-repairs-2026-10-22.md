# Workflow log retention and failure repairs — October 22, 2026

The user approved three-month log retention, asked for the Production failures
to be investigated and repaired, and requested a complete change rundown. PMP
publishes repository main/Pages; Creator promotion remains with the user.

## 1. Workflow log retention — saved in Creator Development

New custom schedule `Workflow_Log_Retention` runs daily at 02:15 America/Chicago,
starting October 23, 2026. Its complete action is:

```deluge
retentionCutoff = zoho.currenttime.subMonth(3);
delete from Workflow_Run_Log[(Started_At != null) && (Started_At <= retentionCutoff)];
```

This uses three calendar months rather than 90 days and covers all statuses.
The exact cutoff is eligible; later timestamps and null start dates are retained.
Daily execution can leave a record for up to one additional day. The new
schedule is separate from orphan cleanup so it has one independently disableable
purpose and cannot change that workflow's unrelated deletions. No widget,
import, notification helper, connection or Custom API is needed for retention.

Creator accepted Save, and the persisted action and Properties showed the
correct date, time, timezone and Daily frequency. Development environment
schedule execution is already suspended; that setting was preserved. The
cleanup was not manually executed, and no workflow-log records were deleted.
Production retention requires the user to promote this schedule.

Source: `creator/integration-audit/prepared/Workflow_Log_Retention.{ds,action-1.dg}`.
Calendar arithmetic follows [Zoho subMonth](https://www.zoho.com/deluge/help/functions/datetime/submonth.html);
the native deletion uses [criteria-based delete](https://www.zoho.com/deluge/help/data-access/delete-records.html).

## 2. GP Development duplicate Attorneys key — live Analytics query repaired

The Production GP Development run stopped on a duplicate destination key.
Native Analytics preview confirmed two source groups with the same job, minor
code and Attorneys description, but different major codes. These are separate groups because
the original query grouped by major code as well as job, minor and description.

At the user's explicit direction, `Cost_Code_Number_1` was removed from GROUP
BY. The selected major is now `MIN(Cost_Code_Number_1)`, retaining the first
major under the original ascending sort order. Description grouping, every
source filter, SUM, selected column names, and ordering remain the same.
The saved query table visibly returns one Attorneys row with the combined total.
Live job identities and monetary evidence are retained in the user's local
report rather than published here. No underlying GP rows or imported
budget values were manually edited. The existing duplicate-source/destination
guards in the Creator importer remain in place.

Source: `creator/integration-audit/analytics/gp-development-costs.sql` and its
`baseline/` copy. SQLite fixtures execute both exact queries to verify that
only the split-major groups combine, included totals are preserved, credits
keep their sign, and range/zero/unmapped-job exclusions remain intact.

## 3. GP Engineering orphan mapping — live Production data repaired

The Production GP Engineering run stopped on a duplicate/broken GP mapping.
The Production report showed two `Great Plains` mappings for the same job:

- One extra record with Subdivision blank.
- One original valid record linked to the correct subdivision.

After the user explicitly approved deletion of the exact unlinked record, only
the extra unlinked record was deleted through the native report. Read-back showed
one remaining record, with the original valid ID and subdivision. No business
parent, budget, amount, cost row or other mapping was deleted. The importer
code and its duplicate/broken-mapping guard are unchanged. The before record
details were saved locally for review/recovery.

## 4. CTC / Percent Complete cross-system lookup — saved in Development

The Production CTC run failed at row 1. Its mapping lookup used
only `External_Code`; identical job codes can validly exist in Great Plains
and HeavyJob. The native Production report confirmed that shape for an actual job,
with both systems correctly linked to the same subdivision.

Only the CTC lookup was changed to:

```deluge
subdiv = External_System_Mapping[(External_Code == rec.get("H.JobCode")) && (External_System == "HeavyJob")];
```

The existing zero-match skip, exact single-match guard, non-null subdivision
guard, budget scope and destination assignments remain unchanged. True
same-system duplicates continue to fail. Creator accepted Update; this action
requires the user's Creator promotion. The preparation generator was updated
so regeneration retains the same system scope.

Source: `creator/integration-audit/prepared/Budgets_Import_Load_CTC_C.{ds,action-1.dg}`
and `scripts/prepare-integration-audit.py`.

## 5. Final Acceptance hidden export error — saved in Development

Production runs at 00:05 and 09:05 failed while waiting for the Tasks Analytics
export after receiving the 344 Projects rows. Both the durable workflow log
and Creator's native full log reported `null` at line 275. Other scheduled runs
completed successfully; the old logs do not establish the underlying transient
export cause.

A direct native Development execution of the unchanged `analyticsExportRows`
helper used the same Tasks view, selected columns and task-name criteria with
an empty audit ID. It completed successfully and returned 250 Tasks rows,
without running the importer, changing dates or creating workflow-log records.
The intermittent failure could not be reproduced, so retry/polling limits and
external transport were not changed.

The native action's outer `catch (syncError)` incorrectly executed
`throw dateError;`, a variable from an earlier nested date-parsing catch. The
handler now rethrows the actual sync error text with operation stage and project
code. This repairs the lost diagnostic; it does not claim to cure an unproven
Analytics outage, increase retry limits, replay imports, or alter date selection.
Creator accepted Update. The preparation generator now inserts the rethrow at
the balanced outer `syncError` block rather than matching an earlier nested
catch. Fixtures execute the actual handler with an unset date error and failures
at both export stages.

Source: `creator/integration-audit/prepared/Sync_Final_Acceptance_Due.{ds,action-1.dg}`
and `scripts/prepare-integration-audit.py`.

## Verification, promotion and rollback

- Full `npm run validate` and `npm run build:pages` passed. On this Windows host
  child-process validation requires execution outside the sandbox; the initial
  sandbox attempt failed with EPERM before those checks could run.
- Focused fixtures cover the retention boundary/status/null guards, system-scoped
  CTC matching, preserved Final Acceptance source errors, and actual GP SQL.
- Preparation checks preserve the original native destination assignments,
  insert payloads, schedules, selected columns, return contracts and external
  request counts of all 19 audited workflow components and three functions.
- No widget source/version/release, environment mapping, permission, connection,
  Custom API or global function was changed. Repository main/Pages publication
  records these backend/source repairs; it cannot deploy Creator actions.
- Promote exactly the new retention schedule and the two edited schedule actions
  through Creator Stage and Production. Production imports were not manually
  rerun, and historical error records were retained. The prior expected
  notification-validation failure is test evidence, not a new business failure.
- Rollback: disable the retention schedule to stop future deletion; restore the
  prior CTC/Final Acceptance actions from the original deployed-source snapshots;
  restore the Analytics baseline query; restore the one removed orphan mapping
  only if deliberately reverting that data repair. Disabling retention cannot
  recreate log records already removed after future production activation.

Exact live record IDs, amounts and before/after evidence are retained in the
user's local report, outside this public repository.
