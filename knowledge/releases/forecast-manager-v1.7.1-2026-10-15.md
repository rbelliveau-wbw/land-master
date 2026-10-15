# Forecast Manager 1.7.1 — review updates

Completed months default to sold actuals; the current calendar month and future
months retain forecast values and existing editing rules. The Actuals + Forecast,
Forecast, Sold and Scheduled buttons provide explicit views. Each month exposes
actuals, its saved forecast (including Not set versus zero) and scheduled lots in
its hover text and accessible label. Year and selected totals follow the active
view. Fiscal years still run February through January, including historical years.
CSV structure and its separate source metrics are unchanged.

The subdivision summary is full width, expanded by default, with an up/down
chevron at the far right. Its header remains visible when collapsed; inventory
and all builder schedules collapse together. Refresh retains the choice for the
same subdivision. Company/series and Equiv LF of Street are omitted from the
presentation. County, territory, code/status, last sold date and the existing
Unforecasted Lots value remain visible in the header. Other lot facts remain in
the expanded inventory area. Contract recent-sales labels use the same one-line
periods as their phase cards while retaining whole-contract scope and source data.
The topbar now consistently names the module Forecast Manager. Existing number
animations survive the header relocation.

## Creator handoff

Changed function: `creator/functions/buildForecastManagerSummary.dg`.
Change: read `Subdivision.Projects_Status` instead of `Subdivision.Status` for
the displayed summary status. This is a read-only field substitution, verified
against the committed Subdivision schema and offline fixtures with different
values for the two status fields. No forms, fields, APIs, writes or unforecasted
calculations are added or changed. `forecastManagerWidget` continues to call the
same function with the same signature and HTML structure.

PMP publishes repository assets and leaves Creator changes for the user to
promote. Save/compile this function in Creator Development and promote it through
the normal Creator workflow. Until then, the widget renders the status supplied
by the currently deployed function. Creator compilation/live promotion is not
claimed by this release. Acceptance goals, placeholder logic, unforecasted-lot
reconciliation and export redesign are outside this change.

## Verification and rollback

Focused model tests cover calendar boundaries, prior-year actuals, January in a
February fiscal year, zero actuals, current/future forecasts and unchanged views.
Desktop inert browser checks cover default expansion, collapse/refresh state,
header visibility, removed fields, historical comparison, view toggles, totals,
save/create/recovery, builder actions and number animations. Native-summary
fixtures cover Projects_Status, exact schedule metrics and unsafe-markup fallback.
Required repository validation and Pages build run before publication.

Rollback widget Development/Production mappings to immutable 1.6.4. If the
Creator substitution has been promoted, restore the previous function revision
to return to `Subdivision.Status`. No forecast data remediation is needed.
