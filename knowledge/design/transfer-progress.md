# Transfer progress modal

Use this pattern when a committing action writes to several records. The reference is Contract Management's `lotRunStart`, `lotRunSet`, `lotRunMergeServer`, `renderLotRun`, and `lotRunEnd` in `widgets/contract-management/src/app/widget.html`. Pro Forma's Budget transfer implements the equivalent in `budget-transfer-ui.js` (`startRun`, `runUpdate`, `pumpRun`, `renderRun`). Approval flows retain the additional reconciliation rules in `approval-progress.md`.

## Appearance and interaction

Pro Forma's ordinary Save uses a compact exception requested October 5, 2026:
show the progress bar and one plain-language status (preparing, saving, checking,
updating totals/schedule). Hide numbered technical stages, API/report names,
record IDs and operation counts. Keep the same persisted verification, pending
close lock, draft retention, duplicate-send protection and truthful terminal
outcome. Show 100% only after the complete save passes verification. Other batch
transfers retain the detailed destination results below.

Open an in-widget dialog immediately when the user presses the final action. Use the shared navy gradient header, source → destination identity, amount and record counts, a slim progress bar, numbered stage rows, Running / Up next / Done / Needs review chips, and a pinned status/action footer. On completion show a prominent outcome and a per-destination list with names, counts, amounts where applicable, and verification states.

Build the dialog once and patch its nodes. Pace only display changes at about 560 ms so fast replies remain readable; never delay requests for animation. Skip display pacing under reduced motion. Keep the result visible until Done/Close. Review transfer can return to the original review with its explicit completion banner and disabled, relabeled action.

Use `role=dialog`, `aria-modal=true`, named title/context, polite live status, a progressbar with a truthful accessible value, trapped focus, and an inert background. Disable Close and Escape until a safe terminal state. Block duplicate writes throughout requests and display settlement. Center every X and check with explicit SVG geometry. Preserve focus on dismissal. Cap the dialog to the viewport and scroll its body on small screens.

## Evidence and recovery

Define object-specific verification before implementing the stages. An API acknowledgement alone is insufficient: require server read-back or a targeted reconciliation response proving all intended destinations and fields. Count progress only from confirmed work. When the server processes one batch and returns at the end, show a running batch stage until that response; do not pretend to stream individual destinations or advance percentages on a timer.

A partial response must retain confirmed destination IDs and distinguish them from unconfirmed destinations. A timeout/lost response may have saved data: say so, stop automatic sends, and offer review. Do not blindly replay a financial or multi-record write. A retry must first recheck persisted state and be idempotent. If the backend cannot support a safe recheck/repair, require manual destination review rather than adding a misleading retry button.

For Budget transfer the stages are Verify destination Budgets → Send costs to Budgets → Verify saved values. Preflight uses the existing read-only preview. The existing `PF_Budget_Transfer` apply function verifies destination header metrics, item amounts/rates/notes, parent totals and Project.Proforma before returning success and `completed` IDs. The widget requires the exact intended unique Budget IDs, expected total, and apply action. Completed IDs on an error are retained; unknown results never enable another send in that session. Preflight is bounded to 30 seconds; an apply response is bounded to 90 seconds, after which the result is explicitly unknown and review is required. This UI adds no transfer or repair endpoint.

## Regression checklist

Verify immediate open, readable fast success, delayed response, double clicks, close/Escape while running, partial completion, lost response, malformed success/missing or duplicate destinations, preflight rejection without a write, stable DOM updates, keyboard/focus, narrow viewport, reduced motion, and a terminal result that stays open. Use a local fixture or an explicitly disposable workflow for screenshots; never replay a real transfer merely to demonstrate the modal.
