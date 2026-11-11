# Groundwork Integration Runner Behavior And Implementation Prompt

Prepared November 11, 2026 from Land Master source at `1f5a3076`. This describes
the implementation contract; it does not certify current Production health.

## What The Existing Runner Does

The Settings clock fires every five hours in America/Chicago. **Next Workflow
Run/Next Batch** captures the scheduled time and batch before advancing the
clock. The combined starter dispatches six imports: budget/project information
and the five jobs below. Separate wrappers for those five are disabled.

| Job | Business Work |
| --- | --- |
| Subdivision Schedule Dates | Copies acceptance and construction dates from Projects/Analytics; preserves conflicts for review. |
| HCSS Budget Line Checks | Refreshes changed source GUIDs or zeros confirmed obsolete imported budget costs. |
| HCSS Actuals | Imports HeavyJob totals and five independently preserved cost elements. |
| GP Construction Actuals | Imports construction actuals for minor codes 3000–3999. |
| GP Development Actuals | Imports development codes 4000–4999 and reimbursement codes 8000–8999. |

Four jobs use subdivision buckets `legacy Subdivision.ID % 5`, rotating through
0–4. One complete sweep therefore takes approximately **25 hours**. The date
sync is not bucketed. A durable starter frame freezes each cycle's identity;
claims prevent duplicate route, callback, chunk and source-row processing.

**Workflow Export Wake** delivers primary callbacks. **Workflow Export Continue**
handles Running legacy jobs; newer `shared-recovery-30m` runs are excluded.
Recovery checks every 30 minutes while protected work exists, parks when idle,
and rearms before accepting new work. Independently committed audit and ownership
records survive importing-transaction failures. Unknown writes are reconciled,
not automatically replayed.

## Prompt To Paste Into Groundwork

Build Groundwork's server-side integration runner to replace the Land Master
orchestration described here. Inspect Groundwork's actual framework, database,
queue and existing Project/Subdivision/Budget models first. Reuse existing domain
entities and authorization. Deliver migrations, connectors, workers, scheduler,
admin UI, meaningful tests and operator documentation. Keep credentials server-side.

### Forms Tables And Fields

Create or extend these entities, with environment isolation, foreign keys,
appropriate indexes and audit metadata:

- **Integration Settings:** timezone (`America/Chicago`), enabled state,
  next-cycle timestamp, current bucket (integer 0–4), bucket count (5), interval
  (five hours), concurrency and failure recipients.
- **Connection:** provider/system, organization/workspace IDs, server-side secret
  reference, enabled/authentication state and last successful authentication.
- **Job Definition:** stable key, display name, handler, connection, versioned
  source query, schedule/batch policy, enabled state, retry policy and deadline.
- **Cycle:** ID, environment, scheduled time, captured bucket, immutable ordered
  routes, scope/mapping/query versions, created time and dispatch state. Enforce
  uniqueness on `(environment, scheduled_time)`.
- **Job Run:** ID, definition, cycle/parent/retry links, status, phase, timestamps
  for start/finish/deadline/next attempt/heartbeat, duration, source export ID,
  immutable scope/query snapshot, checkpoint, received/processed/created/updated/
  skipped/failed counts, error code/message, details and notification state/error.
  Preserve Success, Failed, Partial, Skipped and Timed Out distinctions; add
  explicit queued/running/review states as needed.
- **Attempt/Event:** run and step identity, lease/fencing token, start/finish,
  stage, structured error, outcome and diagnostics.
- **Export Snapshot:** provider/view/query version, scope, external job ID,
  submission/completion, status, row count, checksum and immutable storage path.
- **External Mapping:** connection, external system, exact external job code,
  subdivision FK, active state and change history. Enforce one active destination
  per `(connection, system, external_code)`. Many distinct codes may reference
  one subdivision. Preserve strings and leading zeroes.
- **Imported Cost:** source/business key, system, job, subdivision, major/minor
  codes, source GUID, description, original total, Labor, Materials, Equipment,
  Subcontractor, Other, source timestamp, imported-at/run and budget-item FK.
  Use fixed decimal money with at least four decimal places and sufficient range.
- **Issue/Reconciliation:** run/source/entity key, issue type/severity, expected
  and observed identities, resolution, reviewer and timestamps.
