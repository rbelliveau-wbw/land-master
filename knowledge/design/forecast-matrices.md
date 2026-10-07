# Forecast matrices

## Layout

Keep each selected builder on one row. Pin its name on the left and group each fiscal year's 12 months and total to the right. The Land Master fiscal year starts in February and ends in January of the following calendar year. Put both calendar dates beneath the WFY heading. Pin column headings and the totals footer within an internally scrolling table; the page itself must fit a mobile viewport.

Use the existing pale blue surface, navy text and green title. Keep filters compact and searchable, including single-selection subdivision/year creation pickers. Use the shared segmented treatment for Forecast, Sold and Scheduled. Locked months have a muted surface and a tooltip with the reason. Month inputs must show blank distinctly from zero. Missing builder/year combinations occupy the same builder row and offer Add year & months.

## Editing and results

Save on field change. Tab and Enter advance through editable months. Show a centered SVG green check only after persisted verification, alongside shared [success feedback](success-feedback.md). Retain rejected/unknown entries so users can review them. Check status is read-only and must never replay a write. Subdivision metrics and selected matrix metrics need separate scope labels.

Creation writes one parent and 12 children, so use [transfer progress](transfer-progress.md): mounted dialog, inert background, focus trap, Close/Escape locked while active, truthful confirmed counts and all 12 verified destinations. Known rejection must not show Complete. Unknown results expose only a read-only recheck and remain visible until dismissed.

## Verification

Check one row per builder across multiple years, February/January headings, exact server-defined edit boundaries, retained failed entries, unknown-result reconciliation, centered SVG geometry at actual size, creation close locks, Sold/Scheduled read-only state and mobile page width. Use inert fixtures for automated UI tests. Confirm the live development workflow and custom API separately before release.
