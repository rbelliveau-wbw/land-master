# Stationary held values and the Insights table — October 16, 2026

Typing keeps the old calculated numbers in exactly the same position and size.
They still transition to the final values when the field is left. The shared
hold gate previously reserved width from the incoming value and an estimated
character count. A local fixture reproduced a 61.17px display widening to
122.34px during typing, shifting aligned financial displays.

All four engines now use a CSS grid overlay: only the old formatted text
participates in layout while held; both real texts share one cell during the
committed transition. Character-based width estimates are removed everywhere.
No per-cell layout measurement is added. Native replacement/focus restoration
also settles before a disconnected editor commits its held values.

Data Insights removes the visible bottom description bar and page footer. The
matrix scroll region fills the freed height while retaining its totals row.
Descriptions, data-quality text and load status remain available to assistive
technology outside normal layout. The release version moves into Diagnostics,
and its existing action reads the new location. Measure definitions, CSV,
permissions, completeness guards and the fast measure-only update are retained.

Changed files: canonical shared gate/engine/CSS and seven adopted copies;
PF/Insights/Forecast engines/CSS; Insights HTML, `sales-app.js` and
`insights-redesign.css`; browser/diagnostic regressions; ten widget HTML/configs,
manifests, immutable release bundles, Development/Production maps and design/
module knowledge. Stage mappings and stable Creator widget URLs remain unchanged.

Affected Creator forms, fields, Deluge functions and Custom APIs: **none**.
Creator deployment required: **no**. Calculations, exact native input values,
caret, validation, exports and save/request timing are unchanged.

Desktop checks compare x/y/width/height before and during typing for all four
engines, proportional/monospace fonts, left/center/right alignment and longer/
shorter incoming values. Real PF sidebar, pricing, LOI and financial transfer
values retain their old text and geometry. Transfer status text can still change
its own surrounding layout; its numeric wrapper retains its dimensions.
All seven shared module documents/renderers, PO/receipt edits, reduced motion,
missing comparison maps, native editor replacement and field-exit motion are
covered. Insights tests assert no visible footer, full-height matrix geometry,
seven real measure choices, text/ARIA/heatmap parity, CSV, permissions and the
26,000-lot/four-year fixture (about 22–38ms per measure in the verification run).
Forecast save/summary/recovery checks remain. Screenshots verify the PF typing
state and full-height multi-year Insights table.

Release checks: `npm run validate`, `npm run build:pages` and the four existing
numeric/Insights/PF/Forecast browser suites.

| Widget | Release | Rollback |
| --- | --- | --- |
| Budget Manager | 122.29.46 | 122.29.45 |
| Manage Lots | 0.13.5 | 0.13.4 |
| Contract Management | 1.62.7 | 1.62.6 |
| Tax Center | 19.17.18 | 19.17.17 |
| Land Master | 8.16.5 | 8.16.4 |
| Milestone Gantt | 1.1.13 | 1.1.12 |
| Settings Manager | 1.5.12 | 1.5.11 |
| Data Insights | 1.5.55 | 1.5.54 |
| Pro Forma | 1.80.116 | 1.80.115 |
| Forecast Manager | 1.7.12 | 1.7.11 |

Rollback restores the relevant Development/Production mapping and redeploys
Pages; it restores the prior shift/footer behavior. No Creator data repair is
needed.
