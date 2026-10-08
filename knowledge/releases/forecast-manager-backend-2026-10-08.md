# Forecast Manager backend deployment — October 8, 2026

## Published integration

The existing Forecast Manager **v1.2.1** frontend now loads the installed Creator
backend in Development and Production. Permanent Widget Manager registration:

https://rbelliveau-wbw.github.io/land-master/prod/forecast-manager/

The loader retains Creator's authenticated environment; that same registration
uses the DEV API when embedded in Development. No frontend source, immutable
release, environment mapping or Widget Manager URL changed in this backend task.

The requested work-PC checkout was absent on this PC. Work used the matching
`C:\Users\R\Desktop\claude\land-master` checkout, after updating main. Browser
control connected through the supported Codex in-app browser. Earlier Windows
sandbox startup failures were browser-access failures, not Creator compilation
or API errors. This task did not require another application restart.

## Current native audit and correction

Before creation, the new function and Forecast Manager APIs were absent. The
existing `buildForecastManagerSummary` was present. Current native Deluge,
Development schema export and permission profiles were inspected before enabling
the integration. The current summary matched committed source except for Creator
formatting and is reused unchanged.

The current native mass-create workflow counts **Contracted + Scheduled** lots
for `Forecast_Year.Total_Contracted_Lots`. The prepared endpoint counted only
Contracted. Two source lines now preserve the native combined count. A regression
fixture verifies subdivision/builder scoping, both statuses and fiscal Sold count.

Verified current schema: unique `Forecast_Name`; bidirectional
`Forecast_Year.Forecast_Months` / `Forecast.Forecast_Year2`; twelve-child subform;
parent year choices 2019–2050 and child choices 2018–2046. Creation retains the
intersection 2019–2046. Fiscal years start February and end January next year.

Saved/reopened `forecastManagerWidget` compiled in Development in **Default**,
returning **String**, with one **String payload** argument. Corrected saved source
contains the Scheduled count and unconditional outer String fallback return.
No native workflows or summary calculations were modified.

Creator **9.56** initially installed the function. The corrected function alone
was published through Development → Stage → Production as **9.57**, titled
“Forecast native scheduled-lot parity.” Both environment versions were visibly
9.57 after publication. Unrelated pending Creator changes were excluded.

## Enabled API contracts and audience

| Setting | Development | Production |
| --- | --- | --- |
| Exact linkname | `Forecast_Manager_Widget_DEV` | `Forecast_Manager_Widget` |
| Application/environment | Land Master — Development | Land Master — Production |
| Method/authentication | POST / OAuth2 | POST / OAuth2 |
| Request type | application/json; Key and Value | application/json; Key and Value |
| Response | Standard | Standard |
| Namespace/function | Default / forecastManagerWidget | Default / forecastManagerWidget |
| Argument | payload, String | payload, String |
| State | Enabled | Enabled |

The read-only catalog action ran first with function argument
`{"action":"catalog"}`. Direct API requests wrap it as
`{"payload":"{\"action\":\"catalog\"}"}`. Both live widgets successfully consumed
their respective OAuth2 bindings.

Access is selective: the current **15 application users** assigned the existing
native Forecast Manager audience, plus **2 administrators**. The audience was
derived from native form/page permissions and the exported user assignments:
Write, Read, CFO, Project/Forecast Management, and Dev/Land Acq - Proforma &
Budgets. Accounting/Lot Management and Contract Mgmt were excluded. Inactive
assignments retain inactive status. Neither API uses All users.

Existing application permissions were preserved. The new widget Page currently
has Read/Write profile access; some other native Forecast Manager audiences have
form/page access to the native manager but no new widget Page grant. Their API
audience membership does not grant Page access. Individual role sessions were
not impersonated. Review the selective API list when user assignments change;
it is a current user allowlist rather than automatic permission-profile sync.

## Development verification and retained test records

The user authorized any Development data for testing. Tests used Cottonwood
Creek - Phase 01 (`CM01`, subdivision `4410926000000086211`) and StyleCraft
(`4410926000000037011`). All actual forecast edits stayed in Development.

| Test | Persisted result |
| --- | --- |
| Missing WFY 2027 | Parent `4410926000005118002`; exactly 12 unique correctly scoped/linked children; 2027-02-01 through 2028-01-01 |
| Repeat WFY 2027 | Same parent; createdParent=false; createdMonths=0 |
| Corrected function, missing WFY 2028 | Parent `4410926000005117146`; exactly 12 correctly linked children |
| Repeat corrected WFY 2028 | Same parent; createdParent=false; createdMonths=0; twelve children retained |
| Forecasting window closed | API save rejected; UI counts disabled |
| Forecasting window temporarily opened | Past February 2026 disabled; current/future eligible months enabled |
| Past-month API save | Rejected by native start-date +28-day guard |
| Real field change + blur | February 2027 blank → 1 saved immediately; independent snapshot confirmed 1 |
| Native subdivision side effect | Stored and expected unforecasted changed -763 → -764 |
| Zero then blank restoration | 1 → 0 → blank saved; final forecast null and stored/expected total -763 |
| Final Settings state | First record Open_Forecasting_Window restored false; original Unlock_All_Forecasts retained |

