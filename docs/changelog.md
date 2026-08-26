# Changelog

Newest first. One entry per shipped version. Widget versions are what
`deploy/environments.json` points at; Deluge entries need a Creator publish.

## Create_LOI_Contract — Deluge, published 2026-08-26

- **LOI contracts arrive with the Acquisition checklist.** The function inserts the
  Contract directly, so the form's `Load_Contract_Action_Template` workflow — declared
  `on load` — never ran and the checklist was always empty.
- **That workflow was wrong anyway.** It reads `Builder_Contract_Action_Template`, so it
  would have seeded the Builder list regardless of contract type.
- **Template rows now need all three:** `Template_Action = true`, a `Type_field`, and no
  `Contract`. Without the flag, an action row orphaned by a deleted contract would be
  seeded onto every future LOI.
- **Reuse is not re-seeded.** Resubmitting an LOI leaves an existing checklist alone.
- **An empty result says why** — reports how many rows are typed but unflagged.

## Proforma Manager 1.56.0

- **Blocked saves list every missing field** in the in-app overlay, grouped by tab, with a
  button to the first one. Replaced a toast that showed one error and hid the rest behind
  tab markers.

## Proforma Manager 1.55.1 / 1.55.2

- **Engineering Length is required, minimum 1.** Blank sent a null that killed the Creator
  On Success script mid-run, leaving months unwritten. Zero is refused too: the calc
  guards its engineering spreads with `engLen > 0`, so at zero the spend never lands in
  any month while the totals still count it, and IRR/XIRR/peak cash read optimistic.
- **Field controls align** regardless of whether the label wraps or the hint runs long.

## Proforma Manager 1.55.0

- **OG column cannot be overwritten.** Replaced the re-pinnable baseline, so Revert always
  lands on the saved plan and Δ always measures against it.
- **Up to four numbered pinned scenarios**, side by side, removable, surviving Revert.
- **Refresh** re-reads the record in place.
- **ROI target defaults to 100%**, not the 25% inherited from IRR.

## Proforma Manager 1.54.0 / 1.54.1

- **Headroom takes a metric** — ROI, IRR or XIRR — each with its own target. At a 25%
  target the max land price is $202,100/acre on ROI and $119,200/acre on IRR.
- **The three bounds are substitutes, not three cushions.** Each solves with the other two
  held at plan; the card now says so.
- **Bounds are clickable** and rounded in the safe direction — maxima down, minima up.
- **Targets go to 1000%.** A 100 cap silently rewrote legitimate ROI hurdles.

## Proforma Manager 1.53.0 / 1.53.1

- **Revert all now reverts.** Land $/Acre rescales the purchase installments in place, and
  those drive the land cash timing — so IRR, XIRR and peak cash stayed on the scenario
  while the UI reported no changes.
- **Sensitivity stopped ranking an impossible model first.** Month drivers were tested at
  `v-1` with no floor, so Eng Length was measured 1 → 0 and ranked above Sale $/FF.
- **Drivers sitting at zero are tested**, not skipped.
- **An unsolvable IRR no longer counts as 0%** and invents a full-size swing.
- **Steppers stopped swallowing clicks** — five rapid clicks landed one, because every step
  rebuilt the whole dashboard.

## Proforma Manager 1.51.0 – 1.52.0

- **Main menu and editor moved onto the Contract Management design language.** Both widgets
  already shared a token block; the drift was all in the rules above it.
- **Territory and Stage are multi-select**, and the filter group sits left instead of being
  pushed right.
- **Income and Expenses dropped from General Information** — sixteen tiles duplicating the
  live sidebar, which stays on screen while the pane scrolls.
- **Sidebar 15% larger.** Net Profit had never actually rendered at its intended size:
  `setLv()` overwrote `className` and wiped `sh-big`.
