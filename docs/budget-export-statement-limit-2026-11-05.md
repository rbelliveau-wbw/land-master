# Budget Excel Export Statement Limit

The later single-budget PDF failure and browser PDF patch are documented in
[the November 9 PDF incident](budget-pdf-statement-limit-2026-11-09.md).

Production API logs confirmed `Number of statement execution limit exceed` for
Julie’s single-budget Excel export (line 790) and Robby’s Export All Budgets
(line 104) on November 5. Those numbers identify source lines, not execution
counts. The selected Lakeside at Granger – Phase 01 budget loaded 227 items
successfully; the failure occurred during export, after the normal budget read.

## Repair And Contract

Budget Manager 122.29.101 reuses `BudgetFullExport` and the existing attachment
uploader. Individual Excel export reads saved data in batches and builds a real
`.xlsx` in the browser. It retains Summary, Budget Detail, Budget Elements and
Approval History, including all saved zero rows. The 227-item case needs twelve
detail requests, one metadata request, and one file attachment operation.
It retains 1,135 component rows, signed credits, blank unknown component values,
text identifiers, saved parent totals and the existing approval history.
Summary/detail display two decimals; elements display up to four. Underlying
numeric precision is preserved. Category codes sort numerically, cost codes
as text. No budget values or approvals are changed by export.

The existing OAuth2 `Export_Budget_Snapshot` / Development binding, function
name `exportBudgetSnapshot` and two string arguments remain:

- `ALL_DETAIL`: existing global read, with a maximum of 20 items per request
  and `pageSize:20`. Existing nonzero filtering, including offsetting component
  amounts, credits and actual-only rows, remains.
- `SNAPSHOT_DETAIL`: `budgetId` contains JSON `{budgetId,after,through}` with
  string IDs. Returns the same `budget-full-detail-v1` rows plus an exact
  `budgetId` echo, including saved zero rows for that budget only.
- `SNAPSHOT_META`: plain string budget ID; returns
  `budget-snapshot-meta-v1`, exact budget ID, saved summary and sorted approvals.

New modes are read-only and require the existing authenticated session. The
client validates ordered unique IDs, complete counts, stable bounds/page size,
exact budget scope and native errors before creating a file. Legacy clients
without an advertised page size still use the original 200-item contract.
Reads are paged rather than transactional; concurrent financial edits can
change values during export. Changed counts abort the operation.

Single-budget Excel uses the existing upload path, which creates one
`Attachment` record and uploads to `File_field1`. Existing attachment
permissions, exact parent checks, native success acknowledgements and uncertain
reply recovery apply. User, budget, navigation, session or environment changes
before upload cancel the operation. A lost upload reply is not replayed.
PDF, automatic approved PDF and legacy backend Excel code remain intact.

New backend code is needed because the existing Excel branch formats the
entire workbook inside one Deluge execution. The existing global exporter also
processed 200 items and their five components per execution. Reusing those
contracts with bounded requests avoids changing the shared financial helpers.

## Affected Native Components

Only `exportBudgetSnapshot` changes; no new function, API, form, report or field
is introduced. Reads use existing Add_Budget header/total fields,
Budget_Category parent/code/name/department fields, Budget_Item prices/totals/
components/actuals, linked Subdivision and Project names, approved
Budget_Modification amounts, Budget_Import actual components and
Budget_Approvals history. The existing `budgetElementExportRows` helper remains
unchanged. Attachment creation/upload continues through the existing
`Create_Budget_Attachment_Record` API and native file upload.

## Verification And Rollout

Focused regressions execute the actual read-only Deluge branch with native
lookup shapes and write traps, and round-trip the actual XLSX builder with
227 items and 1,135 component rows. The actual widget flow verifies twelve
detail batches, four worksheets, one upload, legacy PDF behavior, context and
permission changes, malformed/failed reads and uncertain-upload replay blocks.
Existing element/per-unit export regressions retain the legacy layouts.

Creator Development compiled and saved the function; a fresh editor read
matched all 40,962 code tokens (including strings) to the candidate. A live
read-only `ALL_DETAIL` call returned 20 items, 100 elements, `pageSize:20`, and
a matching total of 90 Development items. The missing Production budget ID in
Development returned a clear scoped error. No file or attachment was created
by these checks. Live `SNAPSHOT_META` returned the exact AR05 Development
budget and its eight approval history rows. Its `SNAPSHOT_DETAIL` returned
20 of 155 saved items, including twelve zero rows in the first batch, with
100 component rows and the exact budget echo. A second live page retained
the exact cursor/upper bound/count and returned the next 20 unique items.
The complete 155-item live collection and real upload were not run; the
227-item complete flow is covered by the actual-source regressions above.
Full `npm run validate`,
`npm run build:pages` and whitespace
checks passed. Production elapsed export time has not yet been benchmarked;
15–30 seconds for the 227-item case is a target estimate, including upload,
rather than a measured guarantee.

The user approved main and Production repository promotion of 122.29.101 on
November 5. Development and Production widget mappings now select that release.
Creator promotion remains with the user: publish `exportBudgetSnapshot` so the
new read-only modes are available. Until that publication, the new Excel path
returns an error before attachment creation; legacy PDF behavior is unchanged.

Rollback: map Budget Manager back to `122.29.100`. The read-only native branches
may remain installed; they preserve legacy export behavior. If needed, restore
the prior `exportBudgetSnapshot` body from commit `985643857d93cb3c312873d615411062d1e4e9ae`
and publish that function. Already created attachments are retained.
