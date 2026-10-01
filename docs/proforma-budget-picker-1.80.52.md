# Send Costs to Budgets picker fix — 1.80.52

The first screen clipped Project choices because its absolutely positioned menu extended outside the modal's scrolling body. Explicit option button display styles also overrode the hidden attribute set by the search handler.

Expanded Project and Subdivision menus now participate in body layout, so the modal grows to show their search and scrollable choices. Filtered options explicitly stay hidden; matching ignores case and surrounding whitespace. The close SVG has zero button padding and border-box sizing.

Changed source: `widgets/proforma-manager/src/app/budget-transfer.css`, `budget-transfer-ui.js`, and the version in `widget.html`. Release/configuration: widget config, widget manifest, immutable `releases/proforma-manager/1.80.52/`, and the production mapping in `deploy/environments.json`.

Affected Creator forms/fields, functions, and Custom APIs: none. No Creator deployment is required. Transfer allocations, permissions, and apply behavior are unchanged.

Regression verification: browser checks against the complete widget with synthetic transfer records at 1335×541, 390×844, and 800×400. Check initial choice visibility and hit testing, scrolling to the last choice, case-insensitive search with surrounding whitespace, keyboard traversal past hidden options, no matches, clearing search, Project selection, subdivision filtering, and Escape closing the picker before the modal. No Budget apply calls occur during these checks. Run `npm run validate` and `npm run build:pages` before promotion.

Rollback: map production `proforma-manager` back to immutable release `1.80.51` in `deploy/environments.json` and redeploy Pages. Stable Creator widget URLs remain the same.
