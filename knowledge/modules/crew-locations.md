# Crew Management

## 1.3.2 — employee staffing and foreman locations

The opening Employees workspace lists synced active employees with territory, labor
type and crew assignment. Active/Inactive/All keeps retained inactive employees
visible. New crew reuses the existing native crew editor. Foremen place their
crew badge on every exactly mapped phase appearing in their last seven calendar
dates of timecards. No name/code inference is used. The two daily Analytics syncs
retain employees indefinitely and only the last three calendar months of timecards.
All 35 pending native components were promoted to Stage and Production 9.132
on October 29 with explicit user authorization. The audit follow-up counts all
source rows, reconciles success totals and distinguishes Failed from Partial.
See [installation, verification and rollback](../../docs/crew-employees-timecards-2026-10-29.md).

## 1.2.7 — CFO roster connection failure

Roster reads now use authenticated `LMData.readAll`, matching schedule reads,
instead of the connection-dependent `management-list` request that returned
Invalid Connection for the Production CFO profile. Refresh checks current module
capabilities, then loads complete caller-scoped Crew, assignment and subdivision
reports. Native report/row restrictions and required-field checks remain strict.
No connection authorization, permission grant or Creator promotion is introduced.
The 1.2.7 follow-up also clears retained roster data for code-only native report
permission denials; it includes the SDK roster change from 1.2.6.
See [release checks and limits](../../docs/crew-cfo-roster-connection-2026-10-28.md).

## 1.2.5 — milestone feedback and column controls

Milestone updates, propagation and Undo/Redo use the shared success toast without
automatically opening the save modal. Pending status and actual errors remain
inline; unknown replies keep the editing lock and explicit Review save recovery.
Individual Start / Days / End Hide buttons are removed. Hide Group, restoration
chips and Show All Columns remain. No native data contracts or permissions change.
See the [release checks and rollback](../../docs/crew-milestone-toast-2026-10-28.md).

## 1.2.3 publication baseline

The 1.2.0 change adds actual manual crew management: create a crew, edit its
optional name/color, deactivate/reactivate it, add dated phase work and correct
manual assignment crew/phase/date. The opening Crews workspace uses a searchable
active/inactive roster beside the selected crew's latest dated work, upcoming
work and earlier history. The Milestones & tasks tab retains the schedule editor.
The interface follows the existing Proforma Manager styling and readable desktop
dimensions. The original mockup could not be retrieved during this review; no
claim of new visual comparison to its live page is made.

Management reads all permitted assignment dates; the scheduling badge window
remains today minus seven days through today. A dated assignment does not imply
an ongoing placement, end date or crew capacity. Imported assignment records are
read-only. Inactive crews retain history and cannot receive new assignments;
an existing record may keep its inactive crew when correcting its other fields.

The [implementation and brief audit kit](../../docs/crew-management-brief-audit-2026-10-23.md)
records the complete acceptance matrix, pending native gates, test entry points
and rollback to 1.1.4. New Creator source is not a native install or publication
claim. The installer updates the native evidence files separately.

Historical verified 1.2.0 assets used main commit
`b64591c4eabbc94934b6a26837b8d1b451032103`; CI/Pages passed. Actual 1.2.0 owner
Development widget create/edit/color/deactivate/reactivate and dated assignment
create/reassign/Refresh passed. Records are crews `4410926000005393014`
(`TEST-DEV-1023`) and `4410926000005393018` (`TEST-DEV-B-1023`), plus assignment
`4410926000005393016`. The same assignment ID moved from Cameron01 / Crew A /
10/23/2026 to AAA Springs01 / Crew B / 10/24/2026 and persisted after Refresh.
Inactive work history, disabled Assign work and visible phase locks passed.
No real milestone dates changed in this review; these test records remain.

The final immutable 1.2.3 release is ready for publication.
Unused local 1.2.1/1.2.2 drafts will not publish. Refresh-hint and short-height
spacing/subtitle changes retain readable fonts/control sizes and pass the final
geometry checks below. Final full merged validation passed exit 0, Pages build
passed for 33 paths and Creator packaging passed. This publication includes
Development/Production 1.2.3 mappings; CI/Pages and live presentation smoke
confirmation remain pending.
Concurrent main `21ef0b75` changes are preserved. Creator promotion remains user-owned.
The complete native package includes Read/Widget/Config/Validate/DirectValidate, Crew/Assignment
validation workflows, Task_Schedule schema/mirror guard, All_Task_Schedules web
layout, existing Crew report exposure and the registered Crew page/widget changes.

