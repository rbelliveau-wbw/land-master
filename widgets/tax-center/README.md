
# Tax Center

Tax parcel, tax year, jurisdiction, protest, and appeal management.

## Baseline

- Version: `19.0.0`
- Original upload: `tax_center_widget_19 (2).zip`
- Extracted source: `src/`
- Immutable original: `baseline/tax_center_widget_19 (2).zip`
- Initial external release: `../../releases/tax-center/19.0.0/`

The extracted source is intentionally preserved as a monolithic Creator widget baseline. Do not refactor it merely to make it look cleaner. Establish behavioral tests first, then make targeted changes.

## Entry points

- Creator package entry: `src/app/widget.html`
- External-hosting entry after release: `index.html`
- Creator package manifest: `src/plugin-manifest.json`

## Common commands

```bash
npm run validate
npm run package:creator -- tax-center
npm run release -- tax-center <new-version>
npm run build:pages
```
