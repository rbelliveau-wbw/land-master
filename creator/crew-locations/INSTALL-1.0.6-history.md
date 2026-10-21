# Crew Locations Development installation

This package implements the user-approved **local-only testing mode**. It does
not enable an outbound Projects dispatcher or production scheduling. Native
installation is partial; ten core functions have compiled. Do all steps in Land
Master Development, with the app timezone America/Chicago and date format
MM/dd/yyyy. Preserve `Milestone_Gantt_View`.

## Current installation and publication state — October 21

The scheduled retry created all six forms, added the four User_Access flags with
false defaults, and compiled the ten core functions. The verified existing
`zoho_creator_connection` uses logged-in-user authorization and already has
Land Master access plus the required record read/update permissions.

The new components are denied in all eight ordinary permission profiles. Read
and Write initially inherited access; their grants were removed only for the
six new forms/reports, saved, and verified after reopening. The six custom
profiles already denied them. The existing administrator `wbdevelopment` (Robby
Belliveau, User_Access record `4410926000003608006`) now has View_Crew_Locations.
All three module edit/management flags remain false after the controlled save check.

The user subsequently authorized publication to **Stage and Production**.
Creator version **9.108** contains the initial schema/profile prerequisites;
**9.109** contains the repaired field dependencies, ten disabled core functions,
and the guarded inbound milestone importer. Both versions were promoted together
to Production, which now includes the 9.109 fix. The user's pending forecasting
notification correction was included without modifying its code. A later,
unrelated `buildContractCommentNotification` edit was left in Development.

The dependency error came from 48 fields without valid section parents. All six
forms now have an explicit section in row 1, column 0; every data field uses that
section's row and column 1. Creator then exposed all 48 fields and validated the
complete 78-component fix package. Existing data field identities were preserved.
The generator and a layout regression check now enforce valid section parents.

A canonical native read confirmed the inbound importer guard despite the earlier
maintenance/save error. It retains `analyticsExportRows`, `workflowRunLog`, and
the existing error reporting. See `native-installed/` for verified snapshots and
`native-before/` for original references. Treat save errors as potentially partial;
re-read current native metadata before retrying a component creation.

The NEW internal **Crew Locations** widget is installed from frontend 1.0.6 at
`/app/widget.html` on the NEW `Crew_Locations` page. Its authenticated,
admin-only `Crew_Locations_Widget_DEV` Custom API targets Land Master Development
and maps the JSON key `payload` to crewLocationsWidget. The installed Development
config has **`enabled=true`, `testingMode=true`**; the repository config template
still defaults to disabled. Crew/task adapters remain disabled.

