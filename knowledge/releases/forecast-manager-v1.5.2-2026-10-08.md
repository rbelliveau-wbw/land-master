# Forecast Manager v1.5.2 — October 8, 2026

The top Add Forecast chooser opens with no builder or year selected and Create
Forecast disabled. Refresh existing Builder forecast parents through the current
read-only full-subdivision snapshot, independently of matrix filters. Any matching
builder/year parent, including incomplete or duplicate parents, disables creation
and shows a subtle red warning. Pending/failed reads cannot enable Create. Closing
or reopening ignores an earlier dialog's late response.

Move subdivision name/code into the navy header. Remove the separate route card
and February–January/12 forecasts sentence; use compact pale-blue body/footer.
The empty chooser is 430px wide and about 212px high. Both creation routes retain
navy/white actions. Add Forecast follows the fiscal-year filter, followed by the
40% larger (14px) forecasting-window status.

Source: forecast-app.js, forecast-model.js, forecast.css and widget.html. Update
config/manifest, forecast model/browser regression checks, design/module/release
docs, immutable release 1.5.2 and Development/Production mappings. No Creator
forms/fields, functions, Custom APIs or permissions change. Creator backend 9.59
needs no deployment. Native ensure still handles concurrent/non-Builder-status
conflicts, persisted parent/twelve-child verification and read-only unknown-write
reconciliation. Production checks perform no saves or creation.

Regression: model tests block existing incomplete/duplicate parents, exact large
string IDs and years outside visible filters. Supported inert UI verified blank
initial/reopened selections, one-field disabled, DR Horton/2026 disabled with red
warning, StyleCraft/2027 enabled without warning, zero writes, new header/context,
removed date caption, navy actions, adjacent toolbar button and 14px status. CLI
Playwright runner is updated but not executed; supported browser supplies UI proof.

Local full validation, build, CI/Pages and live verification are recorded below.
Permanent URL: https://rbelliveau-wbw.github.io/land-master/prod/forecast-manager/
Rollback: remap frontend to **1.5.1** and deploy Pages; no data/backend rollback.

Local verification: `npm run validate` passed (exit 0). The final selection
guard also passed focused model and JavaScript checks.
