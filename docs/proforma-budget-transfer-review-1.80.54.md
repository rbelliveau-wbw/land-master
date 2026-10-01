# Budget transfer review — 1.80.54

The transfer modal sorts Budget Item cost codes ascending, automatically maps unique saved subdivision Phase numbers, and shows a subdivision picker when the mapping is missing or ambiguous. The phase tabs remain. Project/Subdivision alphabetical filtering and separated search/results spacing from 1.80.53 remain in place. Production follow-up **1.80.55** versions the three transfer asset URLs after the live browser check detected cached 1.80.53 scripts/CSS surviving a normal reload.

Lots, Acres, Equiv. LF, Lot Price, and Land Cost are editable values for the destination Budget. Edits stay isolated by phase and survive switching tabs. Reset values restores that phase's defaults. Lots must be nonnegative whole numbers; other values permit two decimal places, matching destination field precision. Invalid values block send. Inputs preserve decimals and show grouping/currency formatting on blur.

Changing destination quantities recalculates Lot/Acre/LF-priced lines. Fixed source allocations and engineering/construction base costs still use saved PF values. The PF and its saved phase records are not edited by this modal. The server validates the five-field allowlist, includes edits in its preview token, recomputes costs from saved records, and verifies the written headers and line totals. Permission, empty-Budget, lock, approval, and modification checks remain enforced.

The redesign adds destination identity, outlined editable metric cards, cost-code badges, quieter notes, credit styling, and phase totals. One body scroller and a pinned footer keep the modal usable at short heights; narrow layouts stack metrics and scroll the matrix horizontally. The 36px close button uses a centered 16px SVG with zero padding. Rendered icon-center offsets measured 0px horizontally and vertically.

## Files and dependencies

- Widget source: `widget.html`, `budget-transfer-ui.js`, `budget-transfer-model.js`, `budget-transfer.css`; configuration/manifest and immutable release `releases/proforma-manager/1.80.54/`; Production mapping.
- Creator functions: `PF_Budget_Transfer_Plan` and `PF_Budget_Transfer`. Existing Custom APIs `PF_Budget_Transfer` and `PF_Budget_Transfer_DEV` keep their bindings and parameter shape (`payload:string`). New payload field: `headerOverrides`. Capability version 2 is requested with `budgetTransferClientVersion:2`; legacy clients receive version 1.
- Written existing fields: `Add_Budget.Lot_Total_Residential`, `Acres`, `Equiv_LF_of_Street`, `Lot_Price`, `Land_Cost`, `Prelim_Budget_Grand_Total`; matching Budget Category quantities/totals, Budget Item rates/preliminary costs/notes, and `Project.Proforma`, as in the existing transfer. No new forms, fields, workflows, or API registration required.
- Verification: allocation/parity regression script, synthetic full-widget fixture, responsive fixture server, module/style/handoff docs.

## Deployment

Both functions were saved and compiler-checked in Creator Development, then selectively published through Stage to Production as Land Master **9.25**, package **Budget transfer review 1.80.54**, on 2026-10-01. The selected package contained exactly two components; the unrelated Contracts archive schedule remained unchecked. The environment page confirmed Stage and Production at 9.25. No API registration change was required. Widget Production uses immutable **1.80.55** at its existing permanent URL; 1.80.54 remains immutable.

## Regression and rollback

`npm run validate` and `npm run build:pages` passed, including after integrating newer Contracts releases on main. Model/actual translated Creator planner parity covers all five edits, phase isolation, Lot/Acre/LF recalculation, unchanged base costs/source records, fractional Lots, negative/blank/nonfinite values, excessive precision, unknown fields/phases, and existing transfer constraints.

Full-widget browser checks cover ascending codes, hidden unique mapping, ambiguous/manual mapping, edit persistence, input formatting and precision, invalid Lots blocking send, legacy endpoints blocking edited sends, and one synthetic apply carrying exact edited values. Verify desktop, 390×844 and 800×400 layouts, readable matrices and visible footer, and centered close icon. No real Budget transfer is used for testing.

Rollback: map Production to immutable `1.80.53` and redeploy Pages. The new functions remain compatible with old widgets through capability negotiation and optional overrides. If reverting the functions too, restore both together from commit `3abbe4b`; new widget edited sending remains blocked against version 1. Never clear real Budget values automatically to undo a transfer.
