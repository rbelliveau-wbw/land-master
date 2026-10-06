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

Ordinary Pro Forma Save also shows a decorative spinner while pending and hides
the header X and pending footer. Verified success closes automatically and returns
to the saved record. Failed or unknown saves stop the spinner and keep a Close
action and retained draft; they never auto-dismiss or replay a write. Respect
reduced motion. This exception does not change other batch transfer dialogs.

Ordinary Save failures also retain the actual error in an alert inside the dialog,
including expected and saved Land Cost amounts when those differ. A disappearing
toast must never be the only explanation. Clear that alert when another dialog
run starts. Exact persisted verification and duplicate-send protection remain.

Ordinary Pro Forma Save includes a collapsed **Save log** within the mounted dialog.
It remains keyboard-accessible while the save is pending and displays actual elapsed
time, running requests and request-budget waits. Logging sends no additional requests,
does not unlock Close or replay writes, and retains the last three runs for Copy log
after the dialog closes. Keep diagnostics collapsed by default.

Open an in-widget dialog immediately when the user presses the final action. Use the shared navy gradient header, source → destination identity, amount and record counts, a slim progress bar, numbered stage rows, Running / Up next / Done / Needs review chips, and a pinned status/action footer. On completion show a prominent outcome and a per-destination list with names, counts, amounts where applicable, and verification states.

Ordinary Contract creation and Lots & Pricing Save use the action-button exception
requested October 5, 2026: show Saving on the existing button and a short result
banner, with no progress/result overlay. Retain the detailed captured ledger,
actual error diagnostics, pending interaction lock and duplicate-write guard.
Unknown writes retain the draft and turn the same button into **Check status**;
read-only reconciliation never completes unsent setup or replays a write.
Verified creation opens the created record. Verified Lots & Pricing saves
close the editor and refresh the originating screen, preserving its view,
filters, expanded rows and scroll. Read-only recovery uses the same success
behavior. Preserve the distinction between a
verified created parent and complete setup: unfinished setup says **Contract
created. Setup needs review.** Record the failure through the existing audit and
critical-error reporter once per run without alternate-endpoint email retries.
Actual Lot transfers, file batches and approval operations retain their dialogs.

After complete verified Contract creation, show a prominent green success banner
with 16px text, a centered SVG check, and comfortable padding for five seconds.
Say **Contract created and sent to Legal for review** only when the verified
saved parent is Proposed; otherwise say **Contract created successfully**.
Unknown or incomplete setup retains its existing persistent review warning.
Cancel the previous banner's dismissal timer when replacing it, so an older
success cannot prematurely clear a new confirmation or error.

The October 6, 2026 pricing-save trial uses a black top-center success banner
with white text and a centered mint SVG check. After user review, reduce the
trial by 30% (release 1.61.17): 15.4px text, 22.4px icon, 11.2px vertical/18.2px
horizontal padding, 9.8px gap and proportionately smaller radius/shadow. Keep
its existing nonblocking status announcement and 3.5-second
auto-dismiss. Apply this treatment only to verified Lots & Pricing save and
read-only recovery success pending the user's verification; other success and
error implementations retain their existing presentation and duration.

Ordinary Contract saves show elapsed time and the number of verified destinations
beside the Saving button, with a **Live audit log** action. Keep the existing
audit toggle and its Copy/Clear/Close controls usable during the write lock.
The audit panel samples existing request timings every 500ms, showing active
requests and actual Creator budget/throttle waits without making extra requests.
Copy log retains the last three runs' timings and destination states; omit
business payloads and approval recipients/tokens. Stop sampling at settlement.
Contracts uses normal request timing with no artificial per-minute budget
(requested October 5, 2026). Keep the shared max-three concurrency and respect
actual Creator throttle responses; do not add fixed delays to ordinary saves.
Wrap the save footer on narrow screens so the log and save controls remain visible.
When a confirmation replaces the editor, remount the captured draft before
starting the workflow so its Saving, live audit and Check status controls stay
connected. Verify writable fields and the authoritative child records; do not
write a parent summary which a native on-success workflow derives differently.
Creation finishes from its exact verified destination ledger and merged rows;
an unrelated full-report reload must not delay its success confirmation.
Bound additional setup reads to 30 seconds of active/unexplained waiting,
allowing known request-budget idle time. Late reads cannot resume ended writes.

Contract completion opens its existing confirmation immediately with a disabled
**Checking…** action while fresh scoped details are read. Patch the mounted
confirmation when ready. Cancelled or stale checks cannot reopen it or enable a
write, and failed capability/data checks leave completion disabled.

Lot completion uses the Clear summary confirmation requested October 6, 2026.
Omit the explanatory sentence below its heading. Show the contract identity,
selected group count and contract pricing, then the changes on completion and
preserved values. The count describes selected lots, not guaranteed writes;
show all pricing groups when sizes differ. Keep eligibility in an expandable
**Which lots receive terms?** section: Open/blank status, unassigned/Placeholder
Builder, no purchase/close dates, compatible links and matching pricing. Retain
no-lots/no-pricing/no-match warnings and actual open-action counts. Use
**Apply terms & complete** only when lot pricing matches; keep **Complete contract**
for completion without lot writes. Preserve the mounted preflight, existing
write/progress path, viewport-capped scrolling body and centered SVG close icon.

Build the dialog once and patch its nodes. Pace only display changes at about 560 ms so fast replies remain readable; never delay requests for animation. Skip display pacing under reduced motion. Keep the result visible until Done/Close. Review transfer can return to the original review with its explicit completion banner and disabled, relabeled action.

Use `role=dialog`, `aria-modal=true`, named title/context, polite live status, a progressbar with a truthful accessible value, trapped focus, and an inert background. Disable Close and Escape until a safe terminal state. Block duplicate writes throughout requests and display settlement. Center every X and check with explicit SVG geometry. Preserve focus on dismissal. Cap the dialog to the viewport and scroll its body on small screens.

## Evidence and recovery

Define object-specific verification before implementing the stages. An API acknowledgement alone is insufficient: require server read-back or a targeted reconciliation response proving all intended destinations and fields. Count progress only from confirmed work. When the server processes one batch and returns at the end, show a running batch stage until that response; do not pretend to stream individual destinations or advance percentages on a timer.

A partial response must retain confirmed destination IDs and distinguish them from unconfirmed destinations. A timeout/lost response may have saved data: say so, stop automatic sends, and offer review. Do not blindly replay a financial or multi-record write. A retry must first recheck persisted state and be idempotent. If the backend cannot support a safe recheck/repair, require manual destination review rather than adding a misleading retry button.

For Budget transfer the stages are Verify destination Budgets → Send costs to Budgets → Verify saved values. Preflight uses the existing read-only preview. The existing `PF_Budget_Transfer` apply function verifies destination header metrics, item amounts/rates/notes, parent totals and Project.Proforma before returning success and `completed` IDs. The widget requires the exact intended unique Budget IDs, expected total, and apply action. Completed IDs on an error are retained; unknown results never enable another send in that session. Preflight is bounded to 30 seconds; an apply response is bounded to 90 seconds, after which the result is explicitly unknown and review is required. This UI adds no transfer or repair endpoint.

## Regression checklist

Verify immediate open, readable fast success, delayed response, double clicks, close/Escape while running, partial completion, lost response, malformed success/missing or duplicate destinations, preflight rejection without a write, stable DOM updates, keyboard/focus, narrow viewport, reduced motion, and a terminal result that stays open. Use a local fixture or an explicitly disposable workflow for screenshots; never replay a real transfer merely to demonstrate the modal.
