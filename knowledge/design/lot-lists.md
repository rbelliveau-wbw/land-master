# Lot lists and editing

Repository-wide rule for applicable surfaces; see [scope and exceptions](README.md).

Lots defaults to a compact list, with Grid available in the centered inventory switch. Group
by subdivision, then natural-sorted Block and Lot. Put each group identity in
its header once. Row identity runs Select, Notes, Block, Lot, Lot code, Status,
Linked to, then Builder. Keep status visible alongside readable values. Extra editable columns
are chosen through Columns. Collapsing a block preserves its selection.

Keep the toolbar, subdivision summary, status totals, selection controls and
block navigation above an independently scrolling lot report. Use compact pills
for every displayed block; clicking one expands that block and scrolls the report
to it. Preserve vertical and horizontal report positions through cell saves.
Keep subdivision identity/total, selection, block navigation, the prominent
navy pill-style List/Grid switch, status counts, Edit mode and Columns in one
inventory row. Center the switch independently of the left and right content;
retain it in Grid. Omit the duplicate legend and availability totals in List.

Show Subdivision Name and Subdivision_Code together in the subdivision picker;
search both and preserve leading zeros. Put searchable Builder and Status
multi-selects immediately to its right. Status offers only native Open,
Contracted, Scheduled and Sold, regardless of a row's displayed relationship or
On hold indicator. Status cells themselves use these same four native statuses.
Place On a contract and In a takedown badges in a separate Linked to column
immediately after Status; show both when both apply. These are indicators,
not toolbar filters. Match the Status dropdown's font, weight and color to
Subdivision and Builder, including its empty All statuses label.
Multiple values within a filter are alternatives; active filters intersect. Keep the
Lots and Builder Takedowns filter selections independent. Existing selected lots
stay selected through filtering; Select visible acts only on matching rows.

Builder appears immediately after Linked to, using the existing Lots.Builder1
lookup and a searchable single picker. Alphabetize only Type1 == "Builder"
choices; keep historical values readable and check the chosen record's type
fresh before saving. The Builder picker lives directly in the row in Edit mode;
choosing a value saves immediately without opening an editor modal. On hold is
a boolean checkbox, disabled in read-only mode. Use Budget Manager's circular
pencil [line-note control and popover](notes.md) between Select and Lot. Its
yellow state reflects nonempty persisted notes.

Keep the open subdivision menu, query, focus and option identities through
background count and lot reads. Patch only changed badges and batch count
updates. Reuse the mounted lot report when its rows and editing context have
not changed; cached subdivision clicks must not refetch lots. Filtering is not
a save-state change and must not animate every unchanged table cell as saved.

Use checkboxes and Shift-click on a checkbox or lot number for ranges in the
current visible order. Select visible respects search; a block checkbox affects
only that visible block. Editing selection is separate from takedown selection.
Create Takedown requires every selected lot to meet the existing eligibility
rules and belong to one subdivision. Existing takedown reports remain read-only;
their complete lot detail uses the same block grouping without repeated codes.

Start each widget session read-only, with a slider-style Edit mode switch above
the report. In Edit mode, numeric inputs save on blur or Enter; Escape discards
an unsent draft. Keep the native searchable single Builder picker inline.
Switch modes by patching editable cells; preserve mounted rows, report containers,
date cells, selections, collapsed blocks, focus and scroll. Reuse the sorted
Builder choices for the loaded collection, and populate a row's complete Builder
choices only when its picker opens. Preserve its current or failed-draft value
while populating choices. Switching modes must not request or save data. Keep
draft, pending-write and unknown-result locks in place.
Lot Size inputs are 70 px (one third of the prior 210 px limit); currency inputs
are 105 px (half). Show Appraised Value immediately after Earnest Money. Remove
Address from the list, and keep Entered, Purchase and Close dates always visible
as read-only dates in both modes, including empty values. They are not editable
or optional columns. Mass update is available in Edit mode, chooses fields
explicitly, shows current/mixed values and a
before/after preview, and keeps unchecked fields unchanged. Empty checked text
or numeric inputs explicitly clear that field; unchecked On hold means false
only when its field is selected. Missing fields disable their editing controls.

Only verified saves get mint inline checks and the shared black success popup.
Multi-lot saves use the persistent [transfer progress](transfer-progress.md)
dialog. Preflight checks the captured values and subdivision before any writes;
each saved lot is read back. Report confirmed, rejected, unknown and unsent
destinations separately. Check status reads only and never repeats a write.
Retain selections, fields, context guards, focus/inert locks and drafts on errors.
Single inline saves keep the report mounted, patch only the changed row, and
use grouped [success feedback](success-feedback.md) after persisted verification.
Serialize rapid field saves; keep captured before values, exact decimals, drafts
and row identity. Stop queued unsent edits on a failure. Unknown writes expose
Check status and never replay; invalid/known failed fields retain their error and
allow explicit Enter retry or Escape discard. Keep the report position and focus.

Implementation: [list UI](../../widgets/manage-lots/src/app/lots-list.js),
[styles](../../widgets/manage-lots/src/app/lots-list.css), and
[update controller](../../widgets/manage-lots/src/app/lot-edit-controller.js).
