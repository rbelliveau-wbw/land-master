# Land Master style guide

This guide captures reusable visual preferences established in production work.
Use the short [design index](README.md) to find a focused component guide.

Budget phase-list rows show the three-dot menu, View, attachments and comments
in the Actions cell. Omit the direct Approvals shortcut. Reserve enough column
width for those controls and their count badges; allow the action group to wrap
within its own cell rather than overlap the independently wrapping phase name.
Keep the attachment/comment pair separated by the shared 7px gap.

Budget's single-phase financial table uses the Compact table layout. Wrap item
names and long category titles within their column; put item codes below names
and category/lock/code metadata below category titles. Keep note pencils in the
item cell. Label Per Unit once in the column heading and use compact switches
with full accessible names in its rows. Stack Preliminary status badges below
the heading. Retain all financial columns, readable right-aligned amounts and
the existing searchable unit picker; smaller screens scroll within the matrix.

Exports keep the originating report or record screen mounted. Load deferred
options inside the export dialog; do not replace the screen, re-render the main
report, or refresh its records. Preserve search, scroll, and editor drafts through
both successful downloads and retryable export failures.
[Attachments](attachments.md) defines Legal's shared file workspace and the
required main-list modal target. [Comments](comments.md) defines conversation
surfaces, composer, activity states and interaction guards. Read the relevant
component guide for that work; this general guide supplies the remaining patterns.

Forecast Manager schedule progress uses blue for Sold and dark yellow (`#b8860b`) for Scheduled. When there are scheduled lots, show current and projected completion together in parentheses (`51% → 56%`). Keep the Sold/Scheduled counts below the bar; show the Scheduled count only when positive.

Below each Forecast Manager builder's overall progress, show a separate green monthly forecast meter (`#14845a`) with the current month and `10 of 10 sold` above it. Omit the secondary Sold this month / lots left caption. Keep monthly consumption separate from lifetime schedule progress and the beginning-of-month Unforecasted balance.

For multi-phase Forecast Manager schedules, label the primary bar Phase Progress and keep its counts, monthly actuals and recent sales scoped to that phase. Put whole-schedule progress and shared terms below a divider labeled Contract Schedule — All N Phases. Preserve the full obligation when future phases have not yet been populated. Single-phase cards keep their existing layout.

Closing-term editors and Forecast Manager use Initial Closing, Second Closing,
and Subsequent Closings in that order, with separate lots/day inputs for each.
Second Closing is one event. Keep its legacy blanks visible, and use a short
explicit copy action to stage its current pair into Subsequent Closings; typing
must never link the values automatically. Required indicators for legacy second
fields apply when closing terms change, while unrelated edits remain available.
See [the timing and compatibility contract](../modules/takedown-schedule.md).

The Contract lot editor keeps its four closing cards compact and equally sized,
with two columns on medium screens and one on narrow screens. Use Lots and Days
above the inputs, retaining the full timing meaning in tooltips and accessible
labels. Place Copy to Subsequent beside the section heading so the action does
not add empty space to every card.

Numeric entry controls preserve entered decimal digits on blur and save, including dollar amounts. Counts and month/day numbers reject fractions with a clear field error; never silently round them. Pro Forma Street LF remains whole for the 1.80.51 release.

Pro Forma and Budget currency displays omit trailing `.00`, including zero amounts,
per-unit prices, modifications and transfer previews. The Pro Forma dashboard
(cards, assumptions, scenarios, monthly tables and timeline details) and all Data
Insights monetary values display the nearest whole dollar. Budget's main project
list also rounds project/phase totals, preliminary/final summaries and per-lot
amounts; Pro Forma's main list rounds Land Cost and Net Profit. Keep decimal precision
in editable controls and round only the final displayed aggregate; never change
stored values, calculations or numeric exports to match the display.

In Pro Forma Additional Costs, show the enabled Cost per Unit input with a persistent blue border, pale-blue surface and soft blue glow. Strengthen the glow on keyboard focus. Disabled rates stay muted, and the calculated total keeps its read-only treatment.

