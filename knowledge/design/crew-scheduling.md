# Crew scheduling

Repository-wide rules for Crew Locations and equivalent scheduling surfaces.
The implementation and installation contract are in
[Crew Locations](../modules/crew-locations.md).

Use a full-width timeline above the schedule grid. Keep each phase's Milestones
row directly above Tasks. Put crew badges beneath Tasks in the left title column.
Keep phase IDs stable, readable text, normal page scrolling, and a real calendar
axis starting today in America/Chicago. Month and year labels must remain readable
for partial months. Sections share the same band within each row type.

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

The latest October 21 direction removes testing mode and permits Creator-only
Production edits. Keep the compact Creator only / Projects push off label.
Prepare and apply use the same progress dialog; preparation is not a saved date.
Do not advertise Projects synchronization success for a Creator-only save.
Fixtures belong exclusively in the local browser harness, never widget releases.
