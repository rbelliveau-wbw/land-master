# Line notes

Use Budget Manager's line-item note control for an existing single Notes or
Description field. This differs from the multi-message conversation described
in [Comments](comments.md). Reference: `.nbtn`, `.pop.notepop`, `openNotePop`
and `commitNote` in [Budget Manager](../../widgets/budget-manager/src/app/widget.html).

The control is a 26 px circular pencil button: pale blue `#eef4fc`, border
`#c9d9ee`, icon `#6d8cbf`, 12 px SVG box, and Budget's 2.4 stroke pencil path.
With nonempty trimmed notes, use the `.has` state: amber `#b45309`, border
`#f0c96a`, surface `#fef3c7`. Keep Budget's hover colors. Existing text is the
button tooltip. Accessible labels are Add note, Edit note or View note.
Read-only rows show existing notes; empty controls appear when editing is allowed.

Open the anchored 300 px popover without an overlay or native dialog. Keep its
compact title, record identity, three-row textarea, Clear note, Cancel and Save
actions. Save trims text; Clear saves empty text; Cancel, Escape and outside
click dismiss the staged popover. Ctrl/Cmd+Enter saves. Read-only access disables
the textarea and hides Save/Clear. Fit the popover to the iframe viewport and
return keyboard focus without scrolling.

The host's existing native save and verification rules remain authoritative.
Lot notes use Lots.Notes and exact captured-value preflight/readback, not Budget's
Description field or permission policy. Retain failed text for retry and distinguish
unknown writes from unsent failures. Verified saves update the yellow state and
use the shared [success popup](success-feedback.md). Never claim an unknown save
succeeded. In the Lots list, place Notes between Select and Lot rather than beside
On Hold, and follow the report's read-only/Edit mode switch.


The Purchase Order spreadsheet ledger is an explicit exception (October 9, 2026):
Description remains an inline text field. Replace its pencil with a 23 px rounded
square blue duplicate button containing overlapping squares, matching the user
reference. Do not apply this exception to Budget's other item-note controls.
