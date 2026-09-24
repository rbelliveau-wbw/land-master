# Pro Forma phase sales — implementation prompt

Prepared September 17, 2026 from the local Land Master repository and the approved mockup. This is a future implementation prompt; no application code, Creator configuration, or production data was changed when preparing it.

## Task and scope

Implement the phase-level Lot Sales redesign in the Land Master Pro Forma module, including Creator schema, workflows/functions, widget calculations, persistence, migration, and regression testing. Complete the implementation and verification rather than stopping after a UI change. Keep unrelated functionality intact.

Repository: this `land-master` checkout.

Mockup: `docs/proforma-phase-sales-mockup.html` in this repository. It is an HTML fragment for design reference, not production code.

Follow the repository and widget AGENTS.md instructions. Re-read current source, current deployment mappings, and current Creator metadata before editing: this plan describes the September 17 state, not a guarantee about next week's code. Prefer approved read-only live metadata; the committed `Land_Master_2026-08-06.ds` export is older than several live changes. New field names below are proposals to create and verify, not claims that they already exist. Do not hand-edit generated schema as a substitute for creating Creator fields and refreshing the export.

This prompt authorizes implementation and testing in the appropriate development environment. It does not by itself authorize production promotion, a production-wide migration, or pushing to main. Prepare a tested immutable release and deployment/rollback instructions. If I append “push to main and prod,” complete the coordinated Creator and widget production release after verification, using the existing permanent URLs.

Treat this as a high-impact financial and scheduling change. Work carefully, verify every affected path, and do not declare success while known mismatches or failures remain. “Make no mistakes” is a requirement for thorough checks and candid reporting, not a substitute for tests or a claim of infallibility.

## Clarify uncertainties before implementing dependent behavior

Ask me clarifying questions as needed rather than assume. The intent to complete this in one implementation session does not override this requirement. First check current authoritative metadata, code, documentation, and my explicit instructions for an answer; if a material requirement is still unclear or conflicting, ask me before implementing behavior that depends on it.

Treat every proposed rule, default, interpretation, and illustrative calculation in this document as a discussion starting point, not approval to choose that behavior silently. In particular, clarify unresolved escalation/markup math, accrual versus cash recognition, date proration, overhead basis, zero-initial-take behavior, phase-to-phase construction timing, phase lot reconciliation, and migration behavior. Do not turn these proposals into accepted requirements merely by documenting an assumption in the final report.

Ask concise, grouped questions with concrete options and explain the calculation or behavior each answer changes. Do not ask again about requirements I have already settled, such as construction end Month 36 plus Initial Delay 0 producing first sale Month 37. Continue independent investigation and implementation while awaiting answers, but leave dependent work pending. No response is not approval. Record my answers in the implementation contract and update affected examples and tests to match before proceeding.

## Under Construction access gate

As part of the implementation, add an **Under Construction** modal for the Pro Forma module. It must block interaction for **everyone**, including administrators, until they enter the exact code **`0424`**. The code is a string: its leading zero is significant. Use a password-style input, clear error feedback, keyboard support, and the existing Pro Forma modal styling. Do not allow Escape, backdrop clicks, tab changes, direct/deep links, or browser navigation within the module to dismiss or bypass it. Once unlocked, restore the intended destination and normal workflow. Do not reuse the approval lock or alter saved Pro Forma data just to show the gate.

Clarify with me before building the dependent behavior: whether this gate is temporary during construction or should remain until explicitly removed; whether unlocking lasts only for the current tab/session or longer; and whether “locks everyone out” means a true server-enforced access restriction or a widget-level modal. A four-digit code embedded in public client JavaScript is discoverable and is **not** secure authentication. If true access control is required, implement and test enforcement at the server/Creator boundary rather than relying on the modal alone. Do not silently choose a weaker interpretation. Ensure an authorized recovery/rollback route exists before enabling the gate so a bad deployment cannot strand every user.

Test correct, incorrect, empty, and whitespace-padded entries; the leading zero; keyboard submission; refresh and new-tab behavior according to my answer; every Pro Forma entry route, deep link, and role; blocked interactions before unlock; accessibility/focus; and recovery after deployment failure. Include the gate in the coordinated rollout and rollback plan. Do not accidentally gate unrelated Land Master modules unless I explicitly request it.

## Required experience

