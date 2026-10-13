# Pro Forma monthly Excel export — 1.80.102

The Excel `Months` sheet now has one row per model month, including months with
multiple active engineering, construction or selling phases. Months are sorted
by month number. This is an export-only view of the existing calculated rows.
The Months & Phases editor, PF calculator, phase scheduler, saved child rows,
header totals, dashboard, returns and Creator save workflows are unchanged.

## Column rules

- Sum lots sold, base sales, markup income, escalation income, finished sales,
  land cost/sale, PID/MUD revenue, engineering base/additional costs,
  construction base/additional costs, reimbursements and reimbursed fees across
  the month's detail rows. Keep numeric cells, signs and full source precision;
  do not round individual rows. All-blank components remain blank; zero remains zero.
- Copy Cash Flow and Running Cash Flow once from the month's unique Master row.
  Those values already include all phases. Do not sum running balances.
- Phase columns contain unique, numerically sorted IDs. One ID stays numeric;
  several IDs are text such as `1, 2, 10`. Never pass a multi-ID label through
  numeric conversion, which could turn it into `1210`.
- Escalator percentages, elapsed months and applied percentages retain their
  numeric value when all populated values agree. When selling phases differ,
  show each value with its phase, such as `Phase 1: 5; Phase 2: 7`. Do not sum or
  average rates or durations. Empty legacy pricing components remain blank.
- An invalid month/phase/amount, nonfinite total, conflicting date or missing/
  duplicate Master row stops workbook creation through the existing export
  error surface. Differing sales metadata requires a sale phase for attribution.

The export produces fresh summary objects without changing the calculation
model. Existing workbook columns and the other sheets retain their contracts.
Phase cost detail remains in the underlying PF rows; the Excel Months sheet
shows combined monthly costs.

## Verification and regression

`scripts/test-proforma-monthly-export.mjs` runs the actual complete widget,
writes and reopens real XLSX bytes, and verifies numeric cell types. It covers
six simultaneous engineering/construction phases from the actual calculator,
multiple selling phases, phase-ID sorting/deduplication, matching and differing
rates, zero/blank/negative/sub-cent amounts, Master-only balances, malformed
data, 60 deterministic shuffled overlapping models, every exported additive
column, per-month/dashboard/project totals and final cumulative cash. Frozen
inputs and exact before/after snapshots verify no mutation; native fixtures
verify no Creator writes. Existing phase export, loading/draft preservation,
phase scheduling and the full repository validation/build remain required.

## Deployment and rollback

Only Proforma Manager widget source, version metadata, its immutable release,
the Development/Production frontend mappings, tests and documentation change.
No Creator form, field, function, Custom API or workflow changes. No Creator
deployment or promotion is needed; any Creator promotion remains with Robby.
Permanent widget URLs stay the same. Rollback: map Production Proforma Manager
back to `1.80.101` and redeploy Pages.
