# Crew Management — implementation and acceptance kit

Candidate release: **1.2.0**. Scope: usable manual crew management, the existing
milestone editor, and the newly requested lightweight Projects task mirror.
Repository publication and Creator installation are separate. **PMP leaves
Creator promotion to the user.** Native outcomes are recorded by the installer in
[native-install-progress.json](../creator/crew-locations/native-install-progress.json),
[removal-inventory.json](../creator/crew-locations/removal-inventory.json) and the
release verification material. This document does not infer native success from
isolated tests.

## Current native evidence

Development `crewLocationsRead` and `crewLocationsWidget` were saved and reopened.
The final reopened Widget and Crew_Assignment validation snapshots now pass all
**9 backend groups**, including the native formatter guard checks. The Widget's
final-refinement resave is complete. Native validation workflow names are
`Crew_on_validate`, `Crew_Assignment_on_valida` and
`Task_Schedule_mirror_guar`; the longer repository source names are retained in
the removal inventory for an exact future rollback.

All six lightweight task fields and optional `Subdivision1` / `Stage_Key` were
reopened and verified in Development. The existing `All_Task_Schedules` report
has **19 saved web-layout columns including ID**. Evidence:
[native fields](../creator/crew-locations/native-installed/Task_Schedule.field-evidence.json)
and [report layout](../creator/crew-locations/native-installed/All_Task_Schedules.layout-evidence.json).
This proves the native schema/layout, not an SDK data read or source import.
`taskMirrorEnabled`, `tasksEnabled` and `taskWritesVerified` remain false;
`crewLocationsImportTasks` is not installed and automated Projects ingestion is
unconfigured.

The existing owner's Development `User_Access` record
`4410926000003608006` now has `Manage_Crew_Assignments=true`, saved through the
native form with a success toast. No other permission was changed in this step.
**Live crew CRUD is still unverified:** the direct Crew form and All_Crews report
remain inaccessible even to the owner with preview identity MySelf. That access
problem is under investigation. No native create/edit/reactivate/assignment-save
pass or broader profile-rights change is claimed. Full repository validation
passed; Creator promotion remains the user's step under PMP.

## Daily workflow

The opening Crews workspace has a searchable active/inactive roster, with one
crew's latest dated work, upcoming dated work and earlier history beside it. A
user can create a crew, edit its optional name and badge color, deactivate or
reactivate it, add a dated phase assignment, and correct the crew, phase or date
of a manual assignment. Crew codes and record source identity remain stable.

An assignment is a dated record. The interface does not infer an ongoing crew
placement, assignment end date, worker capacity or staffing span from it.
Imported assignments are read-only. Inactive crews keep their history and cannot
receive new assignments. Correction of an existing assignment can retain its
inactive crew; choosing a different crew requires an active one.

The separate Milestones & tasks workspace retains the existing linked timeline
and schedule editor. Its crew badges use only source dates from today minus
seven days through today. Management loads every permitted assignment date so
future work is visible beyond that badge window.

## Contract and native installation

No new Crew/Crew_Assignment forms, API names or connections are introduced.
The installed forms and verified reports are reused:

| Native component | Required fields / change |
| --- | --- |
| `Crew` / `All_Crews` | `ID`, `Crew_Code`, `Crew_Name`, `Badge_Color`, `Active`, `Source_System`, `Source_Record_ID` |
| `Crew_Assignment` / `Crew_Assignment_Report` | `ID`, `Subdivision1`, `Crew`, `Assignment_Date`, `Source_System`, `Source_Record_ID`, `Source_Key` |
| `Subdivision` / `All_Subdivisions` | `ID`, identity/code/phase/subphase/territory fields, and both `Status` and `Projects_Status` |
| `User_Access` | Existing installed `View_Crew_Locations` and `Manage_Crew_Assignments` checks; no implicit rights from another module |
| `crewLocationsWidget` | Paginated management reads; validate and prepare one record; explicit read-only recovery |
| `crewLocationsRead` | Extend caller-scoped report allowlist to the two verified Crew reports |
| `Crew_on_validate` | Created/edited On Validate: rights, native target scope, code/source immutability, color and source validation |
| `Crew_Assignment_on_validate` | Created/edited On Validate: rights, exact manual lineage, source immutability, active target crew, scoped old/new phases and both status locks |