- Match the mockup's light Pro Forma styling: navy, pale blue, restrained teal, compact labels, and no long description blocks.
- List every phase on the left; each clickable row shows phase, lots, construction end, and first sale month.
- Beside the selected phase, provide editable **Lots in Phase** and **Same for all phases**.
- Initial Take: **Initial Lots**, **Initial Delay**, and **First Recurring Take** delay after initial take (1, 3, 6 months and custom whole months).
- Recurring Takes: **Lots per Take** and **Monthly / Quarterly**.
- Price Escalator: enable switch, **Annual Escalator %**, **Additional Markup %**, and **Esc Start Date**.
- Show a live schedule summary: construction end, initial take, first recurring take, final take, total lots, number of takes, and escalation/markup.
- “Initial Delay” means additional months after the first month following construction completion. Construction ends Month 36 and delay 0 means first sale Month 37. Delay 3 means Month 40.
- “Same for all phases” shares take quantities, delay settings, frequency, escalation settings, and markup. It never overwrites phase lot allocations or construction dates. Turning it off retains the copied values for individual editing. Validate shared initial quantities against every phase. A new phase inherits shared settings when sharing is enabled.
- Use the existing Pro Forma save, dirty-state, permission, and approval-lock behavior. Do not introduce a misleading independent phase save if the application saves the whole model.
- Format numerical inputs with comma separators on blur while preserving numeric precision and unformatted payload values. Preserve intentional zero values.
- Keep existing header `Initial_Takedown` and `Lots_per_Month` fields, visible but read-only, with a short Deprecated indicator. Remove them as editable drivers everywhere, including scenario controls and native Creator forms. They may seed legacy migration, but must not drive recalculation once phase settings are adopted. Prevent old clients/API payloads from modifying or reactivating them on migrated records.

## Schema and source of truth

### `Proforma_Phase`

Use the existing form and parent lookup `Pro_Forma`. Preserve stable row IDs. Treat `(Pro_Forma, Phase)` as a unique logical key and reject duplicates.

Reuse existing `Total_Lots` as editable phase allocation; despite its current decimal field type, enforce whole lots. Keep existing engineering, construction, and sales date/month outputs as calculated fields.

Proposed new persisted inputs:

| Proposed link name | Type / rule |
| --- | --- |
| `Initial_Take_Lots` | Whole number, 0 through phase lot count |
| `Initial_Delay_Months` | Whole number, minimum 0 |
| `First_Recurring_Delay_Months` | Whole number, minimum 1 when applicable |
| `Take_Frequency` | Monthly or Quarterly |
| `Lots_Per_Take` | Positive whole number when recurring lots remain |
| `Escalator_Enabled` | Boolean, default false |
| `Annual_Escalator_Pct` | Decimal percentage, default 0 |
| `Esc_Start_Date` | Date, required when an enabled nonzero escalator applies |
| `Additional_Markup_Pct` | Decimal percentage, default 0 |

Keep “Custom delay” as a UI choice writing a single numeric delay, not a second conflicting persisted value. Record actual field precision, bounds, report exposure, permissions, and payload representation in a schema contract.

Persist the shared-mode preference on `Add_Pro_Forma` using a proposed `Same_Lot_Sales_All_Phases` boolean. Add an explicit schedule-version/adoption marker, with a proposed name such as `Lot_Sales_Schedule_Version`, so blank legacy phase settings cannot be confused with intentionally entered zero values. All actual take and pricing assumptions belong on `Proforma_Phase`.

### `Proforma_Months`

The verified current link name is plural: `Proforma_Months`; its parent lookup is `Proforma`. Add phase-attributable calculated fields for:

| Proposed link name | Meaning |
| --- | --- |
| `Escalator_Percentage` | Annual percentage used for that phase's sale event |
| `Escalator_Elapsed_Months` | Nonnegative elapsed months used in the calculation |
| `Escalator_Applied_Pct` | Effective cumulative percentage on the event's base sale value |
| `Base_Lot_Sales` | Sale proceeds before markup and escalation |
| `Additional_Markup_Income` | Markup earned on lots sold in this row |
| `Escalator_Interest_Accrued` | Accumulated escalator earned on this row's lots, collected at their sale |

Keep `Finished_Lot_Sales` as the all-in lot-sale receipt: base + markup + escalator. Existing `Interest` is a financing expense; never reuse it for escalator income. Detail fields explain the receipt and must not be added to cash flow a second time.

