
# Contributing

## Branches

Use short-lived branches:

```text
feature/<module>-<description>
fix/<module>-<description>
docs/<description>
```

## Pull requests

Every pull request must identify:

- requested behavior
- changed files
- affected Creator components
- Custom API or function contract changes
- frontend versus Creator deployment requirements
- tests performed
- rollback release

## Widget releases

After validation:

```bash
npm run release -- <widget-slug> <version>
```

Then update `deploy/environments.json` through a pull request or the promotion workflow.

Never modify an existing release folder. Create a new version.
