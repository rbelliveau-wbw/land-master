# Forecast Manager 1.7.3 — compact assignment confirmation

After a verified placeholder-to-builder assignment, show the approved compact
confirmation: check and Builder assigned, destination builder, subdivision,
one years/forecasts updated line, and Close. The dialog is 440px wide with a
roughly 245px height for ordinary names, replacing the completed progress bar,
three stages, per-year list and duplicate footer status. The live status remains
available to assistive technology; focus moves to Close. The same result follows
successful read-only recovery. Other dialogs reset the compact styling.

Changed source: forecast-builder-actions.js, forecast-app.js and forecast.css;
updated desktop fixture, design/module documentation, widget metadata, immutable
release and Development/Production mappings. Preserve the latest 1.7.2 Forecast
default and all unrelated main-branch changes.

No Creator deployment is required. No forms, fields, Deluge functions or API
contracts change. Existing Forecast_Manager_Widget assign/assign_status actions,
destination acknowledgement, duplicate protection, pending close/Escape locks,
notes, all-year scope and unknown-response recovery remain unchanged. Counts are
the first appearance of verified plan quantities, so they do not animate; existing
matrix/summary Sliding push transitions remain covered by the desktop fixture.

Verification: desktop inert browser covers compact contents/dimensions, centered
icons, Close focus/dismissal, next-dialog styling reset, assignment acknowledgement,
notes, delayed replies, lost replies, conflict handling and recovery without
replaying writes. The backend fixture confirms the unchanged all-year assignment
and note protections. Required npm run validate and npm run build:pages run before
publication.

Rollback: set forecast-manager Development/Production mappings to immutable
1.7.2. No data changes or Creator rollback are needed.
