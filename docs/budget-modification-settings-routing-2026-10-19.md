# Budget Modification Settings routing — October 19, 2026

The published Budget Modification rule could be ignored when its hidden
`Adapter_Enabled` migration flag was false. Creation, Draft submission and
chainless repair then built the old VP → CFO → optional COO route with legacy
recipients. New standalone submissions now require the published Settings rule.
For CFO Always and COO Above $10,000, $10,000 uses CFO only and $18,750 uses
CFO → COO, with the configured recipients. At or above includes equality.

The Settings editor also aligns Role, Condition, Threshold ($), Enabled and
Delete in separate columns. Exact decimal strings, inline saves, custom pickers,
keyboard/drag reordering, focus restoration and required PO CFO rules remain.

## Deployment and Creator handoff

PMP publishes Budget Manager **122.29.51** and Settings Manager **1.5.16** through
the existing permanent URLs. Development and Production select these releases;
Stage is unchanged. Pages does not deploy Creator functions.

Compile/save these existing functions in Creator Development, in this order,
then promote them together after native regression checks:

1. [snapshotApprovalRoute](../creator/functions/snapshotApprovalRoute.dg)
2. [applySharedApprovalPolicy](../creator/functions/applySharedApprovalPolicy.dg)
3. [createBudgetModification](../creator/functions/createBudgetModification.dg)
4. [submitBudgetModification](../creator/functions/submitBudgetModification.dg)
5. [modificationAdmin](../creator/functions/modificationAdmin.dg)

Keep the existing `resolveApprovalRoute`, `poCurrencyString` and
`sendModificationEmail` dependencies. No signatures, forms, fields or Custom
API registrations are added or renamed. Existing create/submit/admin Custom
APIs continue calling the same entry points. PMP leaves this Creator promotion
to the user; the native routing fix is inactive until these functions are saved
and promoted. Offline source tests do not establish Creator compilation.

Affected existing forms are `Budget_Modification` (Draft/Submitted and existing
item, budget, amount, reason, reference, effective-date and track fields),
`Budget_Approvals` (recipient/title/order/status and parent links), and
`Approval_Route_Snapshot` (captured context/route). Published `Approval_Policy`,
role/assignment, `User_Access`, budget and Territory data are read unchanged.
No production data migration, live record edit or email was performed here.

## Preservation and failure behavior

- Submitted routes with sent rows, decisions or notes retain their original
  recipients and order. The previously submitted screenshot record is not
  automatically rerouted. Any deliberate cancellation/resubmission remains an
  explicit user action through existing controls.
- Missing, disabled, ambiguous or unroutable policy fails before creation.
  A later capture failure returns the saved exact modification ID, retains
  Draft and sends no email. The widget ends with that error without a duplicate
  create or reconciliation poll.
- Chainless Submitted standalone repair uses Settings. It never guesses orphan
  ownership, deletes orphan history, stamps delivery or sends email. New rows
  remain Not Sent until the normal submission/email path activates them.
- Existing linked chains and PO-linked modifications are left alone. Whole
  Budget tracks retain their existing migration gate. Pro Forma routing and
  route-preservation behavior remain unchanged.

## Regression evidence

`scripts/test-budget-modification-settings-routing.mjs` executes the actual
resolver, snapshot, adapter, create, submit and admin source bodies in an offline
Deluge fixture. It covers the hidden flag being false, exact Above/At or above
boundaries, configured recipients, invalid/ambiguous/disabled configuration,
capture failure, Draft submission, untouched defaults, sent-route preservation,
chainless repair, orphan preservation and repeated repair. It also executes the
real frontend create-result handler with an ID above JavaScript's safe integer
range. It runs within `scripts/test-approval-execution.mjs` and repository CI.

`scripts/test-approval-admin-browser.mjs` uses the real renderer and CSS in desktop
Chrome at 1008×700 and 1440×950. It covers aligned geometry, decimal autosave,
custom pickers, condition switches, animated keyboard reorder, add/remove,
required PO CFO, centered X, focus/inert restoration and reduced motion.

Required repository checks: `npm run validate`, `npm run build:pages`, and
`node scripts/test-design-docs.mjs` all passed locally, along with the desktop
browser fixture. Every asset in both immutable releases matches its source.
Native Creator validation remains a separate
handoff gate: compile all five functions; preview the configured route; test new
standalone increase/decrease and Draft submission around the threshold in
Development; confirm first-recipient delivery and existing-route preservation.
After promotion, use an existing record's read-only targeted check to confirm
the structured response. Never run repair solely to test deployment.

## Rollback

Restore the Production mappings to Budget **122.29.50** and Settings **1.5.15**
and rebuild Pages; keep the permanent widget URLs. Before native promotion,
retain the currently deployed Creator functions. If native rollback is needed,
restore these five functions from commit
`27391319b1805e9dd8be14ae771008f93ed763e6` together, then compile and promote.
That restores the legacy routing defect. Do not remove captured approval rows
or snapshots created by either version.
