# Crew Employees By Crew — November 2, 2026

The employee pane groups each native employee once by saved Crew. Crew cards
show code/color, member count and assigned foreman names; foremen lead the
member rows and Unassigned appears last with an amber accent. Initials,
employee codes, hover names and inline staffing pickers remain readable.
Search matches crew name/code or individual employee name/code, territory and
labor type. Active/Inactive/All retains existing status semantics.

Existing native staffing writes, captured foreman group updates, permissions,
recovery, timecard imports and milestone scheduling are unchanged. The current
All_Crews Badge_Color field supplies presentation color. There are no new
Creator forms, fields, functions, APIs, connections or deployment steps.

## Verification

- `npm run validate` and `npm run build:pages` passed for release 1.9.0.
  The immutable release matches all 21 source application files exactly.

- Exact string-ID grouping, cross-foreman membership exclusion, deduplication,
  null lookup shapes, inaccessible crews, retained inactive employees and
  source immutability are covered by the employee model suite.
- Existing inline and group assignment suites cover native saves, errors,
  no-op choices, access guards and lost-reply recovery.
- Desktop browser preview verified crew search, individual search, status filtering,
  inactive read-only rows, badge contrast and inline reassignment. A sample employee
  moved from Unassigned into the selected crew with focus following the row.
- Native Production verification follows the immutable release deployment.

## Test Data Cleanup

At the user's request, five explicitly named Production test crews and their
six dated Crew_Assignment records were deleted through native report actions.
Both reports confirmed the resulting counts: nine operational crews and zero
dated assignment records. Crew Management refreshed to the nine operational
crews. No employee, phase, project, timecard or milestone record was deleted.
Exact deleted IDs are recorded in the removal inventory.

## Rollback

Restore the Production crew-locations mapping to immutable release 1.8.3.
Retain Creator metadata, employee staffing, crews, timecards and audit history.
The test-data cleanup is separate from the presentation release and is not
reversed by a widget rollback.
