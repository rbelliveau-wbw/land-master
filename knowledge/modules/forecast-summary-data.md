# Forecast summary data and integration audit

## Status and evidence

This October 7, 2026 audit records the committed summary's data contract and a
proposed integration for the new Forecast Manager widget. It changes documentation
only. No helper, response field, Creator deployment or record write is implemented
by this document. Current live development source remains a separate verification
gate; the browser runtime failed before connecting during the new widget work.

Primary source is
[buildForecastManagerSummary.dg](../../creator/functions/buildForecastManagerSummary.dg),
with native calculation context in [Lots](lots.md), closing terms in
[Takedown Schedule](takedown-schedule.md), and candidate endpoint details in
[Forecast Manager](forecast-manager.md). The current source includes the candidate
Second Closing fields; confirm their environment publication before installing a
dependent function outside Development.

## Current presentation

[forecastManagerWidget.dg](../../creator/functions/forecastManagerWidget.dg)
returns the existing summary as `summaryHtml` after snapshot/save/ensure. The
widget places it in a collapsed **Subdivision & takedown schedules** panel below
the forecast matrix. The iframe is 540px tall, has an empty sandbox attribute,
and uses a restrictive content security policy with inline styles enabled.
The full native summary remains available, but none of its schedule metrics is
visible while the panel is closed. The returned HTML has no schedule or builder
record IDs.

The selected builder/year matrix and the native summary have different scopes:
the summary displays all Takedown Schedule records containing the selected
subdivision, regardless of matrix builder/year filters. There is no schedule
Status filter, so completed schedules are not implicitly removed. Retain that distinction
in labels and controls. The matrix remains one row per builder; the summary must
preserve one data item per schedule, including several schedules for one builder.

## Field inventory and scopes

`monthStart` is the first day of the current **calendar month** and
`nextMonthStart` is its next boundary. The February fiscal-year rule controls the
matrix's WFY grouping; it does not shift the current-month meter or recent-sales
periods.

| Subdivision information | Current source and scope |
| --- | --- |
| Name, code, status | `Subdivision.Subdivision_Name`, `Subdivision_Code`, `Status` |
| Company and county | `Subdivision.Company_Name`, `County` |
| Total Lots (LM), Lot Total Residential | Stored `Total_Lots`, `Lot_Total_Residential`; distinct fields |
| Lots Sold, Lots Scheduled | Live `Lots.Status` counts for the selected subdivision |
| Equiv LF of Street | Stored `Subdivision.Equiv_LF_of_Street` |
| Last Sold Date | Stored `Subdivision.Last_Sold_Date`; blank when absent |
| Summary Unforecasted Lots | Read-only obligation/forecast-capacity calculation below |

Every schedule item must preserve the following information. A main-card scope
is the selected subdivision/phase; the separate whole-contract scope exists for
schedules whose `Subdivisions` collection has more than one entry.

| Schedule information | Single-phase main card | Multi-phase main card / whole-contract section |
| --- | --- | --- |
| Builder identity | `Takedown_Schedule.Builder1.Builder_Name` | Same builder identity; retain schedule identity separately |
| Lots Contracted / Populated | Stored `Total_Lot_Obligation` | Count selected subdivision's linked `Contract.Lots1`; label zero as Lots Populated |
| Unforecasted Lots | Schedule obligation less prior-month Sold and builder forecast coverage | Selected-phase linked obligation less prior-month linked Sold and the same builder coverage |
| Sold / Scheduled | Live selected subdivision + Builder counts | Main: selected-phase contract members, without an extra Builder filter. Overall: live Builder counts across all schedule subdivisions |
| Progress and percentages | Sold and Sold + Scheduled over full schedule obligation | Main: phase obligation denominator. Overall: full stored `Total_Lot_Obligation`, including unpopulated future phases |
| Expected lots and pink extension | Stored `Lots_Expected`; extension only beyond Sold + Scheduled | Shared `Lots_Expected` appears in whole-contract details and is not allocated implicitly to a phase |
| Current-month forecast | `Forecasted_Lots` for selected subdivision + Builder from monthStart through before nextMonthStart | Same saved phase/Builder forecast; forecasts are not contract-specific |
| Current-month Sold / green meter | Sold with non-null Close Date in that calendar month, selected subdivision + Builder | Main actual: selected-phase linked contract lots with the same Close Date boundaries |
| Initial Closing Date | `Takedown_Start_Date` | Shared terms in whole-contract section |
| Initial Closing Lots / Days | `Initial_Takedown`, `Initial_Delay_Days` | Shared terms in whole-contract section |
| Second Closing Lots / Days | `Second_Closing_Lots`, `Second_Closing_Days` | Shared terms in whole-contract section |
| Subsequent Closings Lots / Days | `Continued_Takedown`, `Continued_Takedown_Delay_Days` | Shared terms in whole-contract section |
| Takedown End Date | Stored `Takedown_End_Date` | Shared date in whole-contract section |
| Last Takedown Date / Last Take Lots | Stored `Last_Takedown_Date`, `Last_Takedown_Amount` | Main instead shows Last Closing Date / Lots from selected-phase linked Sold lots with Close Date on or before today |
| Recent sales: 30 days, 90 days, 6 months, 12 months | Stored `Last_30_Day_Sales`, `Last_90_Day_Sales`, `Last_6_Month_Sales`, `Last_12_Month_Sales` | Main: linked selected-phase Sold lots within each inclusive rolling period through today. Whole contract: the four stored schedule-wide fields |
| Full contract obligation and phase count | Main obligation already has this scope | Whole contract preserves stored obligation and `Subdivisions.size()`; never substitute populated contract-lot count |

