# All budgets detail export

The Budget Manager landing header adds **Export All Budgets** beside Audit Log.
It downloads one `.xlsx` workbook with one filterable **Budget Detail** worksheet.
The report stays mounted, preserving search, filters and scroll during loading,
success and retryable failure. The button prevents duplicate exports and shows
the actual completed row count while reading native pages.

Columns: Project, Subdiv, Department, Category Code, Category, Cost Code, Budget
Item, Unit, Cost per Unit, Preliminary, Unapproved, Final, Modification Amount,
HCSS Actuals, GP Actuals, Notes. Subdiv uses the linked subdivision name and code;
Project follows Subdivision.Project, with the saved budget Project as fallback.
Codes remain text, manual per-unit prices remain blank, and amounts remain
numeric currency. Formula-like names/notes remain text.

Modification Amount is the signed net of **Approved** Budget_Modification rows:
Increase adds the absolute Amount; Decrease subtracts it. Submitted, Pending,
Draft and Rejected modifications do not contribute. Final stays the saved
Budget_Ttl rather than a revised amount. The user confirmed that modifications
only occur on lines with a Final amount, so the original five-field zero rule
remains: exclude a row only when Preliminary, Unapproved, Final, HCSS Actuals and
GP Actuals are all zero or blank. Credits and actual-only rows remain.

## Native contract

The existing OAuth2 `Export_Budget_Snapshot` / `_DEV` binding and function
signature are unchanged. `{exportType:"ALL_DETAIL", budgetId:JSON.stringify({after,
through})}` selects the new early, read-only branch before attachment-writing
export guards. It queries all budgets without User_Access ownership, current
user, archive/status or screen filters. The API still requires its existing
authenticated app session; no report permission or API audience is changed.
Legacy PDF/Excel/APPROVED_PDF attachment exports retain their original code.

`after` and `through` are exact string record IDs. The first page captures the
highest Budget_Item ID. Every page returns at most 200 nonzero detail rows,
their exact item IDs, cursor echo/next/upper bound, matching count and hasMore.
The five query alternatives repeat the full bounds and parent criteria so
Creator's formatter cannot remove a consequential outer grouping. Categories
must belong to an existing budget; template/orphan rows are excluded.

The browser requires ordered, unique IDs, the same upper bound/count, sixteen
typed values and final complete counts before creating a download. Failed or
partial reads produce no file. Actor/environment changes cancel the export.
This is a paged read, not a transactional snapshot: edits during a long export
may change values; changed matching counts fail the download with Retry guidance.

Affected existing forms/fields: Add_Budget.Project/Subdivision1/Subdivision_Code;
Subdivision.Subdivision_Name/Subdivision_Code/Project; Project.Project_Name;
Budget_Category.Budget/Deparment/Category_Code/Budget_Category_Name;
Budget_Item.ID/Budget_Category/Cost_Code/Item_Name/Unit/Per_Unit/
Prelim_Budget_Ttl/Unapproved_Final_Budget_Ttl/Budget_Ttl/HCSS_Actuals/PROJ_Actual/
Description; Budget_Modification.Budget_Item/Status/Modification_Type/Amount.
No fields, forms, reports or API registrations are added. Creator deployment of
**exportBudgetSnapshot only** is required in addition to hosted widget promotion.

## Verification and rollback

Released as Budget Manager **122.29.83**, commit `e1b8d527`, to Development and
Production. Creator **9.125** published only exportBudgetSnapshot through Stage
and Production. A fresh editor read matched the checked-in source's complete
token stream (including string literals and boolean grouping).

Full `npm run validate`, `npm run build:pages`, GitHub CI and the
[Pages production deployment](https://github.com/rbelliveau-wbw/land-master/actions/runs/40516599868)
passed. Desktop UI verification confirmed the button's position in the live
Production header. The live ALL_DETAIL read returned **2,892** nonzero detail
rows across fifteen successful pages, with a final 92-row page and the same
matching count throughout. The in-app browser did not expose its blob download
to the file-capture tool, so the actual downloaded production file was not
independently inspected; workbook formatting was verified by the XLSX
write/read round-trip below.

`scripts/test-budget-full-export.mjs` exercises actual export module pagination,
201 rows, large string IDs, XLSX write/read round-trip, currency, text identifiers,
formula-safe text, actual-only/credit rows, empty exports, malformed values,
duplicates, changed counts/actor, missing pages and network/permission failures.
The existing budget export regression preserves individual PDF/Excel and approved
PDF layouts. Full repository validation and Pages build are required for release.

Rollback: restore Production Budget Manager to **122.29.80** in
deploy/environments.json. The native read-only branch may stay installed; the
previous widget does not call it. Existing native exports and stored records
are unchanged. If native rollback is necessary, remove only the ALL_DETAIL
branch and republish exportBudgetSnapshot, retaining its existing permission
guards and legacy behavior.
