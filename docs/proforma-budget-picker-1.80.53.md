# Budget transfer picker sorting and spacing — 1.80.53

Project and Subdivision choices sort alphabetically by display name, ignoring case and ordering embedded numbers naturally. Sorting a copy preserves the API collection and record IDs. Filtering retains this order.

The search field displays as a block, with an 8px gap before the result list and 5px inner padding around option focus outlines. Search outlines, hovered rows, and keyboard-focused options remain visually separate.

Changed files: `widgets/proforma-manager/src/app/budget-transfer-ui.js`, `budget-transfer.css`, the version in `widget.html`, widget configuration/manifest, `releases/proforma-manager/1.80.53/`, production environment mapping, and module/style documentation.

Affected Creator forms, fields, functions, and Custom APIs: none. No Creator deployment required.

Regression checks: browser verification using the complete widget and synthetic records at desktop, mobile, and short-window sizes. Check alphabetical full and filtered Project/Subdivision lists, the Vista search from the reported screenshot, geometric separation between the focused search field and first hovered/keyboard-focused row, last-row scrolling, no matches, clearing search, selection, and Escape. Run repository validation and Pages build before promotion.

Rollback: restore production `proforma-manager` to immutable release `1.80.52` in `deploy/environments.json` and redeploy Pages.