Initial, subsequent and count defaults currently use zero. Missing dates stay
blank. The legacy Second Closing pair stays blank when null; explicit zero,
including zero Days, stays distinguishable. The compact UI can pair Lots and Days
in one cell, but must preserve both values and their meaning.

The current-month Sold meter covers the entire calendar month without an
additional `Close_Date <= today` condition. Future-dated Sold within that month
is included by the existing query. Multi-phase recent sales and Last Closing
do require Close Date on or before today. Preserve those different boundaries.

Stored schedule recent-sales fields are not interchangeable with the live
multi-phase counts: the exported daily refresh sums Close Date matches across
schedule subdivisions/Builder without a Status, Model or on-or-before-today
condition. Stored Last Takedown Date/Amount uses Builder Takedown Purchase Date;
the exported loop assigns each subdivision in turn rather than selecting a
global latest closing. This audit preserves those stored values and does not
repair their refresh workflows. Likewise, live subdivision Sold/Scheduled uses
only Subdivision + Status, while stored lot totals/Last Sold Date have their own
refresh scope. A compact layout must not imply those sources are equivalent.

## Two Unforecasted definitions

The familiar summary value and the candidate widget's persisted subdivision
metric are different calculations and can legitimately disagree.

**Summary subdivision capacity** is:

```text
sum(single-phase schedule obligations)
+ unique selected-phase Contract.Lots1 IDs across multi-phase schedules
- sum(single-phase Sold for schedule Builder/subdivision with Close_Date < monthStart)
- unique selected-phase linked Sold IDs with Close_Date < monthStart
- current-and-future Forecasted_Lots, deducted once per unique schedule Builder
```

**Summary per-schedule capacity** is that schedule's selected-phase obligation
minus its prior-month Sold deduction minus all current-and-future forecast
coverage for its subdivision/Builder. Multiple schedules for the same builder
share that forecast coverage. Do not sum per-card balances to reconstruct the
subdivision total, or invent contract-specific forecasts during the redesign.

Current-month closings consume the green monthly meter and do not subtract again
from the start-of-month capacity. Scheduled/Purchase Date does not consume that
meter or add another capacity deduction. Forecast coverage preserves the native
query's lack of status/deletion/model filters. Negative balances remain visible.

**Persisted native manager subdivision total** is:

```text
Lots count for selected Subdivision + Phase + Model == false
- same-scoped Lots with Purchase_Date != null
- all subdivision Forecasted_Lots with Forecast_Start_Date >= monthStart
```

The candidate endpoint returns the stored `Subdivision.Unforecasted_Lots` and an
independently calculated `expectedUnforecasted` for save reconciliation. These
must not be replaced by summary capacity, which uses obligations, contract
membership and prior-month Close Date. Present distinct scope/basis labels if
both are displayed. Do not silently assign either value to the other contract.

## Proposed shared structured model

A candidate helper named `buildForecastManagerSummaryData(int subdivisionId)`
is **proposed, not an existing Creator function**. Its purpose would be to own
the current read-only calculations once, return a versioned map, and serve both
the existing native HTML renderer and the new widget. Keep the existing
`buildForecastManagerSummary(int subdivisionId)` signature and native callers;
refactor only its rendering inputs. No native workflow needs a new call.

Proposed model boundaries:

- Version, server date, calendar-month boundaries, subdivision identity and
  complete stored/live subdivision metrics.
- A schedule array keyed by string schedule ID, with string Builder ID and
  contract/phase IDs. Preserve source order or define a reviewed explicit sort.
