# Budget Rejection and Reallocation Controls

Budget Manager `122.29.121` follows the owner's November 9 requests for a required
PO rejection prompt, concise Budget copy and compact reallocation controls.
Development and Production use this immutable release; Stage and permanent
Creator widget URLs remain unchanged. This builds on `122.29.120`, including its
Requests API repair, and preserves the earlier review-link and XLSX corrections.

## Behavior

- Reject PO opens an in-page reason dialog from Details or Approvers. Blank and
  whitespace-only input cannot confirm. The trimmed reason is appended to prior
  recorded approval notes using the existing `note` contract and 10,000-character
  native bound. Existing unsaved notes prefill the prompt. Cancel, Escape and
  backdrop close only the prompt and restore the Reject PO focus without writes.
  Confirmation rechecks actor, PO/revision and active approval, then starts the
  existing mounted progress and guarded decision controller. Approve remains
  direct with optional notes. No native rejection-email behavior is added.
- Remove generic successful PO subcaptions (including reservation/chain/draft/
  deletion statements), completed-upload boilerplate, reallocation instructions,
  Optional/mode captions, export descriptions and the Creator implementation
  footer. Remove the repeated "leave this open" line from approval progress.
  The export confirmation title identifies Attachments as its destination.
  Retain actual errors, unknown outcomes, incomplete uploads, availability and
  permission notices, record identities, amounts and necessary warnings.
- Reallocation uses centered green plus and red minus SVG buttons. Accessible
  names, pressed state and native signed-value behavior are unchanged. Display
  `(1) Labor` through `(5) Other` consistently.
- Show $0 is the existing Budget pill-switch pattern, in the title bar, off by
  default. Hide known zero-budget elements. Preserve original/current/revised
  amounts, required/entered changes, PO allocations, availability, pending
  activity, negative amounts and unknowns. A focused zero editor stays visible
  until field exit. Switch changes only mounted visibility; no model update,
  totals update, native read/write or save is triggered. Reallocation element
  rows are explicitly registered with the shared keyed visibility/resize engine.

## Changed Files and Native Scope

- UI: `po-ui.js`, `po-progress.js`, `po-reallocation-ui.js`,
  `purchase-orders.css` and `widget.html` under Budget Manager's source directory.
- Shared: Budget-specific row registration in `shared/interaction-surfaces.js`,
  synchronized to existing widget source copies. Other module branches and
  environment mappings are unchanged.
- Supporting: focused PO tests, desktop fixtures/server, relevant design guides,
  Budget module notes, version/hash metadata, widget manifest, immutable release
  and Development/Production environment mapping.
- Forms/fields: existing `Budget_Approvals.Approval_Notes` stores the reason via
  `handlePurchaseOrderApproval`; existing `Payment_Request.PO_Approval_State`
  and linked modification status continue to follow that native function.
  No schema or field changes; all record IDs remain strings in JavaScript.
- Functions/APIs: unchanged `managePurchaseOrder` and
  `handlePurchaseOrderApproval` decision/note contracts. No new Custom API,
  recipient lookup, mail helper or backend function.
- Creator deployment required for this change: **No**. The prompt is the widget's
  required-input gate and uses the already supported native Approval Notes.

## Verification and Rollback

Actual source handlers exercise prompt-only initial click, required reasons,
prior-note preservation, native maximum length, exact one-decision payload,
Cancel/Escape/backdrop and focus trap, denied/stale/recovery states and unchanged
Approve. Reallocation tests cover Show $0 defaults/reveal/restore, stable controls,
unchanged model/totals/write count, required/focused rows, numbered signs, existing
signed offsets, native-shaped balances, revision reload and permission guards.

Desktop checks in the agent-owned browser verify blank/whitespace rejection is
disabled, Cancel restores the PO, confirmed fixture rejection reaches the real
controller's terminal result without a filler caption, and keyboard Show $0
reveals/restores all five elements. A $1,000 decrease retains its value/reason
through filtering. Visible SVG boxes are centered in the actual 30-by-29-pixel
buttons. All UI writes use isolated fixtures; no real PO decision or mail occurs.

Run `npm run validate` and `npm run build:pages`, monitor both GitHub checks and
Pages publication, then compare live Production files to the built release.

Rollback: restore Production's Budget Manager mapping to `122.29.120` and rebuild
Pages; retain the immutable `122.29.121` release and latest Development mapping.
No Creator or data rollback is required.