Lot picker hover cards show record details and relevant claim/hold warnings; omit generic backfill availability and data-preservation footers.

Contract detail headers align Back, record identity, view tabs and summary fields in one horizontal row. Scroll the row on narrow screens instead of splitting controls above the summary. Keep Open in Creator out of that header; its three-dot menu entry is personal to Robby.

Lot contract reports use compact branch rows: pale blue on a Master with visible Amendments, a lighter tint on its children, and a shared blue rail and branch connector. Make connectors visibly bold with rounded elbows and a stronger blue rail. Keep status colors independent. Put a counted collapse control beside the Master; omit repeated parent names on nested children and retain them when filters leave a child on its own.

## Record dropdowns

Contract parent relationships use a compact blue bordered Parent Contract
control in the expanded left summary, an optional searchable single picker in
the new modal, and a compact relationship editor from the three-dot menu.
Show a counted blue Master badge whenever children exist; retain the underlying
type. Keep Master assignment read-only, with a short tooltip for the lock.
Parent options are keyboard-focusable buttons with centered SVG selection marks.
Use the existing navy modal title, blue identity card, SVG close, and pinned
Save/Cancel footer. Detailed behavior is in
[Parent Contract assignment](../../docs/contract-parent-assignment.md).

Pro Forma budget-transfer menus float over the modal content without changing
the source/destination card height. Keep them aligned with their picker during
scroll and resize, fit the result scroller inside the viewport, and open above
the picker when the space below is limited.


Alphabetize record picker options by display name. Keep a visible gap between the search field and results, allowing room for focus outlines so adjacent controls never overlap.

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
Subdivision View Lots uses a counted Sold/Scheduled/Contracted/Open/All slider above the scrolling table. All groups by colored status bands, then builder and date; keep the heading, slider and pagination visible while lots scroll. Use green for Sold, gold for Scheduled, blue for Contracted and slate for Open, with text labels as well as color.
Center the lot-status slider in the modal, keep the modal height steady when switching to empty statuses, and inset the table from both side borders.
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

The multi-item PO ledger has its own single-select item picker. Offer only
eligible items whose verified Final Budget plus approved signed modifications
is nonzero. Use a wider, taller dropdown with one horizontal row per item and
aligned Modified budget / After existing POs columns; show labels once in the
sticky heading. Preserve exact cents and keep narrow-screen scrolling contained
inside the menu. A fully committed item remains selectable when its
modified budget is nonzero. Retain old selections on saved POs. Keep the vendor
field about 30% narrower than the former half-width header field on desktop;
retain the existing narrow-screen layout. The proposed right-side grouped
receipt is a mockup pending design approval.

Check, Wire and Purchase Order creation uses Budget → finalized line item →
searchable Vendor → request details. Global entry chooses Budget first; phase
entry starts at line item. Only show eligible finalized items in the shared
Bud Mod, Check, Wire and Purchase Order picker. Hide unavailable rows instead of
showing disabled choices. Preserve finalized zero-value items in the legacy
shared request picker (the multi-item PO exception is above) and search by
name or code. Use the Detail panel vendor picker: put the line-item name and
code in its title bar; searchable rows show location/contact when present and
select a candidate for the adjacent contact/phone/address/payment terms panel.
Use Vendor applies the selection. Keep Add Vendor beside the Vendor heading,
Back and quiet Refresh Vendors in the footer, and reserve spacing above actions.
Stack the panel beneath the bounded list on narrow screens. Retain the draft
through native form entry and list refresh. Center selected vendor and Change
in the request details/preview title bar; hover or keyboard focus on the name
shows the same vendor facts, and tapping shows them on touch screens. Escape
or leaving the name/popup dismisses it. Hide this context in earlier steps and
Bud Mod, and wrap long vendor names at narrow widths.
Use compact body spacing. The Budget rail places dates, a prominent amount
input with its available maximum, and GP
Actuals reference on the left; the compact budget receipt on the right. Stack
the rail beneath inputs on narrow screens. Emphasize the remaining balance in
green when nonnegative and red when overspent. Keep Back, a quiet Refresh
Balance, and Preview Draft in the footer; the centered header X closes the modal.
Receipt rows align labels
left and amounts right: Final Budget, Bud Mods, Revised Final, subtract same-item
POs Issued, Available Budget, subtract this request, then remaining balance.
Keep GP Actuals below the amount input as reference only; paid status does not release
the issued-PO commitment. Show negative
remaining in red and block continuation. Loading/unavailable balances stay
explicit and never show a fabricated zero.

