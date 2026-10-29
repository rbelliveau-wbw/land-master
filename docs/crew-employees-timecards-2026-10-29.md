# Crew Management 1.3.1 — employees and foreman locations

User direction: implement Aynsley's employee staffing roster and use each crew's
foreman timecards for its location badges. Keep only the last three calendar
months of timecards; retain employees who become inactive. Publish repository
main and Production widget assets; the user promotes Creator environments.

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

Installed in **Development**, with no Creator environment promotion:

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
Projects push guards are preserved. No new connection or Custom API was created.
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
The imports above were manual function executions in Development. After user
promotion, Production schedules run under the application's existing environment
settings. Creator record data does not travel with schema promotion: initialize
Production with the same sync functions or allow its first scheduled run.

## Release and rollback

Widget source, configuration, immutable release and Development/Production mapping
use 1.3.1. Older native versions retain the legacy crew workspace and manual badge
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
on main. The final 1.3.1 release includes the employee permission-refresh check.
