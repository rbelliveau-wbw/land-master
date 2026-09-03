# Changelog

Newest first. One entry per shipped version. Widget versions are what
`deploy/environments.json` points at; Deluge entries need a Creator publish.

## Proforma Manager 1.73.0

- **"Download PDF" is now "Export"**, and it opens a chooser: the PDF (unchanged — the
  server-built approval packet) or a real Excel workbook.
- **The workbook is a genuine `.xlsx`**, not a spreadsheet-shaped PDF: eight sheets, with
  numbers stored as numbers so they can be summed and charted.
  - **Inputs** — every editable field grouped by editor tab (General, Site, Project
    Schedule, Land Purchase/Sale, Overheads, LOI when filled), plus the computed income,
    expense, Net Profit, ROI, IRR and XIRR lines.
  - **Lot Mix**, **Purchase Installments**, **Sale Installments**, **PID-MUD**,
    **Construction Curve** — one sheet each, omitted when the Pro Forma has no rows.
  - **Additional Items** — only rows carrying a cost, since the editor keeps blank
    scaffold rows that would just pad the sheet.
  - **Phases** and **Months** — the Months & Phases tab output in full.
- **Nothing new server-side.** The workbook is assembled in the browser from the header
  record, `loadDetail`'s children and `computeProforma`'s output, so it needs no Custom API
  and no Deluge function and works in every environment. SheetJS loads as an ES module from
  `cdn.jsdelivr.net`, already whitelisted in the plugin manifest and already used for
  `pdf.mjs`, and is cached after the first export.
- If the engine cannot run, the inputs still export and the phase and month sheets are
  skipped with a WARN rather than failing the whole workbook.
- Rollback: `releases/proforma-manager/1.72.2`.

## Proforma Manager 1.72.2

- **AI Review can stamp the date again.** `aiCreatorDateTime` built the value in the shape
  Creator reports *read back* (`dd-MMM-yyyy HH:mm:ss`), which an update rejects with code
  3002 "Enter a valid date format for AI Reviewed On" — production hit this on every run.
  The app is declared `date format = "MM/dd/yyyy"` with `time format = "12-hr"`, so a write
  must be `MM/dd/yyyy hh:mm:ss AM/PM`; the same payload's `AI_Review_Criteria_Version`
  (`09/03/2026 09:05:43 AM`) was accepted, which confirmed the shape.
- The retry-without-the-date fallback stays as insurance, and `aiParseWhen` already read
  both shapes, so history and display were never affected. No Deluge change needed.
- **Read format is not write format in Creator** — the misleading comment on that helper is
  corrected in place so this does not get reintroduced.
- Rollback: `releases/proforma-manager/1.72.1`.

## Proforma Manager 1.72.1

- **AI Review copy no longer names the founder.** The running state reads "Reviewing this
  Pro Forma…", the empty state "Run one to check the saved numbers.", and the row-menu
  tooltip "AI review of this Pro Forma". Behaviour unchanged.
- Rollback: `releases/proforma-manager/1.72.0`.

## Proforma Manager 1.72.0

- **Pro Forma links you can paste.** Opening a Pro Forma (View, Edit, Approvals or
  Attachments) writes it into the Creator page URL as
  `#Page:Proforma_Management1?proformaId=<id>`, so the address bar can be copied and sent
  to a colleague; the pasted link lands on the Dashboard through the same path the approval
  emails already use. Back to the list clears it. Only the id goes into the URL, so
  switching segments on an open record never navigates.
- Guards: unsaved edits block the URL update (Creator may treat the navigation as a page
  reload), the URL is never re-sent when it already matches, and unsaved new records get no
  address. A `view=edit|approvals|attachments` parameter is honoured on the way in if it is
  ever declared on the page; nothing writes it today.
- In the local harness the widget rewrites its own URL instead, so the flow can be tested
  outside Creator.
- Rollback: `releases/proforma-manager/1.71.3`.

## Proforma Manager 1.71.3

- **"Estimated Purchase Date" is now "Project Start"** everywhere the widget labels it: the
  Project Schedule tab (and its Engineering Delay hint), the dashboard header, the
  assumptions strip, the list column and the save validation. The Creator field is still
  `Estimated_Purchase_Date`.
- **Dashboard gains a "Land Purchase" row directly under Project Start.** It reads the first
  purchase installment's month and appends "(1 of N)" when the land closes in more than one
  takedown — "Feb, 2027 (1 of 2)". Rows without a date fall back to Project Start plus the
  installment's month offset; no installments falls back to Project Start.
- **AI Review is invisible without the User Access grant.** The row-menu item, the verdict
  chip under the Pro Forma name and the Dashboard / Edit rail button now render only when
  `perms().aiReview` is true, and the modal refuses to open without it; previously history
  was viewable by anyone and only Run was gated. The rail button is re-evaluated whenever
  permissions resolve.
