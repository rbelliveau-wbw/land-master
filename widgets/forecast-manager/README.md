# Forecast Manager

One row per selected builder, with fiscal years extending to the right. WFY 2026 means February 2026 through January 2027. Months save on field change; Sold and Scheduled are read-only views. Searchable filters, per-year totals, the existing subdivision/takedown summary, CSV export and missing-year creation retain the native manager's purpose.

**Candidate only.** Current live development workflows, Creator compilation, API audience and native SDK behavior have not been verified. No Creator records were changed during development. Do not promote this candidate until the development checklist in [the module contract](../../knowledge/modules/forecast-manager.md) is complete.

## Files

- `src/app/widget.html`, `forecast.css`, `forecast-app.js`: layout and Creator v2 custom API integration.
- `src/app/forecast-model.js`: February fiscal mapping, editable-month guards and row/creation verification.
- `creator/functions/forecastManagerWidget.dg`: new server endpoint; install through Creator development, then publish through the normal environment workflow.
- `scripts/test-forecast-manager.mjs`: source audit and offline Deluge execution.
- `scripts/test-forecast-manager-browser.mjs`: inert browser fixtures only; never loads live Creator data.

## Endpoint

New proposed API bindings: `Forecast_Manager_Widget_DEV`, `Forecast_Manager_Widget_STAGE`, `Forecast_Manager_Widget`. POST, OAuth2, Standard response, `application/json`, Key and Value body containing `payload:string`, mapped to `forecastManagerWidget(string payload)`. Scope access to the existing Forecast Manager audience; verify that audience live before enabling the API. Never configure anonymous/public access.

Permanent Pages paths will follow the existing `dev/forecast-manager/`, `stage/forecast-manager/`, `prod/forecast-manager/` bootstrap contract. Promotion changes the environment mappings, not the Creator registration URL. Frontend and API selection follow the authenticated Creator environment; unknown context fails closed. No environment is promoted by this candidate.