Budget Manager's main-list Add menu sits at the far right of the filter row. Put Budget first, then a horizontal separator before Bud Mod, Check Request, Wire Request and Purchase Order. Global requests select a budget before opening the same phase request composer; Budget uses a searchable subdivision chooser that excludes subdivisions with an existing budget, including archived budgets. Keep parent selection compact, keyboard accessible, and independent of landing filters. Multi-record budget creation follows [transfer progress](transfer-progress.md), with a persistent verified result and read-only recheck after an unknown response.

- Dropdown filters that allow multiple values use searchable multi-select popovers with selected states, Clear, Select visible, and Done. Settings that require one value use custom single-select popovers without checkboxes, search, selection counts, or Done. In Insights this includes Date Basis, Period, Measure, Group By, and Sort; selecting an option applies it and closes the menu.
- Group Insights Measure choices under Per FF, Base Price, and Lot Count headings. Show every choice without an inner scrollbar, and keep the full menu inside the viewport.
- Use a custom month/year popover instead of the browser's native month picker. Support keyboard navigation and Escape, and keep popovers within the widget viewport.
- Anchor short reports at the top. Long reports scroll inside their matrix; totals and the report footer remain visible. Center month pagination above the report.
- Insights follows Budget Manager's `budget-layout.css` palette and `landing-combo` controls: white filter pills, centered SVG chevrons rotating on open, a short menu fade, focused search, selection counts, direct clear buttons, and pale-blue card/table surfaces. Use geometric icons instead of font glyphs for control alignment, and respect reduced motion.

## Editable input guidance

Lot Pricing rows include an optional **Escalator %** input between Price / ft
and Base price, in both creation and Change Lots & Pricing. Entering `5` means
5%, and values may have up to two fractional digits. Keep the percent unit
visible in the column heading and reject invalid or over-precision input
without silently rounding.
Blank remains unset; an explicit zero remains 0%. Preserve the per-size draft
through picker changes and apply it through the existing guarded pricing save.

Change Lots & Pricing keeps its pricing card neutral while selected Lot sizes
are unresolved, with **Loading lot pricing…** or the actual unavailable state.
Show complete cached prices immediately during refresh and preserve edits.
Loading data must not briefly appear as a yellow missing-input step; arm that
highlight only after selected Lot sizes are known and required prices are absent.

Open Lot (Master) and Lot (Amendment) contracts expose Change Lots & Pricing in
the workspace header, main-list drilldown and pricing card to general editors
and users with Edit Owned Contracts and Actions who own that contract. Keep
the button visible but disabled during a pending save or retained review;
completed contracts and unauthorized users have no editing control. Callable
open/save paths retain the same ownership, current-status and write guards.

Lot contract creation reveals location, Builder, and name in small numbered cards. Start a Master with Type and the required Project; start an Amendment with Type and required Subdivision. Use a pale-yellow surface and amber outline for the next unfinished card and its missing required input, following Tax Parcel Year's active-step treatment. Completed cards lose the highlight. Keep optional subdivision and lot choices behind the contract identity, and pricing behind lot selection. Respect reduced motion and retain a visible keyboard focus ring.

Show the editable Actions panel as soon as a Lot type is selected. Its template checklist stays visible while Project, Subdivision, Builder, and name are incomplete or cleared.

Put Lot Territory, Status, and the Amendment's Project and Parent Master in the title card. Derive Territory from the Master's Project or the Amendment's Subdivision, using its actual Project when subdivision Territory is blank. Auto-link a unique Master matching both Project and Builder; show the searchable title-card picker when several match. Missing lookup data must remain visibly unresolved, with Retry on failed Project loading.

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

