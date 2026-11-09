# Single-Budget PDF Execution Limit

## Confirmed Failure

Production Budget Manager 122.29.105 reproduced the reported PDF failure on
Bluebonnet Crossing - Phase 01, Budget `4410926000001671002`, with 227 saved
items and 20 categories. At `2026-11-09T17:32:14.925Z`, the widget called
`Export_Budget_Snapshot` / `exportBudgetSnapshot` with:

```json
{"budgetId":"4410926000001671002","exportType":"PDF"}
```

Creator returned `9430` at `17:32:16.913Z`. Its **Production Custom API Hits >
Stack Trace** confirms the underlying failure:

> Number of statement execution limit exceed Line:(1115)

The native PDF path formats the whole budget in one Deluge execution,
including one `budgetElementExportHtml` / `budgetElementExportRows` call
per item. Its aggregate work exceeds Creator's execution limit. The UI's
generic 9430 message is a consequence. Excel already uses bounded snapshot
reads and browser assembly; its success is consistent with this cause.
The stack trace does not establish a particular PDF conversion error or
missing financial value. No write was replayed after the failed export.

## Applied Patch

The exact replacement code is checked into:

- [Widget dispatch and shared snapshot orchestration](../widgets/budget-manager/src/app/widget.html):
  `runBudgetExcelSnapshot`, `runBudgetPdfSnapshot`, `readBudgetPdfStructure`,
  `runBudgetBatchedSnapshot`, and `runExportBudgetSnapshot`.
- [Existing bounded collector](../widgets/budget-manager/src/app/full-budget-export.js):
  retain exact item IDs alongside the already validated rows and elements.
- [PDF definition and worker client](../widgets/budget-manager/src/app/budget-snapshot-pdf.js).
- [Dedicated renderer worker](../widgets/budget-manager/src/app/budget-snapshot-pdf-worker.js).
- [Pinned PDF library, embedded fonts and licenses](../widgets/budget-manager/src/app/vendor/README.md).

Manual PDF and Excel share the proven `SNAPSHOT_META` / `SNAPSHOT_DETAIL`
reader and `uploadBudgetAttachments` lifecycle. A PDF no longer invokes the
whole-budget native `PDF` branch. The existing advertised bounded page size,
cursor/count checks, scope identity, throttle recovery and exact string IDs
remain authoritative. All saved items, including all-zero items, are retained.

PDF additionally reads fresh categories and item-to-category identities via
the established `sdkGetAllRecords` adapter, using the same native category
and item criteria as `loadBudgetDetail`. These are paginated, read-only
report calls with explicit field projections. Every item must match exactly
one saved category ID. Missing, duplicate, foreign, moved, renamed, added or
removed rows/categories that invalidate that structure abort before upload.
Equal category names/codes do not merge distinct records. Empty categories
remain visible. Category Final totals come from saved `Budget_Total`, not a
sum substituted by the browser. The summary uses saved `Budget_Grand_Total`
from the existing metadata response.

The browser builds landscape Letter pages with repeated table headings,
page numbers, literal notes, Unit/Cost per Unit, all five element rows per
item, approved modifications, Revised Final, HCSS/GP actuals and approval
history. Null element values remain unknown dashes; known zero, signed
credits and four-decimal element precision remain distinct. A blank saved
rate remains blank. PDF rendering runs in a dedicated same-origin worker
with embedded fonts, a bounded timeout and surfaced errors. No budget data
is sent to a conversion service and no rendering service/API is introduced.

Immediately before upload, the shared orchestration rechecks exact budget,
navigation, actor, environment, attachment session, write permission and
pending/uncertain attachment locks. It invokes the existing uploader once.
The uploader retains native parent/file identity guards and lost-reply
recovery. Unknown outcomes are never automatically replayed, and optional
display refreshes do not invalidate successful saves. These reads are not
a transactional financial snapshot; concurrent amount changes retain the
same limitation as the existing batched Excel export.

