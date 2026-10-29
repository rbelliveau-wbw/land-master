# Crew scheduling

Repository-wide rules for Crew Locations and equivalent scheduling surfaces.
The implementation and installation contract are in
[Crew Locations](../modules/crew-locations.md).

Open **Employees** by default when the native employee capability is enabled.
Keep **Crews** and **Milestones & tasks** as separate workspaces. Legacy native
versions retain the Crews default until Creator promotion. Keep
the schedule mounted while switching workspaces. In the schedule workspace,
use a full-width timeline above the schedule grid. Keep each phase's Milestones
row directly above Tasks. Put crew badges beneath Tasks in the left title column.
Keep phase IDs stable, readable text, normal page scrolling, and a real calendar
axis starting today in America/Chicago. Month and year labels must remain readable
for partial months. Sections share the same band within each row type.

October 29 direction: the timeline grows vertically with the selected phases and
fits the selected calendar horizon horizontally where readable. Retain horizontal
scrolling when needed; never compress phase labels or edit cells. Bound the editing
table to its readable scrolling workspace while retaining normal page scrolling. Freeze phase labels horizontally and keep
the calendar axis and both table heading rows visible during vertical scrolling.
Provide direct Timeline / Edit Schedule navigation and a searchable Jump to stage
action so editing does not require traversing every phase or dragging a long
horizontal scrollbar. Keep all stage columns available through the existing
hide/restore controls. Let filter controls wrap within the card when needed;
never make the filter strip or the page itself scroll horizontally.

When the Task source is unavailable, preserve each phase's paired Tasks row and
crew badges in a compact row labeled Task source unavailable. Do not display a
matrix of disabled empty date fields or imply that blank task data is available.
Configured sources with legitimately missing dates retain their normal row and
missing-boundary presentation. Editable schedule cells keep a visible pale-blue
outline, including prefilled values; permission and date guards still determine
whether each cell is editable.

Keep Crew, Next Rough Cut Starts, Territory, Section and Dates in one filter row.
Use searchable checkbox multi-selects with stable IDs, clear actions, keyboard
navigation and preserved selected options. The lower grid follows these filters;
Show all projects releases its phase/section link while retaining its own filters
and permissions. Sold-out phases require an explicit table status selection.

Rough Cut is purple; Sewer–Storm Drain is white with a black outline;
Road Prep–Closeout is grey. Use consistent opaque colors on both row types and
transparent blue diagonal hatching on exact cross-section intersections. Keep
source boundary edges visible and make overlapping source endpoints selectable.
Bars contain day counts only. Tooltips identify source stages, actual dates,
missing boundaries and clipping. A missing boundary must never invent a span.

Use Start / Days / End cells with stacked single/double arrows. Hide/restore is
presentation only; arithmetic uses complete source records. The horizontal
scrollbar sits above column controls. Show All Columns shares the restoration
chip row to its right. Date inputs are plain explicit calendar-date text fields;
do not introduce native browser date pickers or dialogs.

October 28, 2026 direction: omit individual Hide buttons on Start, Days and End.
Retain Hide Group, restoration chips and Show All Columns, including restoration
of previously hidden individual columns.

Milestone handles change only their represented endpoints. Task Gantt surfaces
remain read-only even when task-table editing is permitted. All editing uses
authenticated server validation, durable audited operations and exact identities.
Locks and permission errors take precedence over every presentation control.

Apply [interaction motion](interaction-motion.md),
[number transitions](number-transitions.md), and
[transfer progress](transfer-progress.md). The Crew Locations registry is
[crew-surfaces.js](../../widgets/crew-locations/src/app/crew-surfaces.js).
It registers keyed paired rows and uses the existing shared engines for surfaces,
feedback, meters, numeric day counts, local lot counts and selection quantities.
Actor/permission epochs discard prior animation history. Native editable inputs retain their
values/caret. Reduced motion is supported.

## Crew roster and dated work

Use the Pro Forma workspace palette, compact record header and readable desktop
cards. Put the searchable Active / Inactive / All roster on the left and the
selected crew's detail on the right. Bound the roster and work tables with their
own vertical scrolling while retaining normal page scrolling. New crew, Edit
crew, Deactivate / Reactivate and Assign work remain visible at ordinary desktop
sizes. Keep Milestones & tasks available as a separate full-width workspace;
do not insert a roster above or beside its Gantt.

