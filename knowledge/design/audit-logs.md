# Audit Logs

Repository-wide rule for applicable audit and diagnostics surfaces; see
[scope and exceptions](README.md).

Use the existing widget's audit log and runtime context. Opening, scrolling or
copying a log must not reload reports, mutate records or send an approval/email.
Preserve each module's existing diagnostic details and error reporting.

## Dialog And Copy

- Use the existing modal/dialog shell with a compact Audit Log or Diagnostics heading, current
  widget version and a centered SVG close button. Reuse native dialog focus,
  Escape and shared [interaction motion](interaction-motion.md).
- Bound the modal to the visible viewport. Keep its header and footer fixed
  within a shrinkable flex-column shell. Put all log content in a `min-height:0`
  body with `overflow:auto`, so both long lines and long logs are reachable.
  Support keyboard scrolling without scrolling the page behind the modal.
- Keep Copy Log visible in the footer. Copy the full current text, including
  version, existing runtime context and all available entries. Copy must not be
  limited to the visible scroll region or change log content through HTML
  rendering. Refresh the displayed log whenever it opens.
- Prefer the native clipboard API. If it is unavailable or denied, reuse a
  temporary selectable text field inside the open dialog, then remove it and
  restore focus. Announce Copied only after a real successful copy. Otherwise
  leave the log accessible and say that it can be selected and copied manually.
- Keep labels concise and use the existing live status for copy feedback.
  Repeated copy attempts and reopening must work without duplicate handlers.

## Insights Placement — November 5, 2026

Delete the former Insights / Dashboards breadcrumb toolbar entirely. The report
uses that recovered vertical space. Put Refresh and Diagnostics at the bottom
of the left navigation as square, icon-only buttons with full accessible names
and hover titles. Keep them visible and reachable in both the expanded sidebar
and collapsed icon rail. Keep accessible connection status outside visible
layout. This placement changes Insights only; other modules retain their
existing audit entry points.

Reference implementations: Land Master and Contract Management's scrollable
audit dialogs and copy behavior; Insights' native Diagnostics dialog is the
reference for the sidebar entry point. Existing modules have their own audit
format and entry point; adoption of this guide does not authorize unrelated
layout changes or imply that every current surface has been updated.

## Verification

Check desktop geometry, long-log vertical and horizontal scrolling, accessible
icon names, centered close SVG, keyboard/Escape and focus restoration. Exercise
clipboard success, denial/fallback and complete failure, full-text fidelity,
repeated copy and reopening with new entries. Preserve the mounted dashboard,
filters, focus and scroll through navigation collapse and diagnostic actions.
