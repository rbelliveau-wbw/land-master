# Takedown Schedule — Second Closing rework

## Status — October 5, 2026

This is a coordinated Creator backend and widget candidate. The two Number
fields `Second_Closing_Lots` and `Second_Closing_Days` have been added to both
`Contract` and `Takedown_Schedule` in Development and verified after Save and a
full reload. The new `Calculate_Takedown_Cadence` helper compiled, was reopened,
and passed a native read-only Execute: day 75 returned 20 expected lots, a
75-day second-closing offset, and a 165-day end offset. The daily date, daily
expected, and manual refresh replacements were saved and reopened in Development.
The two and three superseded expected/manual bodies were neutralized reversibly;
existing native action conditions and schedule settings were retained. Captured
live originals match the preserved legacy branches. Both reopened combined
bodies passed the six focused cadence regression groups using local fixtures;
live saved-record readback remains a separate verification step. The new
Created or Edited validation and successful-submission guards were saved and
reopened under native link names `Validate_Takedown_Cadence` and
`Recalculate_Takedown_Cade`; all four reopened combined/form-action bodies pass
the six local cadence groups together. Native record-writing execution was not
performed for these checks. The
Forecast Manager summary was saved and reopened in Development; reopened source
matches its reviewed live-preserving patch and passes the seven focused summary
regression groups. All dependent backend functions/actions have now compiled,
been saved and reopened in Development. Both new columns were saved/reloaded in
all four report quick layouts. The Forecast binding audit confirmed no separate
page column edit is needed. Fresh native saved-record verification remains
pending; the user owns Creator promotion and authorized Git-only Production
widget mappings to Legal `1.61.3` and Land `8.15.4`. An environment snapshot showed Stage `9.43` and Production
`9.42` after an external user-initiated Publish; it does not verify that Publish's
outcome or this feature's presence there. This task has not published Creator.

The [field migration registry](../../creator/schema-changes/second-closing.json)
records the schema work. The August generated export is an older snapshot;
do not hand-edit generated metadata to imply that it verifies these fields.
See the [native activation instructions](../../creator/workflows/takedown-second-closing.md)
before publishing any dependent code.

## Three closing tiers

Second Closing is a single event, with its own lot quantity and delay. Subsequent
Closings repeat only after that event. The UI uses **Initial Closing**, **Second
Closing**, and **Subsequent Closings** consistently.

| Meaning | Contract field | Takedown Schedule field |
| --- | --- | --- |
| Total obligation | `Number_of_Lots` | `Total_Lot_Obligation` |
| Initial quantity | `Initial_Takedown` | `Initial_Takedown` |
| Initial grace period in days | `Initial_Takedown_Days` | `Initial_Delay_Days` |
| One-time second quantity | `Second_Closing_Lots` | `Second_Closing_Lots` |
| Second delay after initial due day | `Second_Closing_Days` | `Second_Closing_Days` |
| Repeating quantity | `Subsequent_Takedown_Lots` | `Continued_Takedown` |
| Repeating interval in days | `Subsequent_Takedown_Days` | `Continued_Takedown_Delay_Days` |

The actual Initial Closing is the clock basis. Keep the existing native start
behavior: `Initial_Closing_Date` overrides `Takedown_Start_Date`; otherwise the
existing sold-lot purchase-date logic establishes the start. The initial due day
is start plus the initial grace period. Second Closing is due on that day plus
its own delay. The first recurring closing is one subsequent interval after
Second Closing. Each due day is inclusive for the new calculation.

For an initial quantity of 10, initial grace of 30 days, Second Closing of 10
after another 45 days, and subsequent quantities of 10 every 30 days:

| Days since actual Initial Closing | Cumulative lots expected |
| --- | --- |
| 29 | 0 |
| 30 | 10 |
| 74 | 10 |
| 75 | 20 |
| 104 | 20 |
| 105 | 30 |

