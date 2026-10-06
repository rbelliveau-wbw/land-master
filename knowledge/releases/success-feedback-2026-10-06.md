# Success feedback rollout — October 6, 2026

Implementation evidence for the [component guide](../design/success-feedback.md).

## Releases and rollback

| Widget | New production release | Rollback release |
| --- | --- | --- |
| proforma-manager | 1.80.86 | 1.80.85 |
| budget-manager | 122.28.24 | 122.28.23 |
| land-master | 8.15.6 | 8.15.5 |
| contract-management | 1.61.19 | 1.61.18 |
| tax-center | 19.17.11 | 19.17.10 |
| milestone-gantt | 1.1.8 | 1.1.7 |
| manage-lots | 0.10.4 | 0.10.3 |
| settings-manager | 1.3.11 | 1.3.10 |
| lot-sales-explorer | 1.5.45 | 1.5.44 |

Only production mappings change; stable Creator URLs, development and stage
mappings remain. Roll back by restoring the corresponding production versions
in deploy/environments.json and republishing Pages. Retain business records.

## Scope and contracts

Changed assets: the shared success renderer, its nine synchronized copies,
all nine source HTML entries/configs, PF comments, Gantt's result-dismissal
callback, Insights sales/budget UI callbacks, release artifacts, manifest,
production map, documentation and focused regression fixtures.

Existing inline green checks, borders, saved buttons and autosave indicators
remain. Error/loading/persistent status surfaces and detailed batch dialogs
remain. Actual success callbacks produce contextual copy; Budget notes no
longer claim success before persistence. Inline notifications group presentation
only, with revision/scope guards and no new writes or verification calls.

Existing forms/reports touched by presentation hooks include Add_Budget/Budget_Item,
Contract/Contract_Pricing/Contract_Actions, Add_Pro_Forma, Property,
Tax_Parcel_Year, Settings/Construction_Curve, Builder_Takedown, Milestones,
Comment_Log and Contract_Version. Payload fields, SDK/Creator functions,
Custom APIs, approval routing and backend contracts are unchanged.
**No Creator deployment is required for this rollout.**

Concurrent Budget 122.28.23 and PF 1.80.85
changes are preserved; this rollout builds on both releases.

## Verification

- Full npm run validate and npm run build:pages required before promotion.
- Actual Budget/Tax callback tests: one existing write, green verification
  retained, grouped confirmations, pending/failed/superseded results suppressed.
- Shared renderer tests: safe text, polite status, timer replacement, grouping,
  stale guards and clearing on errors; canonical copies and HTML asset references.
- Eighteen headless Chrome renders using all nine actual widget styles at
  1280 px and 320 px: black/white, 13.86 px text, 20.16 px SVG, responsive fit,
  same focused input and scroll, existing saved class preserved.
- Existing native SDK, approval, attachments/comments, currency, pricing,
  budget, tax, takedown and export regressions remain required and unchanged
  except context-aware copy expectations and new helper fixture dependencies.
- After publication verify CI/Pages success and exact production HTML and
  shared asset hashes for every release. This presentation change uses local
  code/render checks, without live business writes.

