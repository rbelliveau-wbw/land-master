# Forecast matrices

## Layout

Keep each selected builder on one row. Pin its name on the left and group each fiscal year's 12 months and total to the right. The Land Master fiscal year starts in February and ends in January of the following calendar year. Put both calendar dates beneath the WFY heading. Pin column headings and the totals footer within an internally scrolling table; the page itself must fit a mobile viewport.

The October 7 redesign uses **Legal and Pro Forma as the explicit visual references**, replacing the rejected floating KPI-card layout. Reuse their actual tokens and system font, compact white Land Master topbar, navy page title, blue action button, shared navy pill switcher and white report surface. Combine subdivision identity and metrics in one Legal-style info strip: a navy identity block, followed by compact fields with clear scope labels. Use blue Sold, dark-yellow Scheduled and green balance values.

Keep filters compact and searchable, including single-selection subdivision/year creation pickers. Use the shared report search strip, soft-red clear X, checkbox markers only for multi-selection, centered SVG checks, Clear/Select visible/Done controls, selection counts and keyboard navigation. Escape/outside click discard staged changes; Clear immediately resets the filter. Keep menus within the viewport. Use left-aligned WFY chips and calendar dates so year identity stays visible while scrolling. Builder identities have small initials and a pinned name. Keep past values quiet and readable, with the lock reason available to assistive technology and in a tooltip, rather than repeating Locked under every cell. Month inputs must show blank distinctly from zero. Missing combinations occupy the same builder row and offer Add year & months beside the year identity. Follow Legal/Pro Forma navy dialog styling and the existing progress behavior.

The user selected **Compact cards** from the October 7 mockups. Release 1.2.0 puts the complete snapshot above the forecast matrix: navy identity/capacity header, six compact subdivision metrics plus Company/County, and responsive schedule cards. Each card retains progress, current-month meter, paired closing terms and four recent-sales counts in one row. Multi-phase cards preserve their all-phase contract section. Do not achieve density by dropping fields, equating blank with zero, merging repeated schedules or applying matrix filters to the whole-subdivision summary. The native iframe is a fallback for unsupported markup, not the primary summary.

Follow [the summary data audit](../modules/forecast-summary-data.md) for exact math and scope. The familiar schedule-capacity Unforecasted differs from saved inventory-based Subdivision.Unforecasted_Lots. Preserve separate basis labels if both appear. Fiscal-year grouping starts in February; current-month sales still use calendar-month Close Date. Shared closing cadence is never implicitly allocated per phase. Keep summary calculations in Deluge rather than duplicating business math in the browser.

## Editing and results

Save on field change. Tab and Enter advance through editable months. Show a centered SVG green check only after persisted verification, alongside shared [success feedback](success-feedback.md). Retain rejected/unknown entries so users can review them. Check status is read-only and must never replay a write. Subdivision metrics and selected matrix metrics need separate scope labels.

Forecast creation is the user's explicit October 8 exception to [transfer progress](transfer-progress.md): no progress or terminal result modal. Close the top selection chooser on commit; show Creating on the clicked row and a concise inline status. Reveal the forecast only after one parent and exactly twelve correctly linked months are verified. Block duplicate writes while pending. Unknown results remain inline, lock edits/creation/filter changes and offer the existing read-only Check status action; never resend ensure automatically. Known rejection remains visible and never shows Complete.

## Verification

Check one row per builder across multiple years, February/January headings, exact server-defined edit boundaries, retained failed entries, unknown-result reconciliation, centered SVG geometry at actual size, inline creation duplicate locks, Sold/Scheduled read-only state and mobile page width. Use inert fixtures for automated UI tests. Confirm the live development workflow and custom API separately before release.

## October 8 layout update

Forecast Manager 1.3 removes the standalone page heading and Forecast scope strip.
Put every native subdivision fact in the navy subdivision title card. Keep the
forecast-window state beside the filters. Choosing a different subdivision loads
its snapshot automatically; clearing selection hides the workspace. Do not clear
failed or unknown edits during a filter change.