The latest October 21 user instruction enables real milestone date edits in
Creator, including Production, while prohibiting every outbound Zoho Projects
write. `testingMode=false`, `creatorOnly=true`, `projectsPushEnabled=false`.
Every new milestone patch includes `Push_Update=false`; a pre-existing pending
push is rejected rather than cleared. Touched records retain server-only markers
that exclude them from the existing guarded Projects push routes.

The existing inbound Analytics importer may replace saved dates on its next run.
This is not an immediate rollback guarantee. The user explicitly accepts those
Creator changes. Future Projects synchronization requires a separately authorized
implementation; there is no UI switch to enable it.

The page is now named `Crew_Management` / **Crew Management**. The existing
`Milestone_Gantt_View` identity is preserved and its widget embed points to the
same `crew_locations` registration. The original widget source is kept for
rollback. Source: [widget](../../widgets/crew-locations/src/app/widget.html).

## Installation and release state

Six forms, four default-false User_Access fields, ten core functions, five
import/push guards and the milestone On Validate workflow already exist.
Canonical native IDs and current verification are recorded in
[native-install-progress.json](../../creator/crew-locations/native-install-progress.json)
and [removal-inventory.json](../../creator/crew-locations/removal-inventory.json).
They must be checked before recreating or deleting anything. The removal inventory
is memory, not deletion authorization.

Release 1.1.3 routes the frontend API alias by authenticated Creator environment:
`Crew_Locations_Widget_DEV`, `Crew_Locations_Widget_STAGE`, or
`Crew_Locations_Widget`. The server independently derives its environment from
`thisapp.environment.type` and `thisapp.environment.linkname`; client payloads
cannot select a backend. Preserve the existing logged-in-user Creator connection.
API registration, native installation and repository deployment are separate.
The latest PMP instruction leaves Creator promotion to the user.

Historical 1.1.4 verification used main/Production asset commit
`3141c9f84bbeb784de10940dc12021b3a898047d`; CI and Pages succeeded. Production
Milestone_Gantt_View displayed 1.1.4 and Reset showed 38 actual upcoming phases.
Keyboard activation opened the exact Cameron Rough Cut Start 01/01/2027 editor;
Escape dismissed it with no date write. The Development Crew_Management owner
session completed empty native Crew/Assignment SDK reads with crews enabled.
That earlier package contained two functions and two report layouts. The current
larger Creator promotion package is listed above; populated Production native
behavior still depends on the user's promotion.

Development native save and audited Undo both succeeded on October 21.
The earlier save failure was caused by uncommitted locks being invisible to
delegated API validation. Release 1.1.3 commits preparation before applying. Crew/task source adapters
remain disabled until their actual inputs and write semantics are verified.

## Data meaning and unavailable sources

`Subdivision.ID` identifies a phase; Project is its parent lookup. Phase/subphase
identity is preserved even when names match. Territory is `Subdivision.Territory`.
Operational status displays `Projects_Status` first but both raw statuses govern
locks. Local lot count is labeled Local lots and uses `Total_Lots`; imported
residential lots are retained independently. External project IDs always use
`Subdivision.Project_ID` and `Milestones.Project_ID`, never Creator Project.ID.

M rows use Milestones. T rows use only the NEW optional Task_Schedule mirror.
No task source has been verified. The reference exposes task-like dates but does
not establish their actual API/query, stage assignments or reliable write rules.
Therefore tasksEnabled/taskWritesVerified remain false. There are no min/max
rollups, copied milestone dates or arbitrary-task selection.

Native Crew/Crew_Assignment report reads now have their own server configuration
flag, `nativeCrewReadsEnabled`, enabled and verified in Development. It controls
capabilities.sources.crews and reuses authenticated client `LMData.readAll`;
native report/row access and required-field checks remain in force. The open
Production `All_Crews` report and three clearly labeled QA crew records were
confirmed October 23. That Production report initially exposed no columns. Native builder
and Access Dev Live confirmed the actual assignment report link is
`Crew_Assignment_Report`; the earlier `All_Crew_Assignments` contract was incorrect.
All active source/schema/preview contracts now use the native link with no native
rename. Three assignments were successfully submitted through the native
Crew_Assignment form. Both Development function Saves were confirmed after reopening
their native editors; current native snapshots are stored in native-installed.
Deployed 1.1.4 Development SDK reads completed with empty Crew/Assignment data.
Populated Production crew display remains pending user Creator promotion.
See [desktop QA kit](../../docs/crew-desktop-qa-2026-10-23.md).

