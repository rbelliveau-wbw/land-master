# Compact Crew Management

Release 1.5.3 is a frontend change. Creator remains at the verified 9.134 sync
installation; there are no new forms, functions, endpoints or grants.

Workspace tabs move into the title bar. Employees uses one desktop toolbar for
Roster / By Foreman, counts, search, status, Refresh and New Crew. Body rows
are 35px in Roster and 34px in foreman groups, with names and employee codes
on one line. Work dates show distinct day counts and compact bounds; their
title retains every exact recorded date, including gaps. Job codes also keep
their full value in titles. Active/inactive semantics and 14-day review grouping
are unchanged; crew location badges still use seven calendar dates.
The employee workspace flexes within Creator's actual iframe height. Its toolbar
stays mounted and the remaining report region scrolls, leaving bottom clearance
without adding a second document scrollbar. Other workspaces keep their layout.

Territory, Labor Type and Crew Assignment use inline searchable single pickers.
The foreman's Labor Type and Crew also appear in each group header. Selection
saves that employee through the existing validated native SDK write path.
Unchanged selections send no write. Acknowledged saves update displayed staffing
and refresh through the existing report path. There is no automatic staffing
inference, bulk assignment, employee-status editing or post-save field comparison.
Inactive employees and accounts lacking assignment rights stay read-only.

An actual rejected save displays the native error and leaves the last acknowledged
row intact. An ambiguous reply opens the existing employee recovery dialog,
persists its request under actor/environment and blocks a second write; Check
Save Status is read-only. Identity changes invalidate old replies. The compact
picker uses the shared overlay engine, focus/keyboard behavior and save feedback;
the existing keyed row and Sliding push count registries remain active. Confirmed
rows receive the shared changed-cell highlight. Initial values stay static and
reduced motion remains supported.

## Validation

- Controller tests execute the installed picker handlers and real employee save
  logic: no-op, successful save with unchanged other staffing, inactive and
  read-only prevention, native rejection, ambiguous reply lock and actor change.
- Isolated desktop browser: searchable Roster edit issued one native PATCH;
  no-op issued none. A By Foreman crew change with a lost reply opened recovery;
  Check Save Status confirmed it with still exactly one native attempt.
- `npm run validate` and `npm run build:pages` passed for the final 1.5.3 source.
- Desktop browser additionally verified disabled inline controls for inactive
  employees and read-only accounts, and retained cell focus after a native save
  and the complete report refresh. Measured Roster rows are exactly 35px.
- Production smoke verification checks the released version, actual roster and
  By Foreman dropdowns without altering real employee assignments.

Mockups cover all Crew Management views, as the user confirmed. Compact
Workspace and Focus Rail are interactive design concepts; their sample staffing
does not write to Creator. Crews and schedule concepts beyond the common header
are proposals, separate from this release's explicit roster/foreman changes.

Rollback: return only `crew-locations` in Production to 1.4.0. Preserve Creator
9.134, all synced employees/timecards, manual staffing, daily schedule/audit queue,
HeavyJob mappings and all unrelated environment versions.
