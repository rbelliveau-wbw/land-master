# Forecast Manager 1.7.7 — center the view controls

Center the Sold/Forecast color key and displayed-values slider together as one
group within the complete matrix toolbar. Keep Builder forecasts/counts on the
left and Export/recovery actions on the right. Equal flexible side columns keep
the group centered despite different side widths. On narrower desktop windows,
the controls can occupy their own centered row instead of overlapping the sides.

Changed files: widget.html, forecast.css, the existing desktop browser fixture,
design/module documentation, widget metadata, immutable release and
Development/Production mappings. No forms, fields, Deluge functions or Custom
APIs change; no Creator deployment is required. The view default, colors,
contextual key visibility, year-heading centering, values, calculations, saves,
exports and numeric transitions are unchanged.

Desktop browser checks measure the complete controls group's center against the
toolbar at 1440px and the reported 2308px width, confirm left/right controls stay
clear, and retain the existing matrix/save/creation/recovery checks. Inspect the
wide screenshot. Required npm run validate and npm run build:pages run before
publication.

Rollback: restore forecast-manager Development/Production mappings to immutable
1.7.6. No data or Creator rollback is needed.
