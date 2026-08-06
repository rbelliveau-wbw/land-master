
# Proforma Manager

Pro forma input, LOI workflow, comparison, and configurable sequential approvals.

## Baseline

- Version: `1.44.6`
- Original upload: `proforma-widget-v1.44.6-approval-route-builder.zip`
- Extracted source: `src/`
- Immutable original: `baseline/proforma-widget-v1.44.6-approval-route-builder.zip`
- Initial external release: `../../releases/proforma-manager/1.44.6/`

The extracted source is intentionally preserved as a monolithic Creator widget baseline. Do not refactor it merely to make it look cleaner. Establish behavioral tests first, then make targeted changes.

## Entry points

- Creator package entry: `src/app/widget.html`
- External-hosting entry after release: `index.html`
- Creator package manifest: `src/plugin-manifest.json`

## Common commands

```bash
npm run validate
npm run package:creator -- proforma-manager
npm run release -- proforma-manager <new-version>
npm run build:pages
```