Crew_Code is the stable identity and cannot change after creation. Crew_Name is
optional; fall back to the code without repeating the same text on two roster
lines. Show active state and the validated badge color consistently. Choose
black or white badge text with sufficient contrast. Deactivation retains the
crew and its recorded work; reactivation permits new assignments again.

An assignment is one crew, one exact phase identity and one calendar **Work
date**. Use plain MM/DD/YYYY text and the established searchable single-select
pickers for crew and phase. Do not invent assignment end dates, staffing spans,
capacity, or exclusivity rules. **Latest Dated Work** shows every assignment on
the most recent date through today, rather than claiming those crews remain
onsite. **Upcoming Work** lists future occurrences; earlier recorded work stays
available separately. This complete work history is independent of the
schedule's seven-day crew-badge reporting window, which is shown only in the
schedule workspace.

Permit correction or reassignment only for editable manual records. Preserve
native record IDs, immutable crew codes, source system, source record ID and
assignment source key. Imported assignment rows explain their source lock.
Inactive crews cannot receive new work; an existing assignment may retain its
same inactive crew during a permitted correction. Both the current and target
phase remain subject to native permission and phase-status locks.

Use the authenticated user's native Creator SDK for the single-record write,
after server preparation; native form validation and Creator permissions remain
authoritative. Show a precise permission or Creator-promotion dependency when
management is unavailable. Never expose a partial paginated roster as complete.
Retain the last complete authorized view during a refresh; access and required
field failures clear private records.

Use the same authenticated SDK report adapter as the schedule for roster reads,
with fresh module capabilities and complete report pagination. Do not depend on
an additional per-user OAuth connection to open the Crews workspace or replace
native report/row permissions with owner-level reads.

In a short Creator frame, tighten crew header and section spacing and hide the
redundant roster subtitle. Keep text and controls at their normal readable
sizes. Verify a crew with both latest and upcoming work at the actual content
height: the first upcoming row must be visible at 1250 × 564. Loading and saving
tooltips describe that current operation; they must not suggest Creator
promotion during a normal refresh.

Keep a failed draft in its editor. Block duplicate commits while saving and
show success only for the matching request, kind and native destination ID.
An unknown reply locks further writes and offers a read-only status recheck;
never replay it automatically. Keep recovery memory scoped to the authenticated
user and environment across reloads. That memory is a draft and request
identity, not proof that a record was saved.

The existing [crew-surfaces.js](../../widgets/crew-locations/src/app/crew-surfaces.js)
registry owns the shared tab rail, pane/disclosure, dialog and save-feedback
patterns and keyed roster/work-row movement. Reuse that ownership rather than
installing a second observer for the same surfaces. Active/inactive counts,
upcoming-work counts and earlier-work counts use the existing keyed Sliding
push numeric engine. Dates and record identities remain static; initial values,
permission changes and reduced motion retain the shared guards.

The latest October 21 direction removes testing mode and permits Creator-only
Production edits. Keep the compact Creator only / Projects push off label.
October 28, 2026 overrides the earlier automatic progress dialog for milestone
updates: use the shared nonblocking success toast after an acknowledged save,
including propagation and Undo/Redo. Show pending status inline and block duplicate
writes while saving. Keep actual errors visible. Unknown replies retain the
editing lock and an explicit Review save action with read-only status recovery;
never automatically open a dialog or replay an uncertain write. Retain the
destination ledger for that explicit review. Preparation is not a saved date.
Do not advertise Projects synchronization success for a Creator-only save.
Fixtures belong exclusively in the local browser harness, never widget releases.

## Employee staffing and foreman locations — October 29, 2026

The Employees roster defaults to active people and offers Inactive/All plus search.
Edit territory (including N/A), labor type and crew through the established searchable
single-select pickers. Reuse New crew; names, BU identity and active status belong
to Analytics. Retain inactive people and their staffing; show Inactive on schedule
badges when their foreman timecards still fall in the seven-date window.

Use the foreman’s exact BU employee GUID and assigned crew. Today and the previous
six calendar dates determine badges on every exactly mapped phase. Ignore deleted
and future cards. Never fall back to names, employee codes, job prefixes or old
manual assignments in foreman mode. Multiple crews may share a phase; one foreman
working multiple phases may place that crew on multiple phases. Missing mapping
is a data issue, not a guessed location.
