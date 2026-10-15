# Dashboard card correction — Proforma Manager 1.80.110

The returns card restores its original ROI / IRR / XIRR heading and large
vertically stacked return values. Gross Profit appears underneath, in the same
card. Peak Cash Out moves from the monthly table controls to the right-hand
column of the top Cash Position card, beneath Positive Cash Flow. Anniversary
snapshots stay on the left. The monthly view/pager controls regain their prior
layout. The promoted pricing card and January scroll reset are preserved.

## Scope and checks

- Changed files: Proforma Manager `src/app/widget.html`, its widget config,
  `manifests/widgets.json`, immutable `releases/proforma-manager/1.80.110/`
  assets, Development/Production mappings, `scripts/test-proforma-flow-total.mjs`,
  and module/design/release documentation.
- No Creator forms, field definitions, persisted data, functions or Custom APIs
  change. Existing `Net_Profit`, ROI/IRR/XIRR and cash-flow calculations retain
  their current meaning. No Creator deployment is required.
- Regression: original stacked return presentation plus Gross Profit, Peak Cash
  Out in the top cash card only, unchanged snapshots and Positive Cash Flow,
  zero/empty/incomplete funding states, pricing and all four period-scroll views.
- Verification: focused flow regression, desktop browser rendering, full
  `npm run validate` and `npm run build:pages`, followed by CI/Pages deployment
  and verification of the exact public production release.

## Release and rollback

Development and Production map Proforma Manager to `1.80.110`. Stage and the
permanent Creator widget URLs remain unchanged. To roll back this correction,
map the affected environments to `1.80.109` and allow Pages to deploy.
