# Complete held results and stable table scrolling — October 16, 2026

Pro Forma's lot-price subform exposed an incomplete field-exit hold. Numeric
fragments stayed visible while their host changed sign color; intermediate
unknown results and scientific/percentage suffixes could escape the wrapper.
Scalar calculated outputs now retain their complete prior formatted result and
color until Tab/blur, including subform pricing and additional costs. Explicit
choices stay immediate. The same sign-color and unknown-result protections are
applied to the shared engine and Forecast. Native inputs, model calculations,
validation, accessible text, exports, request and save timing remain unchanged.

Data Insights' number wrappers clipped paint but still contributed scroll
overflow. An incoming translated number could create a temporary horizontal
scrollbar; a wider hidden outgoing dollar value could leave right-side overflow
after Lot Count settled. All four numeric CSS engines now contain scroll
overflow at the number wrapper. This preserves the matrix viewport and totals
edge throughout the animation, without disabling real long-period scrolling.

Changed files: shared commit gate/engine/CSS and seven synchronized widget
copies; PF number engine/registered views/CSS; Insights and Forecast number
engines/CSS; numeric, PF and Insights geometry browser fixtures; package test
entry; ten widget source version markers/configs, widget manifest, immutable
releases, Development/Production mappings and design/module documentation.

Affected Creator forms/fields, Deluge functions and Custom APIs: **none**.
Creator deployment required: **no**. No financial calculations, permissions,
approval routes, saved contracts, measure definitions or history guards change.
Stage mappings and permanent Creator widget URLs are retained.

Desktop regressions use real PF native lot-price keystrokes, including clearing,
negative profit and unknown returns, repeated edits, additional-cost subforms,
phase pricing, readonly calculated amounts, LOI and financial transfer displays.
They compare complete old text, semantic color and x/y/width/height before each
blur. The shared four-engine fixture verifies field exit, exact native/model/DOM
values, reduced motion and explicit choices. Existing seven-module, Forecast
save/recovery and all-seven-measure Insights checks remain.

The new Insights geometry fixture uses the actual six CSS assets and numeric
engine with native Chrome scrollbars enabled. Every animation frame is checked
at Creator's 3154×565 iframe and a wide desktop viewport. Narrow desktop and
72-month cases retain genuine horizontal scrolling and the last column remains
reachable. A negative control removing only `overflow:clip` reproduces the
original viewport-height jump from 407px to 397px immediately.

Release checks: `npm run validate`, `npm run build:pages`,
`npm run test:numbers:browser`, `npm run test:insights:browser`,
`npm run test:insights:geometry`, `npm run test:proforma:numbers:browser`,
`npm run test:forecast:browser`, public release/asset verification and a live
Creator Insights measure-switch check.

| Widget | Release | Rollback |
| --- | --- | --- |
| Budget Manager | 122.29.47 | 122.29.46 |
| Manage Lots | 0.13.6 | 0.13.5 |
| Contract Management | 1.62.8 | 1.62.7 |
| Tax Center | 19.17.19 | 19.17.18 |
| Land Master | 8.16.6 | 8.16.5 |
| Milestone Gantt | 1.1.14 | 1.1.13 |
| Settings Manager | 1.5.13 | 1.5.12 |
| Data Insights | 1.5.56 | 1.5.55 |
| Pro Forma | 1.80.117 | 1.80.116 |
| Forecast Manager | 1.7.13 | 1.7.12 |

Rollback restores each prior Development/Production mapping and redeploys Pages.
No Creator record repair is needed; rollback restores the prior visual defects.
