# Crew Management 1.3.2 — employees and foreman locations

Initial user direction: implement Aynsley's employee staffing roster and use each crew's
foreman timecards for its location badges. Keep only the last three calendar
months of timecards; retain employees who become inactive. Publish repository
main and Production widget assets; the user promotes Creator environments.

## Audit follow-up — October 29, 2026

The user subsequently authorized promotion of **all pending Creator changes**,
including changes from other requests. This supersedes the initial handoff above. All **35 pending components** were
published to Stage and Production as **Creator 9.132**. CI and Pages publishing
passed for commit `ba841503`.

Both syncs already used the durable `workflowRunLog` and completion-gated
`analyticsExportRows` helpers. This follow-up aligns their remaining audit behavior
with the other Analytics imports:

- Every inspected source row is processed, including intentional employee skips.
  Before Success, received must reconcile with processed and created/updated/skipped.
- Missing source columns, bad identities/flags/dates and incomplete exports stop
  before mutations. Exports select only the five employee or eight timecard fields
  actually used; the same source/date window and mappings are preserved.
- Failures before a write report Failed; failures after attempted writes report
  Partial, with the source key, operation stage, completed counts and rollback/retry
  warning. Business operations are never replayed automatically.
- Timecard logs include unmapped, tombstoned and expired totals plus the calendar
  cutoff. Count reconciliation precedes tombstones and expiry. Failed imports
  never proceed to retention.
- Existing independent terminal timestamps, configured failure notifications and
  the 30-minute still-Running watchdog are inherited. No new recipients,
  connections, Custom APIs or log schema fields are introduced.

Column validation runs once at the export boundary, matching the shared helper;
per-record identities, flags and dates remain validated across the complete export.
An initial repeated-column preview exceeded Creator's statement budget. The lean
export and boundary validation passed the full 1,616-record native preview.

The actual Deluge bodies are exercised in `scripts/test-crew-sync-audit.mjs` with
native record/transport fixtures: normal/dry runs, inactive staffing preservation,
missing/duplicate source data, audit-start failure, interrupted writes, lost audit
finish, count mismatch, tombstones and retention failures. Native compilation and
real audit records supplement these fixtures. The employee native run reconciled
592 received/processed, 72 updated and 520 skipped; its durable log showed Success.
The audited native timecard run then received/processed/updated all 1,616 records,
with 1,442 unmapped, zero tombstones and zero expirations. Its durable log also
showed Success with the 2026-07-29 cutoff.

The function changes require no widget source change; widget assets remain 1.3.2.
Stage now maps Crew Management to that same immutable release so the promoted
Creator app can load its widget in Stage; Production remains on 1.3.2. To roll back only the
audit refinements, use `native-before/crewSyncEmployees.audit-20261029.dg` and
`native-before/crewSyncTimecards.audit-20261029.dg`, preserving the previous
employee/retention behavior and the shared audit helpers. Full Creator rollback
must account for every component promoted in the application bundle.

## Behavior

Employees opens first after the native capability is promoted. The roster defaults
to Active and offers Inactive/All plus search. Operators with the existing crew
management permission can set Territory (including N/A), Labor type, and Crew.
Labor choices are Superintendent, Foreman, Skilled, Unskilled, Pipe Layer, Laborer.
New crew opens the existing native crew editor. Staffing and crew names require
an operator's choices; the import does not fabricate staffing assignments.

An employee marked Foreman owns the crew selected on that employee. Its abbreviated
badge appears on every exactly mapped phase where that foreman's timecards fall
between today and six days earlier, inclusive, in America/Chicago. Utility Crew 1
becomes U1, Rough Cut 1 becomes RC1, Finish 1 becomes F1. Multiple crews/phases are
supported. Duplicate BU identities fail closed. Deleted and future cards do not
create badges. Inactive foremen or crews show a grey Inactive badge while the
timecard is still within the window. The timeline grows with selected phase rows;
the editor keeps its own scrolling area.

