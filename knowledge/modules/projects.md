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
