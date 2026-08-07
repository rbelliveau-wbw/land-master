
# Land Master Development Instructions

Land Master is a production Zoho Creator application used for projects, subdivisions, properties, budgets, pro formas, contracts, approvals, taxes, lots, and forecasting.

## Authority order

Use information in this order:

1. Current live Creator metadata when an approved read-only connection is available.
2. `creator/generated/` generated from the latest committed `.ds` export.
3. Machine-readable contracts under `manifests/`.
4. Module documentation under `knowledge/`.
5. Current source code.
6. Historical incidents and migration notes.

Chat history and model memory are not authoritative.

## Source of truth

- Widget source: `widgets/<widget>/src/`
- Immutable uploaded baselines: `widgets/<widget>/baseline/`
- External-hosting releases: `releases/<widget>/<version>/`
- Creator export: `creator/exports/`
- Extracted Creator functions: `creator/functions/`
- Generated Creator schema: `creator/generated/`
- Inferred Custom API registry: `manifests/custom-apis.json`

## Change rules

1. Preserve unrelated functionality.
2. Never invent a Creator form, report, page, field, function, or Custom API name.
3. Search all callers before modifying a shared function or API contract.
4. Distinguish frontend-only changes from Creator backend changes.
5. Treat Creator record IDs as strings in JavaScript.
6. Never put secrets in widget source.
7. Do not directly deploy production.
8. Update the widget version and create an immutable release for deployable changes.
9. Update documentation when behavior or contracts change.
10. Include regression and rollback notes in every pull request.

## Permanent externally hosted widget URLs

- Every `dev/<widget>/`, `stage/<widget>/`, and `prod/<widget>/` GitHub Pages
  URL is a permanent Zoho Creator integration contract.
- Never require or instruct a user to change a Zoho Creator widget URL when a
  release is promoted. Promotions change only `deploy/environments.json`.
- Every environment/widget directory must keep `index.html` as the stable,
  cache-busting bootstrap and publish the promoted release as `widget.html`.
- The bootstrap must preserve Creator query parameters and add a fresh cache
  key before loading `widget.html` so cached iframes cannot pin an old release.
- New widgets and environments must use this same stable-loader pattern.

## Deluge constraints

- Do not use `containsKey` unless current Creator documentation and existing application compatibility prove it is supported.
- Do not use `while` loops.
- Parenthesize complex criteria.
- Safely handle nulls and conversions.
- Preserve leading zeroes for identifiers such as Facility IDs.
- Be conscious of Creator and external API limits.

## Required verification

Before declaring a widget change complete:

```bash
npm run validate
npm run build:pages
```

Also report:

- changed files
- affected forms and fields
- affected functions and Custom APIs
- whether a Creator deployment is required
- regression scenarios
- rollback release
