# Forecast Manager

One row per selected builder, with fiscal years extending to the right. WFY 2026 means February 2026 through January 2027. Months save on field change; Sold and Scheduled are read-only views. Searchable filters, per-year totals, the existing subdivision/takedown summary, CSV export and missing-year creation retain the native manager's purpose.

The 1.2.0 release follows Legal and Pro Forma and the selected Compact cards layout. The visible snapshot retains every subdivision fact, each schedule's capacity/progress/current-month pace, closing terms and four recent-sales periods. Multi-phase contracts keep their all-phase section, and repeated builder schedules remain separate. A passive adapter arranges the unchanged Deluge HTML output; it never recalculates business math. Unsupported markup stays available in the sandboxed native-summary fallback. The forecast matrix and field-change save queue remain unchanged.

**Frontend publication for implementation/testing.** The user authorized the permanent production Pages URL. Current live development workflows, Creator compilation, API audience and native SDK behavior still need verification using [the module checklist](../../knowledge/modules/forecast-manager.md). No Creator records or API configuration were changed. Hosting the frontend does not install the backend; missing API or unknown session context keeps controls disabled.

## Files

- `src/app/widget.html`, `forecast.css`, `forecast-app.js`: layout and Creator v2 custom API integration.
- `src/app/forecast-model.js`: February fiscal mapping, editable-month guards and row/creation verification.
- `src/app/forecast-summary.js`: passive, complete native-summary adapter; no record queries or business calculations.
- `creator/functions/forecastManagerWidget.dg`: new server endpoint; install through Creator development, then publish through the normal environment workflow.
- `scripts/test-forecast-manager.mjs`: source audit and offline Deluge execution.
- `scripts/test-forecast-manager-browser.mjs`: inert browser fixtures only; never loads live Creator data.

## Endpoint

New proposed API bindings: `Forecast_Manager_Widget_DEV`, `Forecast_Manager_Widget_STAGE`, `Forecast_Manager_Widget`. POST, OAuth2, Standard response, `application/json`, Key and Value body containing `payload:string`, mapped to `forecastManagerWidget(string payload)`. Scope access to the existing Forecast Manager audience; verify that audience live before enabling the API. Never configure anonymous/public access.

Permanent Widget Manager URL: `https://rbelliveau-wbw.github.io/land-master/prod/forecast-manager/`. Development and production mappings publish 1.2.0 with the stable bootstrap. Frontend and API selection follow the authenticated Creator environment, including when this same URL is embedded in development; unknown context fails closed. Stage remains unmapped until its installation is requested. Promotion changes mappings, not the registration URL.
