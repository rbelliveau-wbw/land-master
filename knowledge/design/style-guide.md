# Land Master style guide

Repository-wide rule for applicable surfaces; see [scope and exceptions](README.md).

This guide defines repository-wide visual rules for every applicable surface.
Use the short [design index](README.md) to find a focused component guide.

UI verification is desktop-only, per Robby's October 13, 2026 direction.
Do not spend time checking phone or tablet formatting.

User direction October 30, 2026: page headings, tabs, column headings, field
labels and action labels use Title Case, such as **By Foreman**, **Labor Type**
and **New Crew**. Keep record names and source-owned values unchanged; ordinary
status/error sentences remain sentences. Crew Management keeps workspace tabs
beside its title and combines employees and crews in equal desktop panes on
**Crews**. Group employees by Foreman, with search and a compact status menu;
omit the Roster / By Foreman switch. Use horizontal space before adding another
toolbar row. Foreman member rows use compact single-line names/codes and inline searchable staffing
pickers. Preserve exact text in titles when shortened, existing native writes,
permission guards and unknown-save recovery.

Crew scheduling uses short, evenly spaced month headings with years grouped
above them and a 24-month default. Keep readable month columns and horizontal
scrolling rather than squeezing or overlapping the labels.

Lookup names that shorten within a control must remain available on hover.
Reuse the existing native full-name title pattern where it is already proven,
as in Tax's Company selector. Land & Projects table and record lookup controls
also expose complete selected names; multi-value summaries include names omitted
by +N. Refresh the title when the value changes or clears. Preserve the existing
lookup click/edit behavior, native IDs and save paths. A title is presentation
only and must never trigger a read or write.

Tax Parcel Management keeps selection actions in the existing pagination row,
to the left of the page controls. Reserve the row height when no records are
selected so selecting or clearing records never pushes the report down. Keep
Clear beside Select All with the selection group. On tighter desktop widths,
scroll that action group internally instead of wrapping it into another row.
Selecting records changes presentation only; retain the existing write guards.

Main report scrollers must fit the visible host area, including Creator pages
that clip a taller iframe. Use a flexible, shrinkable report region and leave
space below its final row, above any horizontal scrollbar. The last row and
bottom scrollbar must remain reachable after resizing, paging and selection.
Tax Center measures ancestor clipping with an IntersectionObserver on its
unchanged document root; fitting the body must not create a height feedback loop.
Keep row and data operations independent from this presentation measurement.

Legal and Construction keep their module slider menu at the left of the page
toolbar above the filters, with New and Refresh at the right. User direction
October 20, 2026 supersedes the earlier centered-header placement. Use the exact
Pro Forma main-report palette from its `report-layout.css`: `#e5ecf3` workspace,
`#f4f7fb`/`#eaf1f7` alternating rows, `#d9e5f1` column headers and the
`#dce8f5` → `#eaf1f8` group-heading gradient. Preserve the existing layout,
hierarchy highlights, status colors and module-specific grants.
Board cards and lane headings must not shrink vertically: wrap full request names
and reserve a few pixels around cards for focus/hover edges. Workspace header
fields wrap so tabs and the comment button never collide with metadata. Omit the
routine Construction submit-access explanation from read-only workspaces; retain
actual denied-action guards and completed-record notices.

Input-driven numeric displays use the selected [Sliding push transition](number-transitions.md).
All ten widgets adopt the pattern for applicable displayed quantities. The
focused guide, inventory and module documentation record coverage and exclusions.

All new and revised interactive features also follow
[Interaction motion](interaction-motion.md): moving tab selection, smooth
disclosures and keyed rows, authorized refresh continuity, truthful inline
save feedback, consistent overlays, changed-row highlights and actual progress
meter transitions. Reuse the shared implementation across every module.

Data Insights keeps branding, Refresh and Diagnostics in the sidebar, reclaiming
the full-width shell header for report height. Use centered SVG action buttons
stacked vertically at the top-right beside branding and above navigation,
matching Forecast Manager's refresh icon. Refresh sits above Diagnostics; reserve
branding height and horizontal clearance so neither label nor navigation overlaps.
Keep connection status accessible without visible Connected text. Keep the
timeframe and active filter pills together on a compact navy report bar. Avoid
repeating the selected date range in another pill. Put Expand All / Collapse All
immediately after Hide Empty, before the space leading to Reset; its label describes the next action for visible
groups. Lot Count is the initial and Reset measure.
User direction October 16, 2026: the Insights matrix fills the remaining report
height. Omit its visible bottom description bar and page update/version footer;
retain the totals row and keep Diagnostics/version information in Diagnostics.
Report descriptions, quality metadata and loading status may remain accessible
outside the visible layout. Measure changes must not resize a bottom text strip.

