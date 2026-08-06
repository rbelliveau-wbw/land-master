
# Budget Manager

Budget management, approvals, attachments, and pro forma comparison.

## Baseline

- Version: `121.0.0`
- Original upload: `budget_widget_v121_compact_comparison_metrics.zip`
- Extracted source: `src/`
- Immutable original: `baseline/budget_widget_v121_compact_comparison_metrics.zip`
- Initial external release: `../../releases/budget-manager/121.0.0/`

The extracted source is intentionally preserved as a monolithic Creator widget baseline. Do not refactor it merely to make it look cleaner. Establish behavioral tests first, then make targeted changes.

## Entry points

- Creator package entry: `src/app/widget.html`
- External-hosting entry after release: `index.html`
- Creator package manifest: `src/plugin-manifest.json`

## Common commands

```bash
npm run validate
npm run package:creator -- budget-manager
npm run release -- budget-manager <new-version>
npm run build:pages
```
