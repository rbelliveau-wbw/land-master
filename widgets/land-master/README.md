
# Land Master

Projects, subdivisions, companies, properties, related records, filters, and editing.

## Baseline

- Version: `8.9.1`
- Original upload: `land_master_widget_v8_9_1_no_subdivision_company_pagination (1).zip`
- Extracted source: `src/`
- Immutable original: `baseline/land_master_widget_v8_9_1_no_subdivision_company_pagination (1).zip`
- Initial external release: `../../releases/land-master/8.9.1/`

The extracted source is intentionally preserved as a monolithic Creator widget baseline. Do not refactor it merely to make it look cleaner. Establish behavioral tests first, then make targeted changes.

Subdivision editors support adding, editing, and removing External System Mapping subform rows. The mapping editor exposes External System and External Code; the parent Subdivision is implied by the open subdivision workspace, injected on create, and never displayed or editable.

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
