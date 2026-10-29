# Forecast Manager 1.7.21 — numbered placeholder exceptions

Extend the existing editable builder-note and builder-assignment exception to
Placeholder, Placeholder2, Placeholder3 and Placeholder4. Match exact normalized
names rather than a broad prefix; the other names retain existing permissions.
All four placeholder names are excluded from assignment destinations. Reuse the
existing notes dialog, year scope, save path, assignment confirmation and recovery
instead of introducing a separate editing flow.

Changed files: forecast-builder-actions.js, forecast-app.js,
widget.html version references, forecastManagerWidget.dg, focused backend/browser
regression tests, module/README and line-notes guide, widget config/manifest,
immutable release and Development/Production mappings.

Affected fields remain Forecast_Year.Builder_Notes, Builder1 and Forecast_Name,
plus Forecast.Builder1. Builder.Builder_Name is read for classification; Builder
records are not renamed. No new forms, fields or Custom APIs. The existing
Forecast_Manager_Widget_DEV, Forecast_Manager_Widget_STAGE and
Forecast_Manager_Widget bindings keep the same forecastManagerWidget contract.

Creator action required: replace the existing forecastManagerWidget(string
payload) source with creator/functions/forecastManagerWidget.dg and compile it
in Creator, then promote through the normal environment workflow. PMP leaves
this installation and promotion to the user; no live Creator function or data
is changed by this repository release. The older backend rejects numbered-name
note/assignment writes until updated. Offline execution is not a Creator
compiler or authenticated native write check.

Regression evidence: offline native-function execution checks all four exact
names, mixed case/outer whitespace, editable notes, hidden-year assignment,
preserved notes/counts, other subdivision isolation, destination exclusions,
lookalike rejection, stale/oversized notes, real-builder locks, conflicts and
write-free recovery. Desktop browser fixtures exercise note save and assignment
for every name with old catalog flags, all four destination exclusions, plus the
existing forecasting save/create/recovery and numeric-transition scenarios.
The complete npm run validate suite, desktop browser fixtures and npm run
build:pages pass. The native Creator compilation/write check remains pending
the user's function installation and promotion.

Rollback: restore forecast-manager Development/Production mappings to immutable
1.7.19. If the Creator function has also been promoted, restore its preceding
source from the parent commit. No schema or data migration is required.