- Separate selected-phase and whole-contract metrics, each with raw counts,
  denominators and the existing percentage/display behavior.
- Explicit shared closing terms, nullable dates, nullable Second Closing fields,
  and four named recent-sales periods with their data basis.
- Separate summary capacity from persisted/expected manager totals. Retain
  negative values and zero-denominator behavior.

The endpoint can add this model to the existing snapshot response while
retaining `summaryHtml` as a fallback. Existing Custom API names and write
payloads need not change. Frontend presentation should format the returned
values, not repeat lot queries or recalculate business rules in JavaScript.

## HTML adaptation tradeoffs

The selected 1.2.0 Compact cards implementation uses a frontend-only passive
adapter in `widgets/forecast-manager/src/app/forecast-summary.js`. The current
Deluge function and its callers stay unchanged. The adapter renders only trusted
DOM built from native text and strictly allowlisted native gradients/meter widths.
It checks that every non-style text node was mapped; unknown sections or unsafe
tags return to the existing sandboxed native-summary view. It keeps repeated
schedules separate and preserves the selected-phase/all-contract split. It does
not use names as record joins, parse displayed counts for arithmetic, or issue
queries. Blank values use an em dash while their original empty value remains
explicit in accessible/native-field metadata. All-phase recent sales occupy the
same four-period row as the phase counts, with distinct scope labels.

The matrix's saved inventory total is labeled Inventory balance; the familiar
native summary capacity retains Unforecasted Lots. Neither is substituted for
the other. This publication is for user implementation/testing; current Creator
function/API setup and live development checks remain pending.

Restyling the isolated native HTML is the safest short-term frontend-only way to
keep every value. Its limits are the nested scroll surface, fixed iframe height,
and difficulty sharing context with the matrix. A parser that rebuilds compact
cards or rows becomes coupled to presentational classes/labels and cannot
reliably join schedules to matrix rows by Builder name. It must preserve repeated
schedules, blank versus zero, full contract sections and displayed percentages.

Do not render raw returned HTML in the widget's outer document. The native source
interpolates text directly; the existing iframe limits that surface. Any adapter
must extract passive text/allowlisted data and render escaped output. Parsing
displayed counts or truncated percentage labels is not a sound long-term data
contract and must not become an independent source of calculation truth.

## Deployment, parity and rollback gates

The shared model would be a Creator backend change, even though it is read-only.
Review all existing summary callers, update function/dependency contracts and
install the model helper before its consumers in Development. Confirm Creator
Save compilation and reload source parity; an offline execution adapter is not a
Creator compiler. Verify current fields, Second Closing publication, API audience
and SDK context before normal environment publication. Document proposed names
and fields before activating them; this audit deploys nothing.

Meaningful validation should extend
[test-forecast-summary.mjs](../../scripts/test-forecast-summary.mjs) and compare
the new model/native renderer against the complete current summary from the same
fixtures. Preserve all displayed values and scope behavior, not only total
balances. Existing seven summary regression groups passed during this read-only
audit. Additional parity cases are required for:

- Several schedules for the same Builder, duplicate/overlapping linked contract
  lots, missing Builder, empty schedules and schedules absent from matrix filters.
- Full obligations with unpopulated future phases; phase membership differing
  from Builder assignment; selected-phase and all-phase Sold/Scheduled counts.
- Distinct persisted versus summary Unforecasted, negative balances, forecast
  coverage once per Builder, and current-month sales without double subtraction.
- Month rollover, both month boundaries, recent-period boundaries, latest closing
  ties, future Close Dates, zero forecast/obligation and over-forecast monthly sales.
- All Initial/Second/Subsequent Lots and Days, blank dates, legacy null Second
  values, explicit zero Days, expected-sales overlap and percentage caps.
- Complete field availability and responsive visibility in the chosen compact
  layout, repeated schedules, contract details, escaped long names and mobile
  overflow. Browser fixtures must use the actual summary data rather than the
  endpoint runtime's current inert summary stub.

The refactor should preserve native HTML output or document deliberate purely
visual changes separately. Run the required widget validation and Pages build
for a deployable frontend change. Confirm only read-only model/render behavior
changes; forecast guards, native month workflows and record writes stay intact.

Before implementation, save the current summary function as the exact rollback
baseline. Rollback restores the prior summary renderer and endpoint consumers
before removing an unused helper, then restores the prior immutable frontend
release through environment mappings. No rollback data repair is needed for a
read-only summary integration. The existing native Forecast Manager remains the
fallback while the candidate widget's live verification is pending.
