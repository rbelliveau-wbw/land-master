# Forecast Manager 1.7.6 — Sold/Forecast colors and centered years

In Sold + Forecast, completed calendar months use blue text and pale blue cells;
the current and future months use green text and pale green cells. Apply the same
basis to existing month headings, builder cells, column backgrounds and selected
month totals. Keep combined year totals neutral and retain the stronger current
month highlight. Refresh colors using the existing Creator server date, including
January in the following calendar year and month rollover.

Put the Sold/Forecast swatch key in the marked toolbar space between Builder
forecasts/counts and the displayed-values slider. Show it only for the mixed
view. Retain the two existing WFY/month header rows; do not add the mockup's
separate Sold/Forecast group headings. Center the WFY chip and date range as one
group over each year's columns, in every view.

Changed files: forecast-app.js, forecast.css, widget.html, the existing desktop
browser fixture, design/module documentation, widget metadata, immutable release
and Development/Production mappings. No forms, fields, Deluge functions or Custom
APIs change. No Creator deployment is required. Preserve default Forecast mode,
blank-zero formatting and focus behavior, hover comparisons, editing, saved
values, calculations, CSV, pending/error states and number transitions.

Desktop fixtures verify legend placement/visibility, centered WFY/date geometry,
the existing two-row header, blue/green rendered colors, future-year and fiscal
January classification, footer basis, server-month rollover and style reset in
other views. Existing save/create/assignment/recovery and Sliding push scenarios
remain covered. Required npm run validate and npm run build:pages run before
publication; inspect the desktop screenshot before release.

Rollback: restore forecast-manager Development/Production mappings to immutable
1.7.5. No data or Creator rollback is needed.
