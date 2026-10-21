# Construction Signal rail — October 21, 2026

Construction Requests → Board uses the selected Signal rail. It has a 54px rail,
priority signals/names and aligned status columns across ASAP, High and Medium
swimlanes. Request/lane/status-column totals and the board's Review badge are
omitted. Existing cards, filters, status vocabulary, open-record actions and
permission/completed-record rules remain. Missing and unexpected legacy
priorities stay visible after the normal lanes; no data is rewritten.

The shared `boardCard` renderer retains the existing card contents for Legal
and Construction. Construction drops route through `statusCellChange`; only
status changes within the same priority are accepted. Completion still uses the
existing confirmation/cascade. No new save, owner, permission or API path exists.
The existing Contracts FLIP pair animates the saved card in both axes and retains
board scroll, with reduced-motion/actor guards and bounded large-board work.
Cards also open with Enter/Space.

Changed files: `widgets/contract-management/src/app/widget.html`, new
`construction-board.css`, widget config/hash, widget manifest, focused board
regressions, the [board guide](../knowledge/design/boards.md), design index/module
notes, immutable release and environment mappings.

Grouping reads existing `Contract.Priority`, `Contract.Status`, `Contract.ID`
and card fields; drops use the existing Status write. No forms or fields are
added/changed. Existing Contract actions,
functions and Custom APIs are reused unchanged. **No Creator deployment is
required for this board change.** Earlier CFO native permission promotion remains
separate and user-controlled.

Development and Production use Contract Management **1.62.29**; Stage is retained.
Verification covers the actual renderer, grouping/legacy visibility, full statuses,
no board request counts, cross-priority/read-only/Pending Review drop rejection,
native status-only writes, completion routing, Legal behavior, wrapping, sticky
rail/headings, scroll preservation, two-axis FLIP, reduced motion and large boards.
Passed: `npm run validate`, `npm run build:pages`,
`node scripts/test-contract-construction.mjs`, `node scripts/test-design-docs.mjs`
and `npm run test:construction:board:browser`. Desktop browser fixtures use the
actual host, local synthetic records and held native acknowledgements; no live
requests were changed as a test. The latest main comment changes are retained.

Rollback: restore Production Contract Management to **1.62.28** in
`deploy/environments.json` and rebuild Pages. Keep the permanent Creator widget
URL and all existing native permissions/functions. Development tracks the latest
complete immutable release.