Searchable dropdown placeholders use Search plus the field name in title case, such as Search Subtype. Omit action prefixes such as Edit.

Land Master searchable dropdowns in reports, filters, and modals share the report filter palette, compact bold option text, header search, border, shadow, and footer. Their close buttons use a centered SVG X on a pale red surface with a soft red outline. Keep single/multi-selection behavior intact.

Land Master report filters reset their applied values immediately when Clear is clicked; the red X clears that filter and closes the popup. Escape and outside clicks discard staged checkbox changes. Clearing one filter preserves the other filters and the main search. Project group headers align the caret, project name, compact edit button, territory pill, and subdivision/sold totals in one flex row; allow wrapping on narrow screens and keep the edit action independent of group expansion.

Center custom selection and success checkmarks with an explicit SVG, a path bounding box centered in its viewBox, and grid/flex alignment. Avoid font glyphs for checkmarks.

Import Lots Attach and spreadsheet-checking dialogs fit their contents with a compact centered width and automatic height. Keep the lot-review table in its larger workspace. Cap compact dialogs to the viewport and scroll their body when needed.

Budget transfer review uses outlined editable fields inside pale-blue metric cards, destination identity above the matrix, and compact cost-code badges in ascending Budget Item order. Keep the modal footer visible and use one body scroller on desktop; unresolved phase mappings show a distinct assignment row.

Keep Budget transfer destination metrics compact beside the Budget identity on wide screens. Center the small phase pill slider beneath that row, using the shared Pro Forma pill styling and omitting lot counts from the phase buttons.

Budget transfer phase pills use the modal header's navy gradient for a shared sliding selection background, with a smooth 280 ms eased movement and immediate movement for reduced-motion users. Keep this chooser 10% larger than the original compact pills, preserving its centered placement and keyboard focus.

Budget transfer matrices follow Budget Manager's single Item column with destination name and Cost_Code pill, pale category bands with blue circular collapse chevrons and department pills, department/category subtotals, and round note pencils (amber when a note exists). Center pencils against the full row including notes. Edit destination notes in a compact Save/Cancel dialog; keep PF notes unchanged. Put selected-phase and all-phase totals in the pinned footer with two-decimal currency, counts, and concise transfer status.

Budget transfer headers show a clear source-to-destination route, transfer total, destination/item counts and an explicit state. Sending uses the Contracts-style persistent progress/result modal described in [`transfer-progress.md`](transfer-progress.md); a tiny completion line or disabled button is insufficient.

Populate Subdivision lot tables use Soft rows: separate white rows with rounded outer corners, quiet column headings, outlined editable values, and blue source disclosure pills. Use a green left edge and compact mint Created badge for saved rows, amber for review flags, and a neutral edge for unchecked rows. Retain the pinned summary, sticky headings, source details, and one scrolling lot list.

Owner pickers, pills, headers and exports display the full name recorded in
User Access. Do not shorten an actual full name at underscores or @ signs; use
the existing login fallback only when Full_Name is blank. Sort owner choices by
the visible name and preserve ID/login/email identity separately.

Contract creation starts with Type, then compact Parent (Optional), then Territory. Selected parents dictate the new draft Territory and Counterparty, rendered as read-only field values. Keep Status in the title row alongside owners. Optional field labels use a visible space before (Optional); flex labels need explicit margin because HTML whitespace alone collapses.

Contract main reports keep every child type immediately below its parent, with
a context parent when only a child matches filters. Counted child-type badges
use the report type palette. Parent pickers group those types and use wrapped
contract names plus counterparty pills and Territory in a wider dropdown. Locked
status pills match the 31px dropdown height and full column width. Lot completion
confirmations use one heading, without a repeated kicker.

Insights waits for complete report data before populating any period; loading or
failed history never leaves partial results visible.


Purchase Order's companion receipt panel is titled Summary. Keep cost codes and
all budget arithmetic on one horizontal table row, right-align tabular currency,
and use green for nonnegative remaining budgets. It sits to the right on desktop
and stacks on narrow screens with horizontal overflow contained inside its table.
