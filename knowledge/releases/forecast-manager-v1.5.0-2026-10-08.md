# Forecast Manager v1.5.0 — October 8, 2026

## Change and scope

Combine native subdivision details and the Data Insights all-date lot-status card
into one compact left overview; move builder schedules beside it. Show the name
once. Matching Total/Residential/Sold/Scheduled values appear once; different
native and inventory values keep their original scope labels. All native data
attributes, dates, schedule terms, recent sales and contract disclosures remain.
Navy identity headers and muted slate-blue surfaces replace broad white areas;
tighter spacing reduces vertical height without reducing the 320px schedule width.

At the user's explicit request, remove the forecast creation progress/result modal.
Row Create Forecast starts the exact captured destination immediately. Top Add
Forecast retains its small Builder/WFY chooser, which closes on submission. Pending
state is inline; verified records appear directly in the matrix. Pending and unknown
creation block duplicate attempts. Unknown results use only read-only Check status;
no ensure replay. Errors remain visible inline. The server verification predicate,
native guard, field-change save, Builder-type chooser and blank Sold/Scheduled cells
are unchanged.

Frontend-only: app/summary JS, CSS/HTML, widget config/manifest, focused browser
regressions, design/module docs, immutable 1.5.0 and Dev/Production mappings.
Affected Creator forms/fields, functions, APIs and permissions: **no contract or
backend changes**. Existing forecastManagerWidget/buildForecastManagerSummary and
Forecast_Manager_Widget_DEV/Forecast_Manager_Widget bindings remain on Creator 9.59.
No Creator deployment is required. Production data verification is read-only.

## Verification

- Supported browser inert source fixture: overview/schedules share a top edge,
  one subdivision heading, all 57 native label/value pairs retained.
- Lost ensure response: no modal; inline review and disabled creation; Check status
  produced twelve visible monthly inputs. Log: catalog,snapshot,ensure,snapshot;
  one write. Successful top chooser creation closed the chooser and revealed all
  twelve months without a progress/result dialog.
- Required validation, Pages build, mobile and live production checks recorded
  below after completion. CLI Playwright runner is not executed; source regression
  scenarios are exercised through the supported browser.

## Deployment and rollback

Permanent URL: https://rbelliveau-wbw.github.io/land-master/prod/forecast-manager/
Promote immutable 1.5.0 to Development/Production through normal Pages deployment.
Rollback by remapping frontend to **1.4.0** and redeploying Pages; no data rollback
or Creator change is needed.
