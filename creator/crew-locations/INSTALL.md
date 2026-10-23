# Crew Management 1.2.3 publication and Creator installation

Latest user direction: enable real Creator milestone editing, including Production;
never write to Zoho Projects. PMP pushes repository main/Production assets and
leaves pending Creator promotion to the user. Earlier Development-only testing
instructions in [historical installation notes](INSTALL-1.0.6-history.md) are superseded.

Historical verified 1.2.0 assets reached main/Production at
`b64591c4eabbc94934b6a26837b8d1b451032103`; CI and Pages passed. Actual 1.2.0
Development owner widget CRUD passed, including same-record reassignment and
Refresh persistence. No real milestone dates were changed in this review.
The final immutable 1.2.3 release is ready for publication;
unused local 1.2.1/1.2.2 drafts will not publish. Short-height management geometry
now passes 24 checks at five sizes, including 1250×564 with the first upcoming
assignment fully visible. Final full merged validation passed exit 0, Pages
build passed for 33 paths and Creator packaging passed. This publication includes
Development/Production mappings to 1.2.3. Await CI/Pages and live presentation
smoke confirmation; no future deployment result is claimed.

The user promotes the complete native Development package: **crewLocationsRead**,
**crewLocationsWidget**, **crewLocationsConfig**, **crewLocationsValidate**,
**crewLocationsDirectValidate**,
**Crew_on_validate**, **Crew_Assignment_on_valida**, Task_Schedule's six new fields
and optional mappings, **Task_Schedule_mirror_guar**, **All_Task_Schedules** web
layout, existing **All_Crews** / **Crew_Assignment_Report** exposure and registered
Crew page/widget changes. Do not infer Creator publication from Pages success.
The task importer/source and all task writes remain disabled.
The only remaining native steps are the user's Creator application promotion
and optional verified external task-source configuration. CRUD, compiled guards,
native fields and layout verification are complete in Development.

1. Read [native-install-progress.json](native-install-progress.json) and
   [removal-inventory.json](removal-inventory.json). Reuse the six existing forms,
   four access fields, ten core functions and `crew_locations` widget registration.
2. Compile the updated Config, Read, Validate, DirectValidate, Status and Widget functions
   from `creator/functions/`. Config derives `thisapp.environment.type` and
   `.linkname`; mode is `testingMode=false`, `creatorOnly=true`,
   `projectsPushEnabled=false`. Do not replace the logged-in-user connection.
3. Keep all five existing importer/push guards and the milestone On Validate
   workflow. Preserve newer workflow audit/error handling. Both outbound schedules
   remain inactive. External crew/task adapters stay disabled until verified.
   The independent `nativeCrewReadsEnabled=true` capability enables native reads;
   manual writes separately require View/Manage and native profile rights.
   Keep `crewsEnabled=false`, blank `importActor`/`crewSourceSystem`, and
   `taskMirrorEnabled=false`, `tasksEnabled=false`, `taskWritesVerified=false`.
   `All_Crews` must expose ID, Crew_Code, Crew_Name, Badge_Color, Active,
   Source_System and Source_Record_ID. `Crew_Assignment_Report` must expose ID,
   Subdivision1, Crew, Assignment_Date, Source_System, Source_Record_ID and
   Source_Key. This is the verified existing report link; do not recreate the
   former unverified All_Crew_Assignments alias. Required-field failures stay
   closed. Native Development report/layout and actual widget data behavior are
   verified; Production native changes still await user promotion.
4. Bind the existing `crew_locations` widget to the permanent external URL
   `https://rbelliveau-wbw.github.io/land-master/prod/crew-locations/`.
   Keep the new page identity `Crew_Management` (display Crew Management) and the
   existing `Milestone_Gantt_View` embed on that same registered widget.
5. Configure OAuth2, Admin-only POST JSON APIs, Key and Value argument
   `payload:string`, standard response: `Crew_Locations_Widget_DEV` targets
   Development, the optional `Crew_Locations_Widget_STAGE` targets Stage, and
   `Crew_Locations_Widget` targets Production. Development and Production aliases
   are installed; Stage is not configured by this PMP. Do not expose a public endpoint.
