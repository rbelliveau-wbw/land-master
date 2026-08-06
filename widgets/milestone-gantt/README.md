
# Milestone Gantt

Subdivision milestone timeline and inline schedule editing.

## Baseline

- Version: `1.0.0`
- Original upload: `gantt (1).zip`
- Extracted source: `src/`
- Immutable original: `baseline/gantt (1).zip`
- Initial external release: `../../releases/milestone-gantt/1.0.0/`

The extracted source is intentionally preserved as a monolithic Creator widget baseline. Do not refactor it merely to make it look cleaner. Establish behavioral tests first, then make targeted changes.

## Entry points

- Creator package entry: `src/app/widget.html`
- External-hosting entry after release: `index.html`
- Creator package manifest: `src/plugin-manifest.json`

## Common commands

```bash
npm run validate
npm run package:creator -- milestone-gantt
npm run release -- milestone-gantt <new-version>
npm run build:pages
```