Forecasts keeps search/project-status/Lot Status/period filters, display switches
and collapse/reset on one compact horizontal control row. Keep Hide Empty, Annual
Totals and Subtotals together, followed immediately by the Sold/Forecast color
legend. Omit the separate Monthly Lot Count/count/legend row above the matrix;
retain the report count as an accessible status.
Align Collapse All / Expand All and Reset together at the far right of that
control row. Make the Sold/Forecast legend 13px and bold, with 12px swatches.
Tint complete monthly cells blue for Sold and green for Forecast, using the
legend's basis colors; keep mixed annual totals neutral. Mark the exact Creator
server month/year with Forecast Manager's lavender Current heading and purple
side rules through body and totals. Body cells keep their basis tint.
Bound filter widths rather than stretching them across the page; allow local
horizontal scrolling when required. Expanded All Filters remains optional below.
Match Lot Sales' 31×18px switch tracks and 12px thumbs, and its 28px pill buttons.
Missing forecasts use a small amber warning box beside Export CSV, with the count
available on hover/focus/click, instead of a full-width notice. Keep actual load
failures visible. Project/Territory/Builder disclosures update mounted rows and
cached subtotals immediately; never re-read or re-aggregate the report solely
to open or close a group.
Put the clearly labeled View by searchable single picker (Project, Territory,
Builder) in the first matrix header. Lot Status (Sold + Forecast / Forecast)
belongs in the top filter row. This October 27 direction supersedes the earlier
Lot Status-in-header placement. Reuse the mounted pickers and their handlers.
Every phase row with multiple displayed builders can expand to show those
builders' monthly values and annual totals. Preserve the same filters, saved
data, unknown/zero semantics, basis colors and current-month marking. Child
rows are a breakdown of the parent; never add them again to totals or CSV.
Keep group and phase disclosures immediate, mounted and accessible, preserving
expanded choices through display switches. Hide Empty applies to child lines
as well as parent phases; hidden/collapsed ancestors hide their descendants.
All three display switches update the mounted report immediately. Cache empty
row membership, both visible-scope group/footer totals and annual columns during a real report build;
switching Hide Empty, Annual Totals or Subtotals must not rebuild the model/table,
read data, lose focus/scroll, or reset collapsed groups. October 27 correction:
Hide Empty excludes rows with no nonzero displayed monthly value, including
missing-only and mixed blank/zero rows. A nonzero month keeps a partly missing
row visible. Missing values remain unknown; hiding them never converts them to
zero. CSV, totals, accessible counts and visible group controls follow the
same displayed scope. The missing-forecast warning retains the complete matching
scope, including hidden empty phases. Keep annual cells mounted and toggle their visibility and
year-header spans together.
Forecasts uses the same saved Forecast/Forecast Year values and Sold + Forecast
month boundary as Forecast Manager. A blank or missing builder-year must never
erase other builders' saved counts. Display available subtotals with their
missing-data warning; all-unknown values remain unknown and explicit zero stays
known. Include only builders with a parent in the selected fiscal years, matching
Forecast Manager's visible matrix. Apply this to row, group, footer, annual and
CSV values. Cache empty masks, counts and totals at render; capture all changed
numeric displays before any visibility/markup writes. Skip unchanged hidden and
subtotal states to avoid repeated layouts and observer work on Hide Empty.

All report loading screens follow the Data Insights Forecasts appearance; see
[Loading states](loading-states.md). Lot Sales and Forecasts share the same
centered card and navy spinner, with their short report-specific loading label
in the report viewport. Do not use the yellow notice bar for loading.
The indicator follows the real pending read, has no invented percentage or
minimum display delay, and becomes static for reduced motion. Keep an already
authorized report mounted during refresh. Real failures retain their error
notice and the existing retry path; hide the spinner on completion or reset.