The proposed “accrued” field is accumulated escalation realized on the lots sold in that month, not a cash receipt on unsold inventory. If a separate monthly accrual/receivable balance is later required, model it separately and exclude it from cash flow until sale.

Support multiple selling phases in the same month without averaging their rates or overwriting one phase. Retain phase attribution on detail rows and exactly one `Master_Month` per project month for aggregate cash-flow outputs. Never sum percentages across rows.

Verify live decimal precision. The existing widget treats `Finished_Lot_Sales`, `Construction_Cost_Base`, and `Entitlement_Engineering` as whole-dollar month fields in some save/repair paths. Define one rounding contract for Creator and JavaScript, including component-to-total reconciliation. Do not introduce cents in one path and silently strip them in another.

## Scheduling contract

Implement a deterministic phase/event scheduler first; derive previews, saved phase outputs, month rows, and header dates from its results. Use one implementation per runtime and common fixture data to prove parity. Consolidate duplicated Creator scheduling formulas into a callable calculation path where practical; do not leave independent formulas scattered among input workflows.

For an active phase:

1. `initialAnchor = Const_End_Month + 1 + Initial_Delay_Months`.
2. If initial quantity is positive, emit that take at the anchor.
3. If lots remain, emit the first recurring take at `initialAnchor + First_Recurring_Delay_Months`.
4. Subsequent recurring takes occur every 1 or 3 project months, measured from that first recurring take. Quarterly does not mean calendar-quarter boundaries and does not multiply Lots per Take by three.
5. Cap the last take at remaining lots. No negative remainder, over-sale, lost final lot, or extra take after sellout.
6. Proposed zero-initial rule: when Initial Lots is 0, the first recurring take occurs at the initial anchor and the after-initial delay is inapplicable. Make this rule explicit in code, helper text, and fixtures.
7. Initial-only phases need no recurring event. Derive first/last sale from actual nonzero takes. `Lot_Closing_Length` is elapsed inclusive months from first to final sale, not number of take events; expose take count separately.

Do not build circular dependencies between construction end and initial sale. Preserve the current phase-to-phase construction staging as the proposed default: Phase 1 uses existing engineering/construction header inputs; later phase construction ends at the previous phase's final sale month, with construction/engineering starts derived using existing lengths and offsets. Apply the next phase's Initial Delay only after that construction end is known. Longer sales on an earlier phase therefore push later construction and sales. Do not silently freeze later construction dates or start all phases together.

Reconcile editable phase lots with the existing lot-mix/header total. Proposed default: phase quantities are an allocation of the project total; require their sum to equal lot-mix `Lots` before save, show allocated/remaining lots, and never silently change the lot mix or redistribute existing manual allocations. Seed new/unconfigured allocations deterministically. On phase-count changes retain surviving phase records and flag allocation mismatches; handle removed phases deliberately and preserve referenced data. Reject invalid zero/negative active-phase allocations and impossible phase counts.

Derive header first-sale dates from the earliest actual sale. Derive project completion and the cash-flow horizon from the latest required event, including final takes, construction/engineering, purchase and land-sale installments, PID/MUD receipts, and explicitly scheduled costs/reimbursements. Preserve the project's purchase-date/month-1 origin. Do not use the old closed-form completion formula or only the last phase plus PID/MUD to bound months. Reject out-of-range inputs clearly rather than dropping events. Keep zero-activity months through the horizon for correct cumulative cash flow and IRR timing.

## Proposed pricing rules — clarify before implementation

The UI request establishes the fields but does not settle every pricing convention. Ask me to resolve the outstanding pricing questions before implementing them. The proposals below are options to discuss, not automatic defaults if I have not supplied different rules. Implement and test the confirmed answers, and include those decisions in the implementation report.

- Use the existing lot-mix-derived base unit price; do not add a separate phase base-price editor in this scope.
- Simple annual escalation prorated by whole calendar-month differences, matching the spreadsheet example: no compounding, and zero escalation in the start month. Normalize sale and start dates to their calendar month; dates before the start produce zero. Document that day-of-month does not prorate this monthly model.
- Additional Markup is a one-time percentage of base sale price, independent of the escalation enable switch. It is not an annual rate and does not itself earn escalation.
- For sold quantity `q`, base unit price `B`, annual rate `r` as a fraction, markup `u` as a fraction, and elapsed months `n`:
  - Base income = `q * B`.
  - Markup income = `q * B * u`.
  - Escalator income = enabled ? `q * B * r * n / 12` : `0`.
  - Finished lot sales = sum of those three components, under the agreed precision contract.