The join is exact, case insensitive GUID identity:

`HeavyJob_JM_Timecard.ForemanID = Employees.BU_Employee_ID = zzz_BUEmployeeID_Guid`.

One employee was checked in both Analytics tables: ForemanID and BU employee GUID
matched, the employee codes matched, and the master employee GUID differed.
Names and employee codes are never fallback keys. JobCode resolves only through
one existing `External_System_Mapping` row with `External_System = HeavyJob` and
the exact `External_Code`. Unmapped jobs stay unmapped; no project-name/prefix
guessing or manual-assignment fallback is used in foreman mode.

## Native installation

Initially installed in **Development**; the full component bundle is now
promoted to Stage and Production **9.132**:

| Component | Purpose |
| --- | --- |
| Employees / All_Employees | BU_Employee_ID (required, unique), Employee_Code, EmployeeName, IsActive, Territory, Labor_Type, Crew lookup, Synced_At |
| Crew_Timecards / All_Crew_Timecards | Timecard_ID (required, unique), Work_Date, Foreman_ID/Code/Name, Job_Code/Name, Subdivision1 lookup, IsDeleted, Synced_At |
| crewSyncEmployees | Validates a complete Analytics export, creates named active/nondeleted people, updates retained people's status, preserves staffing |
| crewSyncTimecards | Validates and upserts a rolling three-month export, tombstones cards absent from the completed window, expires older mirrors after successful upserts |
| crewEmployeeWrite | Existing permission checks and caller-scoped native report validation; prepares only the three staffing fields for SDK update |
| Employees_Staffing_Guard | Created or Edited → Validations on form submission; denies interactive creation and edits to sync-owned fields, validates staffing and active crews |
| Crew_Timecards_Source_Gua | Created or Edited → Validations on form submission; denies interactive source edits |
| Daily_Crew_Employees | Daily **05:00 America/Chicago**, starts 2026-10-30; `thisapp.crewSyncEmployees(false);` |
| Daily_Crew_Timecards | Daily **05:15 America/Chicago**, starts 2026-10-30; `thisapp.crewSyncTimecards(false);` |

The existing `crewLocationsRead` allowlist, `crewLocationsWidget` routing/capabilities
and `crewLocationsConfig` flags were extended. Stable Custom API names, logged-in
Creator connection, Analytics connection, original milestone page identity and
Projects push guards are preserved. The sync installation created no new connection
or Custom API; the separately approved Stage alias is recorded below.
`projectsPushEnabled` remains false. Direct Deluge sync writes bypass interactive
On Validate workflows; browser staffing saves use native SDK validation.

Analytics workspace `2107789000000003001`; employee view
`2107789000036057124`; timecard view `2107789000022718491`.
Both syncs reuse the installed `analyticsExportRows` adapter and workflow run log.
The separate source-specific functions are necessary for their different identity,
retention and staffing-preservation rules. Dry run writes neither business records
nor audit records. Malformed/empty/truncated exports fail before retention. A
failed upsert can leave partial refreshed mirrors, which an idempotent retry repairs;
it never proceeds to old-card deletion. Retention affects LM mirrors only.

Inactive employees are never deleted by either sync. Missing directory rows do
not imply inactivity. Existing people with a blank incoming name still get their
active status updated while keeping their saved name. New unnamed or inactive
people are skipped. A full native export has not been regenerated: the captured
saved component definitions in `creator/crew-locations/native-installed/` are the
authority for these additions; generated full-export metadata remains historical.

## Verification and limits

- Native Deluge compilation and reopened function/form/report/schedule definitions.
- Published widget in Development: all 72 employee records read through the native
  SDK; unchanged staffing saved to the same record with native success. This used
  the current authenticated administrator, without impersonating other profiles.
- Employee dry run and initial Development import: 592 source rows, **72 created**,
  520 skipped (inactive/deleted/unnamed). A second run created zero and updated the
  same 72 people, proving import idempotency.