The end date uses the number of recurring takes needed for the remainder,
rounded up to a full interval. Expected lots are capped at total obligation;
the last take can be smaller. A future start uses signed elapsed days and
expects zero before the first due day. Total obligation must be positive and
whole; initial lots and grace days must be whole numbers of zero or more.
Second Closing days may be zero; lots must be a positive whole number.
Recurring lots and days must be positive whole
numbers only when obligation remains after the initial and second quantities.
No recurring fields are required when those quantities satisfy the obligation.
Any supplied recurring values must still be whole numbers of zero or more.

## Existing records and independent schedules

Records with both second fields blank keep their existing calculation until
their closing terms are edited. No bulk migration, inferred second quantities,
automatic copy from subsequent terms, or recalculation of legacy populated end
dates is part of this change. Historical strict boundary and future-start
behavior stays in the legacy branch.

New closing terms and changes to quantity, cadence, total obligation, or the
schedule anchor require a complete Second Closing pair. Unrelated legacy edits
can preserve blank second fields. A partially entered pair is invalid and must
never fall back to the legacy calculation. Existing no-scope Lot Master shells
retain their creation behavior; entering applicable closing terms requires the
complete pair.

Contract changes **never synchronize an existing Takedown Schedule**. Completion
copies terms only while creating a missing schedule. Both the completion
function and native creation workflow keep their create-if-missing guard.
Users edit an existing schedule directly when its own terms need to change.

The Legal and Land schedule editors provide an explicit copy action from Second
Closing to Subsequent Closings. It copies the current two input values into the
pending draft once. It neither saves nor creates a continuing link: later edits
to either tier remain independent. Cancel discards the pending copy.

## Forecast and receipt boundaries

`buildForecastManagerSummary` displays all three tiers in single-phase cards and
the whole-contract section of multi-phase cards. Blank legacy second values stay
blank. Shared closing obligations are not allocated implicitly to a phase.
The full schedule obligation, selected-phase contract membership, Sold/Scheduled
progress, green monthly meter, and start-of-month Unforecasted calculation keep
their existing scopes.

Forecast creation still creates monthly records by subdivision, builder, and
the February–January fiscal year. This rework does not populate or replace
entered forecasts or change forecast-window locks. Builder Takedown receipts,
taxes, interest, purchase-date writes, and lot status derivation are outside this
cadence change.

## Verification and rollback

Focused source regressions are
[`test-takedown-second-closing.mjs`](../../scripts/test-takedown-second-closing.mjs),
[`test-contract-second-closing.mjs`](../../scripts/test-contract-second-closing.mjs),
[`test-land-master-second-closing.mjs`](../../scripts/test-land-master-second-closing.mjs),
and [`test-forecast-summary.mjs`](../../scripts/test-forecast-summary.mjs).
They cover one-time counting, unequal second/recurring terms, inclusive day 75,
zero delays, future starts, partial final takes, exhausted obligations, partial
or invalid fields, daily/manual/on-save parity, legacy branches, unrelated edits,
explicit staged copy, unchanged existing schedules, phase scope, and entered
monthly forecasts. Local Deluge execution fixtures do not verify Creator
compilation. Native compilation and read-only execution are verified for the
shared helper; Save/reload for the remaining bodies and report-field readback
remain required.

Run `npm run validate` and `npm run build:pages` before release. Backend changes
require a Creator deployment; the additive schema and report changes must reach
the target environment before either widget is promoted.

Development UI rollback mappings are Contract Management `1.60.52` and Land Master
`8.14.5`; prior Production baselines are `1.60.55` and `8.14.8`.
Preserve both second fields and entered values. A widget rollback alone
does not restore three-tier calculations, and older widgets may omit the second
inputs. Use captured native pre-change bodies to roll back backend actions only
after reviewing schedules that now contain second terms. Do not clear those
terms or silently run the old two-tier formula against those records. Generated
exports and unrelated receipt, forecast, and lot data remain unchanged.
