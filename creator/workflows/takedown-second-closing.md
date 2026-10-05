# Second Closing — native Creator activation

## Current state and authority

The October 5, 2026 Development schema work added and Save/reload-verified
`Second_Closing_Lots` and `Second_Closing_Days` as Number inputs on both
`Contract` and `Takedown_Schedule`, ordered between initial and subsequent
terms. Verified schedule preview IDs are `zc-Second_Closing_Lots` and
`zc-Second_Closing_Days`. `Calculate_Takedown_Cadence` compiled, was reopened,
and passed native read-only Execute: day 75 returned 20 expected lots, a 75-day
second-closing offset, and a 165-day end offset. The existing daily
`Update_Takedown_Dates_Tak` replacement was also saved and reopened in
Development. The combined daily expected and manual refresh replacements were
saved and reopened too; their two and three superseded trailing action bodies
were neutralized reversibly, retaining native identities and action conditions.
Captured date, expected, and manual originals were reconciled against the
August export: every legacy gate, formula, assignment, and action order agrees
with the candidate legacy branches. Both reopened combined bodies passed all
six cadence regression groups against local fixtures. Daily schedule settings
were retained. Native saved-record behavior still needs its separate readback
checks; execution of reopened source locally is not live record verification.
The new Created or Edited form guards were saved and reopened as
`Validate_Takedown_Cadence` (Validations on form submission) and
`Recalculate_Takedown_Cade` (Successful form submission). Their reopened source
also passed the six local cadence groups with the reopened expected/manual
bodies. The native save workflow's assigned link name is shorter than its
source filename. No record-writing execution was performed for these checks.
The Forecast Manager summary was also saved and reopened in Development;
reopened source matches the reviewed live-preserving patch and passes its seven
focused regression groups. All dependent backend functions/actions have now
compiled, been saved and reopened in Development. All four report quick layouts
were saved/reloaded with both second columns, and the live Forecast binding
audit confirmed no independent page column edit is needed. Fresh saved-record
readback and widget promotion remain pending. An environment snapshot showed
Stage `9.43` and Production `9.42` with an October 5 version-history entry at
13:31 after an external user-initiated Publish. It does not verify that Publish's
outcome or feature activation there. Builder
maintenance cleared. This task has not published Creator or promoted mappings.

Use [the field migration registry](../schema-changes/second-closing.json) for
environment-specific schema evidence and
[the behavior contract](../../knowledge/modules/takedown-schedule.md) for timing
and compatibility. `creator/generated/` derives from the older August export;
refresh it from a new verified export, never by manually adding proposed fields.
The exact existing action names below are identified in that export. Reconcile
their current live bodies before replacing them; preserve later unrelated live
changes and capture recoverable originals.

## Schema and report exposure

The two identically named Number fields are verified in Development; add and
verify them in each target environment before dependent activation. Keep old
fields and their link names. Use whole-number
storage, no initial/default values, and do not make second fields globally
mandatory: untouched legacy records must support unrelated edits. Native
validation supplies the conditional requirement.

Both columns are Save/reload-verified in the Development quick layouts of
`All_Contracts`, `All_Contracts1`, `All_Takedown_Schedules`, and
`Behind_Takedown_Schedules`. The latter three have initial-second-subsequent
order. `All_Contracts` places second before its existing subsequent columns;
initial columns were not previously present, so that report's scope was retained.
Verify the corresponding API-visible fields in each target environment.
SDK2 `all` still depends on report exposure, so schema existence alone is
insufficient. Confirm exact persisted numeric values, including explicit zero
days, in a fresh report read before claiming a verified widget save.

The live legacy Page `Forecast_Management` has `html_snippet5` embedding
`All_Subdivisions` above `html_snippet6`, which embeds `All_Forecast_Years` in
`frame14`. It has no independent takedown column list to change. The modern
`Forecast_Manager` Form delegates its display to the already saved/reopened
`buildForecastManagerSummary`; applicable Search takedown embeds inherit
`All_Takedown_Schedules` report columns. The binding audit required no Page
change. The captured lower snippet is retained with the native originals.

