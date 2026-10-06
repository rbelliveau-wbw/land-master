# Component design guides

Read the focused guide for the component being changed. Use this index to find
it; unrelated guides do not need to be read for every small edit.

| Guide | Use for |
| --- | --- |
| [Attachments](attachments.md) | Main-list paperclip actions, file counts, attachment modals, upload/preview/download/delete and Added by |
| [Comments](comments.md) | Main-list comment actions, activity counts, conversation modals, composer and message actions |
| [Approval progress](approval-progress.md) | Sending, approving, rejecting and reconciling approvals |
| [Transfer progress](transfer-progress.md) | A committing action that writes to several records |
| [Record details](record-details.md) | Read-only main-report details, identity/date pills, compact previews and complete detail modals |
| [Takedown receipts](takedown-receipts.md) | Builder Takedown editor, sequential interest periods and live receipt |
| [Success feedback](success-feedback.md) | Black routine success popups, contextual wording and inline save accompaniment; preserve inline green checks |
| [General style](style-guide.md) | Shared palette, controls, responsive layout and remaining established patterns |

Keep one focused Markdown document per reusable component family. Put its
related buttons, badges, loading states and dialog behavior together. Record
new reusable preferences in the relevant guide; keep module rules and release
evidence in the module documentation.

## Updating a design

1. For a new standardized component, create its focused Markdown guide in
   `knowledge/design/` and add it to this index.
2. For an existing component, read and update its current guide, then update
   the affected implementations. Retain module permissions and business rules;
   record any pending adoption explicitly.
3. Run focused implementation checks and `node scripts/test-design-docs.mjs`.
   Native Creator UI gates are required for SDK migrations that affect data
   flow; routine presentation edits use code checks unless requested otherwise.
   The consultation and testing rules live in [AGENTS.md](../../AGENTS.md).
   The automatic check discovers guides and verifies links; it does not enforce
   visual match by itself.
