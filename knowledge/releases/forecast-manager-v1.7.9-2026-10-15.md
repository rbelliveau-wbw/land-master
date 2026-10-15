# Forecast Manager 1.7.9 — value rectangles in every view

Match the approved mockup in Sold + Forecast, Forecast, Sold and Scheduled.
Color only the thin outlined 43×30px value rectangles in body rows: blue Sold,
green Forecast and amber Scheduled. Body cells retain neutral row backgrounds;
row year totals use neutral rectangles. The bottom totals row keeps full month
cell fills and plain numbers, including blank zero totals. The current month
uses a lavender heading and purple rails without filling its body cells.

Changed files: forecast.css, widget.html version references, desktop browser
fixture, focused design/module documentation, widget config/manifest, immutable
release and Development/Production mappings. Affected forms/fields: none.
Affected Deluge functions/Custom APIs: none. No Creator deployment is required.

Regression evidence: desktop fixture covers all four views at 1280/1440/2308px,
neutral body cells, blue/green/amber rectangle geometry, neutral year rectangles,
full-color bottom month cells without number rectangles, purple current-month
rails/header, fixed slider and contextual legends. Existing save/zero/blank,
creation, assignment/notes, unknown-result recovery, month rollover, Sliding push
and reduced-motion scenarios pass. Required npm run validate and npm run
build:pages pass before publication. Calculations, exports and backend contracts
are unchanged.

Rollback: restore forecast-manager Development/Production mappings to immutable
1.7.8. No data or Creator rollback is needed.
