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
- Required npm run validate passed (exit 0), as did npm run build:pages and
  git diff --check. CLI Playwright runner is not executed; source regression
  scenarios are exercised through the supported browser.
- A true 390px mobile iframe had equal 380px client/scroll widths, a 342px combined
  card and unchanged 320px internally scrolling schedule cards.
- Live Production Arroyo Ranch Phase 05 loaded v1.5.0. All 52 native label/value
  pairs exactly matched the captured v1.4.0 baseline. Summary height decreased
  from 738.27px to 427.89px: 310.38px reclaimed (42%). Combined overview and
  schedules share their top edge. Only LF/date remain as standalone native facts;
  matching lot counts appear once below, and there is one subdivision name.
- Live input click retained focus. Sold and Scheduled still displayed no numeric
  zero cells in their body/footer. Top Add Forecast opened and cancelled normally.
  No Production forecast or Settings data was changed. Successful creation and
  lost-response scenarios were verified in the inert fixture, not Production.
- Production proof: local task artifact tmp/forecast-manager-v1.5.0-production.png.

## Deployment and rollback

Permanent URL: https://rbelliveau-wbw.github.io/land-master/prod/forecast-manager/
Immutable 1.5.0 is mapped to Development/Production and deployed successfully.
Feature commit: 089e1da679bfcbe9bfbc9c716b92fcbb2ba21051 on main.
[CI](https://github.com/rbelliveau-wbw/land-master/actions/runs/37806785575) and
[Pages](https://github.com/rbelliveau-wbw/land-master/actions/runs/37806785645)
both passed.
Rollback by remapping frontend to **1.4.0** and redeploying Pages; no data rollback
or Creator change is needed.