- `PF_AI_Review` repo copy: the function now asks `getUserAccess` for the caller's
  `pfAiReview` and refuses without it, so a direct call to the all-users Custom API cannot
  bypass the widget gate. Apply the same edit in Development (the Creator session had
  expired when this shipped).
- Rollback: `releases/proforma-manager/1.71.2`.

## Proforma Manager 1.70.0

- **VP Compensation is fully gated by the User Access grant.** Without `VP_Compensation_Tab`
  the tab is now actually hidden (its `hidden` flag was being overridden by the tab CSS, so it
  still rendered; the Construction Curve tab had the same latent gap) and the Edit view's
  live totals sidebar no longer lists G&A Overhead, Eng Overhead, Const Overhead, Interest or
  Profit Share. Total Expenses and Net Profit are unchanged. Nowhere else in the widget
  showed those five figures.
- Rollback: `releases/proforma-manager/1.69.2`.

## Proforma Manager 1.69.2

- **An unpublished AI Review backend no longer pages anyone.** In production the history
  report `All_Proforma_AI_Reviews` does not exist yet, so opening the modal made the shared
  report reader log an ERROR (and send the automatic error email) even though the modal had
  already degraded correctly to "Review history is unavailable here". `sdkGetAll` now takes
  `{optional:true}`: a missing optional report logs at WARN and the rejection carries
  `notFound`, which the modal remembers for the session so it stops firing four 404s per
  open (Refresh still retries).
- **A missing `Review_PF` custom API reads as "not published in this environment yet"**, logs
  at WARN, and greys the Run button with that reason for the rest of the session. Real
  failures still log at ERROR.
- **The row menu chip and the View / Edit buttons now share one centre line.** The chip was
  vertically aligned middle while the buttons aligned to the text baseline, which left the
  chip about 2px lower than its neighbours.
- Rollback: `releases/proforma-manager/1.69.1`.

## Proforma Manager 1.69.1

- **Rows with an AI verdict chip are the same height as rows without one.** The chip under
  the Pro Forma name sat taller than its text line, so those rows grew about 3px and their
  ⋮ / View / Edit buttons dropped out of line with the rows above and below. The chip now
  fits inside the line.
- Rollback: `releases/proforma-manager/1.69.0`.

## Proforma Manager 1.69.0

- **AI Review modal.** `⋮` → **AI Review** on a Pro Forma row, the verdict chip under its name, or the
  new rail button on the Dashboard / Edit views opens a modal for that Pro Forma: its
  current deal numbers, the history of `Proforma_AI_Review` runs (newest first; click one
  to read it), and the selected run's verdict, score, summary, meets, misses and questions.
  When a run is selected the numbers table shows the snapshot it judged beside today's
  values and counts what changed since.
- **Run AI Review** calls Custom API `Review_PF` (`Review_PF_DEV` in Development through
  the standard routing) with `{proformaId, reviewedBy}`, prepends the result to the history
  and stamps `AI_Review_Verdict / Score / Summary / Reviewed_On / Criteria_Version` on the
  Pro Forma through the REST update, since production can drop the function's fetch-assign.
  The button is greyed with a why-icon (same gate style as Send for Approvals) until the
  user has `AI_Review` on User Access, the record is saved, unarchived and has no unsaved
  edits.
- Viewing history needs no grant. A missing history report reads as an empty history, not
  an error, so production is inert until the Creator side is published there.
- Rollback: `releases/proforma-manager/1.68.2`.

## getUserAccess — Deluge, repo copy updated (apply the same edit in Development)

- Reads the new `User_Access.AI_Review` checkbox and returns it as `pfAiReview`, which the
  Pro Forma widget maps to `perms().aiReview`. Three lines: initialise `pfAiReview = false`,
  set `pfAiReview = row.AI_Review == true` inside the row loop, and
  `result.put("pfAiReview",pfAiReview)`.

## PF_AI_Review — Deluge, published in Development (repo mirror synced)

- **The Pro Forma AI review function is fully written in Creator.** It builds a compact
  deal summary (headline numbers with pre-computed ratios, plus the `Lot_Mix_Row`
  children), sends it with the founder criteria from Settings to OpenAI through the
  `openai` Connection, and normalises the strict-JSON reply into verdict / score /
  summary / meets / misses / questions.
- **Every run is kept as a `Proforma_AI_Review` row** carrying the exact Deal_Snapshot it
  was judged on, and the latest verdict is stamped onto the Pro Forma's `AI_Review_*`
  fields. Production can drop fetch-assign writes, so the widget must re-write those five
  fields through the REST update after a successful response.
- `dryRun: true` returns the exact request body without calling the model. Only the
  `openai` provider is wired; any other provider fails closed.
- The repo copy `creator/functions/PF_AI_Review.dg` was a stub and now mirrors the live
  Development source. Still to do: the `Review_PF` Custom API and its Development twin,
  the `AI_Review` grant in `getUserAccess`, the Proforma Manager action and result
  panel, and the PF Review group in Settings Manager.

## Send_Proforma_Approval_Email_With_Context — Deluge, published in Development (updated)

