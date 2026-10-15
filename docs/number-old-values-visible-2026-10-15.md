# Keep old calculated numbers visible during editing

User correction, October 15, 2026: use Budget's interaction everywhere. Every
existing number stays visibly at its pre-edit value throughout typing. Leaving
the field transitions that old value directly to the final recalculated value.
There must be no blank interval. New slots without an old sample stay readable.

The previous gate discarded its pending old value when another renderer supplied
an empty comparison map. It then hid the real value behind an empty old-value
overlay. The fix captures mounted keyed values in the input capture listener,
before original handlers change output, and retains that baseline through all
subsequent renders until field exit. Forecast's equal-value shortcut also honors
the hold. Insights resets presentation snapshots when reauthorizing a dashboard.

Changed files: shared commit gate and four engine integrations/copies; Insights
authorization reset; all ten versioned HTML/configs, release bundles and
Development/Production mappings; design/module documentation; four-engine and
real Pro Forma desktop regressions. Numeric CSS and the Insights measure
optimization remain unchanged. Stage mappings are unchanged.

Forms, fields, Deluge functions and Custom APIs affected: **none**. Creator
deployment required: **no**. Financial calculations, editable values/carets,
validation, exports and existing save/request timing are unchanged.

Desktop checks now assert every existing Pro Forma number's old visible text
during real land-cost, lot-pricing, phase-markup, LOI and transfer edits. The
typing screenshot explicitly checks the profit/returns card and sidebar totals.
All four engines are exercised with empty comparison maps on both first and
repeated typed renders, repeated keystrokes, native change-before-focusout,
Tab/blur, unchanged values and reduced motion. The seven shared modules retain
the Budget PO and receipt behavior. Existing Insights permission/full-render
parity, 26,000-lot measure performance and Forecast save/recovery checks remain.
Required checks: `npm run validate`, `npm run build:pages` and all four existing
browser suites.

| Widget | Corrected release | Previous release |
| --- | --- | --- |
| Budget Manager | 122.29.45 | 122.29.44 |
| Manage Lots | 0.13.4 | 0.13.3 |
| Contract Management | 1.62.6 | 1.62.5 |
| Tax Center | 19.17.17 | 19.17.16 |
| Land Master | 8.16.4 | 8.16.3 |
| Milestone Gantt | 1.1.12 | 1.1.11 |
| Settings Manager | 1.5.11 | 1.5.10 |
| Data Insights | 1.5.54 | 1.5.53 |
| Pro Forma | 1.80.115 | 1.80.114 |
| Forecast Manager | 1.7.11 | 1.7.10 |

Rollback changes the relevant Development/Production mapping to the previous
release and redeploys Pages; that restores the known blanking regression, so
prefer the corrected releases. No data repair or Creator promotion is needed.