Budget's managed PO requests use [Soft rail rows](payment-requests.md): blue
PO pill and left rail, vendor, MM/DD/YYYY request date in the middle, green
amount, status and compact Edit/View action. Omit column headings and repeated
Purchase Order text; keep every element on one horizontal row.

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
Budget's application-wide Export All Budgets action sits in the landing header
beside Audit Log. Keep its loading/count feedback inside the same button and
preserve the current report, filters and scroll. Download only after every native
page has completed; a failed read leaves the same action available for retry.
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

Pro Forma cash-flow matrices keep Category and Total frozen during horizontal
scroll, including expanded child labels and section bands. Keep both frozen
headers above scrolling month headers. Label additional engineering/development
items Dev Costs in cash-flow matrices, timeline details and Excel exports.
The dashboard top cards and Edit-mode sidebar instead use the approved concise
labels: Lot Sales, PID/MUD Revenue, Land Sales, Land Purchase, Engineering and
Development. The sidebar titles/totals are Inflows / Total Inflows and
Outflows / Total Outflows. These are display names for the same existing fields
and categories; retain the dashboard Gross Profit and sidebar Net Profit labels.
The top record card shows Land Purchase using the existing first-installment
summary. Cash Position keeps anniversary snapshots in its left column. A second
column inside the same card uses the matching Positive Cash Flow title and shows
the first strictly positive cumulative-cash project month number and calendar
month/year underneath. The dashboard record bar places Export directly to the
right of Comments and opens the existing PDF, Excel and LOI/Contract chooser.

On the Pro Forma dashboard, preserve the original ROI / IRR / XIRR heading and
large vertically stacked return values in the left column of the first summary
card, with Gross Profit in a second column aligned at the top. Keep the two
columns readable as desktop card widths change. Use the former standalone profit card for construction
cost per street LF and sale price per lot front foot, retaining the dark-blue
emphasis. Show Base and Base + Add’l construction rates side by side, using
total base-plus-additional construction cost divided by street LF for the latter.
Keep Peak Cash Out below Positive Cash Flow in the right-hand column
of the top Cash Position card, showing the largest cumulative deficit in
parentheses and its model month/calendar month-year beneath the amount. Use
`Mth N · Mon YYYY`, matching Positive Cash Flow; keep calendar dates static while
the amount and model month use the existing numeric transitions. Preserve the
same full-schedule cumulative-cash calculation; equal minima retain their first
month. Complete schedules without a deficit show $0 without a peak date, and
empty/incomplete schedules show — without a date.
Cash Position, Positive Cash Flow and Peak Cash Out
use matching heading styles and the same 12px value size. Changing the displayed
period resets horizontal scroll in both the cash-flow matrix and phase timeline
to January; expanding rows within the current period preserves scroll position.

Lot picker hover cards show record details and relevant claim/hold warnings; omit generic backfill availability and data-preservation footers.

Contract detail headers align Back, record identity, view tabs and summary fields in one horizontal row. Scroll the row on narrow screens instead of splitting controls above the summary. Keep Open in Creator out of that header; its three-dot menu entry is personal to Robby.

Lot contract reports use compact branch rows: pale blue on a Master with visible Amendments, a lighter tint on its children, and a shared blue rail and branch connector. Make connectors visibly bold with rounded elbows and a stronger blue rail. Keep status colors independent. Keep matching child records visible beneath their parent, without a family-collapse button (user direction October 21, 2026). Retain counted child-type badges, branch connectors and the separate action/details expansion. Omit repeated parent names on nested children and retain them when filters leave a child on its own.

## Legal and Construction workspaces

Delete confirmations use the affected record's module wording. Construction
uses Delete construction request, its saved request name, the permanent-delete
warning, and Delete request; Legal retains Delete contract. Keep the existing
confirmation layout, Cancel action, permissions and completion locks. Success
and failure feedback use the same module-specific noun.

Legal and Construction are separate Creator pages. Reuse the same widget with
page variables selecting a fixed module; never add an in-widget module chooser
or switch modules while opening a record. A denied Construction page stays
closed instead of displaying Legal. Scope lists, actions, reviews and templates
to the page's module. Construction actions omit assignment dropdowns and do not
require an assignee to save or complete; Legal retains its existing controls.

In the Construction request form, pair half-width Subdivision and Date Needed
on the first row, and pair Request Name with Parent request. Display Date Needed
as `MM/dd/YYYY` using the existing floating custom picker. Retain ISO
`yyyy-MM-dd` in the hidden value carrier and the existing save conversion. Scope
numeric formatting to this field so Legal's compact action dates stay intact.