[Open the native Development Gantt](https://creatorapp.zoho.com/wbdevelopment/environment/development/land-master/#Page:Crew_Locations).
Actual Cameron Ranch and Cottonwood Creek milestones loaded successfully. For
SDK field exposure, All_Subdivisions now includes Lot_Total_Residential and
Project_ID in both its list and quickview layouts. Existing report fields/actions
were preserved. The original Milestone_Gantt_View remains unchanged.

All four outbound guards were merged into the current native bodies, retaining
workflowRunLog and existing HTTP/error handling. Both outbound schedules remain
inactive. The new milestone validator compiled under Creator's generated link
name **`Milestones_on_validate_ed`** (display name Milestones on validate edit).
Crew_on_validate was created, but its script save failed during a publication
lock. Its action is not installed. Crew_Assignment and Task_Schedule validators
are still pending.

One controlled Development save attempted Cameron Ranch Rough Cut End
03/17/2027 → 03/18/2027. Creator rejected the PATCH; the current response lacks
the native rejection details. An authoritative reload retained **03/17/2027**.
The audited operation is `549235cd-65d3-40fb-8b2e-7349cb14f45b`, milestone
`4410926000003819022`, phase `4410926000003378004`. The audit entry is visible;
the marker `M:4410926000003819022` may exist and must be reconciled before removal.
No milestone date changes or Projects calls were confirmed. Edit_Crew_Milestones
was restored false pending a successful native save/undo check.

Creator then showed an application publication lock, followed by an editor
connection/DNS failure. Do not cancel another publication. Further work must
diagnose the native PATCH rejection, complete the remaining validators and page
profile checks, and pass save/undo before granting editing. The one-time retry
automation remains paused. See [native-install-progress.json](native-install-progress.json)
for exact evidence and the native screenshot.

The user requested an exact inventory for possible future removal. Read
[removal-inventory.json](removal-inventory.json) before changing or removing
components, and update it after each native installation step. This is not
authorization to delete anything.

Resume from that progress file; do not recreate installed forms/functions.
Verify report link names and layouts before binding the widget: Creator named
the assignment report **Crew Assignment Report**, while the planned contract
requires `All_Crew_Assignments`. Its native link name has not been verified.
The optional disabled source adapters have not been installed or compiled.

Use the `native2` installation bundle for the compiler and section-layout fixes.
The plain 1.0.6 and `native1` ZIPs are historical snapshots; `native1` lacks the
section-layout repair. The frontend widget release itself is unchanged.
`native-before/` and `User_Access.native.ds` are reference snapshots; merge the
new fields into the current schema instead of replacing newer live definitions.

## 1. Review the exact change set

Read [schema.json](schema.json), the
[module contract](../../knowledge/modules/crew-locations.md), and
[machine-readable manifest](../../manifests/crew-locations.json). The schema lists
NEW proposed forms, every field/default/unique key, reports and the Custom API.
The `*.ds.fragment` files are component definitions, **not** a complete app export;
do not import them as a replacement Land Master application.

The October 21 export is the source used to generate complete guarded workflow
bodies. Confirm against live metadata, including any newer integration-audit
changes. Merge guards into newer bodies instead of overwriting them with stale
exported code. Existing names come from the export; NEW names are proposed.

## 2. Add the NEW schema and access flags

Create Crew, Crew_Assignment, Task_Schedule, Schedule_Change_Log,
Crew_Schedule_Lock and Crew_Test_Record using schema.json and their matching
fragments. Task_Schedule is an optional source mirror; an empty form is required
to compile the provided generic task functions even while the adapter is disabled.

Keep the explicit section blocks in the corrected fragments. A field's `row`
must match its section's `row`; it is not the field's vertical position. Sections
use column 0 and data fields use column 1. Unsectioned fields can appear in the
editor while being omitted from the publication selector, causing dependencies
to remain unresolved even after Select All.

Enforce **No duplicate values** on Crew.Crew_Code,
Crew_Assignment.Source_Key, Task_Schedule.Source_Key,
Schedule_Change_Log.Operation_ID, Crew_Schedule_Lock.Phase_Key and
Crew_Test_Record.Record_Key. The phase-lock unique constraint is required for
serialization; a duplicate lock must fail its insert. Request_JSON, Result_JSON
and Error are multiline fields. Limit payloads to 48 KB as in the server function.

Add View_Crew_Locations, Edit_Crew_Milestones, Edit_Crew_Task_Dates and
Manage_Crew_Assignments as decision boxes on User_Access, all initially false.
Missing or duplicate User_Access rows grant no module access. Do not derive these
permissions from Budget, Legal or Construction flags.

Keep audit, lock and marker forms **server/admin only**. Do not grant ordinary
users create/edit/delete access to them or publish them. Keep User_Access writes
administrative. Crew management forms require Manage_Crew_Assignments plus
native Creator rights. Reuse the existing role/row sharing rules; a territory
filter does not grant access.

## 3. Configure reports and caller-scoped connection

Expose the fields listed below in the report layouts/field permissions and test
them as a restricted user. The widget requests only these fields; missing field
exposure is a setup error rather than permission to guess data.

| Report | Required fields |
| --- | --- |
| EXISTING All_Subdivisions | ID, Subdivision_Name, Subdivision_Code, Project, Phase, Subphase, Territory, Status, Projects_Status, Total_Lots, Lot_Total_Residential, Project_ID |
| EXISTING All_Milestones | ID, Subdivision1, Milestone_Name, Start_Date, End_Date, Milestone_ID, Project_ID, Sequence, Push_Update |
| NEW All_Crews | ID, Crew_Code, Badge_Color, Active |
| NEW All_Crew_Assignments | ID, Subdivision1, Crew, Assignment_Date, Source_System, Source_Record_ID |
| NEW All_Task_Schedules | ID, Subdivision1, Stage_Key, Start_Date, End_Date, Source_System, Source_Record_ID, Source_Modified_At, Write_Enabled |

The backend also requires these fields in All_Subdivisions, All_Milestones and
All_Task_Schedules. Scoped delegated reads must expose the complete phase
schedule; if native sharing/report criteria hide some stage records, edits fail
closed instead of propagating over an incomplete set.

Reuse the verified EXISTING OAuth connection `zoho_creator_connection`: its
authorization owner is **Logged-in users**, its authorization is different for
each environment, and Land Master connection access is already enabled. Its
existing permissions include Get All Records, Get Record and Update Record. Each permitted user authorizes their own Creator
account. Do not substitute an admin connection. The functions set the environment
header to development and never take an environment or actor from payload.

Zoho documents [logged-in-user connections](https://help.zoho.com/portal/en/kb/creator/developer-guide/microservices/understand-connections/articles/understand-connections),
[v2 custom widget APIs](https://www.zoho.com/creator/help/js-api/v2/custom-api.html),
and [v2.1 PATCH/report validation](https://www.zoho.com/creator/help/api/v2.1/update-specific-record.html).
Connection authorization and scope verification are installation gates, not
assumptions based on an existing connection's name.

## 4. Install functions and guarded workflows

Install these complete functions from `creator/functions/`, in dependency order:

1. crewLocationsConfig, crewLocationsIso, crewLocationsRead.
2. crewLocationsValidate, crewLocationsDirectValidate.
3. crewLocationsMayPush, crewLocationsBeginPush, crewLocationsEndPush.
4. crewLocationsStatus, crewLocationsWidget.
5. Optional disabled adapters crewLocationsImportAssignments and
   crewLocationsImportTasks; never expose either as a browser Custom API.

Keep enabled=false while compiling and configuring. Each typed function has an
outer fallback return; no while loops or containsKey calls are introduced.

Add the NEW On Validate workflows in [workflows](workflows/) for edited
Milestones and Task_Schedule, and created/edited Crew and Crew_Assignment. Add
these validators alongside existing business validation. Ordinary users must
not be allowed to skip form workflows. Importers are controlled internal paths,
not public user editing endpoints.

Merge the five complete guarded workflow bodies from workflows/ into their
EXISTING definitions: Milestone_Bi_Directional_1, Sync_Milestones,
Sync_Only_MS_End, Update_Projects_Milestone and Update_Projects_Milestone1.
Keep both exported outbound schedules **inactive**. The wrappers share the same
unique phase lock across user edits, imports and existing outbound actions.
Touched test records are excluded from outbound actions by their server marker.
Unrelated milestone records retain their prior synchronization behavior.

The existing Analytics importer is still allowed to refresh marked test records
after the local edit releases its lock. Existing outbound endpoint/response
logic is not enabled or certified by this package. Its future modernization,
including removal of legacy delay-service calls, remains separate from testing.

Do not edit a protected test record using a direct form/report/API bypass.
Native validators require a staged audited operation and reject past-date,
closed-status, permission or stale-before-value violations. After installing
these validators, the legacy milestone widget's direct date-save path is also
blocked: use Crew Locations for edits, or migrate that legacy save path to this
audited API before granting it editing again. The existing page remains available
for viewing. This is a related scheduling-path change, not a migration of other
Land Master modules.

## 5. Bind the NEW Custom API and page

Create `Crew_Locations_Widget_DEV`: POST, OAuth2 authentication, application/json,
one key/value argument `payload` bound to the string argument of
crewLocationsWidget. Select the **Development** function/application target.
Do not create a production alias or public-key endpoint. Custom API routing uses
the authenticated SDK environment and requests this exact DEV link name.

Create the NEW Creator page `Crew_Locations`, display name Crew Locations.
Register the packaged `dist/creator-packages/crew-locations.zip` using the same
embedded widget pattern as the existing milestone page, or use the permanent
external Development URL generated at `dist/dev/crew-locations/index.html` once
the repository build is hosted. Do not point a Production Creator page at a
Development widget to bypass environment routing. Give the embedded widget
enough height to use the normal page scroll for all selected phases; there is
no fixed-height project clipping box inside the widget.

Use the same deployed hosting base as the existing milestone widget, followed
by `/dev/crew-locations/`; verify the deployed Pages path before registration.
Building local dist files does not publish them. The ZIP is usable without a
GitHub Pages promotion.

Grant a named Development tester View_Crew_Locations and Edit_Crew_Milestones
after the native connection and row-sharing checks pass. Task and crew flags
remain false unless their actual source/management setup has been verified.
Set enabled=true only in the **installed Development config function**, while
leaving testingMode=true. This enables local test saves; it does not authorize
outbound Projects writes.

## 6. Resolve sources without placeholders

To enable crew loading, identify the actual API/report/query, its assignment date
column, stable event IDs, crew codes and badge colors. Install verified master
records and mappings, then configure crewsEnabled, crewSourceSystem and a
controlled importActor. The assignment header/query covers the stated inclusive
calendar-date range. An import timestamp is not an assignment date.

To enable tasks, identify what T rows represent, exact source query/date columns,
stage mappings, source lineage and reliable writes. Configure tasksEnabled and
taskSourceSystem only after that verification. Keep taskWritesVerified=false
for aggregations without a verified edit rule. Source adapters must normalize
actual source Date-Time revisions before calling the internal import functions.
No source endpoint, Analytics view ID or stage rollup is invented here.

The normalized adapters are not external-source fetchers. Provider discovery and
an authenticated provider fetch/query remain unresolved installation inputs.
The widget continues to support real milestone data with clear unavailable
crew/task states when those adapters remain off.

## 7. Verify, recover and roll back

Run the rule tests and repository validation. For isolated browser verification:

```powershell
node scripts/preview-crew-locations.mjs
```

Open `http://127.0.0.1:4317/widget.html?checks=1`. The actual renderer/controller
runs against fixture SDK responses in that local server only. Results are in
the Isolated preview controls disclosure. Fixtures never enter the widget ZIP,
immutable release or hosted dist. The ordinary widget has no fixture fallback.

Then compile every Deluge function/workflow natively, verify denied/missing
User_Access, native report/row restrictions, source locks, duplicate operations,
partial writes, unknown replies, refresh, audit persistence and controlled
inbound restoration in **Development**. Check that test records remain false
for Push_Update and that every existing outbound route excludes their markers.
Do not write fixture dates into live records.

An unknown request is recovered by Check status, which performs reads only.
No replay or timed lock deletion is allowed. A crashed operation with
Execution_Finished=false requires administrator inspection before releasing its
exact phase lock. For partial known failures, inspect confirmed destinations
and refresh; do not claim that unsent records were saved.

Rollback hides the NEW page and disables the new API. Preserve operation logs,
test markers and unresolved locks. Keep the outbound marker guards until test
dates have been reconciled. The original milestone page/release is preserved;
no production widget mapping is changed by this installation package.

Disable the new assignment/task adapters as part of rollback. Resolve every
in-flight operation before restoring legacy date editing; then disable only
the NEW date-validation workflow if legacy editing must resume. Keep the
outbound test-marker guards until reconciliation is complete. Do not delete
audit records, test markers or locks to make a blocked operation disappear.