Development assignment report layout was auto-saved with native Subdivision1,
Crew, Assignment_Date, Source_System, Source_Key, Source_Updated_At, ID and
Source_Record_ID columns verified from rendered DOM. The mistakenly selected
related Crew.Source_Record_ID column was removed. Development All_Crews was
auto-saved with Crew_Code, Crew_Name, Badge_Color, Active, Source_System,
Source_Record_ID and ID columns verified from DOM. The deployed owner widget then
completed empty native SDK reads. demouser3 was denied by the outer Creator Page
gate and the original preview identity was restored; broad widget/report/row
restrictions and populated Production badges were not verified in this review.

No external crew query/API or Analytics view has been verified. The separate
external-ingestion flag `crewsEnabled` remains false, with blank import actor and
source system. Native manual records do not enable or configure an external
adapter. `crewLocationsImportAssignments` is an INTERNAL function,
not a browser API. It requires the server-configured source system/import actor,
exact External_System_Mapping joins, unique crew codes, stable source IDs and
actual assignment dates. Repeated activity does not duplicate badges. Unresolved
jobs/crews remain unresolved. No Creekside name-based exception is installed.

`crewLocationsImportTasks` is likewise internal and disabled. It accepts only a
verified adapter's explicit external project ID, canonical stage key, source
record ID and actual endpoints. It does not discover a provider endpoint or
aggregate tasks. Source timestamps must be normalized by the verified adapter.
These ingestion functions have not been run against live records.

Crew native validators are now saved/reopened in Development as Crew_on_validate
and Crew_Assignment_on_valida. The task mirror guard is Task_Schedule_mirror_guar.
All eleven focused backend groups pass against source and actual reopened native snapshots.
All seven mixed scheduling guards in crewLocationsValidate were staged and
verified, preserving milestone/task separation, single-record counts, duration
anchors, arrow eligibility and the existing canonical timestamp ABA guard.
Fresh DirectValidate capture confirmed the live prepared/saving and exact nested
target core was already correct; the old local capture was stale. Three mixed
permission/past-date guard families were staged without rule changes, then saved
and reopened with zero mixed lines. This is formatter hardening, not a claimed
live-bypass repair. Final full merged validation 63957 passed with exit 0 after
this refinement; 9637 remains history. The 1.2.3 widget/release is unchanged.
Native form/profile/report access and User_Access rights remain independent.
Only the owner's Manage_Crew_Assignments checkbox was enabled in each environment:
Development record 4410926000003608006 and distinct Production record
4410926000004465004. Reopened Production flags are View/Edit Milestones/Manage
true and Edit Task Dates false. No other checkbox/profile or connection changed;
these data updates do not promote Creator application changes.

