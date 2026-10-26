# Repository-wide design rules

**Standing user direction, October 15, 2026:** every guide in this directory is
a repository-wide rule for its applicable component or interaction, across all
existing and new modules. Reference widgets show how to implement the rule;
they do not restrict its scope. Apply the relevant guides together with the
general style guide whenever creating or changing a surface. Keep explicit
module exceptions and existing permissions, business rules and data contracts.

The rules express the required design, not a claim that every existing screen
already implements it. Record adoption gaps and release evidence in module
documentation. Keep new reusable decisions here so future repository work
inherits them through [AGENTS.md](../../AGENTS.md).

Read the focused guide for the component being changed. Use this index to find
it; unrelated guides do not need to be read for every small edit.

| Guide | Use for |
| --- | --- |
| [Empty row filters](empty-row-filters.md) | Hide Empty switches beside Search; Budget and Pro Forma item visibility |
| [Attachments](attachments.md) | Main-list paperclip actions, file counts, attachment modals, upload/preview/download/delete and Added by |
| [Comments](comments.md) | Main-list comment actions, activity counts, conversation modals, composer and message actions |
| [Boards](boards.md) | Construction content-sized priority swimlanes, Signal rail, priority/status dragging, card fields and Legal's board exception |
| [Line notes](notes.md) | Budget's circular pencil, yellow note state, anchored textarea popover and single-field note saves |
| [Approval progress](approval-progress.md) | Sending, approving, rejecting and reconciling approvals |
| [Approval administration](approval-administration.md) | Approval rules, approvers, permanent territory/department scope, change history and route testing |
| [Settings workspace](settings-workspace.md) | Left navigation, separate settings screens, embedded approvals and retained drafts |
| [Transfer progress](transfer-progress.md) | A committing action that writes to several records |
| [Record details](record-details.md) | Read-only main-report details, identity/date pills, compact previews and complete detail modals |
| [Payment requests](payment-requests.md) | Budget Requests cards, PO vendor/amount/status columns and Edit/View actions |
| [Takedown receipts](takedown-receipts.md) | Builder Takedown editor, sequential interest periods and live receipt |
| [Lot lists](lot-lists.md) | Block-grouped lot tables, cell editing, shift selection and mass updates |
| [Success feedback](success-feedback.md) | Black routine success popups, contextual wording and inline save accompaniment; preserve inline green checks |
| [Forecast matrices](forecast-matrices.md) | One row per builder, February fiscal-year month groups, field-change saves and missing-year creation |
| [Number transitions](number-transitions.md) | Sliding push for input-driven quantities, stable scope, immediate real values and reduced motion |
| [Interaction motion](interaction-motion.md) | Required tabs, disclosures, row movement, refresh continuity, save feedback, overlays, row highlights and progress meters for all new features |
| [General style](style-guide.md) | Shared palette, controls, responsive layout and remaining established patterns |
| [Crew scheduling](crew-scheduling.md) | Paired milestone/task Gantt rows, synchronized filters, dates, propagation, locks and local testing mode |

Keep one focused Markdown document per reusable component family. Put its
related buttons, badges, loading states and dialog behavior together. Record
new reusable preferences in the relevant guide; keep module rules and release
evidence in the module documentation.

## Updating a design

1. For a new standardized component, create its focused Markdown guide in
   `knowledge/design/` and add it to this index.
2. For an existing component, read and update its current guide, then update
   the affected implementations. Apply it across the requested scope and follow
   it in future work in every module. Retain module permissions and business
   rules; record any pending adoption explicitly.
3. Run focused implementation checks and `node scripts/test-design-docs.mjs`.
   Native Creator UI gates are required for SDK migrations that affect data
   flow; routine presentation edits use code checks unless requested otherwise.
   The consultation and testing rules live in [AGENTS.md](../../AGENTS.md).
   The automatic check discovers guides and verifies links; it does not enforce
   visual match by itself.
