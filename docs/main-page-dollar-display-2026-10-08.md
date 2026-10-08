# Main-page dollar display — October 8, 2026

Pro Forma 1.80.94 and Budget 122.28.36 extend nearest-dollar presentation to the
main pages requested in the follow-up screenshots.

Budget rounds project totals, average $/Lot, phase Grand Total and $/Lot, and
preliminary/final project summaries. Pro Forma rounds main-list Land Cost and
Net Profit. Credits keep their existing signs; missing values retain their
existing unavailable treatment. Source values are aggregated/divided before
formatting, so rounded phase rows can differ from the rounded project total
when summed manually.

Stored values, financial calculations, input precision, save payloads, numeric
exports, sorting, permissions and approvals remain unchanged. No Creator form,
field, report, backend function or Custom API changes. No Creator deployment is
required. Detail-screen currency policy and Data Insights keep the prior release.

Changed files: the two widgets' `src/app/widget.html` and `widget.config.json`,
`manifests/widgets.json`, two new immutable releases, Production entries in
`deploy/environments.json`, affected module/style documentation, and existing
`test-budget-landing-projection.mjs` and `test-proforma-attachment-presentation.mjs`.

Verification: the actual main-page renderers passed checks with fractional amounts,
negative half-dollar values and raw aggregate/per-lot calculations; record/category
snapshots remain identical before and after rendering. The complete
`npm run validate` suite and `npm run build:pages` passed locally. Deployment
verification checks CI, Pages and the published Production version/formatters.
No live financial writes are required for this presentation change.

Rollback: restore only Production Pro Forma to 1.80.93 and Budget to 122.28.35
in `deploy/environments.json`, then redeploy Pages. Keep the permanent URLs and
immutable release contents unchanged.
