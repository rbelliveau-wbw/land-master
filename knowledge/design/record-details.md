# Record detail modals

Repository-wide rule for applicable surfaces; see [scope and exceptions](README.md).

Data Insights lot-detail tables use the full modal body width, with no side
margins around the scroller or reserved empty scrollbar gutter. Keep the title
and pagination/export footer fixed while the lots scroll independently.

Use this guide for read-only record detail dialogs opened from a main report.
The first implementation is Manage Lots' Builder Takedowns report.

Subdivision View/Edit dialogs combine synced dates and the linked milestone list
under **Milestones & Tasks**. Use the approved **Summary first** layout: a compact
CP Release / Construction Start table with Goal and Estimate columns, one Final
Acceptance Due line, then the complete linked milestone table. Retain its Start,
End and Sequence values, native date formatting, empty states and exact Subdivision
scope. These sections stay read-only in edit mode. Keep the existing staged Details
saves, tab/discard behavior and shared motion; the summary adds no API request or
write. Label only the key-date summary as synced daily from Zoho Projects.

Land Master Property edit/view dialogs also use the navy title and pale-blue
body. Group fields in white, finely bordered cards rather than one long flat
form: Property & location, Ownership & relationships, Acreage & financials,
Designation & coverage, and Descriptions & notes. Keep existing fields and staged
Save behavior. Show concise property identity, county, acreage, and facility in
the header; omit internal report names. Property Transfer uses matching cards,
a compact source-to-destination summary at the right, conditional partial
amount controls, and automatic record activity. History uses dated rows with
company direction, transfer type, status, amount, and View / Edit. Date entry
accepts MM/DD/YYYY and offers a floating custom calendar with keyboard controls.
Keep modal controls centered, trap focus, make the report background inert,
and return focus to the opener. No ownership update accompanies transfer saves.

Transfer type, status, scope, and amount-unit choices use compact text-only
single-select popovers with no search bar or checkbox markers. Retain the modern
trigger, selected-row highlight, keyboard controls, and staged Save behavior.

Legal/Contracts closing summaries use one line per saved tier: `Initial: 20 lots / 30 days`,
`Second: 9 lots / 180 days`, and `Cont'd: 9 lots / 90 days`. Apply the same compact
format in main-report rows, expanded previews, and the Contract detail header.
Keep the contract's total lot count separate. Preserve explicit zeroes and omit
unset tiers; a display change never changes the stored timing or invents a
Second Closing for legacy records.

Contract preview labels and values use separate direct-child style rules. Nested
value spans, including subdivision codes, inherit the same font, weight, size,
and spacing as other values; label uppercase/letter spacing never applies to them.

- Keep the report flat and sortable; put subdivision identity beneath the record
  name instead of grouping records when newest-first ordering matters.
- Use a navy record title, muted secondary identity, pale blue surfaces, fine
  blue borders and a blue top rail on the modal. Clicking the title opens it;
  include a small SVG chevron and an accessible dialog label.
- Put dated milestones in small labeled pills beneath the report identity.
  Distinguish entered, planned purchase and actual closing dates. Never relabel
  one as another without an explicit module decision.
  For Builder Takedowns, the approved Close Date pill uses the takedown's stored
  `Purchase_Date`: it is entered in advance and copied to the lots' `Close_Date`
  when that date arrives. The report and detail modal share the same pill.
  This display label does not change lot status or the scheduled closing workflow.
- Show up to six lot chips in the report and a counted View all action. The modal
  shows every loaded lot; shortening the preview never changes totals or filters.
- Use amber/yellow for Scheduled, with the visible status label. Sold retains its
  existing rose treatment. Never rely on color alone.
- Organize details into Overview, Financials, and Tax & fees cards, followed by
  the full lot list and optional Notes. Stack cards on narrow screens and scroll
  the modal body, keeping the title and Close reachable.
- Use stored values for financial summaries. Mark omitted fields Unavailable;
  do not manufacture zeroes or derive missing financial totals from display text.
- Viewing never sends a write. Preserve the authorized complete report snapshot.
  Escape and clicking the backdrop close the dialog; trap keyboard focus and
  restore it to the opening control. Make the background inert while open.
- Center the Close SVG in a square button; hover turns it red. Keep controls
  steady on hover and retain keyboard focus outlines.

Keep search at the left of the filters: white rounded field, blue square search
icon, fine blue border and a visible focus ring. Optional Builder filtering uses
the same searchable multi-select as Subdivision, with Clear, Select visible and
Done. Keep record IDs as strings and filter by identity, not display names.

Update this file and affected implementations when this reusable design changes.
Add a new component-family guide to this directory and its index for a new
standard, following [AGENTS.md](../../AGENTS.md). The documentation check verifies
discovery and links; focused behavior checks verify adoption.
