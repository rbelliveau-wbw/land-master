# Forecasts Hover Details — Insights 1.6.18

## Behavior

The Forecasts dashboard uses compact 70px annual columns and adds these
read-only details:

- The current calendar-month card shows three rows: Forecast, Scheduled and
  Sold. Each count comes from its saved source field and respects the visible
  subdivision/builder scope. Displayed matrix values retain the existing
  Forecast-only or Sold + Forecast basis; the extra counts never add another
  contribution to monthly, selected-period, annual, group, footer or CSV totals.
  A known Forecast subtotal with missing contributors carries a Partial marker;
  wholly unavailable counts stay unknown and saved zeroes remain zero.
- The subdivision card shows Final Acceptance Due Date from the Subdivision
  form, retaining an empty date as unknown.
- A placeholder builder card shows its nonblank Forecast Manager comments from
  all saved fiscal years for the same exact subdivision and builder IDs. Sort
  by fiscal year and concatenate with a line break, retaining internal newlines.
  The supported identities are Placeholder, Placeholder2, Placeholder3 and
  Placeholder4, using the native case-insensitive normalized-name rule.

Yearly comments remain stored separately. This change adds no note editing,
forecast save, assignment or business-record write. Cards reuse the existing
anchoring, pointer-crossing delay, keyboard focus, click pinning, Escape/close
behavior and shared popover motion. Saved notes are rendered as safe text.

## Data Contract

| Form | Field | Existing Read |
| --- | --- | --- |
| Subdivision | `Final_Acceptance_Due_Date` | `All_Subdivisions` |
| Forecast_Year | `Builder_Notes` | `All_Forecast_Years` |
| Forecast | `Forecasted_Lots` | `All_Forecasts` |
| Forecast | `Scheduled_Lots` | `All_Forecasts` |
| Forecast | `Actual_Lots` | `All_Forecasts` |

The adapter adds the date and note fields to its existing complete report reads.
Existing cursor pagination, record-count reconciliation, string IDs, independent
Forecasts permission and unavailable-field errors remain in force. The Creator
application date identifies the current month; no browser-local date or substitute
acceptance-date field is introduced.

No Deluge function or Custom API change is included. Both new fields are exposed
by the existing Production reports: complete native dashboard reads succeeded
with the required-field checks enabled. No Creator deployment or report
configuration change was required.

## Changed Files

Implementation and release scope:

- `widgets/lot-sales-explorer/src/app/forecast-insights-adapter.js` — existing
  report field requests.
- `widgets/lot-sales-explorer/src/app/forecast-insights-model.js` — acceptance
  date, scoped notes and independent saved count details.
- `widgets/lot-sales-explorer/src/app/forecast-insights-app.js` and
  `forecast-insights.css` — cards and annual-column density.
- `scripts/test-insights-forecast-hover.mjs` and focused Forecasts
  fixture/model/parity regression scripts; widget version and versioned
  HTML asset references; immutable `releases/lot-sales-explorer/1.6.18/` and
  release/dependency/environment manifests.
- This release note, `knowledge/modules/lot-sales-explorer.md` and
  `knowledge/design/forecast-matrices.md`.

The final implementation diff is authoritative. Development and Production
Insights mappings use the immutable 1.6.18 release; Stage remains unchanged.

## Verification

Focused regression plan:

1. Verify independent raw current-month counts for a single builder, multiple
   builders, group/footer totals and both displayed bases. Preserve known zero,
   blank forecast, partial-known and missing-year behavior; compare unchanged
   matrix/annual/CSV totals with Forecast Manager.
2. Verify January/February and calendar-month rollover using the Creator date.
3. Verify exact Subdivision date parsing and blank dates; date display must not
   shift through timezone conversion.
4. Verify each supported placeholder, all-year chronological concatenation,
   internal line breaks, empty notes, duplicate text from separate years, long
   text, HTML-like text and exact subdivision/builder identity isolation.
5. Verify hover/focus/click and Escape/close behavior, pointer crossing, card
   viewport limits, reduced motion, compact annual headings and column alignment
   at desktop size. Preserve filters, group/builder disclosures and Hide Empty.
6. Run focused Forecasts/model/parity and design-document checks, then
   `npm run validate` and `npm run build:pages`.

Passed: the focused model, Manager/dashboard parity, hover behavior and design
documentation checks; `npm run validate`; and `npm run build:pages` (34 stable
environment paths). Local validation used the bundled Python runtime and the
existing runner's child-process access. The new hover behavior test is part of
the standard prevalidation sequence.

Production verified November 4, 2026, after the user's explicit main/Production
deployment approval. [PR 134](https://github.com/rbelliveau-wbw/land-master/pull/134)
merged commit `75c5f6dcd60ec4bdd8fa6638a8b8f5ca5cddca84`.
[Main CI](https://github.com/rbelliveau-wbw/land-master/actions/runs/41849903418)
and [Pages deployment](https://github.com/rbelliveau-wbw/land-master/actions/runs/41849903564)
completed successfully.

- The actual Creator Production Data Insights page loaded versioned 1.6.18
  model, adapter and app assets and the complete 59-phase/28-project default
  report without an unavailable-field error.
- The placeholder card displayed the existing saved native Forecast Manager
  note. The Subdivision card displayed a populated Final Acceptance Due Date.
  The current-month comparison displayed separate Forecast, Scheduled and Sold
  source counts, including the Partial forecast marker and explicit zero Sold.
- Browser geometry measured all four annual header columns at exactly 70px.
  Filtered phase and selected-period totals matched the captured 1.6.17 baseline.
  Live Close returned focus and kept the card dismissed; focused handler tests
  also cover Escape, unknown/zero data and safe multiline text.
- Actual before/after Production screenshots were saved outside the public
  repository as `before-placeholder-prod.jpg`, `after-placeholder-prod.jpg`,
  `before-bluebonnet-subdivision-prod.jpg`,
  `after-bluebonnet-subdivision-prod.jpg`, `before-annual-prod.jpg`,
  `after-annual-prod.jpg`, and `after-current-month-prod.jpg`.

No business records or stored yearly notes were changed during verification.
All-year chronological concatenation and repeated/internal-newline cases are
covered by native-shaped fixtures; no fabricated note was inserted into Prod.

## Rollback

Restore the Production `lot-sales-explorer` mapping to `1.6.17` and rebuild Pages,
retaining the permanent `prod/insights/` and `prod/lot-sales-explorer/` URLs.
No stored forecast values or yearly comments require rollback. Any existing
report-field exposure can remain in place.

