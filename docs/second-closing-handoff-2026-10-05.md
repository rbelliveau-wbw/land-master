# Second Closing handoff — October 5, 2026

## Implemented and verified

- Added Number fields `Second_Closing_Lots` and `Second_Closing_Days` to
  `Contract` and `Takedown_Schedule`; both Development forms were saved and
  fully reloaded. No defaults, global mandatory flags or record backfill.
- Added one-time Second Closing between Initial Closing and repeating
  Subsequent Closings. Timing uses actual Initial Closing plus initial grace,
  then second delay; deadlines are inclusive. Native read-only helper Execute
  returned 20 expected lots on day 75, second offset 75 and end offset 165.
- All dependent Development functions and actions compiled, were saved and
  reopened. Combined daily/manual calculation bodies retain legacy branches;
  superseded trailing bodies were neutralized reversibly. Existing triggers,
  action conditions and daily settings were preserved. Created-or-Edited
  schedule guards have native names `Validate_Takedown_Cadence` and
  `Recalculate_Takedown_Cade`.
- Existing Custom API names and signatures remain unchanged. The existing
  `Complete_Lot_Contract` API invokes its updated function; the new cadence
  helper is internal and needs no Custom API registration.
- Untouched legacy terms keep old calculations. New/edited terms require the
  second pair. Explicit copy stages second terms into subsequent terms once.
  Contract changes never synchronize existing schedules. Monthly forecasts,
  locks, meter, Unforecasted balance, phase scope and receipt math retain their
  existing behavior.
- Both second columns were saved/reloaded in all four Development report quick
  layouts. `All_Takedown_Schedules`, `Behind_Takedown_Schedules` and
  `All_Contracts1` use initial-second-subsequent order. `All_Contracts` places
  second before existing subsequent columns, preserving its prior scope.
- The live Forecast binding audit required no Page edit. Legacy
  `Forecast_Management` embeds `All_Subdivisions` and `All_Forecast_Years`, with
  no separate takedown column list. Modern Form `Forecast_Manager` uses the
  updated summary; applicable Search schedule embeds inherit report columns.
- Final completion error wording was saved/reopened and matched its reviewed
  patch; the Contract suite passed against all seven reopened Legal bodies.
- Development Takedown Schedule field labels were saved and fully reloaded as
  Initial Closing, Second Closing and Subsequent Closings, each with Lots/Days.
  Existing field link names remain unchanged. Contract's existing Initial/Cont'd
  label alignment awaits the publishing lock; its new Second Closing labels are
  already verified.
- The schedule editor verifies fresh persisted terms and server-calculated fields
  before confirming a save. Unknown or mismatched results retain the draft and
  block repeat writes; identified records offer a read-only recheck. Focused
  fixtures cover conflicting responses, exact IDs, zero/blank values, stale
  sessions and formatted numbers; a live business-record save remains a gate.
- Rebased onto the October 5 main updates, preserving Contract creation,
  permission and delete verification fixes, Land import fixes, and independent
  Builder Takedown receipt features. The added receipt editor has no closing
  cadence dependency; its formulas and workflow remain unchanged.
- Local immutable candidates are [Legal 1.61.2](../releases/contract-management/1.61.2/release.json)
  and [Land 8.15.2](../releases/land-master/8.15.2/release.json). Full repository
  validation passed; Pages built 29 current mapped paths. Candidate assets and
  source/config/manifest hashes match exactly. Earlier frozen `.0` and `.1`
  candidates are retained. Environment mappings remain unchanged.

## Remaining activation and evidence

The user initiated Creator Publish outside this task. Builder maintenance cleared
earlier and returned during final label verification; a snapshot showed Stage `9.43` and Production `9.42`, with an
October 5 version-history entry at 13:31. That snapshot does not verify the
outcome of the external Publish, which may still be progressing. This feature's schema and bodies in
those environments are **unverified**. Development compilation/reopen proof
does not establish feature publication elsewhere. No task-initiated Creator
Publish, widget upload or mapping promotion has been performed. Source is
committed on the isolated `second-closing-rework` branch for draft review;
the original dirty checkout remains untouched.

Remaining gates:

1. Verify the intended environment's schema, bodies and API-visible fields
   before treating the externally observed publication as feature activation.
2. Verify fresh persisted terms and calculated results at initial, second and
   subsequent boundaries. Native record-writing execution was not performed in
   the backend verification fixtures. Frontend persisted-readback checks are
   covered by focused execution fixtures; they do not establish a live business
   record's saved behavior.
3. When authorized, promote only the Development mappings to Legal `1.61.2`
   and Land `8.15.2` in [environments.json](../deploy/environments.json), then
   run `npm run validate` and `npm run build:pages`. The existing Pages workflow
   publishes immutable assets after the authorized main update; permanent
   Creator widget URLs stay unchanged. Promote other environments only after
   their Creator dependencies and persisted behavior are verified.

The [schema registry](../creator/schema-changes/second-closing.json),
[behavior contract](../knowledge/modules/takedown-schedule.md), and
[native activation guide](../creator/workflows/takedown-second-closing.md)
contain the field/function/action inventory and regression scope. Recoverable
native originals, reviewed patches and reopened bodies are retained locally in
`.tmp/second-closing-native-originals/` (ignored, not a published artifact).
The legacy Page's captured lower binding is
`.tmp/second-closing-native-originals/Forecast_Management.html_snippet6.dg`.
Native helper screenshots are `.tmp/second-closing-evidence/calculator-development.jpg`
and `.tmp/second-closing-evidence/day75-native.jpg`; those evidence files are
ignored locally too.
Complete validation logs include `.tmp/second-closing-rebased-validation.log`
and `.tmp/second-closing-rebased-build.log`. Reopened cadence bodies passed
all six focused groups together; the reopened summary passed all seven groups.

## Rollback

Prior Development widget mappings are Legal `1.60.52` and Land `8.14.5`;
current main's Production baselines are Legal `1.60.54` and Land `8.14.6`.
Restore the applicable environment's prior mapping if needed. Preserve
both new fields and entered values. Review records with second terms before
restoring captured older backend writers; do not silently apply two-tier math
to those records. Retain all immutable candidates and native originals.
