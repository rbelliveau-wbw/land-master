# PO Capacity Repair — Creator Development Installation

All four required functions are compiled, saved and independently reopened in
Creator Development. Production publication was not performed.

| Function | Verification |
| --- | --- |
| `poBudgetBalancesForItems` | New helper; reloaded source tokens match repository source. |
| `poBudgetBalances` | Existing full-reader signature retained; reloaded wrapper tokens match source. |
| `poElementExportRows` | Only scoped-balance selection changed against captured native body; reloaded patch tokens match. |
| `managePurchaseOrder` | Only the under-lock balance call changed against captured native body; reloaded patch tokens match. |

`native-before/` preserves the three replaced function bodies. The original
collector matches repository baseline `3d085d49` by source tokens. The new helper
contains the same accounting body with scope guards. `native-after/` contains all
four independently reloaded saved bodies. Native formatting is retained in these
captures; source modules keep the canonical repository formatting.

[The verification audit](verification/native-install-audit.json) records a real,
read-only Development check: the full reader returned 155 items for Arroyo Ranch —
Phase 05 and the helper returned exactly the three selected items. Their complete
balance objects match exactly. The Execute dialog takes comma-separated list
values; a JSON-encoded list was correctly rejected as a malformed scope. The
production incident IDs do not exist in this Development data set and were
correctly rejected by the selected membership check.

No real PO was submitted, no approval email was sent and no financial record was
changed by verification. A native 227-item Submit including real notification
delivery remains a separate end-to-end gate; the actual-source local fixture
passes that Submit path with local delivery adapters.

Publish these four components together, including the new helper dependency.
Keep the current 122.29.113 widget mapping and permanent URL. Creator publication
remains with the user. For rollback, restore the three captured original bodies
before removing the helper; do not remove a function that still has callers.

See [the incident and source repair](../../docs/po-submit-capacity-2026-11-09.md)
for regression evidence, API compatibility and remaining native verification.
