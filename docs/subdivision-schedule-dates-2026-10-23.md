# Daily Subdivision schedule dates — October 23, 2026

The existing daily workflow now fills four additional Date fields on
`Subdivision`. Construction Request reads these fields from its linked
Subdivision, so the module shows the persisted daily schedule values.

The workflow display name is **Zoho Projects - Sync Subdivision Schedule Dates**.
Its internal name remains `Sync_Final_Acceptance_Due`; its existing daily
`Settings.Next_Workflow_Run` schedule and America/Chicago timezone stay intact.
The source is Zoho Projects data synchronized through Zoho Analytics.

| Subdivision field | Analytics query and column | Source rule |
|---|---|---|
| `CP_Release_Goal` | Projects Joined w/ Milestones → `Const Plans Release` | Latest Start Date of `Const Plans Release - Const Start%` or End Date of `Municipal Review%`. |
| `Construction_Start_Goal` | Projects Joined w/ Milestones → `Const Start` | Latest End Date of `Const Plans Release - Const Start%` or Start Date of `Rough Cut%`. |
| `CP_Release_Estimate` | Tasks Joined Directly w/ Projects → `CP Rel Est (EST. Comp Date)` | `Construction Plans Released` task → `EST. Comp Date`. |
| `Construction_Start_Estimate` | Projects Joined w/ Milestones → `Rough Start Date` | Latest `Excavate & Rough Grade` task → `Start Date`, matching Budget Module-JK's Rough Cut Start column. |

The two query view IDs are `2107789000014058199` and
`2107789000014196812`. Their Project ID and Project Code export columns are
`Projects (Zoho Projects).Project ID` and
`Projects (Zoho Projects).Project Code`. The workflow reads the query outputs
directly so milestone prefix matching and MAX selection retain their SQL meaning.

## Mapping, missing values and reviews

Projects IDs remain strings. Each query row must agree with the existing Projects
ID → Project Code join, and the code must identify exactly one Subdivision.
Ambiguous or mismatched identities never write or clear destination dates.
Repeated identical source rows are valid; distinct values for one project/field
are preserved for review. Each of the four fields can update independently of
the other fields and of acceptance-date candidates.

Processing is scoped to codes that currently exist in the native Subdivision
form. The Projects export filters by those codes. Acceptance Tasks retain their
original compact `Final Acceptance` / `Accept - Muni` name filter; a local
Project ID/code scope check skips unrelated tasks before date parsing. A native
full-source diagnostic demonstrated HTTP 414 when 325 Project IDs were placed
in the task export's GET criteria, so that long ID filter was removed. Both
construction queries use their existing
cached exports, deduplicate the selected flat-map rows natively, and skip
irrelevant codes locally before identity/date parsing.
The filtered milestone export reached its existing twelve-check pending limit
in a native diagnostic, so the shared export helper and its polling contract
remain unchanged. A native read-only diagnostic proved that the task query's
30,131 selected rows reduce to 262 distinct maps. A separate native eight-map
fixture returned the expected six distinct values, including reordered keys,
different dates/IDs/codes and null versus absent fields. The exact-row
fingerprint guard remains after native deduplication as a backstop before
field/date processing; different source values still receive conflict review.

Both complete construction exports are validated before construction
assignments begin. A scoped query may legitimately return no rows, which
preserves the corresponding dates. An explicitly returned null/empty date
clears its stale destination value. An absent query row preserves that field
because it does not prove an authoritative null. Export/schema failures stop
the workflow. A malformed date or conflicting source value preserves only its
affected destination field and appears as a review.

The native October 23 diagnostic returned dates such as `25 Jun, 2021 00:00:00`
and `01 Dec, 2020 23:59:00`. Both acceptance and construction parsers now handle
the captured `dd MMM, yyyy` calendar date first and retain ISO, slash and dash
fallbacks. Time-of-day is discarded without timezone conversion. The initial
diagnostic also reached Creator's statement limit while iterating unscoped
query rows; native scoping and early duplicate skips address that observed
load. The live recheck remains necessary to establish the actual runtime limit
for the environment's complete relevant cohort.

