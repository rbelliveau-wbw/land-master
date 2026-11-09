# Empty row filters

Repository-wide rule for applicable surfaces; see [scope and exceptions](README.md).

Use the Pro Forma Additional Costs pill switch: a short sliding track on the
left, **Hide Empty** on the right, `role="switch"`, immediate `aria-checked`,
visible keyboard focus and reduced-motion support. Keep it beside Search.
Filtering is a local view choice and must not save, recalculate totals or rebuild
mounted editors. Combine it with search and category filters; hide category
headers when no child items match. Switching off restores rows and preserves
category expansion state. Show a short no-matches status when appropriate.

Pro Forma Additional Costs retains its existing definition: Add'l Cost is blank
or zero. Budget checks each item's Preliminary, Unapproved, Final, HCSS Actuals,
GP Actuals, per-unit rate and modifications across every displayed phase. Keep
negative amounts and individually nonzero modifications even when they net to
zero. Keep per-unit setup/drafts and unknown data visible. Its existing incomplete
per-unit navigation recovery clears filters before focusing the required field.
Budget's saved element amounts also keep their parent line visible. Expanded
element rows inherit their parent line's search, Hide Empty and category state;
they do not become additional items or affect totals.

Reallocation uses the same pill as **Show $0**, in its title bar, off by default.
Hide known zero-budget element rows. Preserve nonzero original/revised budgets,
changes, PO amounts, availability and pending activity, including negatives and
required increases; keep unknown data and a focused editor visible. The switch
only changes mounted row visibility and restores every zero row when enabled.
Do not save, change the reallocation model or recompute displayed totals from
the switch. Keep entered reasons/amounts and stable numbered element identity.
Use the shared keyed visibility/resize registry and reduced motion.

Budget's phase and all-phases item lists use the shared keyed movement engine
with `visibility:true` so filtered survivors move to their real positions.
Existing 100-row motion limits and reduced-motion behavior remain in force.
No count or monetary total changes as a result of this visibility choice.

Forecasts dashboard defaults Hide Empty on, including Reset (October 29, 2026).
Users can switch it off to restore empty/unknown rows; keep mounted identity,
remembered disclosure state and numeric motion. This default is specific to
Forecasts and does not change Lot Sales or editor defaults.
