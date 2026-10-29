# Forecast Manager footer Clear — October 29, 2026

Footer Clear in Territory, Builders and Fiscal years now deselects every staged
option and keeps the picker open. It reports 0 selected, retains Clear focus,
and leaves the current filter/report unchanged until Done. A user can choose
new values immediately after clearing. Escape or outside click discards the
staged change. All, and the All Years with Forecasts preset, retain their existing
restore-selection behavior.

The top-right X keeps its established reset-and-close behavior. Fiscal years
still requires at least one explicit year or All Years with Forecasts: Done
with an empty staged selection keeps the picker open and displays the existing
validation message. Existing pending-save and unresolved-change guards remain.

## Changed files and data boundaries

`widgets/forecast-manager/src/app/forecast-app.js` changes only the footer Clear
handler. Its existing browser regression suite and the module/matrix design
guides record the corrected distinction between staged clearing and filter reset.
Version/cache stamps, release metadata and mappings accompany publication.
No Creator form, field, function or Custom API changes; no Creator promotion or
business data write is needed.

## Regression verification

The desktop Manager fixture checks all three pickers for zero checked options,
zero selected status, retained picker and Clear focus, unchanged applied filter
and report, and no new API reads or writes. It also covers selecting after Clear
then Done, Escape/outside cancellation, All/preset restoration, unchanged top X,
and the empty-fiscal-year validation guard. Existing save, recovery, creation,
notes, assignment, numeric-transition and header/total cases remain in the suite.

## Rollback

Restore Production forecast-manager to immutable release 1.7.23 in
`deploy/environments.json` and publish Pages, retaining the latest Development
mapping. No data or native Creator rollback is required.
