# Forecast Manager 1.9.1

Caps schedule and contract cards at 320px, adds row-click disclosure, removes
Legacy Cards navigation, excludes any builder name containing placeholder from
Contract Review, changes Takedown Schedule to Found / Not Found and strengthens
group bands. Builder Forecasts and saved records are unchanged.

Changed files: Forecast review UI/model/CSS, page markup/navigation, focused
model tests, design guide, widget/version manifests, environment mapping and
immutable release. No Creator form, field, function, Custom API or permission
changes. No Creator publication required. All fields and native read contracts
remain those documented for 1.9.0.

Regression: row and chevron each toggle once; keyboard disclosure stays usable;
multiple cards wrap at the same maximum width; placeholder substrings are
excluded from counts, groups and export; existing Forecast editor is preserved.
Rollback: restore forecast-manager mapping to immutable 1.9.0 and rebuild Pages.

Validation passed: npm run validate (complete suite), npm run build:pages,
placeholder substring model cases, and desktop checks against the actual widget.
Rendered schedule and contract cards measured 320px. Row click expanded, the
chevron closed once, schedule presence read Found, and no Legacy tab or browser
errors remained. All native read contracts and permissions are unchanged.
