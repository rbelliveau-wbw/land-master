# Budget Modification Element Persistence

Manual Budget Modifications use the existing native component request contract.
Choosing `(1) Labor`, `(2) Materials`, `(3) Equipment`, `(4) Subcontractor`, or
`(5) Other` assigns the full positive modification amount to that field and
explicit zeroes to the remaining four. `Modification_Type` supplies the
Increase/Decrease sign; component fields store unsigned amounts.

The November 2 Creator export already contains this contract in
`createBudgetModification` and `modificationAdmin`. This change brings those
two extracted function files into agreement with that authoritative native
implementation. It does not add a new endpoint, field, approval route, or
PO modification handler.

## Existing Schema and API Contract

| Element | `Budget_Modification` field |
| --- | --- |
| `(1) Labor` | `Labor_Budget` |
| `(2) Materials` | `Materials_Budget` |
| `(3) Equipment` | `Equipment_Budget` |
| `(4) Subcontractor` | `Subcontractor_Budget` |
| `(5) Other` | `Other_Budget` |

`Create_Budget_Modification` retains its existing key/value arguments:
`itemId`, `modType`, `amount`, `reason`, `reference`, `effectiveDate`, `track`.
`Modification_Admin` retains `action`, `modificationId`, `budgetId`, `modType`,
`amount`, `reason`, `reference`, `effectiveDate`.

For a Materials modification of $125.35, `amount` is a JSON **string** containing:

```json
{
  "contract": "budget-components-v1",
  "components": {
    "Labor_Budget": "0.00",
    "Materials_Budget": "125.35",
    "Equipment_Budget": "0.00",
    "Subcontractor_Budget": "0.00",
    "Other_Budget": "0.00"
  }
}
```

Both functions require all five values, valid nonnegative currency with at most
two decimal places, and a positive combined amount. They derive `Amount` by
summing components. Existing native callers that allocate across multiple
components remain supported. Legacy decimal-string callers remain accepted;
creation leaves their components unallocated, and scalar updates preserve any
existing component fields.

Creation inserts `Amount` and all components before creating the approval chain
or sending mail. The existing recoverable record ID remains in the response if
approval-template or email delivery fails. Update validates all components
before changing the record, replaces all five fields together, and retains
approved-item and Budget rollups. Existing authenticated permissions, native
read-only-profile override, combined `PO:` modification guard, route selection,
delivery behavior, and targeted approval reconciliation remain in place.

## Creator Publication Check

PMP publishes repository/frontend changes; the user owns Creator promotion.
Do not invoke a live create/update/repair merely to check deployment.

1. Compare the native Development editor with
   [createBudgetModification](../creator/functions/createBudgetModification.dg)
   and [modificationAdmin](../creator/functions/modificationAdmin.dg).
   If the November 2 component-aware bodies already match, this source sync
   needs no additional Creator change.
2. If either editor still accepts only decimal `amount`, compile/save the
   matching function body and promote both through the normal Creator process.
   Preserve the existing Custom API signatures, authentication and bindings.
3. Confirm the five existing fields are available on `Budget_Modification` and
   in the report used by Budget Manager. Do not create replacement fields.
4. For the normal user acceptance scenario, create a manual modification with
   each element in Development, confirm its saved `Amount` and five component
   values, review the same selected element in request details, and complete the
   existing approval flow. Keep test records/approval email under user control.
5. Check an existing automatic PO modification is still managed through its PO;
   the standalone update API must refuse a `PO:` reference. Verify the existing
   targeted read-only approval check after publication, following
   [Approval Progress](../knowledge/design/approval-progress.md).

## Regression Evidence and Rollback

Run `node scripts/test-budget-modification-elements-backend.mjs`. It executes
the checked-in Deluge function bodies with native-shaped lookup fixtures and
large string IDs. It covers all five selections and both signs, persistence
before routing/mail, existing multi-component and scalar callers, missing/
invalid/negative/subcent/zero values, mutation-free validation failures,
permission denial and owned-budget access, automatic-PO isolation, email
failure recovery, changing elements, and approved rollups.

This offline adapter does not establish native Creator compilation, current
editor parity, publication, delivered email, or a successful live write. Those
checks remain explicitly separate. Repository validation and the Pages build
are required with the complete Budget widget change.

Rollback the Budget widget to its prior complete release through
`deploy/environments.json`, preserving the permanent URL and all saved records.
Keep the component-aware native functions when returning to the older widget:
their scalar compatibility supports it. If native function rollback is required,
use the saved prior Creator bodies after reviewing newer native changes; do not
blindly replace them with stale extracted functions from an older repository
commit, and never erase saved component data.