Two new blank builder-year parents and their 24 children remain in Development
as test evidence. No preexisting forecast value remains changed by these tests.

The save guard uses the first Settings record's Open_Forecasting_Window, and
locks when `Forecast_Start_Date.addDay(28) < zoho.currentdate`. Native subtotal
criteria remain non-model phase inventory minus purchased non-model phase lots
minus **all** subdivision forecasts from the current calendar month's first day
onward. No extra forecast status/model/deletion filters were introduced. Parent
summary fields are not updated by native manager month edits.

## Widget and summary verification

- Live Development compact cards retained all **66 native table/recent-sales
  label/value pairs** in the selected summary; native summary business math is
  unchanged. All four native schedule cards remained present.
- Matrix showed one row per builder, sticky left builder header (`left: 0px`),
  fiscal year groups extending right, and February–January months.
- Searchable subdivision, builder and fiscal-year pickers expose the established
  search/selection controls. Blank and zero counts remain distinct.
- Actual input typing followed by blur exercised immediate month saves. Filling
  a test input without a genuine field-change event was not counted as a save.
- Creation progress/result confirmed the persisted parent and twelve months.

The summary's obligation-based Unforecasted Lots and the native manager's stored
inventory balance intentionally have different scope; they are not substituted
for one another.

## Ambiguous result verification

A controlled **inert local fixture**, using the published widget source and the
existing API test adapter, persisted a month write and then lost its response.
The widget retained the proposed value, disabled edits and offered Check status.
Check status reconciled through a read-only snapshot, returned All changes saved
and enabled editing. Visible call evidence was:

`Writes: 1 | Actions: catalog,snapshot,save,snapshot`

This proves the widget did not replay the write. It was not a forced failure of
the live Creator transport; the fixture had no Creator connection. Concurrent
creation/atomic save races were not forced live. Exact +28/+29 boundary, stale
values, orphan/duplicate relationships and conflicting creation cases are covered
by focused offline regressions rather than additional live data manipulation.

## Production read-only verification

After backend publication, the widget reported PRODUCTION and Ready. Catalog
loaded; Cottonwood Creek Phase 01 loaded native cards without parents in the
selected matrix. Arroyo Ranch Phase 04 (`AR04`) with All years loaded two builder
rows and WFY 2024/2025/2026, showing Forecast 246 / Sold 106 / Scheduled 0 /
Inventory balance 0. Sold view rendered without forecast input fields. Loading
was rechecked after 9.57. No Production forecast creation, edits or Settings
changes were made.

Local screenshots of enabled API details, live Development creation, Production
read-only matrix and completed 9.57 deployment were saved outside committed
source. Business-data snapshots and user email rosters are not committed.

## Source scope, checks and rollback

Changed files: `creator/functions/forecastManagerWidget.dg`,
`scripts/test-forecast-manager.mjs`, `manifests/custom-apis.json`,
`knowledge/modules/forecast-manager.md`,
`knowledge/modules/forecast-summary-data.md`, and this deployment record.

Affected persisted objects: Forecast.Forecasted_Lots,
Subdivision.Unforecasted_Lots, Forecast_Year native creation fields and its
Forecast_Months children. Settings is read by the function; its Development
window was temporarily toggled only for tests and restored. Backend deployment
was required and completed. Frontend deployment was not required.

Validation: `node scripts/test-forecast-manager.mjs`, `npm run validate`, and
`npm run build:pages`. The compact-summary browser script's opt-in automated
rendering was not run; actual Creator summaries and the inert lost-response case
were checked through the supported browser. No blanket claim of every role,
mobile viewport, concurrent writer or live transport failure is made.

Operational rollback: keep the native Forecast_Manager available, disable the
two new APIs and withdraw the new widget Page entry if necessary. Do not delete
forecast data as part of rollback. Frontend remains immutable 1.2.1; reverting to
older frontend 1.1.0 does not remove the backend contract. Creator 9.56 contains
the pre-correction endpoint and should not be restored as a native-parity fix;
use the pre-integration native manager/9.55 baseline when withdrawing the new
endpoint. Any remediation of persisted test or business records requires a
separate reviewed data change.
