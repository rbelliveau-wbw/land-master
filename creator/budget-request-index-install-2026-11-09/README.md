# Requests Bulk Loading Repair — Creator Installation

The user explicitly requested publication after Budget Manager **122.29.120**
was pushed to main and Production. This record covers the existing Creator
function `managePurchaseOrder` and its read-only `ListRequests` action; the
existing `Manage_Purchase_Order` API registration is retained.

## Current Publication Status

The first package, **9.172 — Requests Bulk Loading Repair**, completed in Stage
and Production with exactly one selected component, `managePurchaseOrder`.
The live Requests read then rejected a genuine phase list with "Request phase
scope must be a list of exact ID strings." That package did not pass live
Requests verification.

The corrected native-list guard compiled, saved and was independently reopened
in Development. A read-only Requests load for the demo5 profile returned
**8 Requests, 1 Linked Bud Mod and 7 accessible phases**, without quota or
read-unavailable banners. Corrected single-function package **9.173 — Requests
Native Collection Repair** completed in Stage and Production. The final native
Environments screen showed both at 9.173 with **No changes available**. This
records the observation at publication completion, not future Development work.
CI and Pages both succeeded for frontend commit `db7ca437` / **122.29.120**.

[The publication record](verification/production-deployment.json) retains the
failed 9.172 attempt and corrected 9.173 completion. A live Production
**122.29.120** manual Refresh completed in **981 ms**, showing **12 Requests,
2 Linked Bud Mods and 102 phases**, with no warnings. This is one observed
read-only load, not a guaranteed future load time. The live New Request menu
showed exactly **Bud Mod, Check Request, Wire Request and Purchase Order**;
its button rendered at 128.09375 px wide with an eight-pixel label/arrow gap,
and the desktop screenshot was visually verified.

No financial record was written, no real PO was submitted and no approval email
was sent by this installation or verification.

## Native Change And Verification

Only the existing List branch was replaced against the captured native function
body. The rest of the native function was preserved. The baseline differed from
canonical repository source only through Creator's parenthesis formatting. The
saved, independently reopened body matched the expected patched candidate after
the observed comment, whitespace and parenthesis formatting and native
`getAll` → `getall` and `subList` → `sublist` normalization. This is a normalized source comparison, not a
claim of byte equality or financial execution.

The failed guard serialized the entire list and matched a JSON-array regex.
The corrected guard keeps the parsed native collection and applies the proven
list-only `subList` operation. It still rejects text-encoded arrays, maps,
scalars and malformed IDs. The existing exact-string entry checks, duplicate
rejection, canonical identities, anchor and native phase membership checks are
unchanged. The local 102-phase regression now throws if validation serializes
a native list, covering the failure missed by the earlier fixture. This reuses
the native list operation already present in `budgetPlanImportRun` and
`budgetActualImportRun`; [Zoho's subList contract](https://www.zoho.com/deluge/help/functions/list/sublist.html)
requires list input.

`ListRequests` validates the authenticated actor and complete exact-string phase
scope, then returns PO headers, used vendor names and captured approval children
in one API call. Existing per-phase List shape, ownership capabilities, write
paths and approval behavior are preserved. No forms, fields, grants, API names
or persisted financial data change.

## Rollback And Verification Scope

Frontend rollback remains Budget Manager **122.29.114**, before the global
Requests tab. The Development mapping retains the latest complete immutable
release. Backend rollback should restore the captured native function before
this List-branch replacement; repository baseline `872117da` remains the
documented canonical reference. No data rollback is needed.

Corrected package publication and read-only Development/Production Requests
verification are complete. Financial Save, Submit, approval decisions and
notification delivery were not exercised; they are outside this read-only repair
verification.

See [the source repair and regression notes](../../docs/budget-requests-api-repair-2026-11-09.md).
