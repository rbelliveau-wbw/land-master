# Boards

Repository-wide rule for applicable surfaces; see [scope and exceptions](README.md).

## Construction priority swimlanes

Use the **Signal rail** selected October 21, 2026. A 54px left rail pairs the
priority name with a small colored signal: double up for ASAP, up for High,
and a dash for Medium. Keep the thin vertical track behind the signal and label.
Priority names remain visible; color and icons are supplementary.
Status column headings and priority rail labels use uppercase, 900-weight text
(October 21 refinement). Keep card text in its normal case and preserve native
status/priority values; casing is presentation only.

Priority rows stay in ASAP, High, Medium order, with the existing status columns
aligned across them. Retain every supported/legacy status. Missing priority
appears in Unassigned after the normal lanes; preserve unexpected nonempty
priority labels in extra lanes after Medium rather than discarding records.
Keep rows tall enough for their full card stacks. The board's border must hug
its real rows, with no viewport-filling blank area below them. Use compact
content-sized lanes (92px minimum drop area) and the muted report palette:
`#d9e5f1` headings, alternating `#eaf1f7`/`#e3ecf5` lanes, light cards.
Scroll the whole board only when its content exceeds the available space,
with the priority rail and status headings retained at its edges.

Omit request totals, status-column counts, lane counts and the Review badge on
the Construction Requests board. Other list/review surfaces keep their existing
counts. Construction cards match the approved mockup's information: full request
name, real current action when present, budget type, Date Needed and checklist
progress. Date Needed replaces the completed/total action text in the card footer
(October 22, 2026); use the existing numeric date formatter and an em dash when
the native date is absent. Keep its Date Needed tooltip/accessibility label and
leave dates outside numeric transitions. Use the loaded native record/checklist, never preview
data. Omit the repeated subdivision line and all parent/child badges or links
on this board (October 21 correction). List/detail family information stays.
Cards open with Enter/Space and have visible keyboard focus.

Drag between priority lanes to change Priority; drag between status columns to
change Status. A diagonal move commits both fields in one native header update.
Dropping on a priority rail changes Priority while retaining Status. Pending
Review requests permit priority changes for existing editors; accepting or
declining them still requires Review. Reject read-only/completed requests,
ordinary moves into/out of Pending Review, and assignment of unknown priorities.
Reuse the request editor's native update adapter and the existing status handler,
including completion confirmation/cascade, acknowledgement/error handling,
unknown-write protection, string IDs, permissions and filters. Never move the
card optimistically before the native acknowledgement.

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
