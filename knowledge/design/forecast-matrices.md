# Forecast matrices

## Layout

Keep each selected builder on one row. Pin its name on the left and group each fiscal year's 12 months and total to the right. The Land Master fiscal year starts in February and ends in January of the following calendar year. Put both calendar dates beneath the WFY heading. Pin column headings and the totals footer within an internally scrolling table; the page itself must fit a mobile viewport.

The October 7 redesign uses **Legal and Pro Forma as the explicit visual references**, replacing the rejected floating KPI-card layout. Reuse their actual tokens and system font, compact white Land Master topbar, navy page title, blue action button, shared navy pill switcher and white report surface. Combine subdivision identity and metrics in one Legal-style info strip: a navy identity block, followed by compact fields with clear scope labels. Use blue Sold, dark-yellow Scheduled and green balance values.

Keep filters compact and searchable, including single-selection subdivision/year creation pickers. The matrix takes priority; schedule details remain available in a collapsed panel immediately below it. Use left-aligned WFY chips and calendar dates so year identity stays visible while scrolling. Builder identities have small initials and a pinned name. Keep past values quiet and readable, with the lock reason available to assistive technology and in a tooltip, rather than repeating Locked under every cell. Month inputs must show blank distinctly from zero. Missing combinations occupy the same builder row and offer Add year & months beside the year identity. Follow Legal/Pro Forma navy dialog styling and the existing progress behavior.

The later October 7 request supersedes a collapsed-only summary as the intended next design: the team relies on the native subdivision facts, every builder schedule's capacity/progress, current-month meter, full closing terms and four recent-sales periods. Keep a compact visible overview close to the matrix; compare shared-label closing tables, compressed familiar cards and a selected-schedule context rail before choosing the final layout. Do not achieve density by dropping fields, equating blank with zero, merging repeated schedules or applying matrix filters to the whole-subdivision summary. Every schedule and any all-phase contract section must remain discoverable. The current 1.1.0 candidate still uses the collapsed native iframe; the layout options are mockups, not a deployed replacement.

Follow [the summary data audit](../modules/forecast-summary-data.md) for exact math and scope. The familiar schedule-capacity Unforecasted differs from saved inventory-based Subdivision.Unforecasted_Lots. Preserve separate basis labels if both appear. Fiscal-year grouping starts in February; current-month sales still use calendar-month Close Date. Shared closing cadence is never implicitly allocated per phase. Keep summary calculations in Deluge rather than duplicating business math in the browser.

## Editing and results

Save on field change. Tab and Enter advance through editable months. Show a centered SVG green check only after persisted verification, alongside shared [success feedback](success-feedback.md). Retain rejected/unknown entries so users can review them. Check status is read-only and must never replay a write. Subdivision metrics and selected matrix metrics need separate scope labels.

Creation writes one parent and 12 children, so use [transfer progress](transfer-progress.md): mounted dialog, inert background, focus trap, Close/Escape locked while active, truthful confirmed counts and all 12 verified destinations. Known rejection must not show Complete. Unknown results expose only a read-only recheck and remain visible until dismissed.

## Verification

Check one row per builder across multiple years, February/January headings, exact server-defined edit boundaries, retained failed entries, unknown-result reconciliation, centered SVG geometry at actual size, creation close locks, Sold/Scheduled read-only state and mobile page width. Use inert fixtures for automated UI tests. Confirm the live development workflow and custom API separately before release.
