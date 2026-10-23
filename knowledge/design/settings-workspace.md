# Settings workspace

Use a persistent left menu with one visible screen for each Settings section.
Group navigation into General, Approvals, Modules, AI & Data and Advanced.
Keep the navy application header, slate-blue navigation surface, compact SVG
icons, a clear active destination and a short screen title. On narrow screens,
navigation becomes a scrollable row; the page itself must fit the viewport.

Keep the menu mounted when changing screens so the shared moving selection
pill can track the real destination. Register screen panels with the canonical
[Interaction motion](interaction-motion.md) engine and respect reduced motion.
Preserve field nodes, drafts, selection/caret, each screen's scroll position,
and loaded Workflow Log filters when switching screens. Load workflow history
on first entry; further reads use its explicit Refresh or date filters.

Use short field help and tooltips. Put the scheduled-workflow impact list behind a
counted disclosure. Show duplicate-record and unavailable-data warnings above
every screen; a healthy singleton does not need a persistent success banner.
Keep connection, pending, failed and unknown-save states truthful and visible.
Do not expose record IDs in the primary heading. User direction October 23,
2026: omit the Configuration caption/badge and Open in Creator/Refresh buttons.
Keep specific recovery actions such as Check Status and the Workflow Log
Load Runs action available.

Approval Rules, Approvers, Roles, Test Route and Change History are separate
destinations within Settings. Embed the existing approval editor and retain
its audited transport, native readiness checks, exact operation tokens,
unknown-write recovery and role-routing rules. Never duplicate its backend or
infer new approval business rules from this navigation. Incomplete new editors,
active writes and unresolved replies block leaving or refreshing. See
[Approval administration](approval-administration.md) and
[Approval progress](approval-progress.md).

Preserve native field meaning and access. Clearly label the legacy global COO
threshold and point to Approval Rules for current budget modification routing.
Do not reinterpret the native Multi_Line field. Preserve AI instructions,
provider and model values. Additional Fields keeps unknown record fields
available without pretending their purpose is known.

User direction October 23, 2026: place the existing `Current_Batch` field in
Automation beside `Next_Workflow_Run`, and omit it from Additional Fields.
Accept whole numbers 0–4 only; retain rejected drafts and the existing native
save/access protections. The HCSS check owns cursor advancement after success;
the three-hour timer owns only the next run date. Do not silently change an
existing out-of-range value while displaying Settings. Keep the affected-job
disclosure accurate when native schedules change.

Curve dropdowns use searchable single-value pickers. The hidden original
select owns the exact value and original change handler; preserve unresolved
selected IDs and disabled states. Portal the picker into the viewport, allow
keyboard search/selection/Escape and dismiss it when its ancestor scrolls.
Email-chip removes and selected checkmarks use centered SVG geometry.

Implementation: [Settings Manager](../../widgets/settings-manager/src/app/widget.html),
[workspace styles](../../widgets/settings-manager/src/app/settings-workspace.css),
and [curve pickers](../../widgets/settings-manager/src/app/settings-pickers.js).
Local examples must be visibly labeled as sample data and must not write to
Creator. [Review and verification](../../docs/settings-workspace-review-2026-10-23.md).
