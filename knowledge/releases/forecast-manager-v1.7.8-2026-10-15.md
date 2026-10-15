# Forecast Manager 1.7.8 — fixed slider and contextual value colors

Keep the displayed-values pill slider centered at the same position in every
view. Its legend sits independently to the left: green Forecast, blue Sold,
both for Sold + Forecast, and amber Scheduled. Nonzero month cells and selected
month totals use the corresponding color; zero/unset cells remain neutral.
Highlight the complete current calendar month in lavender, label it Current,
and retain metric-colored values inside the lavender column.

Changed files: widget.html, forecast-app.js, forecast.css, desktop browser
fixture, focused design/module documentation, widget config/manifest, immutable
release and Development/Production mappings. Affected forms/fields: none.
Affected Deluge functions/Custom APIs: none. No Creator deployment is required.

Regression evidence: desktop browser checks cover fixed slider geometry and
contextual legends in all four views at 1280, 1440 and 2308px; rendered nonzero
fills, neutral zero cells, current-month lavender/label, acknowledged zero saves,
month rollover, existing input/caret and blank-zero behavior, creation,
assignment/notes, unknown-result recovery and Sliding push/reduced motion.
Required npm run validate and npm run build:pages pass before publication.
The initial Forecast view, calculations, exports and backend contracts remain
unchanged.

Rollback: restore forecast-manager Development/Production mappings to immutable
1.7.7. No data or Creator rollback is needed.
