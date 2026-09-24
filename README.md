
# Land Master Engineering Repository

Source, Creator metadata, knowledge, immutable widget releases, and deployment tooling for the Land Master Zoho Creator application.

## Start here

1. Read [AGENTS.md](AGENTS.md) and the applicable widget's `AGENTS.md` before making changes.
2. Use the [knowledge base](knowledge/README.md) for module rules, design preferences, decisions, and known incidents. For approval work in any module, read the [approval progress pattern](knowledge/design/approval-progress.md).
3. Check the current source under `widgets/<widget>/src/`, Creator functions under `creator/functions/`, and the [environment mappings](deploy/environments.json). The generated Creator metadata comes from a committed export and can lag the live application.
4. Follow the [release process](docs/release-process.md) for immutable widget versions, promotion, and rollback. Existing Creator widget URLs are permanent; promotion changes the environment mapping rather than the registered URL.

## Validate locally

Node.js 20 or newer is required. The repository has no npm package dependencies.

```bash
npm run validate
npm run build:pages
```

## Repository map

| Path | Purpose |
| --- | --- |
| `widgets/` | Current widget source, configuration, and widget-specific instructions |
| `creator/functions/` | Versioned Deluge function source |
| `creator/generated/` | Schema extracted from the committed Creator export; verify against live metadata for new work |
| `manifests/` | Machine-readable widget and Custom API contracts; inferred mappings are labeled |
| `knowledge/` | Current module rules, design standards, decisions, and incident history |
| `releases/` | Immutable widget releases retained for deployment and rollback |
| `deploy/environments.json` | Development, Stage, and Production widget version mapping |
| `scripts/` | Validation, release, and Pages build tooling |

The GitHub Pages site contains widget assets built from `releases/` and `deploy/environments.json`; repository documentation is not part of the served widget bundle.
