# Crew Management — Creator-only scheduling 1.1.0

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

Release 1.1.0 routes the frontend API alias by authenticated Creator environment:
`Crew_Locations_Widget_DEV`, `Crew_Locations_Widget_STAGE`, or
`Crew_Locations_Widget`. The server independently derives its environment from
`thisapp.environment.type` and `thisapp.environment.linkname`; client payloads
cannot select a backend. Preserve the existing logged-in-user Creator connection.
API registration, native installation and repository deployment are separate.
The latest PMP instruction leaves Creator promotion to the user.

The prior Development save was rejected and no milestone change was confirmed.
Live save/undo remains a required native verification. Crew/task source adapters
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

No crew query/API or Analytics view has been verified. crewsEnabled remains false.
Crew and Crew_Assignment supply an authenticated adapter contract once an actual
source is identified. `crewLocationsImportAssignments` is an INTERNAL function,
not a browser API. It requires the server-configured source system/import actor,
exact External_System_Mapping joins, unique crew codes, stable source IDs and
actual assignment dates. Repeated activity does not duplicate badges. Unresolved
jobs/crews remain unresolved. No Creekside name-based exception is installed.

`crewLocationsImportTasks` is likewise internal and disabled. It accepts only a
verified adapter's explicit external project ID, canonical stage key, source
record ID and actual endpoints. It does not discover a provider endpoint or
aggregate tasks. Source timestamps must be normalized by the verified adapter.
These ingestion functions have not been run against live records.

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

The v2 widget uses the existing shared authenticated runtime/data adapter.
Native report reads are paginated and limited to required exposed fields. A
permission failure clears private data and labels. View preferences alone use
localStorage. The custom API derives actor from zoho.loginuser, not supplied email.

The EXISTING logged-in-user Creator connection performs delegated report reads/PATCH
writes with the trusted `thisapp.environment.linkname` header. An admin connection is not equivalent:
it would broaden native sharing. Test both report and row restrictions using
restricted users before enabling the service.

Operations carry unique IDs, exact expected endpoints and field changes.
Schedule_Change_Log is durable. Unique Crew_Schedule_Lock.Phase_Key serializes
prepared user/import/outbound paths. Markers/logs/locks are server-only, not
user-writable reports. Native form validators check the staged operation and
fresh statuses/dates. Undo/redo are compensating operations with the same checks.
The server also rejects compensation when a newer recorded operation targeted
the same fields, including dates changed away and back to the same value.

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

Run `node scripts/test-crew-locations.mjs`, the isolated browser harness described
in [installation](../../creator/crew-locations/INSTALL.md), `npm run validate`,
and `npm run build:pages`. The 1.1.0 rule suite has 23 groups. Browser checks
exercise actual rendered controls against isolated SDK fixtures; they do not
compile Deluge or establish native connection/auth behavior. Native Creator
compilation, restricted-user checks and live save/undo/import checks remain
installation gates. Detailed evidence is in
[verification.json](../../creator/crew-locations/verification.json).

Rollback restores the previous milestone embed from
`creator/crew-locations/native-before/Milestone_Gantt_View.zml` and disables the
new Crew APIs/page. Preserve audit logs, markers and unresolved phase locks until
records are reconciled. Keep outbound guards while markers remain. Version 1.0.6
was Development-only and is not a functioning Production fallback.
