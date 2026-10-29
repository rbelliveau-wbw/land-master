# Forecast total labels and promoted metadata refresh

Forecast Manager 1.7.23 and Data Insights 1.6.15 label their pinned total column
**Total**, with no Selected years or Selected Period subtitle. The Dashboard CSV
header also reads Total. Existing sums, filters, selected-year/period scope,
number transitions and footer alignment are unchanged.

Manager Refresh now uses the same catalog reader/validation as startup and
fetches a new catalog before requesting the selected subdivision snapshot. This
lets promoted Territory metadata activate without reloading the whole Creator
page. With no subdivision selected, Refresh updates only the catalog. A malformed
or failed catalog request stops before the snapshot read and preserves the last
complete mounted report; successful retry clears the error. Native pending-write,
unknown-result and unresolved-edit protections remain unchanged. Automatic
subdivision selection loads and save acknowledgements do not add catalog reads.

## Files and contracts

Changed: Forecast Manager forecast-app.js, Data Insights forecast-insights-app.js,
their existing browser checks, HTML/cache stamps, widget configs and manifest,
module/design guides, immutable releases and Development/Production mappings.
No Creator form, field, function or Custom API changes; no additional Creator
deployment is needed for this frontend correction. The previously prepared
forecastManagerWidget metadata must still exist in the selected Creator
environment for Territory data to be returned.

## Verification

Existing desktop suites cover both simplified headings and Dashboard CSV, plus
old catalog → promoted Territory activation, catalog-only refresh, failed
catalog validation retaining the report, no extra snapshot on failure, no
writes, and successful retry. Existing save/recovery/assignment/filter/total
checks remain required. Run repository validation and Pages build before
publication.

## Rollback

Restore Production forecast-manager to 1.7.22 and lot-sales-explorer to 1.6.14
in deploy/environments.json and publish Pages. Retain latest Development mappings.
No data rollback is required.
