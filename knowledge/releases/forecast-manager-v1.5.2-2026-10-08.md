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

Build: npm run build:pages passed, producing 31 environment paths. Main release
commit: f73f551cc3e77c49a5184d723af0aba49c6cbed0.
[Release CI](https://github.com/rbelliveau-wbw/land-master/actions/runs/37811015174)
and [Pages deployment](https://github.com/rbelliveau-wbw/land-master/actions/runs/37811015253)
completed successfully.

Supported inert chooser creation: StyleCraft/WFY 2027 sent one ensure, closed the
chooser, revealed 12 month inputs, removed the missing combination and returned
All changes saved. No progress/result modal was shown. This is fixture evidence,
not a new Creator data-writing test.

Live Creator Production: permanent registered URL loaded PRODUCTION v1.5.2 and
Arroyo Ranch - Phase 05 automatically. Initial modal choices were empty/disabled.
DR Horton/WFY 2027 showed the muted red conflict warning, with Create disabled.
The compact modal was 430px wide/236px high with warning. Header contains AR05
identity; no route card/date caption. All forecast actions use navy #0b2345 and
white text. Add Forecast immediately follows the fiscal-year filter; window state
is 14px. Removed schedule heading and bottom legend each have zero DOM matches.

Current October 2026: one green month header, all four builder month cells and
one totals cell; the same applies to Sold/Scheduled. All 27 header boundaries have
one consistent 2px solid rgb(124,153,184) separator. Complete outlined schedule
tracks measure 298px and monthly tracks 282px; 0% monthly meters retain visible
empty tracks. Sold/Scheduled contain no displayed numeric zero month/footer cells.
Clicking Adams Homes October preserves input focus/value without a save.

Before/after read-only comparison: all 96 forecast IDs, values and edit-disabled
states, plus all 52 native summary label/value pairs, are unchanged. No Production
save/ensure was triggered. Creator functions, API bindings, native window/date
restrictions and subdivision subtotal math remain as published in 9.59.

Screenshot evidence saved locally under C:/Users/R/Desktop/claude/tmp/:
forecast-manager-v1.5.2-conflict.png, forecast-manager-v1.5.2-matrix.png and
forecast-manager-v1.5.2-production.png. The Creator tab remains open for review.

Limit: chooser read-only availability checks cover Builder-status parents exposed
by the existing snapshot. The unchanged native ensure preflight handles other
status conflicts and changes made concurrently after a read. A failed lookup
keeps Create disabled rather than assuming the combination is available.
