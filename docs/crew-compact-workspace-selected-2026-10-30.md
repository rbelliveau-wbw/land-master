# Approved Compact Workspace — 1.6.0

The user selected Compact Workspace from the two interactive concepts and
requested PMP. This frontend release completes the Crews and Milestones & Tasks
views. Employees keeps the released compact Roster and By Foreman behavior.
Creator 9.134 and its installed forms, functions, syncs, audit queue and grants
remain unchanged; no Creator promotion is required.

Crews has one horizontal toolbar, compact code/name rows and a fitted roster/detail
layout. Its record header shows saved foremen and the latest recorded foreman jobs
within today and the previous six calendar dates. Identity uses exact, unambiguous
BU GUIDs and the existing saved subdivision mapping; deleted, future and stale
timecards are excluded. Multiple foremen/jobs are preserved, with full text in
titles. Unmapped cards retain their job code and an explicit Unmapped label.
These are recorded locations, not inferred ongoing presence.

The Employees section lists saved crew membership, including retained inactive
employees. Its Labor Type picker reuses the employee controller and validated native
SDK save. Territory and Crew are preserved in that request. No timecard group is
automatically assigned. Pending and rejected saves appear in the crew detail;
ambiguous replies open the same read-only recovery and block duplicate writes.
Actor/environment invalidation clears staffing access. Shared keyed rows, numeric
counts, confirmed-cell highlights and picker/status motion remain in use.

Upcoming Work stays visible. Latest Dated Work and earlier assignments remain
accessible under Dated Work, including existing manual edit actions and imported
source locks. Crew creation, editing and activation use the original handlers.

The schedule now has Timeline and Edit Schedule panes in one viewport. They retain
the mounted Gantt and date grid, existing filters, hide/restore controls, Jump to
Stage, real horizontal scrolling, paired M/T rows, source colors, exact overlaps,
date/permission guards, history and unknown-save recovery. Task bars remain
read-only. View changes do not read data, save a date or reset operation state.
Browser-filled date values also commit on field exit when no change event fires;
the existing change handler and busy/unknown guards prevent duplicate submission.
Both routes use the same original date-save function.

## Verification

- Focused model tests cover saved memberships, inactive retention, exact owner
  identity, duplicate BU exclusion, seven-date bounds and multiple latest jobs.
- Controller tests cover mounted editor/value/filter/unknown-operation retention
  and exact horizontal scrollbar width across schedule views.
- Isolated desktop browser: a crew member Labor Type edit issued one native PATCH,
  updated the foreman/recent-job display and preserved other staffing. A lost
  reply recovered without a second write. A rejected save kept its original
  staffing and showed the real error in the visible crew view. Cell focus survived
  the independent employee/crew refreshes. Dated Work retained the old assignments.
- One date edit saved through the existing preparation/apply path. Switching
  Timeline → Edit Schedule retained the acknowledged date and still exactly one
  apply operation. Native permissions, source locks and write rules are unchanged.
- Full repository validation and the Pages build passed for 1.6.0. Desktop
  verification at 1148 × 565 passed all 29 checks, including no outer scrollbar
  in Crews, Timeline or Edit Schedule, visible upcoming work, keyboard navigation,
  dialogs, searchable pickers and centered SVG controls, with zero native writes.
- Publication also requires CI/Pages success and a read-only Production smoke
  test of all workspace views.

Rollback: return Production's `crew-locations` asset mapping to 1.5.3. Retain
Creator 9.134, employee staffing, mirrored timecards, all assignments and mappings,
daily schedules/audits and unrelated widget environment versions.
