
# Widget Release Process

## Create a release

```bash
npm run validate
npm run release -- proforma-manager 1.44.7
```

Commit the new immutable release folder.

## Promote

Edit `deploy/environments.json` in a pull request so the target environment points to the new version. Merge after required approval. The Pages workflow publishes all environment paths.

## Rollback

Change the target environment back to a prior version and merge. Do not delete or modify the failed release; retain it for diagnosis.
