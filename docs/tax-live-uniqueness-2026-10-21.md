# Tax Center live uniqueness and native save diagnostics — October 21, 2026

## Diagnosis and live evidence

The supplied 19.17.25 stack is `submitAddTPY → createRecord → mutate →
acknowledge`. The controller replaced every failed acknowledgement with
“Creator did not confirm the exact record change.” Error serialization then
omitted custom response/code properties. The report consequently cannot prove
the original native code or transport shape. A read-only Production browser
search confirmed that the attempted generated parcel-year code already exists.
No live record was inserted, changed or deleted during this investigation.

The latest committed Creator export defines `Tax_Parcel_Year_Code` as mandatory,
unique and limited to 50 characters. The widget generated that value without
checking uniqueness, and its narrow definite-rejection list omitted native field
validation code 3001. A rejected duplicate could therefore become an
unreconcilable missing-created-ID review and prevent corrected submissions.

Zoho documents [field validation and native status codes](https://www.zoho.com/creator/help/api/v2.1/status-codes.html),
[unique/max-length validations](https://www.zoho.com/creator/help/api/v2.1/add-records.html),
and the [SDK2 single-record success shape](https://www.zoho.com/creator/help/js-api/v2/add-records.html).
The supported success parser was retained; no speculative success envelope was
accepted to hide a genuine failure.

## Patch and exact implementation

- `widgets/tax-center/src/app/tax-controller.js`: `checkParcelYearCode` performs
  the exact-code native count and length check. `mutate` calls it again for the
  captured TPY insert. `definiteRejection` includes 3001 (and documented update
  denial 2897) only within the existing unambiguous, no-ID rejection structure.
- `widgets/tax-center/src/app/widget.html`: `addTPYIdentity` preserves the
  existing code-generation and inheritance rules. `validateAddTPYUnique` checks
  Year/Property/Subdivision changes before enabling Save. A small amber dot and
  short status line appear by the selection; valid results hide it. Each reply
  must match the current selection and dialog sequence. Closed/older replies
  cannot enable Save or overwrite the current notice. Checking/unavailable and
  duplicate results keep Save disabled. Programmatic submit uses the same gate.
- `shared/creator-data.js`: bounded, cycle-safe `failureMessage` extracts native
  rejection messages, field maps and workflow alerts from recognized envelopes.
  It does not change success, rejection, read/write routing or retry predicates.
  All nine shared adapter copies remain byte-identical.
- Tax, PF, Manage Lots, Contracts and Gantt error builders now retain the native
  reason. Tax creation audit entries also retain explicit response context.
  Expected local duplicate validation does not generate a critical-error report.

The exact executable replacements are the above functions in this commit and
its immutable release copies. A duplicate neither adds a suffix nor truncates
the unique code, updates a different company, guesses a record by name, nor
replays the failed insert. This repair adds no automatic field-equality check.

## Affected data and backend

Existing forms/reports: `Tax_Parcel_Year` / `All_Tax_Parcel_Years` and Tax's
`Property` / `All_Property` error handling. Uniqueness checks read only
`Tax_Parcel_Year_Code`. Existing saved fields/payloads, exact string IDs,
parcel-year matching and Creator workflows are unchanged. Other modules receive
native diagnostic text only; their operation/approval/retry rules are unchanged.
No Creator forms, fields, functions, Custom APIs, permissions or deployment change.

## Regression checks

Whole actual-source Tax fixtures cover duplicate detection before Submit, disabled
Save during lookup/failure, clearing the notice for a new available year, missing
identity, generated-code length, stale selection responses, native field-validation
messages, corrected deliberate submission, compound applied-ID responses,
workflow JSON transport errors and no replay. Existing whole/effective Tax suites
retain complete counted reads, field/date/money/project clears, batch ledgers,
unknown/late outcomes and read-only recovery. Shared tests cover native field maps,
JSON wrappers, alert arrays, opaque success/business data, cycles and output bounds.
Existing Manage Lots, PF, Contract and Gantt suites exercise their error paths.

Required release checks: `npm run validate`, `npm run build:pages`, shared and Tax
focused suites, immutable Tax release suite, CI and Pages deployment. The final
browser check inspects the real existing duplicate before Submit and verifies the
production notice and disabled button; it does not create a test tax record.

## Release and rollback

| Widget | New Development / Production | Previous Production rollback |
| --- | --- | --- |
| tax-center | 19.17.26 | 19.17.25 |
| proforma-manager | 1.80.133 | 1.80.132 |
| manage-lots | 0.13.11 | 0.13.10 |
| contract-management | 1.62.32 | 1.62.31 |
| milestone-gantt | 1.1.19 | 1.1.18 |
| budget-manager | 122.29.69 | 122.29.68 |
| land-master | 8.16.12 | 8.16.11 |
| lot-sales-explorer | 1.5.61 | 1.5.60 |
| settings-manager | 1.5.20 | 1.5.19 |

Stage stays at its existing mappings. The additional shared-copy releases keep
source/runtime copies aligned; only the five identified native error builders
and Tax's uniqueness flow change behavior. To roll back, restore the listed
Production mappings and rebuild Pages; keep immutable releases. Development
continues tracking its latest complete release.