- **Outbox/Queue Task:** unique task identity, versioned payload, available-at,
  attempts, lease expiry and acknowledged outcome. Track notification deliveries.

These replace Creator's `Settings`, `Workflow_Run_Log` and overloaded
`Workflow_Export_Lock` coordination roles with normalized records. Creator's log
fields include `Workflow_Name`, `External_System`, `Run_Status`, `Started_At`,
`Finished_At`, `Duration_Seconds`, `Stage`, `External_Reference`, all six row counts,
`Message`, `Details`, `Failure_Notified`, `Notification_Error`, `Export_State`, and
`Resume_At`. Its lock has unique `Claim_Key`, `Claimed_At`, `Wake_At`, `Cycle_State`.
Do not reproduce opaque serialized state where typed columns work better.

### Scheduling And Ownership

Implement six routes: budget/project info, subdivision dates, HCSS cleanup,
HCSS actuals, GP construction actuals and GP development actuals. In one database
transaction, create a cycle and route outbox records, capture its bucket and
scope, then advance the timestamp/cursor atomically. Workers never reread an
advanced Settings cursor to infer their batch. Preserve legacy bucket membership
on migration; UUIDs must not silently reshuffle subdivisions.

Use delayed queue tasks, expiring leases, fencing tokens, bounded chunks and
explicit checkpoints. Support at-least-once delivery with deduplicated effects;
do not claim exactly-once external operations. Startup intent must remain
recoverable between accepting work and committing its queue entry. Recovery runs
independently of business cadence and detects missing/stuck work without
blindly replaying an operation with an unknown outcome.

### Queries And Business Rules

Version the existing SQL and expected columns. Obtain the actual upstream SQL
for views not included in the supplied source before replacing Analytics itself.
View IDs and selected columns alone cannot reconstruct all joins or calculations.

**GP construction:** Analytics view `2107789000031077002`, “GP - Const Cost
Actuals”; source `GP - Job Cost Detail MSTR+HIST (JC00701+JC30101)`. Group by
`WS_Job_Number_Trim`, `Cost_Code_Number_1`, `Cost_Code_Number_2`; preserve
`MAX(Cost_Code_Description)`, `ROUND(SUM(Cost_Code_Act_Cost_TTD),2)` as
`Total_Actuals`, minor range `[3000,4000)` and current positive-amount filter.
Cost_Element 1–5 maps respectively to Labor, Materials, Equipment, Subcontractor,
Other. Return diagnostic `Unclassified_Actuals` and `Unclassified_Count`;
unknown GP element identities block import.

**GP development:** view `2107789000029311186`, “Great Plains - Development
Costs for Budget”, same source and elements. Preserve ranges `[4000,5000)` and
`[8000,9000)`, nonzero amounts including negatives, grouping by job/minor/
description, `MIN(major)` and unrounded source total. Detect resulting duplicate
destination keys rather than silently merging them. Any grouping/filter change
requires an output comparison and business approval.

**HCSS actuals:** view `2107789000023717814`, “HeavyJob Actual Costs joined w/
Subdivs”. Aggregate `HeavyJob_CostSummaryByJobCostCode` joined to
`HeavyJob_JM_Job` by source job GUID. Group by job code, final job code and minor
code; preserve source total `TotalActualCost`, maximum description/major and
summed `ActualLaborCost`, `ActualMaterialCost`, `ActualEquipmentCost`,
`ActualSubcontractCost`, **`Actual_Misc1_Cost` as Other**. Trucking, supplies,
Misc2 and Misc3 are intentionally excluded from the selected elements.

Totals and element sums may differ: preserve them independently, with no residual
allocation or equality requirement. Keep HCSS and GP rollups separate. Existing
actual keys are `job + "-GP-" + minor` or `job + "-HJ-" + minor`.

**HCSS cleanup:** view `2107789000023687048`; select
`H.zzz_CostCodeID_Guid`, `H.JobCode`, `H.Minor Code`, filtered to captured mapped
jobs with existing budgets. Stable budget key is subdivision code + `"-B-"` +
minor. Existing GUID means unchanged; changed GUID with the same stable key
means refresh `Cost_Code_ID`; confirmed missing stable key means zero the
obsolete `HeavyJob Budget` import's `Cost`. Do not insert rows or update unrelated
fields. Incomplete, failed or empty sources never authorize mass zeroing.

