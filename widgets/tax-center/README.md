
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

## Edit TPY currency formatting (19.17.4)

Dollar-value fields in the Edit Tax Parcel Year modal display as US currency when the modal opens and whenever focus leaves the input. Focus removes the dollar sign and grouping commas for editing, and saves continue to send normalized numeric values. No functions or Custom APIs change. Regression: all eight Edit TPY dollar fields, blank values, focus/blur formatting, and save normalization. Rollback: restore the production mapping to `19.17.3`.

## Tax Parcel Year acreage source (19.17.3)

The parcel-year Acres column shows only `Tax_Parcel_Year.Acres`. A blank TPY acreage remains blank instead of falling back to the linked `Property.Acres`. No functions or Custom APIs change. Regression: TPY acreage display, inline edit, and linked-property enrichment for County, legal description, and Company. Rollback: restore the production mapping to `19.17.2`.

## Navarro County (19.17.2)

Property and parcel-year County editors always offer Navarro, including before the first Navarro record exists. Existing record-derived choices and data-filter counts are retained. No functions or Custom APIs change. Regression: Navarro selection, existing choices, and County save payloads. Rollback: restore the production mapping to `19.17.1`.
