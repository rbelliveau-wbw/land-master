# Single-row controls and immediate Forecasts disclosures

Manage Lots **0.13.18** restores one inventory row. Identity and block pills sit
at the left; List — Edit mode — Grid stays independently centered; status counts,
selection and Columns sit at the right. Long side groups scroll locally. The
Edit switch reuses its handler and locks and stays disabled in read-only Grid.
The view controls use pressed buttons in a semantic group, with their existing
arrow navigation and explicit shared selection-rail registration. Both Block
and Lot headings/values remain bold. The connected inventory/report surface and
all real columns remain.

Data Insights **1.6.1** fixes the Forecasts disclosure delay. Previously each
click reran the full report, aggregated groups and rebuilt the table, including
numeric reconciliation. Each group now retains mounted child rows and cached
subtotal cells. Clicks synchronously update visibility and expanded state. The
headers, footer, other rows, focus and scroll remain mounted. Collapse All uses
the same path. Filter/view/period/data changes still build the actual report;
access revocation clears both the rendered data and cached references.

Forecasts primary filters and all grouping/display controls share one horizontal
row. Search is capped at 165px, status/mode at 135px and period at 145px. Narrower
desktop widths scroll that control row, not the document. All Filters can still
expand its separate optional fields. Switch tracks match Lot Sales at 31×18px
with a 12px thumb; grouping buttons are 28px high. The missing-forecast banner is
replaced by a 32px amber box beside Export CSV, with an accessible count and the
existing anchored details surface. Actual loading/errors retain their notice.

Changed files: both widgets' HTML/CSS/controller presentation code and configs;
shared interaction registry and its synchronized copies; version/widget manifest;
existing desktop browser checks; design/module notes; both immutable releases
and Development/Production mappings. No Creator fields, forms, functions,
Custom APIs, report contracts or permissions change. No Creator deployment is
required. Permanent widget URLs stay unchanged.

Verification: actual-widget desktop tests at 1366px/1920px cover one-row geometry,
centered List/Edit/Grid order, bold identities, local overflow, selection/Clear,
read-only/edit locks, notes/precise saves, filtered selection, complete report
failure, independent permissions, revocation, CSV, warning details, totals,
filter/view/year controls and navigation to Lot Sales. The 312/407-lot fixture
retains mounted reports and selection, makes no writes and keeps a 61px toolbar.

The 346-phase Forecasts fixture exercises the largest Project, Territory and
Builder groups through repeated open/close actions. Handlers took 7–19ms and
the next rendered frame took under 460ms on the local desktop runs. Every disclosure
retained rows, column headers, totals footer and focus, with zero report rebuilds
or data requests. These fixtures use native-shaped inert SDK responses; they do
not write live records. Full repository validation and Pages build passed.

Rollback: restore Production `manage-lots` to **0.13.17** and
`lot-sales-explorer` to **1.6.0**, then rebuild Pages. Both restores retain their
permanent URLs. No native rollback is needed.
