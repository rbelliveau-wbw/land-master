# Forecast Manager layout v1.3.0 — October 8, 2026

## Deployment

Permanent registration: https://rbelliveau-wbw.github.io/land-master/prod/forecast-manager/

Frontend 1.3.0 is the immutable release selected for Development and Production.
Creator forecastManagerWidget was saved, compiled and reopened in Development,
then selectively published through Stage to Production as **9.58**, titled
“Forecast inventory status card.” Only this function was selected; unrelated
pending Creator changes were excluded. Both Stage and Production visibly showed
9.58 before frontend promotion. Existing enabled OAuth2 bindings and the
selective audience were preserved; Stage has no configured widget API.

## Presentation and data contract

- Removed the separate Forecast Manager/February–January/Add forecast year row
  and the Forecast scope metric strip. Missing builder/year creation remains
  available from the matrix.
- Removed Load forecasts. A changed subdivision selection loads automatically;
  selecting the same subdivision does not clear/reload it. Clear hides the
  workspace. Pending or unresolved edits still prevent filter changes.
- Moved all native subdivision facts, including Company and County, into the
  navy title card. Native summary output, business math and disclosure details
  remain intact.
- Copied the Data Insights subdivision lot card to the left of the schedules:
  Total/Sold/Scheduled/Contracted/Open, status bar and builder status matrix.
- Restored the native HTML schedule card maximum width of **320px**. Schedules
  scroll within their panel. At narrow widths the inventory card stacks above
  schedules without widening the page.

The added snapshot inventory property is read-only and covers every lot in the
selected subdivision, independent of matrix builder/year filters. Close_Date
wins as Sold; otherwise Purchase_Date wins as Scheduled; otherwise stored
Sold/Scheduled/Contracted applies, with all other statuses grouped as Open.
Archived and model lots remain included, matching Data Insights. The builder
matrix excludes Open lots, groups the normalized display name, and includes
Unassigned. It deliberately retains Data Insights semantics rather than
substituting native summary totals, which have different scope.

Affected fields read by this addition: Lots.Subdivision, Status, Close_Date,
Purchase_Date, Builder1; Builder.Builder_Name; Subdivision.Territory. No schema,
permission, persisted forecast calculation or record-write behavior changed.
The first Settings record Open_Forecasting_Window and the native start-date
plus 28-day lock remain enforced. Native subdivision subtotal side effects and
idempotent twelve-child creation remain unchanged.

## Verification

- Focused backend tests compare the actual Data Insights sales model against
  inventory output, including conflicting status/date precedence, archived/model
  inclusion, another subdivision, Open/unknown status, missing builder and
  duplicate builder names. The inventory action issued zero writes.
- Development function Execute snapshot succeeded and returned the new inventory
  object. Saved source was reopened and verified after compilation.
- Supported browser testing used the actual widget source in an **inert local
  fixture** with no Creator connection: automatic selection loading, removed
  controls, native facts in the title, all five counts, 320px schedule widths.
- A genuine 390px iframe verified responsive stacking and no page overflow
  (380px client/scroll width after its scrollbar). This was not a claim that the
  existing Creator desktop browser viewport changed.
- Lost-response fixture: an inline change persisted once, filter changes were
  blocked, and Check status reconciled through a read-only snapshot. Visible
  evidence: Writes: 1; Actions: catalog,snapshot,save,snapshot. No write replay.
- Required npm run validate and npm run build:pages are release gates. The CLI
  browser suite was not run; browser interactions used the supported connection.
- Production verification is read-only. No Production forecast, lot or Settings
  values were changed. Individual permission-role sessions and concurrent live
  transport failures were not forced.

Live Pages deployment and native widget observations are recorded below after
publication. The earlier [backend verification](forecast-manager-backend-2026-10-08.md)
contains actual Development save/create/repeat-create evidence; those write tests
were not repeated for this presentation-only change.

## Source scope and rollback

Changed source: forecastManagerWidget.dg; Forecast Manager app HTML, CSS, app and
summary renderer; widget config/manifest; API/dependency metadata; focused tests
and test runtime; design/module documentation; immutable 1.3.0 release and
environment mapping. Shared widgets and native summary Deluge were not changed.

Rollback the Development/Production Forecast Manager environment mappings to
**1.2.1**, rebuild and publish Pages. The additive Creator 9.58 response remains
compatible with 1.2.1. If the inventory addition must be withdrawn, selectively
restore the forecastManagerWidget source from commit 3ce11f0 through the normal
Creator deployment process. Do not revert native Scheduled-lot parity or repair
business records as part of a UI rollback.