- Timecard dry run and initial Development import: **1,616 created**, **1,442
  unmapped**, zero expired. The remaining 174 cards mapped exactly to phases.
  Job mappings must be completed before those unmapped cards can place a badge.
- Pure model tests cover exact BU identity, seven dates, multiple crews/phases,
  inactive badges, deletion/future exclusion and duplicate/unmapped cases.
- Actual local browser employee editor save, Active/Inactive filters, keyboard
  picker behavior and real badge rendering use isolated synthetic records.
- Existing schedule and crew management browser regression suites and desktop
  layout checks, employee read-only permission refresh; full `npm run validate` and `npm run build:pages`.

Development schedule executions are suspended by the existing environment setting.
The imports above were manual function executions in Development. After the completed
promotion, Production schedules run under the application's existing environment
settings. Creator record data does not travel with schema promotion: initialize
Production with the same sync functions or allow its first scheduled run.

## Release and rollback

Widget source, configuration, immutable release and Development/Production mapping
use 1.3.2. Older native versions retain the legacy crew workspace and manual badge
source until the Creator capabilities are promoted. All employee/timecard native
components are listed in both removal inventory and installation progress records.

To roll back the widget, set Development and Production crew-locations mappings to
the preserved 1.2.7 release (or prepare a new rollback release if Development's
latest-release check requires it). Disable the two new schedules and feature flags
in Creator if rolling back the native behavior. Preserve imported records and
staffing until explicitly authorized to remove them. Restore only the three scoped
function changes from `native-before/*.employees-20261029.dg` if needed; do not
replace unrelated application changes or promote Creator automatically.

The immutable 1.3.0 candidate is preserved but was never mapped to Production
on main. The final 1.3.2 release includes the employee permission-refresh check.

The 1.3.2 follow-up widens the employee action column and keeps Edit on one line
in the actual Creator desktop embed; no staffing or sync behavior changes.

## Production handoff after audit follow-up

Production Crew Management 1.3.2 loads through its existing authenticated API with
the promoted 9.132 capabilities and reports. Creator promotion copies schema/code,
not the Development mirror records: Production currently shows zero employees.
Its first daily imports are **October 30, 2026 at 05:00 and 05:15 America/Chicago**.
No Development staffing or timecard lookup data was copied into Production.

Stage 9.132 publication succeeded and its immutable assets are mapped. Its widget
preview exposed the missing `Crew_Locations_Widget_STAGE` API alias. After the
separate explicit user approval, that alias was created and enabled with POST,
OAuth2, **Admin only**, application/json, Key and Value `payload`, and Standard
response. It binds to the existing `crewLocationsWidget` in **Land Master STAGE**
(application `4410926000000011415`, function `4410926000005291477`). No new
connection, credential, form, field or function was introduced. This global API
configuration does not require another Creator application promotion.

Loading the actual Stage Crew Management 1.3.2 preview generated **three HTTP 200
Success entries** in the alias's native API Hits tab. The existing handler then
returned **Crew Locations access has not been granted**. Transport/routing is
verified; Stage roster/data behavior is still limited by the account's existing
module access. No User_Access records or module permissions were changed.
Production continues to use its existing API successfully.

The user requested deletion if unused. The alias is **retained because the Stage
preview actually invokes it**. If that consumer is retired, remove only the Stage
alias; preserve the Development/Production endpoints. Disabling it is the
reversible rollback and restores the former Stage connection failure without
affecting Production. Its exact configuration, usage and cleanup condition are
recorded in both removal/install inventories and
[`Crew_Locations_Widget_STAGE.api-evidence.json`](../creator/crew-locations/native-installed/Crew_Locations_Widget_STAGE.api-evidence.json).
The existing DEV API's current native scope was observed as All users and the
registry was corrected to match; its permissions were not modified. Widget
release/mappings remain 1.3.2, Creator remains 9.132, and the earlier full validation
and Pages build remain applicable; the metadata update also passes repository
validation.
