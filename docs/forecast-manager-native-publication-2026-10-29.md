# Forecast Manager native publication — October 29, 2026

The user authorized installing and publishing the pending Creator changes, then
requested correction and live verification of Forecast Manager after promotion.

## Published result

The installed `forecastManagerWidget` still contained the older catalog and
snapshot contract. The latest checked-in function was installed in Development,
saved successfully by Creator, and reopened to confirm persistence of both the
catalog Territory metadata and snapshot overview fields. Native Save accepted
the function without a compilation error.

Only `forecastManagerWidget` was included in the publication package. Publication
completed through Stage and Production as **9.131**. The Environments page then
showed **Stage 9.131**, **Production 9.131**, and **No changes available**.
The existing Custom API binding remains in use.

This activates the native metadata used by Forecast Manager's Territory choices,
first/last/final dates, Projects/LM counts and differences, and the numbered
placeholder behavior already present in the checked-in function.

## Live verification

Read-only production checks confirmed:

- Territory becomes enabled and narrows the subdivision choices correctly.
- First/last actual-sale dates and the final forecast date appear from the new
  native overview metadata.
- The subdivision-wide Sold + Forecast quantity stays constant across all four
  matrix tabs and independent of the selected builder/year filters.
- All Years with Forecasts selects the saved forecast years.
- Each displayed builder total and the bottom grand total agree with the monthly
  values in Sold + Forecast, Forecast, Sold and Scheduled, independently checked
  from the displayed month comparisons.
- Projects/LM quantities and their differences agree with the displayed combined
  quantity.
- Native Refresh completes with Territory enabled while preserving All Years
  with Forecasts, the displayed dates, combined quantity and footer total.

Frontend releases **Forecast Manager 1.7.23** and **Data Insights 1.6.15** are
separate repository/Pages publications. They simplify the Total headings and
reload promoted catalog metadata on Manager Refresh; see the
[frontend correction](forecast-total-labels-and-refresh-2026-10-29.md).

## Scope and rollback

No new forms, fields, Custom APIs or permission grants were added by this native
publication. The existing function's additive read-only metadata was promoted.
Native rollback uses Creator version history for `forecastManagerWidget`.
Review the component diff before restoring its previous approved version;
externally hosted frontend release mappings remain independently controlled.
