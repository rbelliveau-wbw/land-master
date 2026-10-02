# Budget transfer groups and notes — 1.80.56

The transfer matrix follows Budget Manager: one Item column displays destination `Budget_Item.Item_Name` (display name Item) beside its actual `Cost_Code` pill. Items sort numerically ascending within categories; categories and departments follow their lowest item code. Department and category headings show signed preliminary subtotals. Categories collapse independently without changing totals. The matrix shows one aggregated row per destination item, preventing duplicate totals when several fixed PF costs feed the same Budget item.

The pencil edits the complete destination `Budget_Item.Description` that will be sent. Defaults combine existing Budget notes and applicable PF descriptions. Edits are isolated by phase and destination item ID; blank clears the destination note and Reset note restores the default. PF notes are never written. Changing a phase assignment clears that phase's note drafts so stale destination IDs cannot transfer. Existing quantity edits, phase auto-mapping with ambiguous selectors, searchable alphabetical pickers, pinned footer, and centered SVG X remain.

## Files and contracts

- Widget source: `widget.html`, `budget-transfer-model.js`, `budget-transfer-ui.js`, `budget-transfer.css`; widget configuration/manifest, immutable `releases/proforma-manager/1.80.56/`, Production mapping, fixture/model-parity tests, module/style/handoff documentation.
- Functions: `PF_Budget_Transfer` and `PF_Budget_Transfer_Plan`. Existing Custom APIs `PF_Budget_Transfer` and `PF_Budget_Transfer_DEV` retain `payload:string`. Capability 3 supports optional `noteOverrides:{phase:{destinationItemId:note}}`; clients 2 and 1 retain their capability responses. The server validates canonical phase numbers and membership in recomputed destination writes, includes notes in the preview SHA256 token, and verifies the saved Description. It does not trust client amounts or write targets.
- Read metadata: `Budget_Item.Item_Name`, `Cost_Code`, `Department`, `Category`, `Budget_Category`, `Description`; `Budget_Category.Budget_Category_Name`, `Category_Code`, `Deparment` (actual field spelling). No new fields, forms, workflows, or API registrations.
- Existing transfer writes remain: destination `Add_Budget` metrics/preliminary total, Budget Category quantities/totals, Budget Item pricing/preliminary totals/Description, and `Project.Proforma`. The only new editable persisted value is the destination Description. Source `Proforma_Items.Description` remains unchanged.

## Deployment and verification

Both functions were saved and compiler-checked in Creator Development, then selectively promoted to Stage as **Land Master 9.26**, package **Budget transfer groups and notes 1.80.56**. Exactly two function components were selected; the unrelated Contracts archive schedule stayed unchecked. The user completed Production promotion on 2026-10-02; the Environments page confirms Stage and Production at 9.26. Widget release **1.80.56** is promoted through the existing permanent Production URL, with versioned model/UI/CSS assets.

`npm run validate` and `npm run build:pages` passed. Actual translated Deluge/JavaScript parity covers multiline notes, blank notes, wrong phase/unknown destination rejection, phase isolation, no PF mutation, aggregated destination rows, signed credits, destination labels, numeric codes, and subtotal reconciliation. Existing permissions, locks, empty-Budget checks, approvals, modifications, quantities, allocations and stale-preview guards remain covered.

Browser verification covers collapse/expand, exact multiline synthetic apply once, source notes unchanged, reset/blank/Escape, phase draft persistence, and desktop/390×844/800×400 layouts. No real Budget transfer is performed for testing. The close SVG's rendered center offsets are 0px on both axes. Production assets and Creator preview are checked after deployment.

## Rollback

Map Production back to immutable **1.80.55** and redeploy Pages. Capability 3 functions are compatible with its optional header-only payload. To revert backend behavior too, restore both functions together from commit `f226fbd` and promote them together. Capability 2 endpoints block note-edited sends from the new widget. Never clear real Budget values automatically to undo a transfer.