6. In each environment, grant the existing intended administrator
   View_Crew_Locations and Edit_Crew_Milestones through the existing User_Access
   record. `Manage_Crew_Assignments` separately authorizes native manual crew
   management; it does not enable an external crew adapter. Grant it only to
   explicitly authorized users after the two native Crew validation workflows
   below are installed. Keep task editing false while its source is unverified.
   Other users retain default denial and native report/sharing restrictions.
7. The native save blocker is resolved by the prepare/apply protocol. Development
   save and audited Undo both returned complete destination acknowledgements;
   see creator-only-save-verification.json. Promote the controller, direct
   validator and status cleanup together with the Creator-only configuration.
   The user promotes pending Creator changes through Stage to Production after
   the native edit/save check. Do not infer native publication from Pages success.
8. Verify actual native capability routing, real report data, a future milestone
   endpoint save with Push_Update=false, durable audit, Undo, and no Projects call.
   A native error now reports its actual Creator response code/details. Do not
   bypass validation or claim a save worked without a native acknowledgement.

## Native crew management package

Install the updated `crewLocationsRead` before `crewLocationsWidget`. The Read
function adds only `All_Crews` and `Crew_Assignment_Report` to its existing
delegated report allowlist, preserving the logged-in-user connection and native
sharing. Install `workflows/Crew_on_validate.dg` and
`workflows/Crew_Assignment_on_validate.dg` as **created or edited -> On Validate**
workflows before enabling the new controller. These repeat permission,
caller-visible record, active-crew and phase-status checks in the native save
transaction and protect immutable crew codes and source identifiers. No OAuth
scope expansion or new Custom API is required.

The controller's `save-crew` and `save-assignment` actions prepare one native
write; the widget uses SDK v2 `DATA.addRecords` / `DATA.updateRecordById` under
the actual user's native form/report rights. Native error acknowledgement,
exact destination IDs and a single result are required. Successful native
acknowledgement does not trigger editable-value equality checks.
`management-status` is an explicit read-only recovery for an ambiguous response;
it never repeats a write. `management-list` pages all crews (including inactive),
all assignment dates and native phases using `record_cursor`. The client must
finish every returned cursor before showing a complete management list.

New manual records use `Source_System=MANUAL_WIDGET` and a UUID
`Source_Record_ID`. Assignments also use unique `Source_Key=MANUAL_WIDGET:<UUID>`.
Codes and provenance are immutable on edit. Existing `MANUAL_QA` assignments
remain editable when their native source key is valid; imported assignments
remain read-only. Deactivating a crew preserves its assignment history.
Native form validation, profile access and User_Access flags remain independent.
The existing owner's Manage_Crew_Assignments flag was enabled through the native
User_Access form in Development (record 4410926000003608006) and Production
(distinct record 4410926000004465004). Production reopening confirmed View Crew
and Edit Milestones true, Edit Task Dates false and Manage Crew true. No other
checkbox/profile or connection scope changed. This data enablement does not
promote the Creator application or verify Production widget CRUD.

Actual Development records created for verification are Crew
`4410926000005393014` (`TEST-DEV-1023`), Crew `4410926000005393018`
(`TEST-DEV-B-1023`) and assignment `4410926000005393016`. The assignment moved
from Crew A / Cameron01 / 10/23/2026 to Crew B / AAA Springs01 / 10/24/2026
without changing its native ID; Refresh confirmed the corrected values.
Inactive history, disabled Assign work and visible phase-picker locks passed.
These records and the earlier Production QA records remain; no cleanup occurred.

