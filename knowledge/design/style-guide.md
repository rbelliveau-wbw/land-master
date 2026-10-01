# Land Master style guide

This guide captures reusable visual preferences established in production work.

## Record dropdowns

Use the same custom searchable picker for widget record dropdowns as for filters. Single-value fields stay single-select; collections such as Project Properties use multi-select with a selection count, Clear, Select visible, and Done. Keep the selection staged until the record Save action. Put Territory on the Project widget editor and inherit it into new phases; omit the separate phase Territory input. Avoid redundant `Record fields` headings above editor labels. These preferences apply to the widgets, not native Creator form workflows.

## Approval progress

Before adding or revising an approval action in any module, read
[`approval-progress.md`](approval-progress.md). It defines the preferred in-widget
modal appearance, paced phases, accessible controls, and the targeted
verification and recovery behavior that must accompany the visual treatment.

Across Budget, Budget Modification, Pro Forma, and Contract approval actions,
show Reject with a `#b91c1c` outline and label on a pale red `#fef2f2` surface
at rest. Hover darkens the outline and label to `#991b1b` and the surface to
`#fee2e2`. Use the same treatment for an approval rejection confirmation.
Keep unrelated destructive actions on their existing styles.

## Compact icon buttons

Use this pattern for small attachment, comment, and similar record actions across Land Master widgets.

## Visual treatment

- Use a pale-blue surface: `#f4f8ff`.
- Use blue icon and border tones: icon `#285b97`, border `#cbd9eb`.
- Keep the control square with a rounded corner; use the same size for sibling actions in a row.
- Put the numeric count in a circular badge at the lower-right edge of the control.
- Use the paperclip icon for attachments and the speech-bubble icon for comments.
- A recent-comment indicator may add its teal state and orange dot; attachments show their count without a glow.

## Interaction

- Hover changes border, surface, color, and shadow only. Do not translate, scale, or otherwise move the button on hover.
- Use a smooth `180ms ease` transition for background, border color, shadow, and color.
- Hover surface remains `#f4f8ff`, with border `#82a9d8` and a restrained `0 4px 10px rgba(21,61,108,.14)` shadow.
- Retain the visible keyboard focus outline.

## Sizing

- Compact row actions: `28.75px` button with a `16.1px` icon.
- Larger editor actions may scale intentionally when needed, while keeping the same surface, border, badge placement, and hover treatment.
- Reserve enough row width for every control and its count badge. Do not clip badges with `overflow:hidden`.

The shared base implementation is `widgets/proforma-manager/src/app/comments.css`. Local module overrides should only change intentional size or layout differences and must preserve this visual and interaction treatment.

## Centering small symbols

Use SVGs with a centered `viewBox` for small plus signs, chevrons, close icons, and similar controls. Font glyphs and CSS `content` symbols sit inside font ascent, descent, and baseline metrics; `align-items:center` centers that line box, not the visible strokes, so the marks can look consistently low. Give the SVG explicit width and height, draw the paths around the viewBox midpoint, and center the SVG with flex or grid. Check the rendered control at its actual size and avoid positional nudges that only compensate for one font or browser.

## Dashboard workspaces

Insights uses the Budget/Pro Forma pale-blue palette, compact controls, and a left dashboard menu. Use one short green dashboard title; omit decorative taglines. Keep tables horizontally scrollable within their panels, and turn sidebar navigation into a compact row on narrow screens. Background loading should name the unavailable scope while keeping completed views usable.
Use title case for Insights field labels and table headings. Center dialog close icons with SVG geometry and turn them red on hover.
Insights subdivision details use a compact card anchored to the row on hover or keyboard focus. Keep its action reachable as the pointer crosses into the card, use the Land Master navy and slate-blue palette, and keep the card inside the viewport.
Keep the lot-status builder breakdown visible inside the subdivision card; the progress bar is a compact summary, not a hidden-detail control.
Show subdivision builders as rows in a compact matrix, with Total, Sold, Scheduled, and Contracted columns in that order. Fit the matrix to the card without horizontal scrolling.
Omit a redundant heading immediately above the builder matrix. Cap displayed builder names at 23 characters plus an ellipsis and clip them inside the name column; retain the full name in a hover title and accessible label. Scope progress-bar fill styles to the progress segments so they cannot color the builder names.
In grouped lot detail, show count badges beside builder and date headings using totals from the full filtered drill-through, including lots on later pages.
For Insights matrices, soften broad white areas with slate-blue surfaces and use stronger navy accents on headings and group bands. Keep numeric cells and hover states easy to read; color changes should not move report controls.
In wide Insights matrices, pin the descriptive columns during horizontal scrolling and keep a visible but restrained click cue on drilldown values. On narrow screens, pin only the name column so month values remain readable.
Give Group By and Measure columns the same navy emphasis. Make grouped section names clear with a dark, high-contrast band; keep gradient action-button surfaces steady on hover and change only border or shadow.

## Dashboard phase timeline

