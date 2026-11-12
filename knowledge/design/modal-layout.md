# Stable Modal Frames

Repository-wide rule for applicable surfaces; see [scope and exceptions](README.md).

Search, loading, empty/error states, disclosures, pagination and changing result
counts must not resize or recenter an open working dialog. Give each dialog an
explicit, appropriate height capped to the current viewport. Keep its header,
search controls and footer mounted and steady; let only the results/body scroll.
Use a shrinkable flex child with `min-height:0` and `overflow:auto`. Reserve
scrollbar space for searchable lists. On short viewports, shrink the frame to
fit and keep Close/Cancel reachable. Native dialogs must retain their normal
closed state; apply flex display only to `[open]`.

[The shared stylesheet](../../shared/modal-layout.css) provides scoped frame
sizes (560px for pickers, 640px for medium editors, 800px for workspaces, all
capped to viewport height minus 48px). It is loaded after the existing styles
by Budget, Pro Forma, Tax, Manage Lots, Land & Projects, Settings, Insights,
Forecast, Milestone Gantt and Crew Management. Synchronize it with
[the source synchronizer](../../scripts/sync-modal-layout.mjs), run before
validation. Keep existing widths, permissions, business logic and focus behavior.
Budget's two global supplemental-PO picker steps use the same frame. PO Email
Activity retains its height through expanded details and retry results.

Legal/Construction's existing `.modal-back` is already top-anchored, so its
header does not move as contents change. Its separate progress overlays are
also top-anchored. Existing fixed-height record/audit/comment windows retain
their current sizing. Anchored dropdowns and small static confirmations are not
full results workspaces and do not need an artificially large frame.

Use [the browser regression fixture](../../scripts/fixtures/modal-layout.html)
to exercise actual widget styles with empty, one, many, loading, error and
expanded results at desktop, narrow and short viewport sizes. The fixture does
not load widget scripts or make Creator requests. Check frame/header/footer
coordinates and that content can scroll without leaving the viewport.