Keep a compact Suggest action beside the Construction Request Name label. It
rebuilds the draft name using the existing subdivision and budget-type format;
normal field changes preserve manually entered names. Construction creation and
its confirmation use the concise button label Submit.

Expanded Construction rows have one compact facts rail, Parent control, and
description on the left, capped at 280px on desktop. Give Actions the remaining
main area on the right; omit duplicated full summaries. Stack these areas on
narrow screens. In the full Construction workspace, align header controls at
32px and use Request labels in the record/navigation context. Preserve the
existing Legal expanded-row layout.

Construction Review uses responsive cards: request name, Subdivision,
requestor, submitted date, and a short description in the main area; Budget
Type, a Priority badge, and numeric Date Needed as three aligned facts. Keep
Accept and soft red Reject paired and reachable on narrow screens. Reuse the
approval rejection colors defined below rather than inventing a destructive
button treatment for this queue.

Construction status color is limited to picker/filter dots: violet Pending
Review, blue New, rose Rejected,
cyan Feasibility, gold Awaiting Purchasing, orange Awaiting Development,
fuchsia Awaiting Other, teal Approved, green Complete, and slate Cancelled.
Keep menu rows and labels neutral, with the standard blue hover/selection and
checkmark. Do not extend this dot palette to chip surfaces, text, or board rails.
This reflects Robby's October 13 correction: "Just the dots need color."

## Record dropdowns

Legal's main Contracts report includes an alphabetized Territory multi-select
using its existing modern searchable filter popup. Compose it with the other
report filters and search; keep the same selection, Clear and Done controls.

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

Place the Same for all phases slider between the phase title and allocation badge. Enabling it copies Phase 1 settings and lot count once; keep each phase's lot count editable for balancing. Commit numeric fields and refresh phase-card metadata in place so pointer clicks and keyboard focus keep their targets.

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

In a budget's Requests list, managed Purchase Orders show their vendor, dates,
amount and status using the existing compact request card. Put **Edit PO** or
**View PO** beside the status in the card's action area. Draft and rejected PO
editing follows the existing budget permission; other saved states open their
current read-only workspace. Keep the editor locked while loading a saved PO,
with a short loading label and Retry load on failure.

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

Land Master fixed-choice single-select menus (including Property Transfer type,
status, scope, and amount unit) use modern text-only option rows without search
or checkbox markers. Highlight the current value; choosing an option closes the
menu. Keep arrow-key navigation, Escape, outside-click dismissal, and opener
focus restoration. Single record lookups retain search but omit checkbox
markers; multi-selects retain search and their selection controls.

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


Purchase Order item choices show a cost-code pill before Item Name, in numeric
code order under visible major-code and Budget Category headings. Keep amount
columns aligned. Its ledger uses pale blue input surfaces, a fine blue border
and a subtle focus glow to distinguish editable cells. Cost Element starts at 5
and needs only five single-select options. Reuse Budget's floating request date
picker rather than mounting a calendar inside the form. PO totals are calculated
and labeled TOTAL in larger type; omit an editable header-amount control.

Use Title Case on multiword tabs and action buttons, including Approval Rules
and Add Rule. Keep explanatory headings out of compact approval rule lists.

Legal and Construction main-list Status pickers and Current Action Status pills
are capped at 220px on wide desktop reports. Keep their existing row height,
colors, permissions and interaction; status controls must not fill wide columns.

Construction parent-request pickers use the shared searchable single-select,
group eligible requests by subdivision and place the current subdivision first.
Show request name and budget type within each group; search also includes project
and territory. Preserve explicit unassigned and missing-subdivision states.

## Live uniqueness feedback

User direction October 21, 2026: check known unique values as their controlling
inputs change, before enabling Submit. Keep the notice succinct and noticeable.
Updated user direction October 21, 2026 places a short red, bold line and a small
matching dot beside Save in the action footer.
Show a muted checking state, disable Submit while checking/duplicate/unavailable,
ignore stale replies, and hide the notice when available. Retain a final server
check and native uniqueness enforcement for concurrent writers. Tax Center's
parcel-year creation adopts this pattern; do not claim other forms have adopted
live checking merely because they display native validation details.
