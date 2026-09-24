# Approval progress pattern

This is Robby's preferred interaction for sending, advancing, and completing approvals in Land Master. Read this document **before designing or changing an approval flow in any module**, including a new module. The module's business rules determine who approves and what is finalized; this document defines how the user sees and safely recovers from that work.

## The experience

1. Open an **in-widget modal immediately** when the user commits an approval action. Do not use `window.alert`, `window.confirm`, `window.prompt`, a toast as the only feedback, or an indefinite spinner. If a separate confirmation is required, open progress immediately after the user confirms.
2. Show three named phases with a navy gradient header, progress bar, numbered rows, clear Running / Up next / Done / Failed / Needs retry chips, and a footer with live status and actions. Follow the existing Pro Forma **Submit to Legal** visual treatment. Keep copy short and specific to the object and action.
3. Pace **the display only** so fast operations can be read: the current implementations advance visible phases about every **560 ms** and hold the terminal result until the user dismisses it. Start the write and verification immediately; never delay them for animation. Respect reduced-motion preferences.
4. Keep the modal open until a **verified terminal state**: success, notification warning, or conflict/error. Never auto-close success. Keep Close disabled while a request is still in flight or reconciliation is running.
5. Block duplicate approval and submission actions while progress is active. A lost response must not invite a second blind write.

### Phase labels in current modules

| Action | Phase 1 | Phase 2 | Phase 3 |
| --- | --- | --- | --- |
| Budget, non-final Approve | Recording approval | Activating the next approver | Sending approval email |
| Budget, final Approve | Recording approval | Completing approval track | Finalizing budget |
| Pro Forma Send for Approvals | Recording approval request | Activating the first approver | Sending approval email |
| Budget Modification, create or submit Draft | Recording modification | Activating the first approver | Sending approval email |

Use the equivalent three short, truthful phases for a new object. A phase is Done only when the targeted persisted state supports it; an API call returning without an error is not proof of routing, delivery, or finalization.

## Verification contract

- Poll **only the targeted reconciliation API and record/track**, about once per second. Do not refresh an entire report or scan unrelated approval flows to infer success. Use the Creator record ID as a string in browser code.
- Keep a bounded reconciliation window: current flows use **20 seconds**, with **one automatic repair attempt after about 5 seconds** when the targeted persisted state permits a safe repair. No infinite spinner or unbounded retry loop.
- Prefer the existing Custom API and function when they can safely support targeted `Check` and `Repair` modes. Add a new endpoint only when the existing contract cannot serve the new flow. The server must enforce permissions as well as the widget.
- The check response should identify the target and include the parent state, relevant row IDs/statuses/order, pending and approved counts, delivery stamp, recipient role/address, and any object-specific finalization evidence. Scope counts to that track or approval chain.
- Treat `Sent_Date` (or an equivalent delivery stamp) as evidence **only when the email helper writes it after sendmail succeeds**. Clear a stale stamp before activating a new recipient. A submitted request or queued email is not proof that email was sent.
- If the initial write returns an error or times out, check persisted state before deciding what happened. A repeated Start or Approve must be idempotent or guarded against duplicate rows, delivery, and financial writes.

### Current success predicates

| Flow | Verified success requires |
| --- | --- |
| Budget, non-final Approve | Triggering row is **Approved**; its **immediate successor** is the **only Pending** row in that track; `emailSent === true`; `Sent_Date` is populated; recipient role and address are known. |
| Budget, final Approve | Triggering row and all rows in the track are **Approved**; no row is Pending; the parent budget track is **Approved**; the relevant financial finalization state and totals reconcile. There is no next-approver email phase. |
| Pro Forma Send for Approvals | Parent is **Pending Approval** and locked; a chain exists; the first row is the **only Pending** row; no row is Approved; `Sent_Date`, role, and address are populated. |
| Budget Modification create or Draft submit | Modification is **Submitted**; linked approval rows exist; the first row is the **only Pending** row; no row is Approved; `Sent_Date`, role, and address are populated. Both entry paths use the same progress flow. |

For a new module, write its equivalent parent, row, delivery, and finalization predicates before building the modal. Do not copy Budget's financial rules or Pro Forma's role order into an unrelated object.

## Terminal states and recovery

| State | What the modal says and does |
| --- | --- |
| Success | State the verified outcome. For a non-final Budget approval: **“Approved and routed to {role}. Email sent to {address}.”** For final Budget approval: **“Approval track complete. Budget finalized.”** Offer **Done**; keep the result visible until dismissed. |
| Notification warning | Use only when the next or first approver is verified active but email delivery is not. Say the approver is active and the email could not be verified. Offer **Retry email** and **Close**. Retry checks current state first, then sends only the missing email to that active approver. |
| Conflict/error | Explain the failed or unknown verification concisely, without claiming routing succeeded. Examples: **“Approval was recorded, but routing or finalization could not be verified.”** or **“The approval could not be verified. Check its status before trying again.”** Offer **Try again** and **Close**. |

`Try again` must first re-read the targeted persisted state. It may perform one safe, idempotent repair or retry appropriate to that state; it must not blindly repeat a create, send duplicate mail, advance a second successor, or replay partial financial finalization. If a create response lacks an ID, resolve a unique persisted record before reconciling; otherwise show an error that asks the user to inspect the list. The next retry attempt still has its own deadline and terminal result.

The modal can show a failure on phase 1, 2, or 3 according to what is known. A notification warning marks routing Done and email Needs retry. Never mark a later phase Done based only on elapsed time.

## Accessibility and interaction

- Use `role="dialog"`, `aria-modal="true"`, a programmatic title and description, and an `aria-live="polite"` status region. Announce phase and terminal changes without announcing each animation frame.
- Move focus into the modal on open, trap Tab and Shift+Tab, prevent interaction with the page behind it, and return focus to the original action when it closes.
- Escape and Close work **only after the request reaches a terminal, safe-to-dismiss state**. While work or reconciliation is active, keep focus in the dialog and explain that it is still working.
- Give Retry email, Try again, Close, and Done visible labels and keyboard focus styles. Keep the layout usable on narrow screens and under reduced motion.

## Implementation references

- [Budget Approval Progress and Budget Modification send flow](../../widgets/budget-manager/src/app/widget.html): `approvalProgress*`, `inspectApprovalProgress`, `openModificationProgress`.
- [Pro Forma Send for Approvals flow](../../widgets/proforma-manager/src/app/widget.html): `pfApproval*`, `runStartProformaApproval`.
- [Budget reconciliation function](../../creator/functions/handleApprovalAction.dg), [Modification reconciliation function](../../creator/functions/modificationAdmin.dg), and [Pro Forma start/check/repair function](../../creator/functions/Start_Proforma_Approval_Chain.dg).
- [Focused regression checks](../../scripts/test-send-approval-progress.mjs) and module-specific rules in [Budget](../modules/budget.md) and [Pro Forma](../modules/proforma.md).

For each new approval flow, verify immediate open, fast success with readable phases, delayed routing, email failure and Retry email, stale/conflicting rows, ambiguous write response, timeout, safe Try again, duplicate clicks, final-step reconciliation if applicable, keyboard focus/Tab/Escape, narrow viewport, and reduced motion. Document the object-specific predicates, Creator function/API contract, permissions, and rollback in that module's knowledge page.