New code is required because there was no browser PDF renderer to reuse.
The existing Excel collector, native data adapter, metadata service and
attachment uploader are reused instead of introducing parallel transport,
authorization or save logic.

## Forms, Fields and Functions

No Creator metadata, function body, Custom API contract or workflow changes.
No Creator deployment is required for this frontend patch.

- Read `Budget_Category`: `ID`, `Budget`, `Category_Code`,
  `Budget_Category_Name`, `Deparment`, `Budget_Total`.
- Read `Budget_Item`: `ID`, `Budget_Category` for exact category membership;
  all financial rows/elements still come from the existing snapshot service.
- Existing metadata reads `Add_Budget` and `Budget_Approvals`.
- Existing writes create one `Attachment` through
  `Create_Budget_Attachment_Record` and upload `File_field1`; the established
  Budget parent, date, actor, permission and attachment recovery rules remain.
- Existing `Export_Budget_Snapshot` arguments remain `budgetId`, `exportType`.
- Native `APPROVED_PDF`, `generateApprovedBudgetPDF`, automatic approval
  delivery and other native callers are unchanged. This patch does not claim
  to repair a large automatic approved-PDF execution-limit failure.

## Regression Evidence

`node scripts/test-budget-snapshot-pdf.mjs` executes the actual production
worker and pinned browser renderer with 227 items, 1,135 elements and 21
categories, including an empty category. It covers saved totals that differ
from row sums, exact IDs above JavaScript's integer limit, duplicate labels,
blank rates, zero/unknown values, signed credits, four-decimal amounts,
Unicode/literal text, approval history and a note long enough to span pages.
Wrong-budget/category IDs, changed memberships/counts/labels, missing element
detail and malformed financial values fail before attachment creation.

The actual browser worker also generated and downloaded the fixture PDF in
the agent-owned desktop browser. Poppler rendered all 99 stress-fixture pages;
all page contact sheets were visually inspected, and pypdf extraction
confirmed 227 Labor and Other rows, the last item, saved totals, Unicode,
signed values, complete approval history, nonempty pages and Letter landscape.
The fixture is synthetic and is not a successful live Bluebonnet export.

`node scripts/test-budget-batched-export-flow.mjs` executes the real widget
orchestration and collector: 227 items in 12 advertised twenty-row fixture
reads, a four-sheet XLSX round trip and one PDF attachment upload. Tests cover
navigation/budget/actor/environment/session changes, permission revocation
during reads or PDF layout, failed/inconsistent reads, renderer failure,
pending pricing, attachment locks and no replay after a lost upload response.
The live service currently advertises 100-row pages, so a stable 227-item
budget requires three detail calls rather than one expensive formatting call.

Additional regressions:

```powershell
node scripts/test-budget-snapshot-workbook.mjs
node scripts/test-budget-export-per-unit.mjs
node scripts/test-budget-export-batches.mjs
node scripts/test-budget-full-export.mjs
node scripts/test-budget-element-exports.mjs
npm run validate
npm run build:pages
```

All listed checks passed on November 9. Full repository validation completed
successfully; Pages built 35 environment paths. The final release preflight
verified all 33 source/release files are identical, Development selects
122.29.107 and Production promotion selects 122.29.107. The pre-existing
Contract Management manifest-hash warning is unrelated to this patch.

Promotion to Production is authorized. A successful
native Bluebonnet attachment save/download through the new frontend is still
required after publication; the live reproduction established the failure,
not post-release success. Existing native data transport/upload behavior is
reused, but the fresh projected structure reads and worker must also be
verified inside Creator after publication.

## Release and Rollback

Frontend release: **122.29.107**, Development and Production.
Production rollback: **122.29.106**. Promotion/rollback changes only
`deploy/environments.json`; stable Creator widget URLs do not change.
There are no financial, approval or schema writes to reverse. An attachment
created by an explicitly requested export remains governed by existing
attachment recovery/delete permissions.
