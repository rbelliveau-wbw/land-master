# Split Grips — November 2, 2026

The old Start/End targets extended six pixels outside their bars, overlapped at
touching dates and appeared only on hover. Raising the hovered bar also created
a new stacking context. Split Grips keeps editable targets visible, 18px wide
and inside their own bar, with source section colors and two vertical marks.
Hover no longer changes milestone bar stacking; captured resizing retains its
existing raised active state. Short and zero-day bars cap each target to its
available half instead of overlapping. A sole editable endpoint can use the
full available width. Source date coordinates and row heights are unchanged.

Changed source: `widgets/crew-locations/src/app/crew-manager.css` and the
versioned widget entry. The isolated preview gains `splitGripsPreview` for
touching, one-day and zero-day synthetic spans. Existing CrewDrag pointer
capture, coordinate mapping, mounted previews, cancellation, validation,
keyboard boundary editing and CrewApp commit are reused without changes.

Existing native fields: Milestones.Start_Date and Milestones.End_Date. Native
prepare/apply/status functions, Custom APIs, permissions, audits, unknown-save
recovery and Creator-only/Projects-push guards are unchanged. No Creator form,
field, function, connection, workflow or publication is needed.

## Verification

- All seven existing drag controller cases pass: preview before save, one exact
  drop, invalid spans, Escape/cancel/blur/actor/capture loss, clicks and jitter,
  scroll-aware mapping, native permission/task locks and unknown replies.
- Desktop browser preview confirms distinct Rough Cut End and Sewer Start
  rectangles at the same date, permanent visibility, exact endpoint/record hit
  ownership after hover, grips above overlap shading, and non-overlapping
  targets on one-day and zero-day bars. Preview selection produced zero native
  prepare/apply requests.
- Enter on Sewer Start opened the existing editor for that exact endpoint;
  closing it sent no save. Task rows retain zero drag grips.
- `npm run validate` and `npm run build:pages` passed. All 21 immutable release
  application files match current source exactly. Production verification uses
  read-only views; no live dates are edited for presentation verification.

## Rollback

Restore the Production crew-locations mapping to immutable release 1.9.0.
Preserve all Creator metadata, milestone dates, staffing, crews, timecards and
audit/operation history. Other widget mappings remain unchanged.