The construction extension reduces native statement use with precomputed
column definitions, one state-map initialization per field, one schema check
per source row, cached successful date parses, and one native multi-field
update per eligible Subdivision. Conditional values keep fields with missing,
invalid or conflicting sources at their existing values while valid fields
can still update or clear. Creator documents the four-field update as one
statement in its [multi-field update reference](https://www.zoho.com/deluge/help/data-access/update-multiple-fields.html).

Analytics supports SQL WHERE criteria, including `IN`, quoted table/column names
and single-quoted values in its [criteria specification](https://www.zoho.com/analytics/api/v2/prerequisites.html).
The [asynchronous View ID export](https://www.zoho.com/analytics/api/v2/bulk-api/export-data-async/create-export/view-id.html)
accepts those criteria. Native codes and IDs are escaped as SQL string literals;
the code never concatenates unescaped criteria values.

The prior Final Acceptance task selection, REVIEW conflict rule and assignment
remain intact. Review-only completion now records **Partial** with a review count
instead of throwing after successful independent updates. This prevents a review
of acceptance dates from rolling back valid construction dates. Actual failures
still flow through the existing Failed/Partial audit catch and rethrow.

## Sources, verification and deployment

The canonical reviewed action is
`creator/integration-audit/overrides/Sync_Final_Acceptance_Due.action-1.dg`.
`scripts/prepare-integration-audit.py` applies it verbatim when regenerating
the matching prepared action and schedule component. Original export baselines
remain unchanged.

Focused checks execute the actual additive Deluge block with native-style
map/date fixtures, including captured month-name formats, scoped criteria and
apostrophe escaping, large IDs, null and absent values, duplicate values,
ambiguous mappings, invalid dates, empty/failing exports, dry run and acceptance
review independence. A load-shaped case supplies 344 irrelevant milestone rows
and 30,131 identical task rows and verifies that only four date parses occur.
This fixture checks processing paths, not Creator's native statement counter.
A repeated task fixture verifies native-style deduplication occurs before the
row loop, while a complete 344-Subdivision fixture verifies all
destinations update once and four shared dates require only four parses.
The existing preparation check still verifies the original
acceptance assignments, selected columns and daily schedule, with a narrow
exception for these four authorized fields and query identity columns.

Run:

- `node scripts/test-subdivision-schedule-sync.mjs`
- `node scripts/test-integration-audit.mjs`
- `python scripts/test-integration-preparation.py`

Native Creator Save is required to validate Deluge syntax and the four Date
fields. Native form/workflow changes require Development → Stage → Production
publication; repository publication alone does not install them. Deployment
status and native evidence are recorded with the task's release report.

Rollback the workflow from the captured October 23 native-before action, restore
its prior display name if needed, and roll the widget back through its normal
release mapping. Leave the added fields and their data intact until all callers
have been rolled back; remove the canonical override only when restoring the
previous generated action deliberately.

## October 23 release evidence

- The native Development write-enabled sync executed successfully against 17 matching Projects and 17 scoped acceptance tasks. Four construction fields were populated in native Subdivision records.
- A subsequent read-only diagnostic processed the complete Analytics cohort: 325 nonblank Project Codes, 325 matching Projects and 250 acceptance tasks. It executed successfully with both business/date writes and audit-log writes disabled. Native Development destinations remained the Development cohort; this was not a Production record-write test.
- Native map distinct validation preserved six distinct maps from eight fixtures, including different dates, Project IDs, Project Codes, explicit nulls, absent keys and reordered keys. The full task query exported 30,131 raw rows and reduced to 262 distinct projected rows.
- The final native workflow was restored with `dryRun = false`, no diagnostic scope, native distinct and the proven task-name-only acceptance filter. The Development side of the Stage publication preview was checked directly; it contained the final action. The Application IDE displayed an older cached action after the workflow editor update, so that cached view was not used as release proof.
- The four fields are visible in the native Production All Subdivisions report (346 records). The Production Land & Projects Subdivision pane and Construction request matrix were inspected on desktop after Pages deployment. Production values for the new fields await the daily sync; no manual Production data sync was run.
- Full `npm run validate` and `npm run build:pages` passed after preserving the concurrent Settings 1.6.1 release.
- Hosted releases: Contracts **1.62.35**, Land Master **8.17.2**. Previous Production rollback versions: Contracts **1.62.34**, Land Master **8.17.1**.
- Frontend [CI passed](https://github.com/rbelliveau-wbw/land-master/actions/runs/39973510928) and [Pages deployment passed](https://github.com/rbelliveau-wbw/land-master/actions/runs/39973511065).
- Native Creator Stage and Production publication completed at **9.119**; only `Sync_Final_Acceptance_Due` was selected for this package.
- [Native daily workflow](https://creator.zoho.com/appbuilder/wbdevelopment/land-master/workflowbuilder/Sync_Final_Acceptance_Due/edit).

The Subdivision native form, All Subdivisions report, before/after schedule sources and environment status are preserved in `creator/schema-changes/construction-schedule-dates/`. The read-only diagnostic is a local test artifact only and must never replace the published schedule.
