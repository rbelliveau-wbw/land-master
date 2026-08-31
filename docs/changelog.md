# Changelog

Newest first. One entry per shipped version. Widget versions are what
`deploy/environments.json` points at; Deluge entries need a Creator publish.

## Proforma Manager 1.64.1

- **The view switcher sits dead centre again.** 1.64.0 gave the name column 1.75fr against
  the rail's 1fr, which pushed the switcher right; moving the owner pills out had already
  freed the room, so the extra weight was over-correcting.
- **Equal columns, capped at zero** (`minmax(0,1fr)`) rather than a bare `1fr` — a bare
  `1fr` has an auto minimum, so a long Pro Forma name would widen its own column and shove
  the switcher off centre again.

## Proforma Manager 1.64.0

- **Send for Approvals is on the Approvals tab.** The `[data-pf-appr-start]` click handler
  already existed but nothing rendered one, so the row menu on the list was the only way to
  start a chain. Same gate and the same why-icon as the menu item, so the two entry points
  cannot disagree.
- **Owner pills moved to the right-hand end of the record bar**, out of the header group
  they were sharing with the Pro Forma name.
- **The name gets the room back.** The bar's first column now outweighs the trailing rail
  (1.75fr to 1fr), so "Spring Creek (Stylecraft Tree Lake) - North Austin" fits instead of
  being clipped while the rail sat empty.

## Proforma Manager 1.63.0

- **All four LOI pickers are searchable** — existing Sellers, existing Properties, and the
  County and City on every Property row. They are `<input list>` over a `<datalist>`: type
  to filter, no popup to position inside a scrolling table, keyboard still works.
- **County and City are alphabetical**, sorted at load rather than by reordering the
  literals so no entry can be dropped in the edit.
- **Typed text is turned back into a real value on commit.** A county is snapped to its
  canonical spelling ("bell" → "Bell"); anything not in the vocabulary is cleared and
  flagged, because both are Creator picklists and free text fails at the save.
- **Duplicate Seller names are disambiguated** with their record id, and a bare ambiguous
  name refuses to resolve rather than picking one at random.
- **The Add button stays off until the text resolves** to an actual record.
- The validator's "City must be a picklist, not a text input" guard is rewritten rather
  than dropped: City and County inputs must be bound to their vocabulary datalist.

## Proforma Manager 1.62.0

- **Fixed: the close X leaked onto every dialog.** `display:grid` on `.cm-x` outranked the
  UA `[hidden]` rule, so 1.61.2 put an X on the discard prompt and every other confirm.
  Third time this stylesheet has done it — `.btn` in 1.58.2, `.cm-body` in 1.60.1.
- **The acreage state moved onto the Total Acres readout.** That number *is* the sum of the
  Property rows, so the field showing it glows green with a ✓ when it agrees with General
  Information, red with the signed difference when it does not, and carries the gap in the
  hint underneath ("1.00 under General Information (193.00)").
- **Removed the separate acreage bar and the grey savebar strip** under the Properties
  table.
- **The discard prompt loses its "UNSAVED CHANGES" kicker** — the title says it already.

## Proforma Manager 1.61.2

- **The blocked-save dialog has no footer buttons** — a single X in the header. It reports
  why a save cannot happen; there is nothing to confirm or cancel, and "Go to <tab>" was a
  second exit dressed as a choice. The tab badges already point at the work.
- **"Nothing has been saved. Fix these and save again." → "Correct the following and try
  again."**
- `uiConfirm` takes `dismissOnly:true` for this shape; every other dialog keeps its footer.

## Proforma Manager 1.61.1

- **Acreage must match exactly — no tolerance.** The 0.01 window is gone; Property acres
  and Total Acres are compared as ten-thousandths, so summing the rows cannot invent a
  difference out of float noise while a real 0.0001 gap still counts.
- **Differences are printed at the precision they occur** — 2dp normally, 4dp when the gap
  is in the last two places, so a 0.0012 mismatch no longer reads "over by 0.00".

## Proforma Manager 1.61.0

- **Property acres must tie out to Total Acres.** Once any Property is on the LOI, their
  acres are summed — saved rows and rows staged for creation alike — and compared to Total
  Acres on General Information. A gap blocks the save and badges the LOI tab.
- **A bar under the Properties table shows the sum in both states**, green when it ties out
  and red with the difference when it does not. A check that only appears when it fails
  reads as a bug rather than a rule.
- **It tracks Total Acres as you type it** on the other tab — the LOI pane is built once by
  `ensureLOIWorksheet`, so the bar is patched in place rather than waiting for a rebuild.
- **Tolerance is 0.01 acres**, and the check waits until Total Acres itself is set so its
  own "Enter Total Acres" error is not doubled up.
- **Fixed alongside:** the LOI subform draft errors replaced the LOI pane's error list
  instead of appending, which would have dropped the acreage line from the blocked-save
  overlay whenever the LOI was dirty.

## Proforma Manager 1.60.2

- **One modal-title scale: 15.5px / 700.** Every modal header sat at 16–18px and weight
  800–900; at that size the weight reads as shouting. Covers the confirm/lock dialog, the
  Submit to Legal run modal, the LOI quick modal, the owner picker, the month overlay and
  the attachments header (which was the heaviest at 900).
