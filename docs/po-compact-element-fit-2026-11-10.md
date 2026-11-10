# Compact PO Elements and Fitted Ledger

Budget Manager `122.29.124` makes the PO line editor fit its desktop card without
horizontal scrolling. Development and Production promote the immutable release;
Stage and permanent Creator widget URLs remain unchanged. Preserve the Summary
readability improvements from `122.29.123` and live reallocation behavior.

## Behavior and Changed Files

- `widgets/budget-manager/src/app/po-ui.js`: reuse the existing picker. Its closed
  Cost Element display shows only the canonical string ID 1–5. The existing
  expanded 210px picker still shows `(1) Labor` through `(5) Other`. Add full-label
  tooltips to selected pickers, preserving full codes and names when space is
  tight. Blank elements remain blank (a dash), with the existing selection gate.
- `widgets/budget-manager/src/app/purchase-orders.css`: replace the active fixed
  1040px ledger minimum with a flexible shared header/row grid, a 38px element
  field, narrower Cost Code allocation and a fixed accessible row-action area.
  All nine cells fit; the overflow guard does not conceal Total or actions. At
  desktop widths up to 1500px with Reallocation visible, move the PO above Summary
  and Reallocation using the existing stacked layout. Retain vertical scrolling,
  keyboard focus, field-exit number handling and the centered row icons.
- `scripts/fixtures/purchase-orders.html`: add an isolated three-line desktop
  example using the reported quantities/prices and $192,181 total, without native
  writes. Preserve the existing fixture cases.
- Design/module notes, source version/hash, widget manifest, immutable release
  and Development/Production mappings accompany the change.

Forms/fields: display only for existing PO line Cost Element and Cost Code. No
schema, field, permission or persisted-value changes. Stored element IDs and
Creator record IDs remain strings. Clipboard, paste, calculations, totals, native
Get/Save/Submit, approvals, attachments, reallocation and exported labels retain
their current contracts. Functions/Custom APIs changed: **None**. Creator
deployment required: **No**.

## Verification

Run existing Purchase Order regressions, `npm run validate`,
`npm run build:pages` and the focused design documentation check.

Agent-owned desktop browser checks cover Row and Spreadsheet mode with three
saved lines. At widths 1024, 1280, 1440, 1500, 1536, 1742 and 1920, ledger
`scrollWidth` equals `clientWidth`, every row cell has positive width and stays
inside the ledger, and the PO body has no horizontal overflow. At 1742px the
ledger is 804px wide and all totals and duplicate/remove actions remain visible.

Open ELEM to verify all five numbered names, choose Equipment and confirm the
closed field shows 3 with its full tooltip, then use Enter/ArrowDown/Enter to
restore Subcontractor as 4. Spreadsheet mode retains its 24 data cells across
the three rows. No financial Save/Submit or native record writes are performed.
The latest upstream Summary-only container rule was preserved during integration;
it does not alter ledger geometry.

After GitHub checks and Pages deployment succeed, compare the stable Production
bootstrap, widget, picker and stylesheet to the built artifacts.

## Rollback

Restore Production's Budget Manager mapping to `122.29.123` and rebuild Pages.
Retain immutable `122.29.124` and the latest Development mapping. No Creator or
data rollback is required. Rollback restores the wider ELEM display and the
previous horizontal ledger scrolling behavior.
