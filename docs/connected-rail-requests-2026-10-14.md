# Connected Rail Requests (2026-10-14)

Budget Manager 122.29.40 replaces split Payment Requests/Budget Modifications sections and modification KPI tiles with the chosen Connected Rail list. Parent rows share aligned type, name/description, approval, MM/DD/YYYY date, amount, status and four fixed icon slots. Groups sort newest-first; unknown dates are last, with deterministic exact-ID tie breaks.

A budget modification is nested only when its budget and stored PO:<id>:<current revision> reference exactly match a managed PO in this phase. Children remain adjacent when sorted. Orphans and old-revision references remain visible standalone. The child budget delta does not increase the parent's payment amount or alter aggregates. Its approval status comes from the exact parent; no independent lifecycle buttons appear. Existing PO and standalone modification actions retain their native permissions. Check/Wire retain their existing read-only behavior.

Exact existing roster IDs supply approver initials when full names are known; role labels remain the fallback. Report denial, loading and stale-phase handling remain intact. PO-only children are excluded from redundant standalone-chain repair; the native handler already excludes these records.

No Creator fields, functions or Custom APIs change. Existing managePurchaseOrder and handlePurchaseOrderApproval recovery updates are a separate pending user promotion. Full repository validation, Pages build and actual-source request/PO regressions are required. Native record testing is left to the user. Rollback Budget mapping to 122.29.39.

Root AGENTS.md records that a message containing only uppercase PMP authorizes repository main/Production release and leaves Creator promotion to the user.
