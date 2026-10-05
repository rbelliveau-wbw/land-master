# Record detail modals

Use this guide for read-only record detail dialogs opened from a main report.
The first implementation is Manage Lots' Builder Takedowns report.

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
