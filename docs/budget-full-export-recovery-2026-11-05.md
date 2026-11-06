# Full Budget Export Recovery And Batching

Budget Manager **122.29.102** addresses the supplied November 5 log:
49 successful 20-item pages exported 980 of 2,881 matching budget items, then
the 50th request returned Creator **2955**, the per-minute API limit. The log
spans 35 seconds. The live response advertises `pageSize:20`; the previous
checked-in collector assumed 200. Each successful page was also retained and
rendered in full in the audit log, including all five element rows per item.

## Resulting Behavior

The collector honors a stable advertised page size from 1 through 200. Older
responses without that field retain their 200-item contract. Exact string IDs,
ordered unique rows, the captured upper bound, matching counts and all five
element rows remain required before a file is prepared. Once the counted total
has been collected, an extra empty-page request is unnecessary.

Only this read-only full export recovers from minute throttling: retain completed
pages, wait 61 seconds, then retry the same cursor, at most three times per page.
The button shows **Waiting** and the retained count during the pause. Actor or
environment changes stop the operation before another request or download.
Other errors still fail without a partial file. Attachment PDF/Excel exports and
all other workflow writes retain their previous behavior and do not gain retries.

Success audit entries contain cursor/count facts instead of financial rows.
Recoverable minute throttles use warning severity; an exhausted export still
shows its actual error. The existing mounted report, export menu, duplicate
prevention and truthful row-count progress remain in place.

## Creator Changes

`exportBudgetSnapshot` reads up to **100** matching items per page and advertises
that capacity. It fetches the related categories, budgets, subdivisions, projects,
approved modifications and HeavyJob Budget import rows once per page, indexes
them by exact native IDs, and reuses the existing element calculation through
the query-free `budgetElementExportValues` helper. The existing
`budgetElementExportRows` wrapper supplies the same native facts to that helper
for individual downloads, attachments and approval mail.

For the supplied 2,881-item count this requires **29 calls instead of 145**,
an 80% reduction before any transient retries. This is a request-count estimate,
not a measured live completion time. Per-page matching counts remain fresh;
this paged read does not become a transactional snapshot.

No form, field, report, API registration, audience or data is changed. Existing
read fields are Add_Budget.Project/Subdivision1/Subdivision_Code;
Subdivision.Subdivision_Name/Subdivision_Code/Project; Project.Project_Name;
Budget_Category.Budget/Deparment/Category_Code/Budget_Category_Name; Budget_Item
identity, labels, unit/rate, parent totals, description, five preliminary/final
elements and ten HCSS/GP actual element fields; Budget_Import_Item.Budget_Item,
Data_Source, Cost and five source elements; Budget_Modification.Budget_Item,
Status, Modification_Type, Amount and five budget elements. Approved signed
modifications, credits, actual-only and offsetting element rows, four-decimal
precision, and unknown-versus-zero allocations retain their existing meaning.

The existing authenticated `Export_Budget_Snapshot` and environment bindings
keep their names, signature and `ALL_DETAIL` mode. Legacy attachment behavior
is unchanged.

## Publication And Verification

The user authorized main, Production and Creator deployment on November 5.
This release builds on 122.29.101, retaining its scoped SNAPSHOT_DETAIL and
SNAPSHOT_META modes and four-sheet individual Excel attachment flow. Deployment
uses only these three Creator functions:

1. Capture the current native bodies for reconciliation and rollback, then add
   `budgetElementExportValues(map sourceValues)` from its source file.
2. Update `budgetElementExportRows` and `exportBudgetSnapshot` from source.
3. Compile and verify read-only ALL_DETAIL pages in Development, including an
   actual end-to-end export with unchanged count and all five element rows.
4. Promote the selected Creator functions through the existing environments and
   promote the hosted widget only when authorized. Keep stable widget URLs.

After explicit authorization, the current Development source was captured and
reconciled with main. The original scoped snapshot/meta and attachment body is
retained byte-for-byte behind the new ALL_DETAIL branch. All three functions
compiled, saved and persisted after reopening. Creator normalized getAll to
getall; all other code tokens matched. A native read-only Development export
returned all 90 items and 450 element rows with pageSize 100 and no more pages.
Creator **9.152** published exactly these three functions from Development to
Stage and Production; both environments show 9.152 and No changes available.
The Production export audit confirms **29 successful pages, 2,881 items and
14,405 element rows**, with a final 81-item page, stable total/upper bound and no
errors. The first and last successful page timestamps are 20 seconds apart.
Browser download capture stalled, so a saved CSV file was not independently
inspected; this timing is page-processing evidence, not an end-to-end benchmark.
Source rollback copies and saved native bodies are retained under
`creator/full-budget-export-2026-11-05/`; the page-facts evidence contains no
exported amounts, descriptions or names.

Focused regressions execute the collector and real widget transport/action:
20/100/200-item capacities, same-cursor recovery, bounded retries, waiting counts,
actor changes, duplicate clicks, typed XLSX/CSV output, formula-safe text,
missing/failed reads and absence of partial downloads. Backend regressions
compare the extracted calculation to the prior helper and inspect batched reads.
The 2,881-item native-shaped fixture passes with 29 pages and 233 bounded table
reads, including offsetting elements on the final page. The legacy attachment
export body is byte-for-byte unchanged. Full `npm run validate` and
`npm run build:pages` passed. Validation used the bundled Python runtime and
ordinary child-process access; the default Windows Python alias was unavailable.

Changed files: `widgets/budget-manager/src/app/full-budget-export.js`, its
`widget.html` integration and `widget.config.json`; the three Creator functions
listed above; `scripts/test-budget-full-export.mjs`,
`test-budget-full-export-backend.mjs`, `test-budget-full-export-recovery.mjs`,
`test-budget-element-exports.mjs` and the prior-helper fixture; `package.json`,
widget/API manifests, Development and Production mappings, immutable 122.29.102
release, this handoff and the Budget module guide.

## Rollback

Map Budget Manager to **122.29.101** and rebuild Pages. Restore the captured
pre-install native `exportBudgetSnapshot` and `budgetElementExportRows` bodies
through the normal Creator publication flow if backend rollback is required. The added
query-free helper can remain unused. No record rollback or URL change is needed.