Legal's immutable-payload readback requires both new numeric fields to be
returned for a save that changes them. Land's existing normal Save path confirms
the native acknowledgement and patches its local values; verify a fresh
persisted schedule row separately, including the six terms, expected lots and
end date. A visible column or successful acknowledgement does not replace that
readback.

## Existing components and proposed additions

| Native target | Checked-in source | Change |
| --- | --- | --- |
| New Deluge helper `Calculate_Takedown_Cadence`, verified in Development | [function](../functions/Calculate_Takedown_Cadence.dg) | Shared three-tier numeric calculation; compiled/reopened/read-only Execute verified, no record writes |
| Existing daily `Update_Takedown_Dates_Tak` — Update Takedown Dates - Takedown Schedule | [action body](Update_Takedown_Dates_Tak.dg) | Saved/reopened in Development; preserve legacy missing-end gate; recalculate three-tier end dates |
| Existing daily `Update_Expected_Sold_Coun` — Update Expected Sold Count - Takedown Schedule | [action body](Update_Expected_Sold_Coun.dg) | Saved/reopened in Development; combined first action with trailing two bodies neutralized; reopened-source regressions passed |
| Existing report action `Refresh_Calc_Fields_Taked` — Refresh Calc Fields - Takedown Schedule | [action body](Refresh_Calc_Fields_Taked.dg) | Saved/reopened in Development; combined first action with trailing three bodies neutralized; sales counting/legacy conditions preserved and reopened-source regressions passed |
| New `Validate_Takedown_Cadence` — Validate Takedown Cadence | [action body](Validate_Takedown_Cadence.dg) | Saved/reopened in Development; Created or Edited, Validations on form submission; require second terms on new/changed cadence/total/anchor and allow untouched legacy edits |
| New `Recalculate_Takedown_Cade` — Recalculate Takedown Cadence On Save | [action body](Recalculate_Takedown_Cadence_On_Save.dg) | Saved/reopened in Development; Created or Edited, Successful form submission; recalculate the saved schedule's own terms |
| Existing `Complete_Lot_Contract` | [function](../functions/Complete_Lot_Contract.dg) | Validate/copy second pair while creating a missing schedule; preserve existing-schedule guard |
| Existing `Create_Takedown_Schedule_1` — Create Takedown Schedule 2 - Contract | [action body](Create_Takedown_Schedule_1.dg) | Copy second pair only into a missing schedule |
| Existing `Lot_Contract_Required_Fie` | [action body](Lot_Contract_Required_Fie.dg) | Conditional requirements for new/edited applicable Lot terms |
| Existing `Hide_Lockdown_Fields_Cont`, `Show_Type_Specific_Fields`, `Set_Subdivision_Fields_Co` | [load visibility](Hide_Lockdown_Fields_Cont.dg), [type visibility](Show_Type_Specific_Fields.dg), [subdivision visibility](Set_Subdivision_Fields_Co.dg) | Include second inputs in the existing Lot-specific show/hide rules |
| Existing `Send_Contract_Approval_Email` | [function](../functions/Send_Contract_Approval_Email.dg) | Include stored Second Closing terms in the existing email content |
| Existing `buildForecastManagerSummary` | [function](../functions/buildForecastManagerSummary.dg) | Display second pair in single-phase and whole-contract tables |

Form-action filenames identify source files. Use the recorded native identities
in the table and registry: Creator assigned `Recalculate_Takedown_Cade` to the
successful-submission workflow even though its source filename is longer. Save
and reopen verification covers these two actions; their local fixture checks
do not claim live record-writing execution. No new Custom API is needed;
existing completion/approval endpoints keep their contracts. The helper is
called internally by the proposed/replaced schedule actions.

