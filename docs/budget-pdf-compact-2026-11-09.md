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

## Production Verification

Release `122.29.109`, commit `e1e4b496e9bf81b942bf5b32c8685dde9e06ce3f`,
reached main and Production. [CI](https://github.com/rbelliveau-wbw/land-master/actions/runs/42675243922)
and [Pages deployment](https://github.com/rbelliveau-wbw/land-master/actions/runs/42675243628)
both completed successfully. The agent-owned Creator browser loaded the new
109 PDF script through the permanent Production URL.

Bluebonnet Crossing - Phase 01 was exported once at 12:39 PM America/Chicago
on November 9. The new PDF saved successfully, increased its attachment count
from three to four, downloaded through the existing Creator Download action,
and opened in the existing native preview at **36 pages**. This is **46 fewer
pages (56.1%)** than the prior complete 82-page PDF. The file is 313,072 bytes.

The downloaded PDF contains all 227 item element blocks and all 1,135 element
rows. A read-only comparison of both actual downloaded PDFs matched every
element label and all **7,945 element financial cells** exactly. The saved
summary total and approval history remain present. Every page is nonempty and
Letter landscape. Poppler rendered all 36 pages and all contact sheets were
visually inspected; the live native preview was also confirmed at 36 pages.
The actual-source regression independently verifies complete parent item/notes,
summary/category totals and approval-history cell parity against 122.29.107,
including precision, zero/unknown, Unicode and unusually long notes.

The first 108 publishing attempt encountered a GitHub internal server error
before its deployment job started. Re-running the successful build produced
two artifacts with the same `github-pages` name, blocking that retry. The fresh
109 workflow published successfully with one artifact. Both immutable releases
remain intact; Production and Development select 109.

## Rollback

Map Budget Manager Production to immutable **122.29.107** and rebuild Pages.
The permanent Creator widget URL stays unchanged. No financial, approval or
schema data needs reversal; generated attachment files retain existing rules.
