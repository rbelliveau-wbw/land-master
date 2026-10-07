# Lot lists and editing

Lots defaults to a compact list, with Grid available in the same toolbar. Group
by subdivision, then natural-sorted Block and Lot. Put each group identity in
its header once; full codes belong in tooltips and the selected-lot disclosure.
Keep status visible alongside outlined editable values. Extra editable columns
are chosen through Columns. Collapsing a block preserves its selection.

Keep the toolbar, subdivision summary, status totals, selection controls and
block navigation above an independently scrolling lot report. Use compact pills
for every displayed block; clicking one expands that block and scrolls the report
to it. Preserve vertical and horizontal report positions through cell saves.
The summary combines subdivision identity and total with small status counts;
omit the duplicate legend and availability totals in List mode.

Builder appears immediately after Status, using the existing Lots.Builder1
lookup and a searchable single picker. Alphabetize only Type1 == "Builder"
choices; keep historical values readable and check the chosen record's type
fresh before saving. On hold is a direct boolean checkbox. Place the notes
icon immediately to its right; use yellow when nonempty notes exist. Clicking
the icon opens the same verified Notes editor for adding, editing or clearing.

Use checkboxes and Shift-click on a checkbox or lot number for ranges in the
current visible order. Select visible respects search; a block checkbox affects
only that visible block. Editing selection is separate from takedown selection.
Create Takedown requires every selected lot to meet the existing eligibility
rules and belong to one subdivision. Existing takedown reports remain read-only;
their complete lot detail uses the same block grouping without repeated codes.

Click a cell to edit its field; the pencil opens all editable fields for one
lot. Mass update chooses fields explicitly, shows current/mixed values and a
before/after preview, and keeps unchecked fields unchanged. Empty checked text
or numeric inputs explicitly clear that field; unchecked On hold means false
only when its field is selected. Missing fields disable their editing controls.

Only verified saves get mint inline checks and the shared black success popup.
Multi-lot saves use the persistent [transfer progress](transfer-progress.md)
dialog. Preflight checks the captured values and subdivision before any writes;
each saved lot is read back. Report confirmed, rejected, unknown and unsent
destinations separately. Check status reads only and never repeats a write.
Retain selections, fields, context guards, focus/inert locks and drafts on errors.

Implementation: [list UI](../../widgets/manage-lots/src/app/lots-list.js),
[styles](../../widgets/manage-lots/src/app/lots-list.css), and
[update controller](../../widgets/manage-lots/src/app/lot-edit-controller.js).
