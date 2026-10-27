# Budget is the quantity source of truth — 2026-10-27

Budget Manager calls `syncBudgetMetricToProjects(string payload)` after saving one
of the three header quantities. The expanded function updates that same field on
the unique matching Subdivision and Zoho Project. No form workflow is used.

| Budget field | Subdivision field | Projects API name | Projects field ID |
| --- | --- | --- | --- |
| `Acres` | `Acres` | `acres` | `1496277000000995261` |
| `Lot_Total_Residential` | `Lot_Total_Residential` | `lot_total_residential` | `1496277000000055039` |
| `Equiv_LF_of_Street` | `Equiv_LF_of_Street` | `equiv_lf_of_street` | `1496277000000055041` |

## Production API enabled and tested

`Sync_Budget_Metric_to_Projects` is enabled and bound to Land Master Production,
Default namespace, function component `4410926000005504298`. The `_DEV` API remains
enabled against Development component `4410926000005479009`.

Both APIs use POST, OAuth2, All users, application/json, Key and Value, and the
Standard response. Their request is `{ "payload": "<JSON string>" }`; the inner
JSON supplies `budgetId` and `field`. Optional `dryRun:true` performs read-only
validation. Creator wraps the string result in `{code:3000,result:"<JSON string>"}`.
The production endpoint is
`https://www.zohoapis.com/creator/custom/wbdevelopment/Sync_Budget_Metric_to_Projects`.

The actual Production Budget Manager save path was tested on Arroyo Ranch 5,
budget `4410926000001664566`, code `AR05`, Project `1496277000013686372`:

| Field | Temporary test value seen in Projects | Restored Budget and Projects value |
| --- | --- | --- |
| Residential lots | 188 | 186 |
| Acres | 35.52 | 35.51 |
| Equivalent street LF | 5873 | 5872 |

Each change and restoration was inspected in Zoho Projects. The compact success
toast **Budget saved · Projects updated.** was captured. Projects initially had
35.508 acres; final 35.51 intentionally matches the restored Budget source.
Production Budget values were all restored before the Development extension was
tested. No prices, costs, approvals, other budgets or milestone data were edited.

## Saved in Development; PMP leaves these two functions for owner promotion

1. `syncBudgetMetricToProjects`: now writes the changed saved quantity to the
   matching Subdivision and Project. The function compiled in Creator. Native
   Development executions passed for all three fields with
   `subdivisionUpdated:true`, `projectsUpdated:true`, and Projects HTTP 200, using
   restored source values 35.51, 186 and 5872. Subdivision
   `4410926000001979003` and Project `1496277000013686372` matched `AR05`.
2. `workflowExportRun`: removes only the three `subdiv.Acres`,
   `subdiv.Lot_Total_Residential` and `subdiv.Equiv_LF_of_Street` writes from the
   `Update_Budgets_w_Projects1` processing branch and their redundant audit flags.
   The Subdivision status write, Budget Project/Phase/Status identity updates,
   export continuation, cost imports, batch controls and all other branches are
   preserved. It compiled in Creator. The broad import was not executed for testing.

The current schedule action is only
`thisapp.workflowExportEnqueue("Update_Budgets_w_Projects1");`; its actual writes
run through `workflowExportRun`. The published version 9.126 already had no
quantity writes into Add_Budget or Budget_Category. User direction now also
removes the scheduled Projects/Analytics-to-Subdivision quantity writes.

Promote **both functions together**, Development → Stage → Production. The
existing `workflowRunLog` and export dependencies are already published. The
production API is registered; no new API, widget URL, or form field is needed.
Until this promotion, Production keeps its tested Projects-only outbound body
and the previous scheduled Subdivision quantity import. The latest PMP authorizes
repository publication and leaves Creator promotion to the owner.

## Contract and partial results

The actor comes from `zoho.loginuser`; native Budget User_Access/owner-ID checks
and the read-only Construction Budgeting profile guard are preserved. Browser
requests cannot supply the value, Subdivision ID or Project ID. The function reads
the persisted Budget, requires exactly one Subdivision by Subdivision_Code,
confirms any saved Subdivision lookup agrees, and requires one Project with the
same exact project_code and ID before writing either destination.

It updates only the requested metric. Blank/negative values fail; destination
Number fields require whole values without rounding. Creator Number/Decimal
comparisons normalize to Decimal; the Subdivision residential-lot Number write
uses an explicit toLong conversion. Acres retains saved Budget precision.

A dry run returns before both writes and before audit creation. A real execution
writes the native Subdivision field, then PATCHes Projects through the existing
milestone portal `700737166` and `zoho_projects_connection`. Native assignment
success and the exact Projects ID acknowledgement establish success; there is no
automatic editable-value equality check. If Projects fails after the native write,
the response retains `subdivisionUpdated:true`, returns `ok:false`, logs Partial,
and never automatically replays. This is not an atomic cross-system transaction.

Per-field serialization orders one browser's rapid saves; it is not a global
cross-user lock. Native Budget saves remain successful if the separate sync fails.
No backfill, schedule run, quantity migration, or milestone update is included.

## Verification and rollback

Regression coverage exercises actual widget save ordering, all three fields,
standard result envelopes, native-save failures, external errors/unknown replies,
stale revisions, serialized edits, preview honesty, unique destination guards,
dry-run ordering, partial acknowledgement flags and native integer conversion.
A preservation check compares the complete captured import processor with the
new body and permits only the three removed quantity assignments/audit flags and
one explanatory comment. It preserves all unrelated native code byte for byte.

The two prior live bodies are saved under
`creator/workflows/budget-source-of-truth-2026-10-27/`. Restoring the old import
body would resume Projects-to-Subdivision quantity writes, so do that only if the
source-of-truth decision is explicitly reversed. To stop all outbound widget sync,
disable the API or map Budget Manager back to `122.29.84` and rebuild Pages. The
current widget remains `122.29.85`; this follow-up changes Creator functions and
API registration only, with no frontend release required.
