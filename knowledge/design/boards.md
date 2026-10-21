# Boards

Repository-wide rule for applicable surfaces; see [scope and exceptions](README.md).

## Construction priority swimlanes

Use the **Signal rail** selected October 21, 2026. A 54px left rail pairs the
priority name with a small colored signal: double up for ASAP, up for High,
and a dash for Medium. Keep the thin vertical track behind the signal and label.
Priority names remain visible; color and icons are supplementary.

Priority rows stay in ASAP, High, Medium order, with the existing status columns
aligned across them. Retain every supported/legacy status. Missing priority
appears in Unassigned after the normal lanes; preserve unexpected nonempty
priority labels in extra lanes after Medium rather than discarding records.
Keep rows tall enough for their full card stacks. Scroll the whole board,
with the priority rail and status headings retained at its edges.

Omit request totals, status-column counts, lane counts and the Review badge on
the Construction Requests board. Other list/review surfaces keep their existing
counts. Keep existing card information, full wrapped names and open-record
behavior. Cards also open with Enter/Space and have visible keyboard focus.

Priority lanes are read-only grouping. Drag only changes status within the
same priority lane, through the existing guarded status handler. Reject drops
into another priority, Pending Review, or from read-only/completed requests.
Preserve completion confirmation/cascade, native acknowledgement/error handling,
unknown-write protection, record IDs, permissions and filters.

Reuse the Contracts native `queueFlip`/`flipCapture`/`flipPlay` path, whose
ownership is recorded by the [interaction registry](../../shared/interaction-surfaces.js).
Construction cards retain keyed string identity and animate horizontally and
vertically after the real save. Reduced motion stays still; changed actors
cannot replay old visual state. Large boards measure/animate only the moved
card beyond 100 cards. Keep horizontal and vertical board scroll during saves.

Legal retains its existing status-column board, counts and behavior. This is
an explicit module exception; do not copy Construction's priorities onto Legal.

Reference: [board styling](../../widgets/contract-management/src/app/construction-board.css)
and `renderConstructionBoard`/`boardCard` in the [shared host](../../widgets/contract-management/src/app/widget.html).