- Escalation accrues through delay months and quarterly gaps, but only becomes cash income on the relevant sale event. It resets according to each phase's own Esc Start Date.
- Preserve the existing administrative overhead basis on base lot receipts unless current authoritative business rules require gross receipts including these premiums; explicitly document and test that choice. Financing interest and profit share still respond to the changed cash flow under their existing formulas.

## Required code and workflow audit

Create an impact inventory before editing, then mark each item changed, delegated to the shared calculator, or verified unaffected. Search all current callers and assignments of old pace fields, phase/month forms, start/end dates, lot-sale income, cash flow, totals, and return calculations. Include native workflows and embedded Creator page code, not just `creator/functions/`.

Known September 17 hotspots:

- `widgets/proforma-manager/src/app/widget.html`: `computeProforma`, including schedule preamble, PHASES, MONTHS, FILL LOT SALES, cost allocation, impact fees, overhead, main cash-flow loop, `finalizeTotals`, monthly cash list and aggregation.
- Model/persistence: `newModel`, `recordToModel`, `modelToCalc`, `loadDetail`, `HEADER_FIELDS`, `validateModel`, `buildHeaderData`, `buildSavePayload`, `phaseData`, `monthData`, `repairFractionalMonths`, `saveProforma`, and duplicate `FORK_CHILD_LISTS`/`forkModel`.
- UI/consumers: `paneSchedule`, `renderMonthsPane`, `renderFlowTable`, dashboard and comparison KPIs, CSV/export paths, `calcDiag`, and every displayed schedule summary.
- Scenarios: `DEAL_DRIVERS`, `dealCloneWith`, `dealApplyDriver`, `dealSnapshot`, `dealSolveBound`, sensitivity/headroom, reset/restore, pins, and MUD-revenue inclusion. Replace deprecated pace drivers with phase-aware behavior; never mutate the saved phase model during scenarios. Quantity scenarios must reconcile a cloned phase allocation deterministically and preserve baseline restoration.
- Creator function `proforma_save.dg`, live Save_PF API bindings/routing, and `Proforma_Bulk_Save` if it exists live. The latter is referenced in the widget but its implementation must be located and verified before relying on it.
- Creator workflows `Schedule_Validation_Profo` and `Schedule_Validation_Profo1` through `4`; `Schedule_Validation_Compl` and `Schedule_Validation_Compl1` through `3`; `RUN_EVERYTHING_ON_SUCCESS`; `Calc_IRR_XIRR_Pro_Forma`.
- Related workflows `Form_Logic_Checks_Pro_For`, `Installment_Month_Check_P`, `Lockdown_Form_Proforma`, `Delete_Orphaned_Months_Ph`/`1`, purchase/sale installment and date workflows, and `Set_PID_MUD_Date_Pro_Form`.
- Downstream consumers `Update_Pro_Forma_Months_B`, `Set_Months_from_Start_Pha`, `Set_Months_from_End_Phase`, Creator `Proforma_Management` page, budget links, `PF_Build_Proforma_Approval_PDF`, and `PF_AI_Review` snapshots. Update stale lot-sales assumptions and reported numbers where necessary; preserve unrelated approval routing, legal/Offer behavior, email content, and PDF layout.

The current generated schema/export is dated August 6. Refresh or verify live workflows before deploying; do not overwrite newer production fixes with old export bodies.

## Persistence and migration — address before UI rollout

Current `RUN_EVERYTHING_ON_SUCCESS` deletes/recreates all `Proforma_Phase` rows. The widget fallback also deletes/recreates phases and months. Both must stop destroying phase input records. Upsert phase inputs and calculated outputs while retaining IDs; rebuild only calculated month data using a guarded process. Preserve legitimate references to existing rows.

Extend the model, detail fetch, report field lists, save payload, Creator validation, API response, and reload path to round-trip every phase input, including zeros, cleared dates, disabled escalators, and sharing state. Add the new phase input collection to `FORK_CHILD_LISTS` and duplicate tests so a duplicate cannot update its source's phases.

Order saves so the backend has the validated phase inputs before recomputation. The current API save is followed by a minimal REST header touch to run form workflows. Ensure that path, native saves, phase-form edits, and supported fallbacks run the same engine in the correct order and do not trigger loops or race with each other. Enforce parent ownership, phase uniqueness, and approval locks on the server, not only in the browser.

