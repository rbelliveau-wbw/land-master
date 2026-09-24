# Pro Forma phase sales implementation contract

Status: Creator Development backend installed; widget release `1.80.14` is a candidate and the Development mapping is staged in draft PR #112. The branch's Pages build passed but deployment was rejected by the `github-pages` environment protection rule, which does not allow this feature branch. The DEV widget has not been published and no record has been migrated. Production promotion and production migration are outside this authorization.

## Confirmed business rules

- The Under Construction control is a widget modal for every Pro Forma user, including administrators. The exact unlock code is the string `0424`. Unlock applies to one browser tab and is lost when that tab closes. Keep the modal until the user explicitly removes it. This is an interface gate, not server authentication; native Creator forms and direct APIs are not secured by this four-digit widget code.
- Base lot price remains the existing lot-mix-derived `Sale_Price_FF * Lot_Size_Ft`. Annual escalation is simple and noncompounding: each elapsed whole calendar month adds one twelfth of the annual percentage of base receipts. The calendar month containing `Esc_Start_Date` earns zero escalation; the day of month does not prorate the result. Escalation enters income and cash flow only when the corresponding lots sell.
- Additional markup is a one-time percentage of base receipts, independent of escalation, and continues when the escalator switch is off. Annual escalation rates must be nonnegative. Negative markup percentages are allowed.
- Sale-event base, markup, and escalation amounts are rounded to whole dollars independently; the stored all-in receipt is their sum. Monthly and project amounts sum stored event components so all displayed totals reconcile.
- Preserve the existing G&A overhead basis and formula for this change. Premiums affect cash flow, financing, profit share, and returns through all-in lot-sale receipts; they do not change the overhead formula.
- Every active phase has an initial take greater than zero. Initial Delay zero means the first sale is the month after construction ends; construction end Month 36 produces first sale Month 37. The first recurring take occurs the chosen number of months after the initial take. Later-phase construction ends at the previous phase's final sale month.
- Active phase allocations must add up exactly to the project/lot-mix lot total before save, with an over/under indicator. New allocations split evenly and place the remainder in the final phase. Retain IDs of surviving phases; delete phase rows no longer needed when the phase count is reduced, after validating the new allocation and references.
- Existing records retain legacy calculations until explicit adoption. The adoption UI previews proposed settings and results and requires user approval. The suggested seed uses the old header initial take for Phase 1 and the old monthly pace, capped by phase lots, as the initial take for later phases; remaining lots sell monthly, with no initial delay, no escalation, and no markup. Migrate one Development record to verify the path.
- Remove obsolete sales-pace drivers from the scenario tool. Keep the other scenario features, including project-lot-count scenarios, and do not mutate the saved phase model while exploring them.

## Compatibility and rollout

- Legacy version and adopted version must remain distinguishable. Opening a legacy record does not write or migrate it.
- The prior Development widget mapping was `1.79.3`. GitHub main advanced to `1.80.13` in all environments during this implementation. The phase-sales candidate is `1.80.14`, and only Development is staged to move to it.
- Creator schema, workflows, functions, Custom APIs, and native form behavior must agree with the widget before enabling adopted writes. An old client must fail clearly against an adopted record rather than recalculate it with legacy pace fields.
- Development verification includes one migrated record, new-record save/reload, native Creator save, duplicate isolation, scenario restoration, phase ID retention, schedule and financial parity, and gate behavior. Production promotion requires separate authorization.

## Impact inventory

| Surface | Required action |
| --- | --- |
| `Add_Pro_Forma` | Add shared-mode and schedule-version fields; make legacy pace inputs read-only; validate version and allocation. |
| `Proforma_Phase` | Add per-phase inputs, preserve surviving IDs, enforce parent/phase uniqueness, and expose fields in reports. |
| `Proforma_Months` | Add phase-level sale breakdown fields, preserve one master row per project month, and expose fields in reports. |
| Creator scheduling workflows and `RUN_EVERYTHING_ON_SUCCESS` | Route adopted records through one new phase scheduler and keep legacy records on the old calculation path. |
| `proforma_save` and Save_PF binding | Persist and validate phase inputs before calculation; reject legacy writes to adopted records. |
| Widget model, calculation, save, reload, duplicate, scenario, exports, and UI | Round-trip phase inputs, compute event receipts, reconcile server results, and display the mockup-inspired editor and adoption preview. |
| Approval packet, AI review, budget and report consumers | Verify their income and schedule figures against the adopted model; update stale pace labels where applicable. |

