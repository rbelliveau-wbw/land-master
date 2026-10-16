# Visible Pro Forma row motion — October 16, 2026

Appending a PF row previously only faded its background. Opaque table cells
could obscure that highlight. Removing the final row did not move any surviving
row, so deletion had no visible motion. Offer seller/property rows were absent
from the row registry. The previous fixture only checked an Animation object
after insertion and a row count after deletion; that did not establish visible
boundary movement.

The native PID/MUD Add handler also matched only the button itself; clicking its
nested plus SVG/span did nothing. It now resolves the containing Add button,
preserving the same existing permission, draft and focus checks.

## Change and scope

The shared interaction engine supports opt-in list-boundary resize over 230ms,
in addition to keyed row FLIP. PF registers each real subform wrapper separately
with a stable host key and actual record/draft identities. The native add/remove
handler changes the model and DOM immediately. No removed editor, cloned row,
spacer record or delayed operation is introduced. Wrapper height releases to
native layout; real horizontal scrolling is retained during motion. Typing
cancels stale structural intent so calculated rerenders do not trigger row motion.

New rows enter with a short fade/move and a cell-level soft-blue wash visible
above their fills. First insertion and bottom/only-row removal animate the
boundary even with no surviving row to move. Lot Pricing and PID/MUD retain
their column widths when empty. The rule is now explicit in the repository-wide
[interaction guide](../knowledge/design/interaction-motion.md).

Changed source: shared/interaction-motion.js, shared/interaction-surfaces.js and
their ten synchronized copies; PF widget.html wrapper annotations and colgroups;
the shared/PF desktop browser fixtures; the interaction guide and PF module guide;
version metadata, immutable releases and Development/Production mappings.

Affected UI: PF Lot Pricing, PID/MUD, purchase/sale installments, additional
costs, construction curves and Offer seller/property lists. Detailed native
button tests cover Lot Pricing, PID/MUD and staged Offer seller/property rows.
Other widgets receive the shared first-row/cell-highlight and typing-intent fix;
only PF opts into boundary resize. Existing native Legal/Settings/takedown FLIP
remains authoritative.

Creator forms/fields, Deluge functions, Custom APIs and saved payloads are
unchanged. Financial calculations, field-exit number holds, draft duplicate
guards, focus, permissions, locks and save timing remain intact. No Creator
deployment is required.

## Regression verification

Run npm run validate and npm run build:pages. Desktop motion and real PF browser
fixtures check actual intermediate/settled boundary heights for append, last/only
removal, empty-to-first, PID/MUD and Offer rows; stable widths, visible cell
highlight, immediate focus, rapid opposite edits and reduced motion. The native
empty-lot-draft guard still focuses the existing empty row. Existing per-keystroke
financial/precision/unknown/sign/layout and Budget transfer checks remain.
Numeric rollout, Insights performance/geometry and Forecast suites verify the
shared layer does not regress other widgets. CI/Pages and public asset checks
follow publication; live Creator checks use an unsaved blank lot row only.

## Releases and rollback

| Widget | Release | Rollback |
| --- | --- | --- |
| budget-manager | 122.29.49 | 122.29.48 |
| manage-lots | 0.13.8 | 0.13.7 |
| contract-management | 1.62.10 | 1.62.9 |
| tax-center | 19.17.21 | 19.17.20 |
| land-master | 8.16.8 | 8.16.7 |
| milestone-gantt | 1.1.16 | 1.1.15 |
| settings-manager | 1.5.15 | 1.5.14 |
| lot-sales-explorer | 1.5.58 | 1.5.57 |
| proforma-manager | 1.80.120 | 1.80.118 |
| forecast-manager | 1.7.15 | 1.7.14 |

Rollback the relevant Development/Production mapping to the prior immutable
release and redeploy Pages. Stage and stable Creator widget URLs remain unchanged;
no Creator record repair is needed.
