# PO submission statement-limit repair — November 9, 2026

## Confirmed production incident

Julie King's Submit of PO `4410926000005902006`, budget
`4410926000002289002` (Eagle Prairie — Phase 01), returned native code 9430
after approximately 7.15 seconds at 20:25 UTC / 2:25 p.m. Chicago time.
The frontend release was Budget Manager 122.29.112. Her draft contains five
lines, three distinct Budget Items and a total of $167,122.50.

Read-only production inspection of Microservices → Custom API →
Manage Purchase Order → API Hits → Julie's November 9 2:24 p.m. HTTP 500 entry →
Stack Trace confirmed: `Number of statement execution limit exceed Line:(1632)`.
The visible Error Response was the same generic 9430 as the incident report;
Info List was empty. The production PO was subsequently read through its normal
widget and still displayed Draft, all five lines and the original total.
No submit, approval, email, recovery or record edit was performed during diagnosis.
This does not independently prove the operation/phase-lock records are clear.

## Cause and patch

Submit called the complete `poBudgetBalances` collector for all 227 phase Budget
Items. Notification called `poElementExportRows`, which repeated the complete
collector; the Excel attachment repeated it again. Each pass rebuilt five
component rows per item. The shared full-budget reader had been reused without
limiting its item work to the PO. Native execution exhaustion bypassed the normal
structured function error response.

The patch moves the unchanged accounting collector into
`poBudgetBalancesForItems(string budgetId, list budgetItemIds)`:

- The existing `poBudgetBalances(string budgetId)` signature forwards an empty
  list to retain the complete budget reader and existing approval callers.
- Submit and in-flight edits pass the distinct keys from the already-validated
  grouped line amounts, after acquiring the existing phase lock.
- `poElementExportRows` derives its distinct scope from persisted current-revision
  `PO_Item` rows before requesting balances. Zero selected rows return immediately.
- The collector preserves the phase-wide PO/snapshot/legacy integrity pass. It
  skips unselected Budget Items before reading baseline/component amounts or
  approved modifications. Existing selected-item arithmetic is unchanged.
- Null scopes, numeric/malformed IDs and duplicate IDs fail closed. Missing,
  foreign-phase or template selections fail the exact selected-row count.

For this PO the expensive baseline/component calculations cover three items per
pass instead of 227. The email and Excel retain the same output contracts.
No browser values authorize accounting changes. There is no new retry or lock
takeover behavior.

## Exact source and installation

The complete replacement code is in:

1. `creator/functions/poBudgetBalancesForItems.dg` — new map function with a string
   `budgetId` argument and list `budgetItemIds` argument. Install first.
2. `creator/functions/poBudgetBalances.dg` — existing full-budget wrapper.
3. `creator/functions/poElementExportRows.dg` — existing list function, same argument.
4. `creator/functions/managePurchaseOrder.dg` — existing string function, same argument.

Affected records are read from Add_Budget, Budget_Item, Payment_Request, PO_Item,
Budget_Modification, Budget_Approvals and Approval_Route_Snapshot. No forms or fields
are added or modified. The existing `Manage_Purchase_Order` / Development API names
and arguments are unchanged. No frontend release or production mapping changes.

**All four functions are installed in Creator Development.** Each function
compiled, saved and was independently reopened for source verification. The
native full reader returned 155 items for Arroyo Ranch — Phase 05; the scoped
helper returned exactly three selected items with identical complete balance
DTOs. Production publication was not performed and remains with the user.
Original and reloaded bodies plus the verification audit are captured in
[`creator/po-submit-capacity-install-2026-11-09/`](../creator/po-submit-capacity-install-2026-11-09/README.md).
Keep the existing permanent widget URL. Main advanced to Budget 122.29.113
while this repair was being prepared; preserve that frontend mapping.

The incident's live Balances response lacks the newer reallocation capability
fields that are present in repository main. The repository patch is based on
`6e2eb2cb`, then reconciled with main `3d085d49`; it must not be used to replace an older production function wholesale
and inadvertently publish the separate reallocation feature. Compare the actual
Development sources and publication prerequisites first. When applying to the
older collector, move its own current accounting body unchanged into the scoped
helper and apply only the scope guards and caller changes shown by this diff.
The actual Development collector matched the original repository collector by
source tokens. The helper and wrapper reloaded exactly by tokens; the two
callers were patched surgically against their captured native bodies, preserving
unrelated reallocation work and Creator's existing formatting. Publish only the
intended component set, with dependencies resolved. Creator publication remains
with the user.

## Regression evidence

`scripts/test-po-submit-capacity.mjs` executes the checked-in Deluge bodies through
the existing local adapter with 227 Budget Items, five saved PO lines and three
distinct selected items. Full output filtered to those three items equals scoped
output exactly. The fixture records 261 currency conversions for the full reader
and 37 for the scoped reader. This measures bounded work, not Creator's native
statement counter.

Coverage includes duplicate line aggregation, persisted current-revision selection,
old-revision exclusion, all 15 element export rows, own reservation subtracted once,
native four-decimal component floors, approved increases/decreases, pending credits,
allocated and unallocated legacy commitments, offsetting unallocated modification
counts, malformed/duplicate/null/missing/foreign/template scopes, empty saved line
sets, an invalid unrelated baseline, and zero writes from the collectors/export.

The same test also executes the actual `managePurchaseOrder` Submit body against
local fixture records: 227 items, five lines, three selected items. The full-budget
reader throws if called; the scoped call must receive exactly the three grouped
item IDs. Submission succeeds with five saved lines, selected modifications, one
approval round, a Complete operation receipt and no remaining phase lock. Policy
capture and delivery use local adapters; no real submission or email is sent.

Existing actual-source reallocation, create-permission, approval, delivery,
reconciliation and export tests continue to exercise their original guards.
Local adapters do not establish native Creator compilation, sendmail success or
completion under its actual statement limit.

Local validation: all 127 JavaScript commands from the repository's validation
script passed, as did the focused PO checks, `git diff --check`, repository
validation and `npm run build:pages` (35 environment paths). `npm run validate`
itself stops at an unrelated Python prerequisite: this host only has the Windows
Store Python alias, not an installed interpreter. The Python checks are not
claimed as passed. Repository validation also reports a pre-existing Contract
Management source/manifest warning in baseline `6e2eb2cb`; this patch does not
change that widget.

After reconciliation with 122.29.113, focused Submit/final-approval checks and the
Pages build passed again. Repository commit `074dcca2` passed the full GitHub
[CI workflow](https://github.com/rbelliveau-wbw/land-master/actions/runs/42695506863),
including the Python checks unavailable locally. The existing 122.29.113 Pages
deployment is successful; backend-only files do not trigger a new widget release.

Native compilation, persistence and read-only full/scoped parity are verified.
Remaining native end-to-end verification must use a representative Development
phase with at least 227 items and a five-line/three-item PO: verify one normal
submission, its operation receipt/lock release, exact destination line
count, approval chain and attached Excel. Check duplicate-send and read-only
reconciliation without blindly replaying the production request. Re-read the exact
production operation/lock before permitting a new submit if it remains unresolved.

## Rollback

No production change was performed. If rollback is needed, restore the previous caller and
wrapper versions together before removing the new helper. Do not remove a helper
that still has callers. Restore each environment's captured native pre-change
function versions; repository baseline `3d085d49` is the source rollback reference.
Do not roll back unrelated reallocation functions or schema. No business-data
rollback, frontend release rollback or permanent widget URL change is required.