- **The lock dialog is wider (440 → 492px)** — a typical "<name> - <date>" title was one
  word short of fitting and wrapped to two lines in the narrowest dialog in the app.

## Create_LOI_Contract — Deluge, needs a Creator publish

- **Acquisition contracts are named `Acquisition - <Pro Forma Name>`**, replacing
  `<Pro Forma Name> - LOI`.
- **Reuse still finds the old ones.** Reuse matches on the contract name alone, so the
  lookup now tries the new name and falls back to the legacy one — without that, the next
  resubmit on any Pro Forma already sent to Legal would insert a duplicate. Existing
  contracts keep their existing name.
- **The reuse trace reports which name matched**, so a duplicate hunt is not blind.

## Proforma Manager 1.60.1

- **Menu item and modal now read "Submit to Legal"**, not "Submit PF to Legal".
- **The lock dialog is title-only** — "Only the LOI tab will remain editable." is gone, and
  `uiConfirm` takes `message:false` and drops the whole body when there is nothing in it,
  so the head sits on the buttons instead of leaving empty padding.

## Proforma Manager 1.60.0

- **Eleven more fields block a save when blank:** Territory, Probability, MUD/PID, Total
  Acres, Land Cost $/Acre, Engineering Cost $/Lot, Const Cost Base $/FF, Total Street LF,
  Engineering Delay, Construction Delay and Initial Takedown. They land in the same
  grouped-by-tab overlay the other required fields use.
- **Zero stays a real answer** for the two delays and Initial Takedown — those reject blank
  and negative, not 0. Total Acres must be positive, because ft/lot and lots/acre divide
  by it.
- **Legacy records feel this:** any older Pro Forma missing one of these has to have it
  filled in before it will save again.
- **Scenario Analysis header modernised.** The "What-if tools" pill is gone; the ↗ text
  arrow is now a stroked sliders glyph, and the loose "Expand" word plus boxed caret are
  one pill with a chevron that rotates on open. Same words, same "N changes" badge.

## Proforma Manager 1.59.1

- **The page variable arrives in `getInitParams()`, not `getQueryParams()`.** 1.59.0 read only
  `getQueryParams()`, which comes back empty for a page-embedded widget, so the link resolved
  nothing. Now reads `getQueryParams` → `getInitParams` → a permissive scan of the widget's
  own href — the order the budget widget already proved for `budgetId`/`modificationId`.
- **The href fallback could never have covered for it:** it required a `?` and read
  `window.location` / `document.referrer`, none of which carry a parent-page hash fragment.
- **Boot logs what each source held** (key names only — `getInitParams` carries the login
  user), so a link that still does not resolve is one audit-log copy from a diagnosis.

## Proforma Manager 1.59.0

- **The approval email's link opens the Pro Forma's dashboard.** `?proformaId=<id>` on the
  page URL was ignored, so an approver landed on the full list and had to find the record
  the email had just told them about.
- **Read from `ZOHO.CREATOR.UTIL.getQueryParams()`**, with the iframe's own query string,
  hash and referrer as backstops — the same resolution Contract Management uses for its
  `contractId` / `loiReviewId` links.
- **An id that does not resolve leaves the list usable** and says so, rather than failing
  into a blank view.
- **Deluge, needs a Creator publish:** `Send_Proforma_Approval_Email_With_Context` in the
  repo built the link against `#Page:Proforma_Manager`; the live email uses
  `#Page:Proforma_Management1`. Resynced — confirm against the published copy.

## Proforma Manager 1.58.2

- **The reasons live on their own hover target.** A small amber "?" sits at the right of
  the greyed Send for Approvals row; hovering it opens a tooltip listing every criterion.
  Hovering an item you cannot use should not be the only way to find out why, and a native
  title cannot render a list.
- Clicking the row still opens the full dialog; the enabled state has no icon.

## Proforma Manager 1.58.1

- **Send for Approvals renders even without the access flag.** 1.58.0 still hid it behind
  `canSendProformaApprovals()`, so the criterion most likely to be unmet was the one that
  kept the item invisible — which is why it never appeared greyed in Dev.
- **The reason names the checkbox:** "Tick Send for Approvals on your User Access record."
  One shared `User_Access.Send_for_Approvals` field covers Budgets and Pro Formas; there is
  no Pro Forma specific flag.

## Proforma Manager 1.58.0

- **A blocked profile no longer wipes the month schedule.** The client-side rebuild deletes
  every phase and month row before writing the new set; a profile without Add rights on
  `Proforma_Phase` / `Proforma_Months` 403s on all ~130 writes, leaving the Pro Forma with
  no schedule at all. It now probes one row on each form first and aborts while the old
  data is still there.
- **One 2899 stops the pool** instead of firing another hundred-odd doomed round trips.
- **"Retry save" is no longer the advice for a 403** — the toast names the permission and
  says the app owner has to re-save.
- **Send for Approvals is always in the menu, greyed with its criteria.** It used to vanish
  once the flow had started, and the LOI checks only ran after the click, so there was no
  way to see what was missing without trying it. Clicking the greyed item lists everything
  outstanding.
- **Lock confirmation reads "Lock all inputs for <name>?"**

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
