# Number field-exit transitions — October 15, 2026

Typing now keeps the last committed number visible in dependent displays. Leaving
the field (Tab, blur or another control) reveals the newest calculated result
with one 420ms Sliding push. Reduced motion reveals it instantly at the same
boundary. Native editable values/carets, calculations, validation, saves,
requests, accessible DOM values and exports keep their existing timing.
Measure, scenario and other explicit choices still replace numbers immediately.
The design rule applies repository-wide in `knowledge/design/number-transitions.md`.

The shared commit gate handles repeated edits, native change-before-focusout
node replacement and synchronous native-editor replacement/focus restoration.
It retains complete formatted old values without interpolating amounts. Existing
identity, unknown/first/equal-value and permission protections remain in place.

Data Insights measure changes previously rebuilt all report aggregations and
rows, then forced layout separately for changed numeric cells. The measure-only
path now reuses complete authorized statistics and mounted rows/numeric nodes,
refreshes labels, accessible names, missing values, quality counts and heatmap,
and starts transitions without forced layout. Currency formatters are reused.
Filter, data, grouping, collapse and permission changes retain full rendering.
No metric, date, financial, completeness or revenue-access definition changes.

On the same desktop Chrome synthetic fixture (26,000 lots, 50 subdivisions,
48 months and 2,552 decorated numbers), measure handler time fell from
659–802ms to 24–42ms in isolated runs. A parallel verification run measured
27–46ms. These are local fixture measurements, not a promise for every device;
browser paint and initial history loading still depend on display/data size.

## Changed files and contracts

- `shared/number-edit-commit.js`, shared numeric engine/CSS, their seven adopted
  widget copies, and the three existing PF/Insights/Forecast engines/CSS.
- All ten source `widget.html` files load the versioned commit gate; widget
  configs/manifests, immutable release assets and Development/Production maps.
- Insights `sales-app.js` adds a measure-only display update and cached currency
  formatters; `number-transitions.js` updates mounted formatted values and uses
  alternate animation names to restart rapid updates without layout reads.
- Synchronization/adoption checks, native browser fixtures, the four-engine
  commit fixture, the representative Insights fixture and module/design docs.

Affected Creator forms, fields, Deluge functions and Custom APIs: **none**.
Creator deployment required: **no**. Existing stable widget URLs are retained.
Stage mappings are unchanged. The latest Forecast 1.7.9 presentation changes
are included in Forecast 1.7.10.

## Verification

Desktop browser fixtures cover all ten real module documents/renderers; native
PF land-cost/lot-price/phase-markup/LOI/transfer edits; PO quantity/unit-price
and receipt fees; all four engines' repeated typing, exact native/model/DOM
values, Tab/blur, native output replacement, reduced motion, unchanged commits
and immediate choices. Existing Forecast save/assignment/recovery checks remain.
Insights checks all seven real measure pickers, full-render parity of text,
accessible names and heatmap, collapsed groups, missing values, CSV, histories,
permission/revenue resets and record/context identity. The 26,000-lot fixture
asserts aggregate, row and numeric-node reuse on measure switches.

Required release checks: `npm run validate`, `npm run build:pages`,
`npm run test:numbers:browser`, `npm run test:insights:browser`,
`npm run test:proforma:numbers:browser`, `npm run test:forecast:browser`.

## Releases and rollback

Promote these immutable releases in Development and Production. Roll back by
restoring the prior mapping for each widget; no Creator records need repair.

| Widget | Release | Rollback |
| --- | --- | --- |
| Budget Manager | 122.29.44 | 122.29.43 |
| Manage Lots | 0.13.3 | 0.13.2 |
| Contract Management | 1.62.5 | 1.62.4 |
| Tax Center | 19.17.16 | 19.17.15 |
| Land Master | 8.16.3 | 8.16.2 |
| Milestone Gantt | 1.1.11 | 1.1.10 |
| Settings Manager | 1.5.10 | 1.5.9 |
| Data Insights | 1.5.53 | 1.5.52 |
| Pro Forma | 1.80.114 | 1.80.113 |
| Forecast Manager | 1.7.10 | 1.7.9 |
