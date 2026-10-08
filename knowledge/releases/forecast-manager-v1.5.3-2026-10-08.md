# Forecast Manager v1.5.3 — October 8, 2026

Remove builder rows which have no Forecast_Year in any selected fiscal year.
Subdivision assignment alone was the source of the empty Placeholder row. The
visible matrix and CSV omit those rows; top Add Forecast remains available for
first-year creation. Preserve missing-year cells when another selected year
exists, plus incomplete/duplicate-parent rows that require review.

Changed: forecast-model.js, forecast-app.js, versioned widget.html, widget config
and manifest, model/browser regression fixtures, design/module/release docs,
immutable release and Dev/Production mappings. Frontend-only deployment; no forms,
fields, native functions, Custom APIs or permissions change. Creator backend 9.59
is unchanged. No forecast records are deleted or modified by row filtering.

Regression covers assigned/no-parent rows, parents outside selected years, explicit
empty builder selection, missing year alongside an existing one, empty subdivision,
and retained incomplete/duplicate parent issues. Top chooser and verified creation,
unknown-result reconciliation, native edit restrictions and summary math remain
unchanged. CLI Playwright runner is updated but not executed.

Validation, deployment and live read-only evidence follow below.
Permanent URL: https://rbelliveau-wbw.github.io/land-master/prod/forecast-manager/
Rollback: remap frontend to **1.5.2** and deploy Pages; no data/backend rollback.

`npm run validate` passed (exit 0). Supported inert fixture verified the assigned
Placeholder is omitted, DR Horton and StyleCraft remain, StyleCraft retains one
missing-year Create Forecast cell, and explicitly selecting Placeholder yields
zero builder rows / No forecast available while top Add Forecast remains enabled.
Before-release fresh Production read reproduced four rows with two empty
Placeholder year cells; 72 actual forecast inputs and 52 native pairs were captured.
No production writes were performed.
