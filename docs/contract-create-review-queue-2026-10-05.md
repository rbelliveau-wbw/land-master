# Contract creation and Review Queue handoff

The user requested that every newly created Contract enter Review Queue. The
widget candidate now writes `Contract.Status="Proposed"` for every user already
allowed to create Contracts, both on initial creation and after verified child
setup. An old draft containing New cannot bypass this default. Review Queue
includes Proposed parents; the main Contract list excludes them. Legal's existing
Accept action moves the parent to New. No existing Contract is migrated.

Action defaults remain Proposed for proposal-only users and New for editors or
the existing degraded-access path. Demo actions retain their existing New default.
Approvals remain Not Sent, with the existing sequence, recipient, reminder and
email defaults. Create access and Legal acceptance permissions are unchanged.

## Confirmed Production workflow

The fresh Production **V9.43** export contains `Set_Contract_Approved_Con` at
DS line **48223**, triggered by `Contract_Approvals` **on add or edit / on success**.
Its original body is:

```deluge
contract = Contract[ID = input.Contract1];
approvals = Contract_Approvals[Contract1 = input.Contract1 && Status != "Approved" && Status != "Not Sent"];
if(approvals.count() == 0)
{
    contract.Status="Approved";
}
```

The first Not Sent approval satisfies this predicate, so it can change a Proposed
parent to Approved during setup. The widget's final captured-status update normally
restores Proposed, but a verification failure at the first approval stops before
that final update. This confirms a production routing defect that can explain a
partially created parent entering the main list. It does not establish which
approval field caused the reported fresh-read mismatch.

Source: `Land_Master-production (3).ds`, exported October 5, 2026, modified
`2026-10-05T20:55:16.747Z`, SHA-256
`9c0e529be609ef73fcf771598b547b5d69d595bde78d59d347009ed9fe05f55b`.
The [original extracted body](../creator/workflows/baseline/Set_Contract_Approved_Con.production-V9.43.2026-10-05.dg)
and adjacent provenance JSON provide rollback evidence. Historical exports remain
unchanged.

## Replacement and native publication

Use the entire body in
[`Set_Contract_Approved_Con.dg`](../creator/workflows/Set_Contract_Approved_Con.dg)
for the existing **Set Contract Approved - Contract Approval** custom script,
retaining its form and trigger. The guard preserves a parent already in Proposed
and ignores a missing parent. The existing approval-count rule still applies to
non-Proposed parents. No approval row or other workflow is edited by this script.

The replacement compiled and saved in Creator Development, then the single
approval workflow was published to Stage V9.44. A fresh Production V9.45 schema
export confirms the Proposed guard is live: `Land_Master-production (4).ds`,
modified `2026-10-05T21:25:14Z`, SHA-256
`8339d8f49f6e1b7cf7832e79bab107113c8757b4b2d5ed7fc0bfea4ca0d52cf9`.
No live Contract or approval row was changed as a test. Rollback
restores the extracted prior production body and the prior widget release;
restoring that native body also restores its original routing defect.

## Regression checks

`node scripts/test-contract-new-review-queue.mjs` exercises actual widget creation
for editor, editor/proposer, proposal-only and degraded-access roles, including
initial and final persisted Proposed status, stale draft defaults, Review versus
main-list membership, one parent queue count, unchanged action/approval defaults,
existing Accept-to-New behavior, denied access and Demo routing.

`node scripts/test-contract-proposed-workflow.mjs` executes the replacement's
queries and condition against fixtures. It verifies Proposed preservation for
Not Sent, Approved and blocking approvals; the existing non-Proposed truth table;
another-parent isolation; unchanged approval rows; and parentless templates.
This adapter does not compile Deluge or exercise a live workflow.

After native compilation/publication, confirm on disposable records that adding
a Not Sent approval leaves a Proposed parent in Review, and that non-Proposed
parents retain their existing blocking/nonblocking behavior. The retained unknown
setup continues to block another write; no automatic repair, create replay or
correction of the originally reported Contract is included.