Keep the existing `Update_Sold_Counts_Takedo` start/sold-count behavior and
`Update_Status_on_Takedown` status consumption. The Forecast Manager Search and
twelve month-edit workflows continue calling the summary with the same
signature. Do not alter `Mass_Create_Forecasts`, fiscal-year/month generation,
forecast locks, receipt calculations, or lot-status workflows.

## Reviewed activation order

1. Capture current live function/action/report definitions and the environment
   mappings. Verify the additive fields on both forms and the required report
   exposure. Existing second values remain blank; do not backfill from recurring
   terms. Keep the candidate feature out of normal use until its dependent
   actions are installed together.
2. Save and reload the new helper, including its outer-scope fallback return.
   Verify its numeric validation and the no-remainder case with blank recurring
   inputs. Then replace the existing daily date, expected-lot, and manual refresh
   action sets with the reviewed bodies. Capture every original action body.
   For a combined replacement, install it in the first action and neutralize
   superseded trailing action bodies with inert assignments, retaining their
   native identities and originals for recovery. Remove actions only after a
   separate reviewed cleanup. Leaving old bodies active would overwrite new
   results with two-tier arithmetic. Keep existing triggers, schedule times,
   frequency, and America/Chicago timezone. Reconcile reopened source after
   Creator canonicalization. New mixed AND/OR criteria use precedence-safe
   conjunctions, and consequential runtime guards use nested conditions so
   removing grouping parentheses cannot broaden their behavior.
3. Add the proposed schedule on-validate/on-success actions. Save/reload them and
   verify new schedules, changed cadence/total/anchor, unrelated legacy edits,
   and no-start cases. A partial pair must neither enter legacy math nor overwrite
   a previous calculation. The on-success action operates only on the schedule's
   own saved terms.
4. Install the reviewed Contract validation/visibility, completion/create-if-
   missing, approval-content, and Forecast Manager summary updates. Verify both
   completion entry paths create one missing schedule with all six terms and
   never update an existing schedule from Contract edits. Preserve existing
   approval recipients and send behavior.
5. Run focused regressions and repository validation/build. Exercise fresh native
   report reads and saved results at the initial, second, recurring, and final
   due boundaries. Verify the current Forecast Manager monthly meter,
   start-of-month Unforecasted balance, and multi-phase scopes. Record Save/reload
   evidence; local execution adapters are not native compilation proof.
6. Create and validate immutable widget candidates separately; promote the
   applicable environment mappings only after the persisted-behavior gates
   pass. Promote backend schema/report/function/
   workflow dependencies to a target environment before its widget mappings.
   Production publication remains a separately tracked action; these source
   instructions do not claim or authorize it.

## Regression and rollback

Run `scripts/test-takedown-second-closing.mjs`,
`scripts/test-contract-second-closing.mjs`,
`scripts/test-land-master-second-closing.mjs`, and
`scripts/test-forecast-summary.mjs`, followed by `npm run validate` and
`npm run build:pages`. The shared example starts at actual Initial Closing,
waits a 30-day grace period, and adds another 45 days for Second Closing; on day
75 inclusive, 10 initial plus 10 second lots are expected. Recurrence starts one
interval later. Cover unequal quantities/delays, zero second days, future starts,
partial final takes, obligation exhausted by initial/second, invalid partial
pairs, legacy parity, no automatic copying, and no Contract-to-existing-schedule
updates.

Retain the additive schema and all entered Second Closing values during rollback.
Prior widget mappings are Contract Management `1.60.52` and Land Master
`8.14.5`. Backend rollback uses captured native pre-change bodies, with a review
of records containing second terms before restoring two-tier writers. Do not
delete new fields, clear new data, or reinterpret second closings as recurring
takes to make an older release appear compatible. Report exposure may remain;
it is additive. Preserve the current monthly-meter/phase-scoping summary baseline
when reverting only this feature.
