# Forecasts search and matrix density — Insights1.6.10

All Filters adds a Subdivision searchable multi-select immediately after Project,
using the same picker style and native subdivision IDs. Its selections intersect
Project, Territory, Builder and search; Reset clears it. It filters cached data,
with no extra reads or change to values/CSV scope rules.

Forecasts search grows from165px to198px minimum width. Four pixels of filter
scroll padding and an inset blue focus ring keep selection visible even when
horizontal scrolling moves the input to the clip edge. Search matches
the existing Subdivision.Subdivision_Code field as well as phase/project,
territory and builder names. All_Subdivisions explicitly requests the native
field; existing complete-read, report-field and access guards remain enforced.

Project-view Expand All/Collapse All also opens/closes every matching multi-builder
branch, updating mounted rows without another data read or model build. Individual
group controls keep their remembered branch state. Hide Empty remains respected.
Month columns shrink from65px to55.25px and their values are centered throughout
headers, parent rows, builder details, subtotals and footer. Annual columns remain
100px minimum. Matrix width follows these columns instead of stretching them to
fill a wider viewport. Numeric transitions, colors, Current month and CSV math
remain unchanged.

Changed: Forecasts HTML/app/model/adapter/CSS, fixture/model/browser checks,
design/module notes, config/manifest, immutable1.6.10 and Development/Production
mapping. Creator forms/fields/functions/APIs/permissions: none changed; the existing
Subdivision_Code field is now read. No Creator deployment is required.

Verification: model/code-search and parity tests, desktop UI regression (focus
clearance,198px search,55.25px centered months, nested bulk disclosures, retained
rows, permissions, CSV and large-report performance), npm run validate and Pages
build. Rollback: map Production lot-sales-explorer to1.6.7 and rebuild Pages.
