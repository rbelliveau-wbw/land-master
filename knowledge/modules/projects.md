## Shared interaction motion — 1.1.15, October 16, 2026

Applicable tabs, disclosures, keyed rows, authorized refreshes, actual save
feedback, overlays, changed rows and progress meters follow the approved
[repository-wide interaction rule](../design/interaction-motion.md). Every new
feature must use the shared layer and explicit registry. Native field-exit
numbers, business timing and access guards remain. No Creator deployment is
required. [Coverage, checks and rollback](../../docs/interaction-motion-rollout-2026-10-16.md).

## Stable numeric layout — 1.1.13, October 16, 2026

Held old numbers keep their natural width, baseline and position during typing;
real text sizes the committed transition. Insights also removes its visible
bottom description/page footer and fills that space with the matrix. No Creator
contracts or deployment changes. [Verification, files and rollback](../../docs/number-layout-and-insights-footer-2026-10-16.md).

## Keep old numbers visible — 1.1.12, October 15, 2026

Existing calculated numbers stay visible during typing, then transition on field
exit. Nested renders cannot erase the held old value. No Creator contract or
deployment changes. [Fix, verification and rollback](../../docs/number-old-values-visible-2026-10-15.md).

## Milestone Gantt field-exit numbers — 1.1.11, October 15, 2026

Derived visuals retain their last committed number during typing and replace it
once on field exit. Explicit choices remain immediate; native precision, model
calculations, accessible DOM values, exports and save/API timing are preserved.
No Creator contracts or deployment change. [Release evidence, regressions and
rollback](../../docs/number-field-exit-2026-10-15.md).

## Milestone Gantt number transitions — 1.1.10, October 15, 2026

Sliding push now covers milestone/scheduled/unsaved counts, numeric durations and verified destinations.
Real values update immediately; native editable precision/caret, identities, dates,
financial math, permissions and existing save/approval/recovery gates are retained.
Reduced motion is immediate. No Creator forms, fields, functions or APIs change;
no Creator deployment is required. Production rollback: 1.1.9.
[Changed files, complete coverage and regression evidence](../../docs/number-transition-rollout-2026-10-15.md).



## Save policy — October 8, 2026

Acknowledged successful saves no longer compare refreshed editable/calculated
fields with the submitted payload. Record identity/count, real API errors,
preflight and duplicate-send guards remain; explicit unknown-reply recovery is
read-only. This supersedes earlier automatic field-equality requirements. See
[implementation, regressions and rollback](../../docs/automatic-save-check-removal-2026-10-08.md).
# Projects and Milestones

## Scope

Project and subdivision schedules, milestone synchronization, forecasts, and the milestone Gantt widget.

Known milestone rollups include development/engineering start and submittal, construction plan release/start, HMAC milestones, final acceptance, and estimated completion dates. Verify exact Creator and Zoho Projects field names before modifying integrations.

## Routine success feedback — October 6, 2026

Milestone Gantt retains explicit saves and the complete verified date-range progress/result dialog. Dismissing a fully verified result adds a contextual black confirmation with the actual range count. See [the shared design guide](../design/success-feedback.md) for sizing, wording, inline preservation and reuse. This rollout is frontend only and adds no forms, fields, backend functions, Custom APIs or verification requests.
