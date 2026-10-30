# Live Milestone Dragging — 1.8.0

The former pointer handler changed only fixed bottom text. The new presentation
controller resizes the actual mounted bar, updates its duration and boundary, and
recomputes overlap hatching from a draft phase while retaining the original span
as a quiet outline. Saved source records are untouched before release. Grips are
12px wide, have explicit zero padding and sit above overlap hit areas. Horizontal
edge scrolling participates in the same exact calendar mapping and inverse.

Stage/endpoint, original and new date, day change, total duration, pending save,
confirmed save and actual errors appear beside the changed edge. There is no
fixed bottom drag banner or duplicate global success popup for pointer drops.
Other date edits retain their shared success popup. Existing Review Save remains
available for unknown native replies; uncertain changes are never replayed.

Clicks, sub-threshold jitter, other pointers, Escape, pointer cancellation/capture
loss, blur, view changes and actor invalidation cannot submit a date. Invalid
dates show a red preview and restore the original span on release. Native milestone
permissions, locked/past dates, pending pushes and task dragging guards are unchanged.
Controls lock during the gesture without disabling the captured handle. Confirmed
drags clear obsolete Days propagation state for that same native source identity.

Changed source: `crew-drag.js`, the Gantt markup/event integration in `crew-app.js`,
drag styles in `crew-manager.css`, and the widget entry. The separate controller
is needed because the earlier Crew handler never updated geometry; the older
Milestone Gantt editor owns a different draft model and save contract. Existing
CrewModel calendar/validation/interval helpers and CrewApp commit are reused.

Affected native form/fields: existing Milestones.Start_Date / End_Date. Existing
Crew_Locations_Widget prepare/apply/status functions, audited destination and
duplicate-send rules are unchanged. No new form, field, function, API, permission,
schedule or Creator promotion is required. All source IDs remain strings.

## Verification

- Controller tests exercise live bar width/position/duration and boundary updates
  before any save, exact one-record drops, inline before/after confirmation,
  invalid ranges, click/jitter/other-pointer no-ops, cancellation, capture loss,
  blur/actor changes, scroll-aware dates, native permissions/locks/tasks and
  unknown replies without replay.
- Actual isolated browser drag recorded eight intermediate bar positions and
  widths with unchanged source dates and zero apply calls. Releasing sent one
  audited prepare/apply pair for the exact milestone ID. An endpoint underneath
  overlap shading remained draggable. Its inline result showed December 1 →
  December 10, +9 Days and 35 Days Total beside the changed row.
- A second actual drag lost its native reply. The inline card showed the real
  error and Review Save remained available. One read-only status check recovered
  that operation with still exactly one apply request and one native operation.
- All 29 desktop geometry/keyboard/editor checks pass at 1148 × 565, including
  no outer page overflow and zero native writes during those checks.
- Full repository validation and the 34-path Pages build passed for 1.8.0.
  Production verification uses read-only views; synthetic drag saves never claim
  live edits.

Rollback: map Production crew-locations to 1.7.1. Preserve Creator 9.134, milestone
dates, audit/operation records, employee staffing, timecard mirrors, mappings,
schedules and unrelated widget versions.
