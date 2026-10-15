# Forecast Manager 1.7.5 — Sold + Forecast blanks

Rename the combined displayed-values button to Sold + Forecast, consistent with
the Sold view. Zero month counts, year totals and selected totals in
this combined view display blank, matching Sold and Scheduled. Nonzero counts,
saved zero values, hover comparisons, calculations and CSV
exports are unchanged. Mixed forecast inputs show blank when zero and reveal the stored zero on focus.
Leaving an unchanged zero sends no save; clearing it while editing still saves
null intentionally. Forecast remains the fresh-session default.

Changed files: forecast-app.js, widget.html, the existing desktop browser fixture,
design/module documentation, widget metadata, immutable release and
Development/Production mappings. No forms, fields, Deluge functions or Custom
APIs change, and no Creator deployment is required.

Desktop fixtures verify the new label, blank zero month/year totals, retained
zero values in hover text and snapshot data, no writes from view/format/focus changes,
nonzero mixed values, editing, assignment recovery and numeric transitions.
Required npm run validate and npm run build:pages run before publication.

Rollback: restore the forecast-manager Development/Production mappings to
immutable 1.7.3. No data or Creator rollback is required. Proposed Sold/Forecast
color differentiation is a separate mockup, outside this production change.
