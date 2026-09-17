# Land Master style guide

This guide captures reusable visual preferences established in production work.

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

## Dashboard workspaces

Insights uses the Budget/Pro Forma pale-blue palette, compact controls, and a left dashboard menu. Use one short green dashboard title; omit decorative taglines. Keep tables horizontally scrollable within their panels, and turn sidebar navigation into a compact row on narrow screens. Background loading should name the unavailable scope while keeping completed views usable.

## Filter and month pickers

- Dropdown filters use searchable multi-select popovers with selected states, Clear, Select visible, and Done. Settings that have one meaningful value use the same searchable visual pattern with single selection.
- Use a custom month/year popover instead of the browser's native month picker. Support keyboard navigation and Escape, and keep popovers within the widget viewport.
- Anchor short reports at the top. Long reports scroll inside their matrix; totals and the report footer remain visible. Center month pagination above the report.