In the Pro Forma dashboard's phase timeline, use golden yellow for Engineering, module-toned blue for Construction, and green for Lot sales. Align every phase to the same month grid so concurrent stages are visible. Use compact, lightly squared bars with the full stage duration in months printed inside; keep the full duration visible when a bar is clipped by the current page. Hatch months without sales between a phase's first and last closing month, and explain the hatch in the legend. Give hover and keyboard focus a stage-tinted detail card with the date window, duration, phase lots, and stage-specific calculated totals. Engineering and Construction cards show only the additional cost from calculated monthly rows assigned to that phase within the hovered stage window. Keep project grand totals on the dashboard KPI, outside individual phase cards.

## Phase schedule editors

Keep Pro Forma editor tabs in a compact, horizontally scrollable strip with a clear blue active state, restrained hover, and visible keyboard focus. Tabs stay in place on hover.

Keep phase cards to the left of the inputs and the live schedule to the right when space allows. Make each card unmistakably interactive with a visible selected state, chevron, hover, and keyboard focus. The three pieces must be sibling grid items so the schedule cannot accidentally fall below the input column. Show quantities and timing on the cards, avoid repeating the tab name in pane headings, and put the event and month together in bold beside filled timeline dots. End the connector at the final event. Give desktop cards enough width to avoid needless wrapping, and use page vertical space instead of a separately scrolling phase rail.

Keep the timeline a compact card capped at 340px instead of stretching across a wide monitor. Put the overall lot-allocation status beside the selected phase heading in a clearly bordered pill, using green for balanced and red for over/under.

Keep the Escalator switch in the Markup & Escalator header. Show the base lot price and the price after markup together in a small pill; align Markup, Lot price, Annual escalator, and Esc start date in two columns when enabled. Briefly highlight the schedule when the selected phase changes, and honor reduced-motion settings.

## Filter and month pickers

- Dropdown filters that allow multiple values use searchable multi-select popovers with selected states, Clear, Select visible, and Done. Settings that require one value use custom single-select popovers without checkboxes, search, selection counts, or Done. In Insights this includes Date Basis, Period, Measure, Group By, and Sort; selecting an option applies it and closes the menu.
- Group Insights Measure choices under Per FF, Base Price, and Lot Count headings. Show every choice without an inner scrollbar, and keep the full menu inside the viewport.
- Use a custom month/year popover instead of the browser's native month picker. Support keyboard navigation and Escape, and keep popovers within the widget viewport.
- Anchor short reports at the top. Long reports scroll inside their matrix; totals and the report footer remain visible. Center month pagination above the report.
- Insights follows Budget Manager's `budget-layout.css` palette and `landing-combo` controls: white filter pills, centered SVG chevrons rotating on open, a short menu fade, focused search, selection counts, direct clear buttons, and pale-blue card/table surfaces. Use geometric icons instead of font glyphs for control alignment, and respect reduced motion.

## Editable input guidance

- In Pro Forma input tables, use the Additional Costs treatment to identify the next missing editable value: a pale-blue field with a blue border and restrained pulse for the first value, followed by a steady blue outline for dependent values. Prefilled generated rows may keep a steady outline on every editable cell so users can distinguish them from calculated values. Do not highlight read-only, calculated, locked, complete conditional, or untouched optional fields.

## Lots and Takedowns

- Keep subdivision filter names and count badges on one line; allow a wider desktop popover and truncate long names on narrow screens.
- Lot grids follow Legal's status palette, counted legend and hover detail cards. Block headers pair a rounded block-number mark with a clear title, compact counts and a pale-blue selection action.
- Keep status coloring independent of each module's eligibility rules. Unavailable lots still expose details through hover and keyboard focus.
- In Budget Manager, pulse required header metrics and the active per-unit input in yellow only while their value is missing or zero. Clear the pulse as soon as a valid value is entered; prompt for Unit before Cost per Unit. Do not pulse a completed, locked, or optional input.
- In manually added financial rows, keep an explicit Add button below the table; typing in a field must never create another row. Use a centered SVG plus in the action and a visible outline on editable cells, including prefilled values.

- Lot-selection tiles use darker slate gray for Sold/unavailable and a deeper blue for Contracted/selected. Pair unavailable states with a light diagonal texture and a small SVG lock; show these cues from actual selection eligibility, retaining status colors and hover details. Single subdivision selection in import uses the standard floating searchable popover, with focused search, selected checkmark, rounded options and border, viewport positioning, and keyboard/Escape/outside-click controls. Keep the search inside the popover.

- Populate Subdivision review pins the subdivision identity, import totals and per-block counts above one scrolling lot list with sticky column headings. Place totals beside identity on desktop; keep the summary out of the vertical scroller. Show the subdivision per lot as read-only text and use Lot Size (Ft) for width. Keep import counts distinct from existing subdivision inventory.

Phase removal uses a soft red square button with a pale red surface and visible outline. Center the X with SVG geometry and grid alignment; retain an accessible Remove phase label.