Use the Data Insights all-date lot-status card at the left of the schedule row:
five Total/Sold/Scheduled/Contracted/Open counters, stacked status bar and its
Builder/Total/Sold/Scheduled/Contracted table. Follow the same Close Date, then
Purchase Date, then stored Status precedence; include all subdivision lots. The
builder table excludes Open just like Data Insights. Its count is distinct from
native stored lot totals and forecast inventory balance.

Schedule cards retain the native HTML width and maximum width of 320px; the
schedule row scrolls horizontally within the summary. The lot card is at most
420px wide and stacks above schedules on narrow screens. Keep all native schedule
terms, recent sales and multi-phase contract disclosures.

## Input and creation controls — v1.4

Matrix clicks never rebuild its inputs; only explicit view buttons switch views.
In Sold and Scheduled views render numeric zero as a blank cell, including totals;
keep the actual counts, forecast zeroes and CSV values intact.

Missing cells say **No forecast available.** with **Create Forecast**. Clicking
creates that exact builder/WFY directly, bypassing the selection dialog. The top
**Add Forecast** button opens a compact searchable Builder and WFY chooser. Only
Builder.Type1 == Builder records appear in that creation picker; preserve other
identities in existing matrix/filter data. Both paths retain verified parent plus
12-month progress, duplicate guards and read-only uncertain-result reconciliation.

The selected title treatment uses the light-statistics structure with a navy
identity header, Company/County below the name and six light statistic cells in
three columns. Cap it at 780px, matching the compact-width preview, while schedule
and forecast panels retain their full available width. Preserve all native values.

## Combined overview and reduced glare — v1.5

The user superseded the v1.4 title arrangement: combine its native facts and the
all-date lot-status breakdown in **one 380px maximum left card**, with builder
schedules starting alongside it. Use one subdivision heading, native metadata,
Company/County and territory, followed by the remaining native facts and lot
status counters/bar/builder table. Remove the separate full-width title row.

Display equal native Total/Sold/Scheduled and inventory counters once; if their
values differ, keep the native labels and the explicitly all-date lot-status
section. Equal Residential and LM totals need one visible number. Retain native
label/value metadata for parity and accessibility; a later difference must become
visible automatically. Never change scope, calculation, or group schedules by name.

Use soft slate-blue page/surfaces, slightly deeper card headers and pale blue
matrix rows with navy identity accents. Reduce card/section padding without
shrinking established readable terms or removing contract disclosures. Schedule
cards stay 320px, scrolling internally; mobile stacks the combined card above
schedules. Preserve inline editing, picker and blank-zero behavior.

Version 1.5.1 removes the visible Builder schedules/count heading; retain the
section's accessible name. Schedule and monthly progress tracks must show their
full outlined length and contrasting empty portion, including at 0% fill. Preserve
every native stop position, segment and meter width. Highlight the complete current
calendar-month column in green (header, builder cells, missing-year background and
footer), matching the Creator server date and year. Refresh the highlight in place
on new snapshots. Use one uninterrupted 2px separator below all month headings and
the pinned Builder heading.

- Remove the visible matrix autosave/Editable/Locked/Missing year footer row. Keep
  inline cell feedback and keyboard movement without the extra height.
- Add Forecast and Create Forecast actions use the other modules' shared navy
  (#0b2345) with white text, including the small selection-modal commit action.

Top-level Add Forecast always opens with blank Builder/WFY choices and a disabled
commit. Refresh the full subdivision's existing Builder parents read-only; block
any matching builder/year, including incomplete parents, with a subtle red warning.
Keep commit disabled while the check is pending or unavailable, and ignore late
results after closing. Place subdivision name/code in the compact navy dialog
header; remove the separate route card and fiscal calendar-range caption. Keep
Add Forecast directly after the year filter and set window status to 14px.
