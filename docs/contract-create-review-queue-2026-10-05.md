# Contract creation and Review Queue handoff

The Review Queue includes `Contract.Status="Proposed"`; the main Contract list
excludes that status. Existing widget creation defaults proposal-only users to
Proposed and users with edit access to New. A change to that default is awaiting
the user's routing decision and is separate from the backend candidate below.

The exported `Set_Contract_Approved_Con` workflow runs after a
`Contract_Approvals` record is added or edited. It sets the parent Contract to
Approved whenever there are no approval rows with a status other than Approved
or Not Sent. Inserting the first Not Sent approval therefore satisfies that
predicate and can change a Proposed parent to Approved. The widget normally
restores its captured parent status after all setup rows verify. A failure at the
first approval stops before that final update, leaving the native parent eligible
for the main list after a fresh read.

This mechanism is confirmed in `creator/exports/Land_Master_2026-08-06.ds`,
workflow block starting at line 36562, and in the generated workflow inventory.
The current live workflow and the exact failed production approval fields have
not been read, so this is a concrete candidate based on the committed export,
not a claimed live diagnosis or completed production repair.

## Exact replacement and trigger

Use the entire body in
[`Set_Contract_Approved_Con.dg`](../creator/workflows/Set_Contract_Approved_Con.dg)
for the existing **Set Contract Approved - Contract Approval** workflow:

- Form: `Contract_Approvals`.
- Record event: **on add or edit**.
- Trigger: **on success**.
- Action: the existing custom Deluge script.

The only routing change is to preserve a parent already in Proposed. The
existing non-Proposed approval-count rule remains. A missing parent is ignored.
No approval row, recipient, decision, email helper or other workflow changes.
The candidate uses existing `Contract.ID`, `Contract.Status`,
`Contract_Approvals.Contract1` and `Contract_Approvals.Status` fields.

Before applying, read the live workflow and compare it with this candidate; merge
the Proposed guard into any newer live body rather than replacing unrelated live
logic. Save and compile it in Creator Development, then use a disposable Proposed
Contract to confirm that inserting a Not Sent approval leaves the parent
Proposed. Also confirm its existing behavior for a non-Proposed parent with
blocking versus nonblocking approvals. Creator publication is required to apply
this workflow in Stage/Production. This repository file does not deploy it.

`node scripts/test-contract-proposed-workflow.mjs` executes the candidate's actual
queries and guard against fixture records. It verifies Proposed preservation,
the existing non-Proposed truth table, another-parent isolation, unchanged
approval rows and parentless approval templates. It is not native Deluge
compilation or a live workflow test. The retained unknown setup still blocks
another write; no automatic parent repair or create replay is added.

Rollback: restore the prior live body captured before editing. The historical
export remains unchanged. No record migration or automatic correction of the
reported Contract is included.
