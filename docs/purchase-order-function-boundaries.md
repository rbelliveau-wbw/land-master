# Purchase Order function boundaries

The existing Budget Manager widget owns the compact ledger, searchable pickers,
description editor, generated cost-code display, exact live calculations and
per-item budget preview. It sends one PO command to `managePurchaseOrder`.

Creator owns persisted validation, reservations, automatic budget modifications,
approval decisions and email. Browser calculations do not authorize writes.
These functions have active callers:

| Function | Purpose | Called by |
| --- | --- | --- |
| `managePurchaseOrder` | Authenticated PO commands and persisted write verification | PO Custom API |
| `poValidatePayload` | Validate exact amounts, dates and complete lines before writes | `managePurchaseOrder` |
| `poSnapshot` | Read and verify the saved header, lines and approval bundle | PO commands, balances, approval handler |
| `poBudgetBalances` | Calculate item balances from reserved POs and modifications | PO commands, final approval verification |
| `poCurrencyString` | Normalize supported exact currency | PO functions and shared approval policies |
| `poMultiplyExact` | Verify quantity × price and cent rounding | Payload validation, persisted line verification |
| `poApprovalBundle` | Verify one sequential chain for the PO and its modifications | Snapshot, approval handler, email |
| `handlePurchaseOrderApproval` | Record and verify the active person's decision | `managePurchaseOrder` |
| `sendPurchaseOrderEmail` | Send the combined PO/lines/modifications email to the active person | PO submission, approval handler |

Shared template functions also serve the existing Budget, Modification, Pro Forma
and Contract workflows: `manageApprovalPolicies`, `approvalConfigurationSnapshot`,
`resolveApprovalRoute`, `snapshotApprovalRoute` and `applySharedApprovalPolicy`.
They remain separate from the PO ledger.

## Cleanup

The temporary `poNativeCurrencyProbe` and empty `r213f2f` stub were removed from
Development after Creator reported no references. The diagnostic probe source is
removed from the deployable repository. No business function was removed based
only on its name.

## Supported capacity

The application enforces 100 lines per PO. Native Development testing saved 100
calculated lines and independently verified their receipt, amounts, UOM and cost
codes. A 250-line attempt exceeded Creator's Deluge execution limit before PO
writes. This is an application cap, not Creator's subform row limit: PO lines are
separate `PO_Item` records.
