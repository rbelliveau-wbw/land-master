# Pro Forma currency/save review — 1.80.78

## Observed incident

The screenshot identifies a persisted header mismatch on Land_Cost after Save_PF.
Read-only production inspection of Taylor Farms (ID 4410926000004799074) displayed
236.44 acres, $52,868.00/acre, and saved Land Cost $12,500,109.90. The displayed
inputs multiply to $12,500,109.92. No real record was resaved during investigation.
Display values do not establish hidden input precision; the two-cent mismatch is
consistent with the reported verification error, not proof of an API timeout.

Development form-builder inspection found Land_Cost Max Digits 10, Decimal Points
2. Other header currency fields also have small limits (10 or 12). Capacity loss
is a suspected cause, pending exact native disposable-record readback. Attempts to
change the Development property did not pass persisted verification (reselecting
still showed 10); do not treat the schema as deployed or repaired.

## Prepared changes

- Exact verification remains mandatory. Land Cost errors name the expected and
  saved amounts. The save dialog retains the full error and an enabled Close.
- Currency input strings retain their entered decimals. Computed currency rounds
  to cents. Construction_Cost_Base now uses round2 in buildHeaderData; the paired
  proforma_save assignment uses toDecimal without the old round(0).
- No report, form, field, API or function is added. Save_PF still calls the existing
  proforma_save function; child verification and no-replay protections are intact.

## Creator deployment requirement

Deploy the one Construction_Cost_Base assignment in creator/functions/proforma_save.dg
with widget 1.80.78; frontend-only promotion would cause another exact mismatch
when construction base contains cents. Compare current native function before
patching; do not replace newer native code with an old extracted function.

Proposed schema repair: Add_Pro_Forma currency fields with Max Digits below 14
should be expanded to 14 while retaining Decimal Points 2. Existing 14/16-digit
fields stay as configured. This covers Land_Cost, Land_Sale, Earnest_Money,
Amount_per_Extension, Gross_Sales, MUD_Revenue, Reimbursements, Reimbursed_Fees,
Total_Income, Entitlement_Cost, Entitlement_Engineering_Addl,
Construction_Cost_Base, Construction_Cost_Addl, Total_Expenses, Net_Profit,
Overhead_Total, Engineering_Overhead_Total, Construction_Overhead_Total,
Interest_Total and Profit_Share_Total. These are proposed changes, not verified
live mutations. Audit related installment/item/month currency capacity before
promotion if their precision loss is observed; never replace exact comparison
with a monetary tolerance.

Native gate: use a disposable Development Pro Forma to save 236.44 × 52868,
an Add_l_Cost of 20.25 and a construction unit rate yielding a fractional base;
read exact stored header, child and month values after the engine completes.
Then promote only the verified changes. Review the real record before any further
write; some child changes already committed when header verification failed.

## Regression and rollback

scripts/test-proforma-land-cost-save.mjs runs actual complete widget saves for
Development and Production transport contexts with exact and two-cent-mismatched
readbacks. It checks committed item cents, retained draft/modal, visible error,
one send/no replay, exact-rate payload, construction base cents, and successful
automatic dismissal. Existing financial preservation checks normalize only the
authorized construction-base expression; all other functions remain guarded.
Full repository validation and Pages build passed on October 5, 2026.
Native schema/write validation remains pending; this is not an end-to-end live fix.

Rollback widget mapping to 1.80.77 and restore the single backend round(0)
assignment together. Retain expanded currency capacity; shrinking it can damage
newly saved values. Production mapping is unchanged in this candidate.