The mandatory native workflows run for SDK writes. The adapter uses
`ZOHO.CREATOR.DATA.addRecords` and `updateRecordById` without `skip_workflow`.
Zoho documents that Add Records executes associated workflows by default:
[Add Records API](https://www.zoho.com/creator/help/js-api/v2/add-records.html).
Their installation must be verified before this feature is treated as protected
against direct native form/report requests.

New records use `Source_System=MANUAL_WIDGET` and the UUID request identity.
Assignment `Source_Key` is `MANUAL_WIDGET:<requestId>`. Corrections patch only the
editable native fields. Existing `MANUAL_QA` assignments with exact source keys
remain editable. Imported lineage is retained and read-only.

Management actions are `management-list`, `save-crew`, `save-assignment` and
`management-status`. The save API returns a validated `state:ready` native
descriptor; the browser performs one native form create or exact-report-ID
update. A successful native acknowledgement must confirm the intended ID and
single-record count. It does not require a post-save editable-value comparison.
A lost or identity-free acknowledgement retains the draft, blocks another write
and offers read-only status recovery; status never resends the write.

Native report sharing, row restrictions, form create/edit profile rights, the
existing delegated connection's report read scope and the module flags are
distinct gates. An Admin-only Custom API registration is not proof that a
restricted user can reach the feature. Do not widen a profile, connection or
API scope merely to make a test pass.

Creator's native formatter was observed removing boolean grouping in mixed
AND/OR guards. The management and native assignment guards therefore use staged
booleans and nested conditions. The backend checks also inspect the reopened
native snapshots and evaluate their recorded guard predicates against empty,
denied and contradictory native responses. A repository-source pass alone is
insufficient evidence that the native formatter preserved those guards.

## Original brief acceptance matrix

The source brief is the user-supplied October 20 implementation prompt. Later
explicit instructions govern the differences listed below.

| Check | Implementation / evidence boundary |
| --- | --- |
| 1. Native schema, distinct M/T sources | Existing schema contracts and native installation inventory; no copied milestone dates. New manual management reuses installed forms. |
| 2. Phase/subphase identity | Creator IDs remain strings. Joins use IDs, not similar names. |
| 3. Chicago reporting/calendar arithmetic | Existing calendar-day model and fixed-clock schedule fixture; badges remain independent from management's all-date reads. |
| 4. Union filters, restrictions, search | Existing shared scheduling model and rendered schedule harness. |
| 5. Exact upcoming Rough Cut | Existing exact milestone stage/date logic; unavailable T data never supplies an M date. |
| 6. Linked M/T pairs and Show all | Existing schedule behavior, preserved with workspace tab changes. |
| 7. Month/year axis from today | Existing calendar timeline. |
| 8. Missing Closeout regression | Existing exact constituent intervals and 11/09/2026 fixture regression. |
| 9. Missing/reversed/ambiguous source data | Existing model diagnostics; no fabricated dates or name-based job mapping. |
| 10. Opaque section colors and blue hatching | Existing timeline renderer and rendered schedule checks. |
| 11. Day counts / row labels / badge position | Existing timeline and schedule checks. |
| 12. Desktop readability and reachable phases | Later desktop sizing direction uses bounded scrolling workspaces with frozen labels/headings. New roster/detail workspace is explicitly required by the later crew-management request. |
| 13. Stage/type-specific edits, Days, arrows | Existing validated, audited scheduling operations and regression harness. |
| 14. Hidden propagation and visible boundaries | Existing complete-data propagation and view-only hide/restore controls. |
| 15. Exact M handles, no T dragging | Existing renderer/server guards; task-table writes remain gated by verified source semantics. |
| 16. Both raw phase statuses lock writes | Existing milestone validation plus new manual-assignment prepare/native workflows; a display filter is never authorization. |
| 17. Date protections / valid overlaps | Existing milestone calendar validation. Manual assignment dates are dated work records and may be historical; they do not move milestone endpoints. |
| 18. Native and module access | Caller-scoped reads and native profile/row gates; isolated denied/profile/field tests are not restricted-user live verification. |
| 19. Save failure, duplicate/unknown requests, conflict | Existing scheduling staged operations; new one-record management duplicate guard, exact acknowledgement and read-only recovery. No fixture writes are sent to Creator. |
| 20. Outbound sync/freshness | Superseded by the explicit October 21 Creator-only direction. `Push_Update=false`; no Projects dispatcher or false external-sync success claim. Daily inbound Analytics can replace Creator-only milestone dates. |

## Task mirror and external sources

The user subsequently authorized a lightweight form mirroring individual Zoho
Projects tasks. Reuse/extend `Task_Schedule`; preserve individual task, external
project and phase IDs, raw dates/status and explicit stage mapping. Screenshot
columns identify requested shape, not an authenticated query or a verified task
API mapping. Blank Start/Due values stay blank. Completion date is not a
replacement for either endpoint.

The installed Development additions to `Task_Schedule` are `Task_Name`, `Task_Code`,
`Source_Project_ID`, `Task_Status`, `Completion_Date` and `Milestone_Task`.
`Subdivision1` and `Stage_Key` are verified optional so an individual source task
can be retained without inventing a phase match. `Stage_Key` stays blank when no explicit
mapping is verified. `Source_Task_ID` remains the task's external string ID.
The controlled `crewLocationsImportTasks` path can retain these unresolved,
read-only task records behind the separate default-false `taskMirrorEnabled`
flag. `tasksEnabled` and `taskWritesVerified` remain false. The revised native
Task_Schedule On Validate path was installed as `Task_Schedule_mirror_guar` and
blocks ordinary form/API impersonation of the configured importer. The importer
function remains repository-only and uninstalled. These schema/workflow changes
await user promotion and do not establish an automatic Projects schedule or a
live source adapter.

The native layout verification distinguishes the complete candidate schema from
installed snapshots. Only the six explicitly recorded pending task-mirror field
names may be absent from the installed Task_Schedule snapshot, and all three
task mirror/source/write flags must remain false while any are pending. Missing
unrecorded native fields still fail validation. This preserves a truthful PMP
package without relabeling an unfinished native installation as verified. The
current pending-field list is empty: all six additions are now confirmed and the
complete installed task-field layout is checked.

The task mirror's repository schema, native installation and actual automated
ingestion are separate deliverables. The installer records exact additional
fields and evidence. An unconfigured portal/query, unknown Projects task IDs or
an unverified stage/write rule stays an explicit dependency. Task dates must not
be turned on by inventing stage rollups or copying milestone dates. Likewise,
manual crew management does not configure an external crew provider or HeavyJob
mapping. External crew/task import flags remain off until their actual inputs
are verified.

## Test and release procedure

Local-only fixtures are served by `npm run preview:crew`. The SDK replacement is
injected only by that preview server. No fixture file is copied into widget
source, immutable releases, the Pages output or Creator.

| Local preview | Purpose |
| --- | --- |
| `/widget.html?managementChecks=1` | Actual rendered manual CRUD, validation, duplicate-click guard, native rejection, lost/ambiguous acknowledgement recovery, read-only/denied/field/pagination/row-scope checks and desktop geometry |
| `/widget.html?checks=1` | Existing rendered scheduling regression; explicitly opens the schedule workspace |
| `/desktop.html` | Existing schedule geometry at 1250×600, 1366×768, 1440×900 and 1920×1080 |
| `/desktop.html?workspace=crews` | Crew roster/detail, editor/picker bounds, centered close SVG, keyboard focus and no-overflow checks at the same four desktop sizes; no record writes |
| `/widget.html?management=1` | Manual visual review of the new workspace with native-shaped isolated records |

Fixtures include decimal IDs beyond JavaScript safe integer range, lookup
objects, boolean/string checkbox shapes, inactive crews, future records, source
locked records, missing-field failures, native create/profile denial and
independent paginated report cursors. The test script publishes its per-check
result to `window.CrewManagementQA`; a written test is not a passed test.

The final rendered management run passed **17 groups** in the root-controlled
browser, including native acknowledgement-envelope ambiguity, plain returned and
thrown native 2897 denial, caller-scope/field failures, independent pagination,
legacy-service promotion gating and visible white crew badges. The scheduling
geometry run passed **23 checks at each of the four desktop sizes**. Management
geometry is recorded separately after its four-size rerun; the first 1250×600
pass found an outdated test expectation for the new-crew initial focus, which was
corrected to the required code field. No geometry check writes native records.

The final `npm run validate` passed, including all nine backend groups. Required
release gates remain `npm run validate` and `npm run build:pages`, then
immutable release creation, main/Production environment mapping, CI and Pages
monitoring under PMP. Use actual native Development compile/save evidence for
Creator changes and leave their promotion to the user. Native create/edit and
restricted-user tests must be reported separately from isolated browser checks.

Rollback maps the widget to **1.1.4**. Retain crew and assignment records rather
than delete them during rollback. Keep the exact removal inventory, existing
milestone widgets/pages, connection, operation history and Projects guards.
