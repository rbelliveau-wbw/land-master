# Land Master style guide

This guide captures reusable visual preferences established in production work.

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

## Phase schedule editors

Keep phase cards to the left of the inputs and the live schedule to the right when space allows. Make each card unmistakably interactive with a visible selected state, chevron, hover, and keyboard focus. The three pieces must be sibling grid items so the schedule cannot accidentally fall below the input column. Show quantities and timing on the cards, avoid repeating the tab name in pane headings, and put the event and month together in bold beside filled timeline dots. End the connector at the final event. Give desktop cards enough width to avoid needless wrapping, and use page vertical space instead of a separately scrolling phase rail.

Keep the timeline a compact card capped at 340px instead of stretching across a wide monitor. Put the overall lot-allocation status beside the selected phase heading in a clearly bordered pill, using green for balanced and red for over/under.

## Filter and month pickers

- Dropdown filters use searchable multi-select popovers with selected states, Clear, Select visible, and Done. Settings that have one meaningful value use the same searchable visual pattern with single selection.
- Use a custom month/year popover instead of the browser's native month picker. Support keyboard navigation and Escape, and keep popovers within the widget viewport.
- Anchor short reports at the top. Long reports scroll inside their matrix; totals and the report footer remain visible. Center month pagination above the report.
- Insights follows Budget Manager's `budget-layout.css` palette and `landing-combo` controls: white filter pills, centered SVG chevrons rotating on open, a short menu fade, focused search, selection counts, direct clear buttons, and pale-blue card/table surfaces. Use geometric icons instead of font glyphs for control alignment, and respect reduced motion.

## Editable input guidance

- In Pro Forma input tables, use the Additional Costs treatment to identify the next missing editable value: a pale-blue field with a blue border and restrained pulse for the first value, followed by a steady blue outline for dependent values. Prefilled generated rows may keep a steady outline on every editable cell so users can distinguish them from calculated values. Do not highlight read-only, calculated, locked, complete conditional, or untouched optional fields.
