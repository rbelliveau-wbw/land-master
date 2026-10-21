# Shared comment actions and clear success feedback

The shared success popup used z-index 10000 beneath the comment modal's 10040
blur layer. Other Pro Forma overlays and native Insights dialogs had the same
risk. The canonical helper now uses a feature-detected manual popover, a
2147483647 fallback stacking layer and a transparent pointer-free backdrop.
Native-modal notifications stay hosted inside the active modal for live-region
accessibility. Clear/timer releases the popover; focus, scroll, dimensions,
grouping, stale guards, inline checks and existing save requests remain unchanged.

Legal, Construction, Budget/Project and Pro Forma use the same PFComments
component and row-action/editor CSS. Shared Reply/Edit/Delete controls match
Pro Forma, with SVG icons and its blue/amber/red action colors. The existing
exact rbelliveau@wbdevelopment.com→wbdevelopment author alias applies across
hosts; other users gain no alias. Persisted author and 24-hour ownership checks,
soft-delete placeholders and completed/read-only guards remain authoritative.
Conflicting row actions and Post are disabled while writes/confirmation await.
Legal and Budget delete confirmations sit above the conversation; cancel keeps
the exact draft and returns focus. No forms, fields, Deluge or Custom APIs change.

Desktop browser fixture verified clear feedback above the real shared comments
CSS and above a native modal, with top 14px, filter none, retained input focus and
correct modal host. Actual-component fixtures cover Reply/Edit/Delete on all
four parent fields, author/time boundaries, other-admin denial, permission
revocation, exact payloads, cancelled confirmations and duplicate-write guards.
The shared helper fixtures cover native/legacy hosts, missing/throwing APIs,
rehosting, accessible safe text and timer/clear cleanup.

Every success script reference is stamped with its release; all three comment
hosts explicitly request the updated Pro Forma component/style version. This
prevents old stable-URL assets from remaining cached after promotion. The two
component design guides record the repository-wide standard.

New releases: proforma-manager 1.80.127, budget-manager 122.29.63, land-master 8.16.11, contract-management 1.62.23, tax-center 19.17.25, milestone-gantt 1.1.18, manage-lots 0.13.10, settings-manager 1.5.19, lot-sales-explorer 1.5.60, forecast-manager 1.7.17.
Rollback each Development/Production mapping to its preceding version:
proforma-manager 1.80.125, budget-manager 122.29.61, land-master 8.16.10, contract-management 1.62.21, tax-center 19.17.24, milestone-gantt 1.1.17, manage-lots 0.13.9, settings-manager 1.5.18, lot-sales-explorer 1.5.59, forecast-manager 1.7.16.
No Creator publication is required for this PMP rollout.

Final review also verified locked inline textareas during Save and scoped
Pro Forma confirmation focus trapping/inert restoration on both terminal paths.