Introduce explicit calculation/schema version checks so an old widget/backend cannot overwrite the new schedule. A fallback that cannot persist the full new contract must fail clearly and preserve existing data, not silently save a partial legacy schedule.

Replace “server row count equals expected row count” as the success test. Reload and reconcile phase settings, phase bounds, monthly event quantities, revenue components, cash flows, totals, and return metrics. Equal-length schedules can still have completely different dates or income. Surface any partial-write or reconciliation failure and retain dirty/retry state; do not show Saved.

For existing records:

1. Snapshot inputs, phase/month rows, dates, totals, and returns before migration. Prepare a dry-run migration report.
2. Keep legacy records calculable with an explicit legacy version until adoption; opening a record must not migrate it or alter stored results. Protect locked/approved records.
3. Seed adopted records from their existing phase lot counts and legacy pace. Phase 1 uses its prior initial quantity; later phases can seed their first take with the former monthly quantity, capped at phase total, followed by monthly takes one month later. Use delay 0 and zero escalation/markup. Do not apply Phase 1's large initial take to every existing phase automatically.
4. Compare candidate event schedules to the stored/legacy schedule. Preserve valid baseline results; flag existing missing-lot, rounding, or off-by-one anomalies instead of silently baking them into the new engine or claiming identical migration.
5. Make migration repeatable without duplicate rows, cross-project writes, or resetting edited settings. Retain original deprecated header values for reference.
6. Avoid destructive bulk migration until the dry-run results and rollout scope are authorized. Any rollback must preserve new phase inputs and account for schema/version compatibility; simply restoring the old widget would reactivate destructive legacy writers.

## Income, cash flow, and returns

Make lot-sale event receipts authoritative for lot-sale totals. Replace `Gross_Sales = Sale_Price_FF * Lots * Lot_Size_Ft` where it would omit markup/escalation. Reconcile total finished lot receipts to Gross Sales, Total Income, and Net Profit. Keep base/markup/escalator breakdowns without double counting.

Trace and verify every dependent calculation: `Cash_Flow`, `Cash_Flow_with_Overhead`, `Cash_Flow_with_Interest`, `Running_Cash_Flow`, `Running_Cash_Flow_with_Interest`, financing `Interest`, overhead totals, `Profit_Share`, ROI, IRR, XIRR, peak cash requirement, cash-position anniversaries, annual/all-project flow totals, and comparison/scenario summaries.

Cash-flow aggregation must count each event exactly once and write aggregate results to only one master row per month. Preserve existing expense and financing conventions except for the intended changed quantities/timing/income. Phase lot reallocations must also propagate to engineering costs, construction allocations, and per-lot reimbursements without changing unrelated project totals.

Check the live IRR contract before altering it. The current widget computes a monthly root, reports `IRR = monthlyRate * 1200`, and labels `(1 + monthlyRate)^12 - 1` as XIRR. Do not silently replace this with an actual-date XIRR method as part of the sales change. Feed the corrected complete monthly cash series into the existing agreed return definitions, verify convergence/residuals, and keep no-solution cases explicit.

## Implementation sequence

1. Refresh evidence, identify unresolved requirements, ask clarifying questions as needed, produce impact/schema contracts, and capture legacy fixtures and migration snapshots. Record confirmed decisions before implementing dependent rules.
2. Define canonical inputs/events/output semantics and write independent expected-result fixtures for scheduling and pricing.
3. Add Creator schema/report exposure and version compatibility protections in development; create repeatable migration and rollback tools.
4. Implement phase persistence and safe upserts; remove destructive phase regeneration in every writer and fallback.
5. Implement the scheduler and pricing in Creator and JavaScript, consolidate schedule workflows, then connect month generation, income, cash flow, totals, and returns.
6. Implement the mockup UI, shared mode, editing, validation, readonly legacy fields, and scenario/duplicate integration.
7. Update all affected displays, exports, diagnostics, documentation, contracts, and test registration.
8. Run local tests plus actual Creator development save/reload/native-workflow parity tests; prepare immutable release and coordinated rollout evidence.

## Required verification and acceptance

Use independent expected schedules and financial amounts, not tests that merely repeat the implementation formula or assert source strings. JavaScript-vs-JavaScript parity is insufficient: exercise the actual Creator engine in a nonproduction test record and compare reloaded results. If live execution is unavailable, deliver the implementation and exact remaining steps but label backend verification incomplete.

Scheduling fixtures:

- Construction end 36, delay 0 => initial 37; delay 3 => initial 40; delay 6 => initial 43.
- 179 lots, initial 35 at 37, recurring 20 starting 40, monthly: final 4 at 47; 9 takes; closing span 11 months.
- Same quantities/start with quarterly recurrence: takes at 40, 43, 46, 49, 52, 55, 58, 61; final 4 at 61; 9 takes including initial; closing span 25 months.
- Exact divisions; single-lot phase; initial equals all lots; zero initial under the explicit rule; invalid initial exceeding phase total; zero recurring quantity with lots remaining; fractional/negative/blank inputs.
- Unequal phase lots; Phase 10 remainder; phase count changes; allocation mismatch; shared mode on/off; shared quantities exceeding a smaller phase; independent phase lots while sharing is on.
- Chained phases and simultaneous sales from different phases if permitted by live scheduling; more than two overlapping engineering/construction phases must never be silently truncated.
- Purchase date changes, year boundaries, first/last month, long delays, horizon limits, no-sales gaps, and late purchase/sale/PID/MUD/cost/reimbursement events.

Illustrative pricing fixtures under the unconfirmed proposals, before configured currency rounding; revise their expected results to match my clarified decisions before using them as acceptance tests:

- Base price $50,000, annual escalator 5%, 10 lots sold: elapsed month 0 earns $0; month 1 earns $2,083.333…; month 12 earns $25,000.
- Add 2% markup to that month-12 sale: base $500,000 + markup $10,000 + escalation $25,000 = $535,000. This distinguishes additive markup from compounded pricing.
- Start before/on/after sale month; midmonth start under the documented month-bucket rule; blank required start; zero rate; disabled escalation with markup still active; mixed phase rates/dates; quarterly gaps; partial final take; zero-sale month contributes no cash escalator income.
- Rounding component sums and header sums must match stored precision on save/reload, including former whole-dollar fields.

Financial invariants:

- Every phase sells exactly its allocated lots and project lots reconcile to the lot mix.
- Detail base + markup + escalator equals finished receipts; summed receipts equal Gross Sales; summed monthly total income equals header Total Income.
- Monthly income minus expenses equals base Cash Flow; final Running Cash Flow equals summed Cash Flow; financing/overhead variants reconcile separately.
- Additional income changes cash balances, applicable financing interest/profit share, ROI and returns through the timed cash series, without a second addition of the income components.
- Hand-check a small complete project and an independently computed IRR reference. Test no positive/negative sign change and nonconvergent roots; preserve existing return definitions.

Persistence/integration:

- Create, edit, save, reopen, native Creator save, direct phase edit, recalculation without input changes, duplicate and save duplicate, and repeat migration.
- Reload preserves all inputs and phase IDs; duplicating leaves the source byte-for-byte unchanged.
- Old client/schema mismatch, same-row-count but wrong-income backend result, denied child writes, stale rows, partial failure, missing parent ID, and unknown create outcome. No success banner on failed parity; no unfiltered deletion; no duplicate retry inserts.
- Restricted user, owner, administrator, manually locked, pending approval and completed approval cases.
- Scenario changes, restore/reset, sensitivity, MUD toggle, snapshot/pins, charts, flow table annual/overall totals, exports, approval financial summaries, and budget consumers.
- Representative long/many-phase projects remain within Creator statement/API limits and reasonable widget recalculation time.
- Browser interaction and responsive checks for sidebar, keyboard switching, numeric blur formatting, field error focus, and disabled deprecated controls.

Run all applicable existing Pro Forma regression scripts, especially duplicate, flow totals, per-unit costs, scenarios, and approval packet. Register new meaningful regressions in the normal validation command. Complete `npm run validate` and `npm run build:pages`. Report actual commands/results, development record IDs and environment, parity tolerances, and any unexecuted checks.

## Completion and release report

Provide changed files; exact created/changed forms, fields, reports, workflows, functions and APIs; migration behavior; financial assumptions; test results and independent parity evidence; current release/version; Creator deployment requirement and ordered steps; known limitations; and a compatible rollback procedure preserving new inputs.

Deploy schema and compatible backend protections before enabling the new widget writer. Release activation must ensure old cached clients cannot recalculate migrated records using legacy logic. Read current production mappings at implementation time rather than using an old release number as rollback. Do not declare the feature complete while only the mockup/widget is updated or while Creator still deletes the phase settings or computes the old income.