Live Development inspection confirms that `RUN_EVERYTHING_ON_SUCCESS` currently starts by deleting all `Proforma_Phase` rows for the Pro Forma and recreates them from the legacy header pace. Its month pass also deletes and recreates `Proforma_Months`. The adopted version must branch before the phase delete; simply adding fields to the existing workflow would erase the new inputs and phase IDs. The workflow's totals action currently assigns `Gross_Sales` from `Sale_Price_FF * Lots * Lot_Size_Ft`, which must become the sum of event receipts for adopted records while retaining the existing assignment for legacy records. Other form workflows include `Delete Orphaned Months/Phases - Pro Forma` and multiple `Schedule Validation - Proforma` actions; those require a version-aware review before activation.

## Development changes verified in Creator

- Added `Add_Pro_Forma.Same_Lot_Sales_All_Phases` and `Lot_Sales_Schedule_Version`.
- Added to `Proforma_Phase`: `Initial_Take_Lots`, `Initial_Delay_Months`, `First_Recurring_Delay_Months`, `Lots_Per_Take`, `Take_Frequency`, `Escalator_Enabled`, `Annual_Escalator_Pct`, `Esc_Start_Date`, `Additional_Markup_Pct`. The existing `Total_Lots` remains the allocation field.
- Added to `Proforma_Months`: `Base_Lot_Sales`, `Additional_Markup_Income`, `Escalator_Interest_Accrued`, `Escalator_Percentage`, `Escalator_Elapsed_Months`, `Escalator_Applied_Pct`.
- Updated `RUN_EVERYTHING_ON_SUCCESS` actions 1, 2, 3, and 12 with version-2 branches and unchanged legacy `else` branches. The new branches are mirrored in `creator/workflows/proforma-phase-sales-v2.md`. Creator accepted and retained the scripts after reload.
- Updated the Development `proforma_save` function behind `Save_PF` with `save_phase_sales`. It validates and upserts per-phase inputs, preserves surviving IDs, removes surplus phase rows, then sets the schedule version. It also rejects old-client saves of already adopted records. The no-write `Execute` test returned the expected validation response; actual record writes remain unverified.
- The widget blocks version-2 saves outside Development and refuses client-side month/phase rebuilds or unconfirmed server results for adopted records. It verifies month count, sold lots, gross sales, and phase timing after the server recalculation. Production remains mapped to `1.80.13`.

## Remaining before claiming end-to-end DEV completion

1. Obtain authorization to merge the DEV-only mapping to `main`, which is the allowed Pages deployment branch. Then confirm the stable DEV URL serves `1.80.14`. Do not bypass the GitHub environment protection rule.
2. Use the adoption preview to migrate one draft DEV test record (candidate `asd`, ID `4410926000002947007`), then verify write/reload parity and preserving its phase IDs. Do not touch a Production record.
3. Exercise new-record save, native Creator save, phase-count decrease, duplicate isolation, scenario restoration, gate behavior, and approval/report consumers in the live Development app. The local `npm.cmd run validate` suite and `npm.cmd run build:pages` currently pass.
4. Refresh the Creator export after live verification; the committed generated schema is from August 6 and must not be treated as a deployment artifact for the new fields.

Rollback before any migration: point Development back to `1.80.13`; the new Creator fields and guarded workflow branches are inert for legacy records. After migration, reverting the widget alone would leave version-2 records unreadable to the old widget, so preserve the new inputs and resolve or reverse that record explicitly before a full rollback. No Production mapping or Creator Production change is part of this candidate.