**Subdivision dates:** read Projects ID/Code from `2107789000000012031` and
Task ID/Name/Project ID/Due Date from `2107789000000012088`, filtering tasks to
“Final Acceptance” and “Accept - Muni”. Match existing subdivision codes and
update `Final_Acceptance_Due_Date`. Preserve REVIEW conflict policy: do not choose
arbitrary earliest/latest dates. View `2107789000014058199` supplies Const Plans
Release → `CP_Release_Goal`, Const Start → `Construction_Start_Goal`, Rough Start
Date → `Construction_Start_Estimate`. View `2107789000014196812` supplies CP Rel
Est (EST. Comp Date) → `CP_Release_Estimate`. Invalid dates and ambiguous
destinations remain review issues; unrelated valid fields may still update.

**Budget/project info:** preserve the existing three-stage route using Project
Code, Status, Gross Acres, Lot Total - Residential and Equiv. LF of Street from
view `2107789000000012031`. Port the actual assignments/exclusions from source;
do not assume source columns authorize overwriting manually owned Budget inputs.

Scope mapping joins by connection/system. Existing SQL code-list subqueries do
not consistently do this; compare proposed corrected output before activation.

### Export, Validation And Application

Submit an asynchronous Analytics export once, retain its ID, poll with bounded
backoff, and download only a completed matching job. Validate HTTP, schema,
scope and completeness. Store one immutable snapshot reused by all chunks;
avoid repeatedly downloading the entire export. Preserve the existing 15-minute
export window after scheduled start and two-hour actual-import deadline initially.

Preflight the entire actual source before writes: unique mapping, scope/code
range, decimals, required columns, known GP elements, source-key uniqueness,
destination identity and field limits. Existing destination source/subdivision/
major/minor must match; never silently reassign a financial record. Initially
match the current maximum 100-row scan/25-write chunks, then tune by measurement.
Upsert with database-enforced keys; skip unchanged amounts.

Retry transient reads with bounded backoff/jitter. Reconcile unknown writes
before retrying; database transactions and idempotent writes should make safe
recovery easier than Creator. A missing mapping, empty-valid result, unchanged
success, partial write and unknown outcome are different states.

### Improvements And Cutover

Build an integration dashboard showing job/bucket/scope, counts, source freshness,
last successful full sweep, next run, deadlines and linked issues. Alert on stale
subdivision data and missing starts as well as explicit failures. Provide dry-run
previews, audited mapping corrections/removal, affected-cache invalidation,
read-only reconciliation and deliberate retry of captured failed scope without
changing the shared cursor. Reject collisions such as one GP `D_TU01` mapping
to both Tucker and Turner, identifying both destinations.

Prefer normalized state, queue delays, transactional outbox and inexpensive local
audit writes over self-directed Creator API calls and per-record timer forms.
Consider independent schedules and incremental watermarks later, after freshness,
source corrections and deletion semantics are agreed. Never silently change
monetary rounding, source grouping, cadence or date conflict policy.

Test duplicate callbacks, crashes around commits, lost acknowledgements, stale
leases, recovery parking/waking, deadlines, failed/pending exports, corrupt/empty
snapshots, mapping collisions/changes, cross-batch isolation, duplicate cost keys,
negative GP adjustments, unknown GP elements, independent totals/elements and
empty cleanup safety. Compare old/new read-only outputs, then validate every
route and bucket before enabling writes. Disable obsolete schedules only after
successful cutover; retain audit history and a rollback plan.

## Source References

- [Clock and cadence](../knowledge/architecture/shared-workflow-cadence.md)
- [Starter frame](../creator/functions/workflowStarterFrame.dg),
  [dispatch](../creator/functions/workflowStarterDispatch.dg),
  [enqueue](../creator/functions/workflowExportEnqueueCaptured.dg)
- [Query plans](../creator/functions/workflowExportPlan.dg),
  [business runner](../creator/functions/workflowExportRun.dg),
  [actual importer](../creator/functions/budgetActualImportRun.dg)
- [Actual SQL directory](../creator/workflows/budget-actual-elements/analytics/),
  [element contracts](../creator/workflows/budget-actual-elements/schema.json)
- [Continue eligibility](../creator/continue-schedule-filter-2026-11-08/release-notes.md)