- **The email buttons are a fixed 120×42** — real padding stacked on `mso-padding-alt`
  ballooned them, so sizing now comes from td width/height attributes (the only sizing
  Outlook's Word engine honours) with line-height centering, 14px gaps between buttons
  and 26px above / 14px below the row.

## Send_Proforma_Approval_Email_With_Context — Deluge, published in Development

- **A View button joins Approve and Deny** in the approval email, opening the same page
  as the "Open the full Pro Forma" footer link.
- **Buttons render properly in Outlook:** padding moved from the anchor to the TD (with
  `mso-padding-alt`) — Outlook ignores anchor padding, which is why they collapsed to
  text-tight blocks.
- Production gets it with the Dev → Prod environment deploy.

## Proforma Manager 1.68.2

- **A missing TerraVault URL blocks Send for Approvals.** It joins the per-Property
  readiness list, so the greyed button's tooltip, the why-icon and the click dialog all
  name the row ("Eight Twenty Eight Test needs TerraVault URL").
- **`Start_Proforma_Approval_Chain` enforces the same check server-side** — published in
  Development; Production gets it with the environment deploy.

## Proforma Manager 1.68.1

- **The combo popup sizes to its longest label** (up to 560px, clamped on-screen) instead
  of locking to the input's width — company names were ellipsising at exactly the point
  the series numbers stop looking identical.

## Proforma Manager 1.68.0

- **Purchasing Company is a searchable combo** — the 200-option native select joins the
  styled popup the other four pickers use. Junk text reverts to the committed company
  instead of silently unlinking it; clearing the text clears the selection.
- **The Create Purchasing Company modal is quieter:** the subtitle and the "Pick an
  entity…" placeholder strip are gone. That line now lives as a tooltip on the gated
  Create & Add button (not `[disabled]` — a disabled button swallows its tooltip), and
  the derived-name strip only renders once the name exists.

## Proforma Manager 1.67.0

- **TerraVault URL on every LOI Property row**, saved and staged, between Acres and
  Seller. Mandatory once the LOI is under way — blank rows flag red, join the needs-data
  list, and block the save ("Tract A needs a TerraVault URL").
- **`proforma_save` published in Development** with the field: written on new-Property
  inserts, and on edits only when non-blank — a widget whose `All_Property` read omitted
  the field would otherwise send "" and wipe a stored URL. If saved rows show blank for
  properties that have URLs, add `TerraVault_URL` to the `All_Property` report.
- **Create Purchasing Company is entity-driven.** A dropdown with the two WBW series
  entities plus a 4-digit Facility ID replaces free-text Company Name (and Account
  Number is gone from the modal). The XXX in the series is the last 3 digits of the
  Facility ID, and the full derived name renders in the modal the moment both are in —
  "WBW Single Development Group, LLC-Series 417".
- Facility ID is forced to digits, forced to 4; Create & Add stays disabled until valid.
- **Production Creator still needs the Dev → Prod environment deploy** (field +
  `proforma_save` + `getUserAccess`).

## Proforma Manager 1.66.0

- **Native `<datalist>` dropdowns are gone — and banned.** The browser popup is an
  unstyled OS overlay that clips inside the scrolling table and shows bare values. All
  four LOI pickers (Sellers, Properties, County, City) now share one styled floating
  popup: filter as you type, full list on open, Arrow/Enter/Escape keyboard nav, click to
  pick. The validator hard-fails on `<datalist id=` from now on.
- **Owner Edit & Send Approvals now also configures the route** on Pro Formas you own —
  approver names, emails, order, add/remove. Edit All Pro Forma Approvals is unchanged as
  the admin route. The two config Custom APIs enforce nothing server-side, so the widget
  gate is the gate.
- **The read-only Approvals subtitle tells the truth** — it claimed "approvals are active"
  even on a Not Sent route; it now names the permission that would unlock editing.
- **Creator:** `getUserAccess` is published in Development with the
  `Owner_Edit_Send_Approvals` flag (the checkbox now exists on `User_Access`). Production
  still needs the Dev → Prod environment deploy.

## Proforma Manager 1.65.0

- **New targeted permission: Owner Edit & Send Approvals.** A Pro Forma owner with it can
  edit that Pro Forma and send it for approvals, on records they own only. Edit All
  Proformas is untouched and still the full admin mode.
- **Send access is per-record now.** `canSendProformaApprovalsFor(rec)` decides; the old
  no-argument form stays as the "can send something" visibility gate.
- **Buyer Broker and Seller Broker are on the LOI tab**, defaulting to "None". They were
  already read from and written to `LOI_Worksheet` — only the fields were missing.
- **Both are required once the LOI is under way** and block the save if cleared, with the
  message pointing at "None" as the answer when there is no broker on that side.
- **NEEDS CREATOR WORK:** add the `Owner_Edit_Send_Approvals` checkbox to `User_Access` and
  publish `getUserAccess`. Until then the flag reads false and nothing changes.

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
