# Forecasts dashboard and page links — Insights 1.6.0

Data Insights adds the approved read-only Forecasts dashboard beside Lot Sales.
The independent `User_Access.Forecasts_Dashboard` grant controls navigation,
data loading and CSV export. Missing/false grants deny access, including an
explicit Forecasts URL. The existing Lot Sales and revenue grants retain their
meaning. The intentionally retired Budgets dashboard stays unavailable.

## Creator Development installed; owner promotes native changes

**Installed in Development on October 27.** Added the default-false Forecasts
Dashboard field, saved and reopened both access functions, and added/reopened
both Text variables on the existing `Data_Insights` page. Native saved function
bodies match the checked-in bodies after whitespace normalization. No user or
profile grants changed. PMP publishes the repository/frontend and leaves native
Stage/Production promotion to the owner. Exact inventory is in
[changes.json](../creator/schema-changes/insights-forecasts-2026-10-27/changes.json).

1. Development now has default-false decision box `Forecasts_Dashboard`, labeled
   **Forecasts Dashboard**, in `User_Access`. Grant it only to intended viewers;
   no existing users are automatically granted the new permission.
2. Development now has the checked-in
   [getUserAccess](../creator/functions/getUserAccess.dg) and
   [getUserAccessLean](../creator/functions/getUserAccessLean.dg) bodies. Both
   return the independent `forecastsDashboard` flag, and the Creator application
   date as `today` for authorized forecast viewers. Existing DEV wrappers and
   `Get_User_Access` / `Get_User_Access_Lean` bindings/audiences stay in place.
3. Existing **Data Insights** page link name is `Data_Insights`. Development now
   has optional Text page variables `dashboard` and `projectId`, with no default
   value or page script added. The existing widget registration remains
   `https://rbelliveau-wbw.github.io/land-master/prod/insights/`.
4. Verify authorized viewers can read the five existing reports and the fields
   listed in `changes.json`. Keep Add/Edit/Delete off for report access introduced
   solely for this dashboard. The widget never invokes a forecast write API.
5. Test signed-in Development with Sales-only, Forecasts-only, both, and neither
   grant, missing/blank forecast values, each grouping, filters and CSV. Promote
   the field, functions and page parameters through Stage/Production when ready.

Until the native setup is promoted and an intended viewer receives the separate
grant, Forecasts stays hidden by default in Production. Report denial, missing
fields, incomplete cursor reads, malformed relationships and duplicate or
incomplete years show an unavailable state; they do not publish partial data or
substitute sample records. Native saves compiled successfully and persisted after
reopening. Authorized live report loading/export and the native permission
matrix still need signed-in verification after the owner chooses viewers;
fixture browser tests do not establish that each viewer's report profile works.

## URL contract

Append the following after the existing Creator `#Page:Data_Insights` route:

| Page variables | Opens |
| --- | --- |
| `?dashboard=sales` | Lot Sales |
| `?dashboard=forecasts` | Forecasts |
| `?dashboard=forecasts&projectId=<Project.ID>` | Forecasts scoped to one exact string Project ID |

Development examples:
- `https://creatorapp.zoho.com/wbdevelopment/environment/development/land-master/#Page:Data_Insights?dashboard=sales`
- `https://creatorapp.zoho.com/wbdevelopment/environment/development/land-master/#Page:Data_Insights?dashboard=forecasts`

After native Production promotion, use the same suffix on
`https://creatorapp.zoho.com/wbdevelopment/land-master/#Page:Data_Insights`.

The same query values work directly on the existing hosted widget URL in its
supported Creator context. Native page values take precedence over iframe
defaults. Blank dashboard selects the first permitted dashboard. Unknown names
and denied explicit destinations show a scope/access message; they never widen
to another view. Navigation within the widget retains the project parameter
and updates its own URL without changing Creator environment or record identity.
The official [Get Query Params API](https://www.zoho.com/creator/help/js-api/v2/get-query-params.html)
reads declared Creator page parameters; a direct iframe query is also supported.

## Values and presentation

The user selected the existing Forecast Manager outlook rule: completed months
use `Forecast.Actual_Lots`, while the current/future months use saved
`Forecasted_Lots`. Forecast-only shows saved forecasts for every selected month.
Sold and Forecast are never added together within the same month. February
starts WFY; January belongs to the following calendar year. Current WFY + 1 is
the default, with current-only, +2 and individually selected years available.
`forecast-model.js` is the unchanged Forecast Manager pure model, reused for
calendar boundaries and display-value selection; the regression enforces parity.

Project/Territory/Builder views share exact subdivision/builder/year identities.
Project Status and Builder replace First Lot Sale and Average Front Ft. Annual
Totals and expanded Subtotals are independent switches; collapsed group rows
retain their totals. Hide Empty removes only known-zero rows, retaining unknown
forecasts. Missing saved forecasts remain unknown in cells, totals and CSV.
Sold-out checks use the subdivision's native Total_Lots/Lots_Sold inventory,
and compact hover/focus/click cards expose Territory and selected scope.

The existing custom searchable pickers, keyed numeric engine and motion layer
are reused. New forecast groups register stable row keys, view tabs and anchored
cards. The canonical registry is synchronized to the existing widget copies;
selectors for the new Insights surface do not change other widgets' behavior.

## Verification and rollback

Focused tests cover native lookup/string-ID shapes, fiscal boundaries, existing
outlook selection, builder allocation, unknown/blank values, exact filtering,
annual reconciliation, duplicate/incomplete data, denied reads, SDK page variables,
independent permissions and revocation. Actual-widget desktop tests cover
1366/1920px layouts, filtering, all views, collapse/subtotals, annual columns,
territory cards, CSV, direct denied/allowed routes, Forecasts-only access and
navigation back to Lot Sales. Fixtures are excluded from published assets.

Changed files: Insights HTML/config, new forecast adapter/model/app/CSS and
reused Forecast Manager model, shared controls/access/shell and Sales startup,
canonical motion registry and its copies, both access function bodies, schema
handoff, dependency/version manifests, package checks, tests and release mapping.

No financial definitions, forecast edits, approval routing, business records or
API audiences changed. Native changes are limited to the one permission field,
two access function additions and two optional page variables. Frontend rollback:
restore Production `lot-sales-explorer` to `1.5.62` and rebuild Pages, retaining
both permanent URLs. New optional permission/page variables can remain in place;
roll back the access bodies separately if needed, retaining all unrelated access
flags and native changes.