Native empty reads now recognize the observed 9220/HTTP400 report-empty case and
9280/HTTP400 scoped no-match case. 9280 requires nonblank criteria. Nonempty data,
error flags, success:false and denied/unrelated HTTP statuses remain failures.
The [official status-code reference](https://www.zoho.com/creator/help/api/v2.1/status-codes.html)
defines the two empty outcomes; the 9220 HTTP400 variant was verified natively.

## Scheduling and UI contract

The named twelve-stage order resolves the existing Dry Utilities/Punch List
Sequence tie without rewriting Sequence. Exact case/whitespace-normalized canonical names, optionally followed by a pipe
and an assignee, are supported; unmapped and duplicate stages are
diagnostics, not substring classifications.

The assignment range is today minus seven days through today, inclusive, in
America/Chicago. It is queried separately from the Gantt horizon. Date arithmetic
uses calendar-day ordinals, including DST, leap years and clamped month ends.
Horizons include 6/12/24 months and the reference's All future dates. Selecting
several uses the widest; clearing returns to twelve months. Upcoming phase
eligibility always uses exact Rough Cut M starts within twelve months.

Crew Assigned Phases unions with individually selected phases, then intersects
crew and territory restrictions. An explicit cleared selection means an empty view. First load without saved preferences
selects actual upcoming phases when the crew source is unavailable. Table
filters add restrictions; Show all projects releases Gantt phase/section limits
but never permissions, source locks or the sold-out explicit-selection rule.

Grouped sections use their exact named endpoints only when both are valid and
visible. Otherwise constituent intervals and isolated markers retain exact source
values and gaps. Creekside's 11/09/2026 Road Prep regression applies to every
phase and both source types. Blue diagonal overlap hatches preserve opaque source
colors; overlay inspection exposes only the endpoints actually represented.

Days edits keep the known Start fixed, or use a lone End as an explicit anchor.
Arrows shift adjacent/all earlier/later stages using the magnitude of that saved
duration edit, preserve each target duration and retain missing endpoints. They
use the complete source dataset including hidden stages. Consumed target stages
cannot receive the same duration delta twice. Entire actions are validated first.

Only milestone endpoints drag. Release creates one operation; Escape cancels.
Task-table editing remains available only when its source write semantics and
record lineage have been explicitly verified. Either raw status matching
Completed/Sold Out/Sold Out (Prev WFY) locks both rows. Existing past endpoints
cannot change and new dates cannot enter the past. Valid overlap is allowed.

## Persistence, access and recovery

Manual management reuses `Crew`, `Crew_Assignment`, `All_Crews` and
`Crew_Assignment_Report`. From 1.2.6, the widget uses the shared authenticated SDK
adapter to read complete caller-scoped crews, all-date assignments and phase
identities/statuses. The old `management-list` backend remains for compatibility
but is not called by the widget. The
report contract includes Crew_Name, both source fields and assignment Source_Key;
missing native field exposure fails closed. Independent report cursors are
carried until every source finishes; a partial roster is not presented as complete.

`save-crew` and `save-assignment` prepare one validated native write descriptor.
The authenticated widget performs the native SDK v2 `addRecords` or
`updateRecordById` call. The `Crew_on_validate` and
`Crew_Assignment_on_validate` created/edited workflows are mandatory: they repeat
rights, caller scope, source identity and current phase/crew checks for direct
native form/report paths too. No workflow is skipped. New manual source identity
is `MANUAL_WIDGET:<requestId>`; native-source fields and crew codes are immutable
on updates. Existing exact `MANUAL_QA` assignment lineage is editable; imported
assignments remain source locked. No owner-level Deluge insert replaces a
denied native create or edit permission.

Native code:3000 success must identify the single intended destination record.
After that acknowledgement, requested values may display immediately and an
ordinary reload refreshes the lists. No editable-value equality comparison gates
normal success. Lost/identity-free replies retain the draft, disable another
write and expose `management-status`, which performs reads only and permits
explicit recovery comparisons. Unresolved request metadata may be retained in
sessionStorage for that actor/environment to reopen recovery after reload. It is
not an authoritative crew database or completed operation log. LocalStorage
continues to contain view preferences only.

Manage_Crew_Assignments, View_Crew_Locations, native create/edit profile rights,
the actual Custom API profile scope and delegated report/row access are separate
gates. Their native outcomes must be verified independently of fixture tests.

The v2 widget uses the existing shared authenticated runtime/data adapter.
Native report reads are paginated and limited to required exposed fields. A
permission failure clears private data and labels. View preferences alone use
localStorage. The custom API derives actor from zoho.loginuser, not supplied email.

The EXISTING logged-in-user Creator connection still performs server-side save
preparation/recovery report reads and schedule PATCH
writes with the trusted `thisapp.environment.linkname` header. An admin connection is not equivalent:
it would broaden native sharing. Test both report and row restrictions using
restricted users before enabling the service.

Operations carry unique IDs, exact expected endpoints and field changes.
The frontend first calls prepare; its successful acknowledgement commits the
phase lock, complete validated audit request and Projects-exclusion markers.
Only then does apply revalidate and acquire a second unique execution claim
(<phaseId>:apply). This prevents duplicate apply execution. Both calls bind
the same actor and canonical plan. A lost prepare reply never triggers apply.
Prepared or unfinished operations retain their locks for administrator recovery;
Check status never starts a write. The direct validator accepts only the exact
committed prepared/saving operation and its allowed dates with Push_Update false.
Schedule_Change_Log is durable. Unique Crew_Schedule_Lock.Phase_Key serializes
prepared user/import/outbound paths. Markers/logs/locks are server-only, not
user-writable reports. Native form validators check the staged operation and
fresh statuses/dates. Undo/redo are compensating operations with the same checks.
The server also rejects compensation when a newer recorded operation targeted
the same fields, including dates changed away and back to the same value.
Chronology uses audit Timestamp; Creator record IDs are allocated across writers
and must not serve as a clock. Other recorded operations with the same timestamp
conservatively block compensation. History sorts by Timestamp descending.

Creator multi-record writes are not presented as atomic. All targets are
prevalidated; confirmed destination IDs are recorded incrementally. Partial
failures retain exact confirmed records and reload authoritative data. A lost
reply blocks new edits and offers read-only Check status; it never resends.
Unfinished user operations also expose Check status in durable History, so a
lost page session does not lose the recovery entry. Complete terminal results
are persisted before their terminal state, and status recovery can clean up a
terminal operation's remaining lock without replaying writes.
Exact date comparisons are limited to explicit unknown-reply recovery. Successful
native acknowledgements are not gated by post-save editable-field equality.

If execution never finishes, keep the phase lock and require administrator
recovery. Do not delete a lock on a timer or replay an ambiguous request. Review
the native request, operation log and current records before releasing a lock.
The direct-form workflow is an additional application guard, not a security
boundary against an administrator deliberately skipping workflows or rewriting
Deluge. Such privileged paths require operational control.

The prepared guarded copies retain the existing import/export business logic
except serialization and test-record exclusion. They do not activate either
inactive outbound schedule, repair the legacy outbound endpoint/response checks,
or replace the existing Analytics delay mechanism. Those legacy synchronization
repairs belong to the separately requested future push integration. Do not
overwrite newer live workflow edits with an older exported body; merge the guard
into the current body and retain any integration-audit instrumentation.

## Verification and rollback

The management browser entry point is `/widget.html?managementChecks=1` on the
local preview server. It exercises actual rendered create/edit/active-state and
assignment controls, native validation rejection, duplicate committing clicks,
lost/ambiguous native acknowledgement and no-replay recovery, native-shaped IDs,
lookups and checkbox forms, denied scopes/field omissions, report pagination and
desktop dialog/picker geometry. `/widget.html?management=1` supports visual review.
These fixtures are injected only in served local previews and never included in
releases. Actual result evidence is recorded after the checks run.
`/desktop.html?workspace=crews` runs geometry and keyboard checks at the four
desktop sizes without repeating CRUD; it verifies both editors, picker bounds,
focus return, a centered close SVG, readable side-by-side panes and page overflow.

The user has additionally authorized a lightweight individual Projects task
mirror. Reuse/extend `Task_Schedule`; preserve source task/project/phase identity,
raw dates/status and explicit stage mapping. A task screenshot does not establish
a verified portal/query or an automated import. Native schema installation,
data ingestion and reliable stage-date write behavior remain separate evidence
gates. Blank Start/Due values must remain blank; Completion date is not an endpoint
substitute. Task source/write flags remain disabled until those inputs are known.
Six new fields and optional Subdivision1/Stage_Key are installed/reopened in
Development, and All_Task_Schedules exposes 19 web-layout columns including ID.
The mirror importer is uninstalled; taskMirrorEnabled/tasksEnabled/taskWritesVerified
remain false. Schema/report readiness is not a verified source ingestion path.

Run `node scripts/test-crew-locations.mjs`, the isolated browser harness described
in [installation](../../creator/crew-locations/INSTALL.md), `npm run validate`,
and `npm run build:pages`. The current suites pass 24 scheduling groups, five
native-read groups and eleven focused backend groups. Full validation passed after the native
fixes. The latest management browser run passed 17 groups; the schedule browser
run passed 21. Schedule geometry passed 23 checks at four sizes. Final management
geometry passed 24 checks at 1250×564, 1250×600, 1366×768, 1440×900 and 1920×1080.
The compact check selects actual fixture latest/future work and requires the first
upcoming assignment row to fit completely. Final 1.2.3 validation, Pages build
and Creator packaging passed; CI/Pages publication and live presentation smoke
confirmation are separate pending gates. Browser checks
exercise actual rendered controls against isolated SDK fixtures; they do not
compile Deluge or establish native connection/auth behavior. Native Creator
compilation and owner Development crew CRUD are now verified separately.
Restricted-user breadth is not claimed. Remaining native steps are the user's
Creator application promotion and optional verified external task-source setup.
Detailed evidence is in
[verification.json](../../creator/crew-locations/verification.json).

Release rollback maps the widget to 1.1.4 and retains manual crew/assignment records.
Full feature rollback restores the previous milestone embed from
`creator/crew-locations/native-before/Milestone_Gantt_View.zml` and disables the
new Crew APIs/page. Preserve audit logs, markers and unresolved phase locks until
records are reconciled. Keep outbound guards while markers remain. Version 1.0.6
was Development-only and is not a functioning Production fallback.

Native inline editors bind change on the rendered input; boundary editors bind
on their owning content container. The isolated harness also simulates a host
consuming document-level change events so native field-exit saves do not depend
on document event propagation. Native widget verification remains separate.

Final 1.1.3 verification: both Development pages load the externally hosted
release and display Creator-only mode. Normal date typing and Tab produced a
complete native destination acknowledgement; audited Undo restored the original
end date. Full repository validation, the 33-path build, CI and Pages passed.
Evidence and exact operation IDs: [PMP outcome](../../creator/crew-locations/pmp-outcome.json).
Pending Creator publication remains the user's step under PMP; Production native
save verification is therefore not claimed. Crew/task source adapters stay off.
