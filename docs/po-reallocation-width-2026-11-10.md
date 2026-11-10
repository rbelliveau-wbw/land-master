# Reallocation Panel Width

Budget Manager 122.29.126 makes the right-hand Reallocation pane 15% wider in
the three-panel desktop PO workspace: 326px becomes 374.9px. The existing PO and
Summary columns divide the remaining width; viewport caps, heights, scroll
containers and the narrower desktop layout retain their current rules.

This change is limited to `widgets/budget-manager/src/app/purchase-orders.css`
and release stamps/metadata. It changes no forms, fields, functions, Custom APIs,
calculations, approval behavior or saved data. The release retains the separate
[PO email and activity implementation](po-outcome-notifications-2026-11-10.md),
including its documented Creator publication requirement.

Release stamps/metadata changed in `widgets/budget-manager/src/app/widget.html`,
`widgets/budget-manager/widget.config.json`, `manifests/widgets.json` and
`deploy/environments.json`, with immutable assets under
`releases/budget-manager/122.29.126/`. The payment-request design guide, Budget
module notes and existing PO release evidence describe the new candidate.

Verification passed: complete `npm run validate` (including the existing PO
reallocation/UI suites), `npm run build:pages` (35 environment paths), and exact
recursive comparison of all 39 release assets with source. The stylesheet differs
from 122.29.125 only in the requested width value. This presentation edit adds no
live SDK or financial-write test and does not repeat a desktop UI gate.

For this width adjustment alone, roll back to immutable Budget 122.29.125.
The later [PMP integration](po-notifications-pmp-2026-11-10.md) promotes
122.29.127, retaining main's separately published124 ledger improvements.
For the complete promoted feature rollback, use Budget122.29.124 and Settings1.6.8.
