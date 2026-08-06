
# Land Master Engineering Repository

Company-owned source, knowledge, Creator metadata, and release tooling for the Land Master Zoho Creator application.

This package was assembled from:

- the Zoho Creator export generated August 6, 2026
- six uploaded working widget packages
- curated Land Master engineering rules and known working solutions

## What is included

- **6 widget baselines** with original ZIPs and extracted source
- **57 Creator forms** and **1269 parsed fields**
- **70 reports**
- **17 pages**
- **53 extracted custom Deluge functions**
- workflow and connection inventories
- Codex `AGENTS.md` instructions and reusable skills
- GitHub Actions for validation and GitHub Pages deployment
- immutable external-hosting releases and Development/Stage/Production mapping

## Start here

1. Read [`START_HERE.md`](START_HERE.md).
2. Create a **private** repository in the company GitHub organization.
3. Upload the contents of this folder, not the outer ZIP itself.
4. Enable GitHub Actions.
5. Run the `CI` workflow.
6. Configure GitHub Pages to deploy from GitHub Actions.
7. Register only the Development external-widget URLs in Creator first.

## Local validation

Requires Node.js 20 or newer and Python 3.11 or newer.

```bash
npm run validate
npm run build:pages
```

No npm dependencies are required for the initial baseline tooling.

## Important trust labels

- `creator/generated/*`: generated from the uploaded Creator `.ds` export
- `widgets/*/src/*`: extracted unchanged from uploaded widget ZIPs
- `manifests/custom-apis.json`: inferred from widget source and must be verified in Creator
- `knowledge/*`: curated operational documentation; update it through pull requests