All eleven focused backend groups pass against source and reopened native snapshots.
Native `9220` empty-report HTTP 400 and scoped `9280` HTTP 400 cases are handled
only with empty data and no contradictory error/success flags; unscoped `9280`
and permission failures remain closed. See the official
[v2.1 status codes](https://www.zoho.com/creator/help/api/v2.1/status-codes.html).
All seven mixed schedule guards in crewLocationsValidate were rewritten and
reopened, preserving milestone/task separation, counts, anchors, arrow scope
and the existing canonical timestamp ABA rule.

Fresh native-before evidence confirmed DirectValidate already had canonical
prepared/saving and nested exact-target checks; the earlier local capture was
stale. Three remaining mixed permission/past-date guard families were staged,
with no rule change or live-bypass claim. The reopened 5,199-character snapshot
has no mixed lines and its new backend group passes. Include this saved function
in Creator promotion. Final full merged validation 63957 passed with exit 0
after this refinement; the prior 9637 pass remains history. The widget is unchanged.

## Lightweight individual Projects task mirror

Reuse **Task_Schedule**, preserving its form/report identities. The additive
definitions are in `Task_Schedule.ds.fragment` and `schema.json`. Add text fields
`Task_Name`, `Task_Code`, `Source_Project_ID`, `Task_Status`, date
`Completion_Date`, and checkbox `Milestone_Task` (default false). Make existing
`Subdivision1` and `Stage_Key` optional so a real task can remain unmapped.
Existing `Start_Date` holds source start and `End_Date` holds source due date;
completion is retained independently. Keep every actual source task in its own
row with its real task/project IDs and stable unique `Source_Key`.

All six fields and both optional mappings are installed/reopened in Development.
All_Task_Schedules has 19 saved web-layout columns including ID; exact evidence
is in native-installed/Task_Schedule.field-evidence.json and
native-installed/All_Task_Schedules.layout-evidence.json. The native mirror guard
is installed as Task_Schedule_mirror_guar. Source ingestion is not installed or
enabled by this schema/layout verification.

Expose those fields with all existing source/mapping/date fields on
`All_Task_Schedules`. Install `workflows/Task_Schedule_on_validate_edit.dg` as a
**created or edited -> On Validate** workflow. It blocks native creation and
keeps the mirror read-only until the real source and write rules are verified;
only the controlled internal importer owns source rows. No source query, portal,
endpoint or stage aggregation has been inferred from the screenshot.

The existing internal `crewLocationsImportTasks` now accepts actual task snapshot
metadata in `taskName`, `taskCode`, `taskStatus`, `sourceTaskId`,
`externalProjectId`, `startDate`, `dueDate`, `completionDate`, `milestoneTask`,
stable `sourceRecordId`, and adapter-normalized `sourceModifiedAt` (datetime).
Calendar date strings use `YYYY-MM-DD`; Creator date fields retain `MM/dd/yyyy`.
An explicitly supplied canonical `stageKey` and unique exact
`Subdivision.Project_ID` join are required for schedule mapping. Unmapped rows
can be mirrored with an unresolved result; they never supply T-row schedule
dates. A mapped task cannot silently move to another phase/stage or source ID.

Keep `taskMirrorEnabled=false`, `tasksEnabled=false`,
`taskWritesVerified=false`, and blank source/import actor configuration until
the actual provider metadata and controlled import identity are verified. The
prepared importer remains an uninstalled internal function, with no browser API or guessed
external request. Multiple real tasks assigned to one stage are diagnostics;
no min/max or arbitrary-task summary is installed.

The controlled earlier failed save was operation
`549235cd-65d3-40fb-8b2e-7349cb14f45b`; the original End remained 03/17/2027.
Preserve its audit and any marker until deliberately reconciled. Completed/closed
phase and historical endpoint protections remain active.

Run `node scripts/test-crew-locations.mjs`,
`node scripts/test-crew-native-capabilities.mjs`, `npm run validate`, and
`npm run build:pages`. Use `npm run package:creator -- crew-locations` if an internal
ZIP is needed. Fixtures are isolated and do not establish live save behavior.

Rollback restores the original milestone embed from
`native-before/Milestone_Gantt_View.zml`, disables the new page/APIs and preserves
all existing milestone data, audit records, markers and active locks. Do not
remove outbound guards while marked records remain. Keep this inventory current.
