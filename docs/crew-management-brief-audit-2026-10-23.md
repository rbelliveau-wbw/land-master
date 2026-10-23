# Crew Management — implementation and acceptance kit

Publication release: **1.2.3**. Scope: usable manual crew management, the existing
milestone editor, and the newly requested lightweight Projects task mirror.
Repository publication and Creator installation are separate. **PMP leaves
Creator promotion to the user.** Native outcomes are recorded by the installer in
[native-install-progress.json](../creator/crew-locations/native-install-progress.json),
[removal-inventory.json](../creator/crew-locations/removal-inventory.json) and the
release verification material. This document does not infer native success from
isolated tests.

Historical verified release 1.2.0, commit
`b64591c4eabbc94934b6a26837b8d1b451032103`, reached main and Production. That merge
preserved concurrent main changes from
`e4b740ff`, and full merged validation passed.
[CI succeeded](https://github.com/rbelliveau-wbw/land-master/actions/runs/39977572496)
and [Pages deployment succeeded](https://github.com/rbelliveau-wbw/land-master/actions/runs/39977572515).
This publishes widget assets; it does not publish Creator changes or prove live
new-widget CRUD.

The final immutable **1.2.3** release is ready for publication.
Local 1.2.1 and 1.2.2 drafts will not be published. The final candidate includes
the refresh hint and short-height spacing/subtitle correction; fonts and control
sizes stay readable. It preserves concurrent main changes from `21ef0b75`
(Land Master 8.17.3 / Contracts 1.62.36). Final full merged validation passed with
exit 0, the Pages build passed for 33 paths, and Creator packaging passed.
Final full merged validation 63957 passed after the bounded DirectValidate
refinement; the earlier 9637 pass remains history. The 1.2.3 widget is unchanged.
Development and Production mappings are 1.2.3 in this publication. CI, Pages and
the presentation smoke check still await live 1.2.3 assets; their future success
is not claimed here.

## Current native evidence

Development `crewLocationsRead` and `crewLocationsWidget` were saved and reopened.
The final reopened Widget and Crew_Assignment validation snapshots now pass all
**11 focused backend groups**, including the native formatter and schedule guard checks. The Widget's
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
The distinct Production owner record `4410926000004465004` also had only
Manage_Crew_Assignments enabled. Its reopened form confirms View Crew and Edit
Milestones true, Edit Task Dates false, and Manage Crew true. These are data
permission changes; the Creator application has not been promoted.
The earlier owner-preview access problem resolved after a full owner Development
reload. **Actual 1.2.0 Development widget CRUD passed:** create, edit name/color,
deactivate/reactivate, add dated work, reassign the same assignment and Refresh.
Inactive crews retained dated work and disabled Assign work. The actual phase
picker visibly locked protected phases. No broader profile-rights change was
needed and no real milestone dates were changed during these checks.

| Development native test record | Verified result |
| --- | --- |
| Crew `4410926000005393014` / `TEST-DEV-1023` | Name changed to `TEST Development Crew — edited`; badge `#FFFFFF`; deactivated and reactivated |
| Crew `4410926000005393018` / `TEST-DEV-B-1023` | Created through the actual widget |
| Assignment `4410926000005393016` | Created for Crew A / Cameron01 / 10/23/2026, then reassigned to Crew B / AAA Springs01 / 10/24/2026; same ID and exact corrected values remained after Refresh |

These Development test records remain. The earlier three Production QA crews
also remain. The intentionally invalid native `MANUAL_QA` / non-UUID create was
rejected with no row created; two earlier preparation failures likewise created
no rows. Positive widget verification is separate from that negative guard test.
Production native behavior still awaits the user's Creator promotion under PMP.

`crewLocationsValidate` was saved and reopened with all seven formatter-sensitive
mixed guards rewritten. The captured checks now cover milestones without task
source fields, single-record table/duration/drag changes, duration anchors and
arrow eligibility. The existing canonical timestamp ABA protection is retained.
The captured management/schedule checks test actual reopened Crew, Assignment, Widget, Read
and Validate snapshots as well as source behavior.

A final bounded DirectValidate audit replaced a stale local snapshot with a fresh
live capture. The actual live function already had canonical prepared/saving and
exact nested-target checks; no live bypass is claimed. Three remaining mixed
permission/past-date guard families were staged for formatter resilience without
changing rules. The reopened 5,199-character snapshot has zero mixed lines. The
eleventh focused backend group passes against it, and 24 scheduling groups pass.
Include `crewLocationsDirectValidate` in Creator promotion; fresh native-before
and installed snapshots preserve this distinction.

Native empty-report handling was also corrected: the app returned `9220` with
HTTP 400 for an empty report and `9280` with HTTP 400 for a scoped lookup with no
match. Only their known empty envelopes are accepted; nonempty data, error flags,
`success:false`, permission failures and unrelated statuses remain failures.
`9280` requires an actual nonblank criterion. The official
[Creator API v2.1 status codes](https://www.zoho.com/creator/help/api/v2.1/status-codes.html)
define the two empty outcomes; the observed HTTP 400 variant for `9220` was
verified in the native application.

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
| `crewLocationsValidate` | Preserve milestone/task separation and staged single-record, duration, arrow and canonical timestamp conflict guards through native formatting |
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

The user promotes the complete pending Creator package: `crewLocationsRead`,
`crewLocationsWidget`, `crewLocationsConfig`, `crewLocationsValidate`,
`crewLocationsDirectValidate`, the native
Crew/Assignment validation workflows, Task_Schedule fields and mirror guard,
All_Task_Schedules web layout, existing Crew report exposure and the registered
Crew page/widget changes. Task source ingestion and task writes stay disabled.

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
geometry passed **23 checks at four sizes**. Final management geometry passed
**24 checks at five sizes**: 1250×564, 1250×600, 1366×768, 1440×900 and 1920×1080.
The new compact case selects a crew with actual fixture latest/future work and
requires its first upcoming assignment row to be fully visible. The artificial
inner fixture warning is hidden only for geometry; the outer harness remains
clearly isolated. No geometry check writes native records.
The existing scheduling browser suite also passed **21 groups** after its nested
unavailable-source fixture was changed to open the schedule workspace before
exercising Clear and Reset. The widget source and immutable release were not
changed by that fixture correction.

Final full merged `npm run validate` passed with exit 0 (63957) after the native
fixes, including all eleven focused backend groups. `npm run build:pages` passed for 33
paths and Creator packaging passed. The latest source management browser run
passed 17 groups; the schedule run passed 21. Main/Production publication maps
1.2.3; CI/Pages confirmation and its presentation smoke check remain pending.
Native Development CRUD was proven in the actual 1.2.0 widget and is recorded
separately from the presentation follow-up. Remaining native steps are the user's
Creator application promotion and optional verified external task-source setup.
The previous 9637 pass remains historical; final 63957 includes the completed
DirectValidate hardening and its eleventh focused backend group.

Rollback maps the widget to **1.1.4**. Retain crew and assignment records rather
than delete them during rollback. Keep the exact removal inventory, existing
milestone widgets/pages, connection, operation history and Projects guards.
