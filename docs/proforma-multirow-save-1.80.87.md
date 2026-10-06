# Pro Forma multirow save repair — 1.80.87 candidate

## Failure and correction

Saving a duplicate with two new lot-pricing rows starts concurrent native creates
against `Lot_Mix_Row`. The transport previously keyed both creates by the form,
so its duplicate-operation guard rejected the second intended row while the
first was pending. The parent and first child could already exist.

Each captured pricing row now supplies a workflow-scoped intent key. Distinct
rows can create concurrently, including rows with identical values. Repeating
the same pending intent remains blocked. Standalone creates retain the form
guard; updates retain the exact record ID guard. Native exact-ID verification,
the concurrency limit, retained drafts and read-only recovery remain required.

## Separate phase-flags incident

The supplied original Taylor Farms screenshot failed at phase flag readback,
before lot pricing. It is a separate failure. An administrator's native report
currently shows schedule version `2` and same-for-all `false`; the user identified
Travis Moltz and believed same-for-all was off. The live user administration
screen assigns Travis the `Dev/Land Acq - Proforma & Budgets` profile. Both flag
visibility checkboxes are off in that profile's Development configuration.
This is a plausible cause, but does not establish the values returned in
Travis's failed Production request. The user subsequently authorized the two
phase flag permission changes in both Dev/Land Acq and CFO. They were saved in
Development and verified by reopening each profile: both flags have Visibility
and Read Only enabled. CFO already had Visibility enabled. The user will publish
the Creator changes; Production retesting is still outstanding.

The additional read-only audit found Dev/Land Acq hides `Status`,
`Acquisition_Email`, and the five AI review result fields. Status is used by the
widget's lifecycle display and native status-update readback; Acquisition Email
is used by its LOI inputs. Both profiles lack Proforma AI Review report access,
which prevents native review-history reads. These are separate functional gaps,
not proven causes of the phase-flags failure, and were left unchanged. Core
phase/month, item, installment, curve and pricing reports have View/Edit access.

Phase verification now accepts equivalent numeric version `2.00` and explicit
boolean strings regardless of case. Missing, null, blank and invalid checkbox
values cannot masquerade as false. Errors identify unreadable fields or the
expected and saved flag values. Exact parent IDs remain mandatory. A missing
field remains a failed verification, retaining the draft and blocking replay.
Travis's native readback is still needed to establish and resolve the incident;
this release is not claimed to fix a report permission problem.

## Native verification

The user-requested duplicate initially had 1,058 pricing-row lots and only 958
phase lots. At the user's direction, 20 were added to each of its five phases:
193, 212, 212, 212 and 229. The missing 100-lot, 40-foot, $1,200/LF row was added
through Creator's native form to the already-created duplicate. A fresh widget
session then saved successfully and verified both pricing rows, phase inputs,
server-generated months and resulting calculations. The original was not edited.
This verifies live recovery on the existing production widget; the code repair
was reproduced and verified separately through the actual widget's SDK fixture.

## Scope, regression and rollback

Frontend only. Forms read/written: `Add_Pro_Forma` and `Lot_Mix_Row`, with their
existing reports. Lot fields: `Pro_Forma`, `Lot_Count`, `Lot_Size_Ft`, `Price_LF`.
Phase header reads: `Lot_Sales_Schedule_Version`, `Same_Lot_Sales_All_Phases`.
No Creator functions, fields or Custom API contracts change; no Creator
deployment is required for this frontend candidate. The separately authorized
native permission edits require Creator publishing before live users receive
them. Existing Save_PF and phase save operations are unchanged.

Regression: Dev/Prod duplicate creates with distinct and identical pricing rows,
same-intent duplicate guard, double Save, exact parent/price/field verification,
both checkbox states, numeric/boolean response representations, missing and
wrong flags, retained draft and recovery without write replay. Required checks:
`npm run validate` and `npm run build:pages` both passed.

Production remains on 1.80.86 until explicitly authorized. Widget rollback:
promote 1.80.86 through `deploy/environments.json`; persisted recovered records
need no rollback or migration.
