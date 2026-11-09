# Compact Budget PDF

## Requested Behavior

The complete Bluebonnet Crossing - Phase 01 PDF in 122.29.107 has 82 pages.
The user requested a more compact PDF with every detail retained, and authorized
main and Production publication with PMP.

## Layout

Release 122.29.109 replaces one element table per item with a continuous,
nine-column element ledger per populated category. Each row contains the saved
cost code, element label and all seven existing financial values. The full
item name stays on its first element row; blank/shared codes repeat the full
item name on every row. Category and column headings repeat
on every continuation page, and subtle alternating item-group shading separates
the five-row blocks. No rows, zero values or unknown values are filtered out.

Body type remains 7.5pt Roboto, with the same landscape Letter page size and
margins. Narrower cell padding, tighter table spacing and a wider Notes column
remove wasted space and excessive note wrapping. Complete summary values,
saved category totals, all parent item columns, full notes, all five elements,
four-decimal element precision and approval history are retained.

## Scope

Changed source: `widgets/budget-manager/src/app/budget-snapshot-pdf.js` and
the widget version stamp, plus the focused PDF test, design/module notes,
immutable release and environment/manifest metadata.

This is a presentation change to the existing manual browser PDF. No Creator
forms, fields, functions, Custom APIs, permissions, saved values or workflow
contracts change. Existing `Export_Budget_Snapshot` bounded reads, exact native
item/category identity checks and `uploadBudgetAttachments` are reused. No
Creator deployment is required. Excel and native automatic approved-PDF
generation remain on their existing paths.

## Regression Checks

`scripts/test-budget-snapshot-pdf.mjs` executes both the new production renderer
and immutable 122.29.107. It compares every saved summary/category/item cell,
note, element label/amount and approval-history cell. Font size is unchanged.
It retains exact native string-ID/scope, precision, credits, zero/unknown,
Unicode, long-note and worker failure/timeout checks. The 227-item/1,135-element
stress fixture drops from **99 to 44 pages**, including its unusually long note.
The test enforces at least a 40% reduction on that complete fixture.

Poppler rendered all 44 fixture pages. All contact sheets and a full-resolution
element page were inspected; text extraction confirmed all 227 element blocks,
the final item and approval history. No native writes occur in these tests.

Required release checks:

```powershell
node scripts/test-budget-snapshot-pdf.mjs
node scripts/test-budget-batched-export-flow.mjs
node scripts/test-budget-snapshot-workbook.mjs
node scripts/test-design-docs.mjs
npm run validate
npm run build:pages
```

All listed checks passed before publication. Pages built all 35 environment
paths; the complete immutable release matches the current source.

The post-deployment Bluebonnet export, download and native preview will verify
the actual production page count. Production verification follows publication.

## Rollback

Map Budget Manager Production to immutable **122.29.107** and rebuild Pages.
The permanent Creator widget URL stays unchanged. No financial, approval or
schema data needs reversal; generated attachment files retain existing rules.
