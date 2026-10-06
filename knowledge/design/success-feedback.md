# Routine success notifications

Approved October 6, 2026. Use the black, compact success popup for routine
confirmed actions across all nine modules. The reference implementation is
[`shared/success-feedback.js`](../../shared/success-feedback.js), copied into
each widget by the shared-asset synchronization script.

## Appearance

Use a black background and white, bold text, with a mint circle and centered
SVG check. Position it at the top center, 14 px from the top. Preserve the
approved final size: 13.86 px text, 20.16 px icon, 10.08 px vertical and
16.38 px horizontal padding, 8.82 px gap and 7.56 px corner radius. This is
the original enlarged trial reduced by 30%, then by a further 10%.

Cap width at 560 px or the viewport minus 36 px, wrap long text and retain a dark
shadow. The popup is nonblocking, has a polite atomic status announcement,
never takes focus or changes scroll, and dismisses after about 3.5 seconds.
An existing longer confirmation duration may be retained. No motion is needed.

## Scope: inline checks always stay

Replace only an existing pill-style success popup. **Never replace an inline
green checkmark, saved border, saved button, autosave status, or other inline
verification.** Add this popup as an accompaniment to verified inline saves,
including Budget editing, Tax Parcel Year, Property editing, Land Master
table editing, Contract action/pricing editing and Settings autosave.

Do not turn persistent status bars, validation, loading messages, warnings or
errors into success popups. Preserve retained drafts and existing error surfaces.
Multi-record transfers, approvals, uploads and takedown creation keep their
[progress/result dialogs](transfer-progress.md). A routine confirmation can
accompany a verified terminal result; it cannot substitute for its result ledger.

## Truthful, context-aware text

Name the actual action and object: **Lot pricing saved.**, **Budget item saved.**,
**2026 parcel year added.**, **Construction curve row saved.**, **Owners updated.**,
**Comment added.**, **Audit log copied.**, **Lot sales CSV ready.** Avoid vague
“Done” text when the action is known. Export completion means the browser export
was prepared; it does not prove the user saved a file to disk. A duplicate that
is still a draft must never say it was created. Never claim an email was sent
when the email action is unavailable.

Show a save confirmation only from the existing verified success path. Do not
add a write or a verification request just for feedback. Failed, unknown,
partial or superseded outcomes retain their existing explanations. Use actual
verified counts for batch wording; never infer completion from elapsed time.

## Inline save grouping and stale results

`LMSuccess.inline(key, message, group, guard, revision)` coalesces confirmations
for 650 ms, without delaying business writes. One field uses its contextual
message; several fields use “3 budget changes saved.” Repeated confirmations
for the same key count once. `begin(key)` invalidates the previous queued
confirmation when a new edit starts; its returned revision can guard the
subsequent callback. Existing host revision and actor/navigation checks remain
authoritative and should also be checked when queued feedback is displayed.

Clear success feedback on a save error. A canceled or older dismissal timer
must never hide a newer notification. Use text content for user-supplied text,
never HTML. Keep diagnostics, record IDs and backend terminology out of copy.

## Verification and reuse

Test actual successful and failed save callbacks, rapid edits, newer pending
revisions, grouping, safe text rendering, focus/scroll preservation, narrow
screens and unchanged inline green checks. Consult this guide for future
modules; do not fork different popup dimensions per module. Widget adoption
and release/rollback evidence belong in the module or release notes.

[Rollout and rollback evidence](../releases/success-feedback-2026-10-06.md) lists adopted modules and releases.

