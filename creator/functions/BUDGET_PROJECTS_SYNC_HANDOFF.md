# Budget metrics to Zoho Projects — 2026-10-27

The Budget Manager sends each of its three saved quantity fields through
`syncBudgetMetricToProjects(string payload)`. No form workflow was created.
The user requested a function and Custom API instead of form workflows.

| Budget field | Projects API name | Projects field ID |
| --- | --- | --- |
| `Acres` | `acres` | `1496277000000995261` |
| `Lot_Total_Residential` | `lot_total_residential` | `1496277000000055039` |
| `Equiv_LF_of_Street` | `equiv_lf_of_street` | `1496277000000055041` |

## Saved in Creator Development

- Function: `syncBudgetMetricToProjects`, native component `4410926000005479009`.
- Custom API: `Sync_Budget_Metric_to_Projects_DEV`, enabled, POST, OAuth2,
  All users, application/json, Key and Value, Standard response; bound to
  Land Master **Development**, Default namespace, the function above.
- The request body is `{ "payload": "<JSON string>" }`. The JSON string contains
  `budgetId` and `field`. Optional `dryRun:true` performs read-only validation.
- Response: Creator's standard `{code:3000,result:"<JSON string>"}` wrapper;
  the function result includes `ok`, source/destination identities and
  `writeAttempted`. Dry runs never confirm a Projects update in the widget.

The function derives the actor from `zoho.loginuser` and reuses Budget's native
User_Access/owner-ID permission pattern. It rejects the read-only Construction
Budgeting profile. It accepts no browser-supplied destination or metric value.
It reads the saved Budget, requires its `Subdivision_Code`, checks the linked
Subdivision code when present, filters Projects by exact `project_code`, requires
one result and confirms the returned ID/code before updating. It reuses the
milestone portal `700737166`, `zoho_projects_connection`, detailed invokeurl and
`workflowRunLog`; Projects v3's documented update method is PATCH with a JSON body.
It updates only the changed metric. Missing/duplicate mappings, denied access,
HTTP/API errors and uncertain acknowledgements fail without automatic replay.
No initial backfill, schedule, Subdivision quantity write, or milestone change.

Projects' Lots and Equiv. LF fields are Number fields. Fractional values for
either are rejected without rounding; blank source values are not treated as
zero. Acres retains decimal precision from the saved Budget. Native Number and
Decimal values are normalized to Decimal for the whole-number check, then the
two destination Number fields are sent as integers. The live lot-count dry run
caught Creator treating Number `186` differently from its Decimal floor result;
the normalized comparison was saved and verified in Development.

## Owner promotion required (PMP leaves Creator publication to the owner)

1. Publish **only** `syncBudgetMetricToProjects` from Development through Stage
   to Production, with its existing `workflowRunLog` dependency available.
2. Create the corresponding production Custom API
   **`Sync_Budget_Metric_to_Projects`** with the same request/response settings,
   bound to Land Master **Production** and the promoted function. The Development
   API is a separate Microservice; do not point production callers at Development.
3. If Stage testing is needed, register `Sync_Budget_Metric_to_Projects_STAGE`
   against Stage. The widget's existing runtime routing adds the correct suffix.

The widget release is promoted per the user's PMP instruction. Until the
Production function/API are available, native Budget saves still succeed and
the UI reports **Budget saved · Projects update failed.** It never falsely
reports external success. After a successful external acknowledgement, the
existing compact success toast says **Budget saved · Projects updated.**

## Verification and practical limits

Native Development compilation and a read-only function execution verified:
Budget `4410926000003558988`, code `AR05`, maps to Projects
`1496277000013686372` (Arroyo Ranch 5). Budget Acres was `35.51`; Projects Acres
was `35.508`. The dry run returned `ok:true`, `dryRun:true`,
`writeAttempted:false`; no Projects value was changed. The live response
materialized the unique match as a Map, handled explicitly before the code check.
Final read-only executions of the corrected function passed for all three
fields: Acres `35.51`, residential lots `186`, and equivalent street length
`5872`, each matched the same Project ID and returned `writeAttempted:false`.

The custom API's enabled state and binding were inspected. A real external
PATCH and end-to-end production SDK save remain unverified until owner promotion
and an approved live test. Source-level runtime tests cover all three fields,
native-save-before-push ordering, SDK response wrapping, local/external errors,
unknown responses, stale revisions, serial rapid edits and truthful feedback.
Per-field serialization orders one browser's rapid saves; it is not a global
cross-user lock. No editable-value equality check was added after saves.

## Regression and rollback

Preserve header access, approval locks, per-unit calculations and saves, Lot Price
and Land Cost behavior, owner edits, environment routing, and inline green saved
indicators. New sync calls run only after confirmed saves of the three quantities.

Rollback: map production Budget Manager back to **122.29.84** and rebuild Pages.
The new function/API can remain unused or be disabled; there is no form workflow
to remove and no field migration or data deletion.
