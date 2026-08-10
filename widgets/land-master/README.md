
# Land Master

Projects, subdivisions, companies, properties, related records, filters, and editing.

## Baseline

- Version: `8.9.1`
- Original upload: `land_master_widget_v8_9_1_no_subdivision_company_pagination (1).zip`
- Extracted source: `src/`
- Immutable original: `baseline/land_master_widget_v8_9_1_no_subdivision_company_pagination (1).zip`
- Initial external release: `../../releases/land-master/8.9.1/`

The extracted source is intentionally preserved as a monolithic Creator widget baseline. Do not refactor it merely to make it look cleaner. Establish behavioral tests first, then make targeted changes.

Subdivision editors support staged inline adding, editing, and removing of External System Mapping subform rows. No mapping API call is made until Save changes is pressed. The editor exposes External System and External Code; the parent Subdivision is implied by the open subdivision workspace, injected on create, and never displayed or editable.

Mapping saves reconcile the successful Creator operations into the loaded widget state instead of reloading every Land Master report. Record-editor saves also defer the background list refresh until the editor closes, keeping the Save action responsive. Audit delivery uses the deployed `Report_Proforma_Widget_Error` Custom API link name and stops retrying when Creator reports that the API is missing or unpublished.

Mapping deletions call Creator's report-based delete API with a validated `ID` criteria expression; the SDK does not accept a record `id` property for this operation.

Existing subdivision editors omit the report subtitle and the mapping-save confirmation message. Milestones, Forecast Years, Monthly Forecasts, Takedown Schedules, and Builder Takedowns are read-only tables in this workspace and therefore omit the Actions column and Open buttons.

## Entry points

- Creator package entry: `src/app/widget.html`
- External-hosting entry after release: `index.html`
- Creator package manifest: `src/plugin-manifest.json`

## Common commands

```bash
npm run validate
npm run package:creator -- land-master
npm run release -- land-master <new-version>
npm run build:pages
```
