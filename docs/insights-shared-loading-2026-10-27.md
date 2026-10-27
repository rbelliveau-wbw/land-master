# Insights loading and Forecasts builder breakdown — 1.6.7

Lot Sales uses the Forecasts centered white card, pale-blue emblem and navy
indeterminate ring with `Loading lot sales…`. The dashboards now use a single
set of loading styles in insights.css. Forecasts retains its existing appearance.
The new [design guide](../knowledge/design/loading-states.md) records the user's
standing direction to always follow the Forecasts loading appearance.

Forecasts also swaps Lot Status and View by: Lot Status returns to the top
filter row, and View by occupies the first matrix header. Phase rows with
multiple displayed builders expand into their builder monthly/annual values,
using the same loaded data and filters. Cached mounted child rows follow
Hide Empty, annual visibility and ancestor collapse without another read or
model rebuild. Parent/group/footer totals and CSV count each phase only once.

Lot Sales loading covers both recent data and complete history, with no timing
delay or invented progress. Exact received/total counts remain accessible.
The old loading banner and duplicate empty label stay hidden while pending;
actual history failures still show the existing error and Retry history action.
The loader is a sibling of the scroller so the empty-table hiding rule cannot
hide it. Completion, errors and access reset clear it and the matrix's aria-busy
state. Retry uses the same pending surface. Existing atomic first paint, native
permissions, string IDs, counted complete reads and export locks remain.

Changed files: Insights HTML, sales-app.js, insights.css, Forecasts app/model/CSS,
existing startup/model/browser regressions, design/module notes, config/widget manifest,
immutable 1.6.7 release and Development/Production mappings. Affected Creator
forms/fields, functions, Custom APIs and permissions: none changed. Frontend
deployment is required; Creator deployment is not. Permanent widget URLs remain.

Verification: focused desktop loading/startup checks, existing Forecasts browser
regressions, repository validation and Pages build. Desktop checks cover centered
geometry at 1366px/1920px, the shared visual tokens, reduced motion, recent/history
pending, complete success, real failure/retry, denied/reset access, stale replies
and disabled exports. The presentation fixtures do not write live records.
Forecasts regressions cover both modes, the swapped mounted pickers, builder
breakdown parity, partial/missing values, annual columns, parent totals/CSV,
Hide Empty and nested collapse, retained node identity/focus and bounded large
report disclosure/switch timing with no extra model builds or reads.

Rollback: restore Production `lot-sales-explorer` to **1.6.6** in
deploy/environments.json and rebuild Pages. No native rollback is required.
