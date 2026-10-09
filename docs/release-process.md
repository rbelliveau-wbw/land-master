
# Widget Release Process

## Create a release

```bash
npm run validate
npm run release -- proforma-manager 1.44.7
```

The release command also points that widget's Development mapping to its latest
complete immutable release. Commit `deploy/environments.json` with the release
folder, then run `npm run validate` and `npm run build:pages` again. Every
Development widget must use its latest release; validation rejects stale pins.
Version selection compares major, minor and patch numbers and ignores folders
without `index.html`. Existing release contents remain immutable.

Development still uses the authenticated Creator Development environment for
data and Custom APIs, including when Creator retains the permanent Production
widget URL. This updates frontend assets; Deluge changes must also be saved in
Creator Development to test them. No Creator promotion is needed for a widget
mapping change.

## Promote

Edit `deploy/environments.json` in a pull request so the target environment points to the new version. Merge after required approval. The Pages workflow publishes all environment paths.

## Rollback

Stage and Production can return to a prior version by changing their mapping.
Development tracks the latest release: fix a failure with a new immutable
version. An explicitly requested Development rollback must also adjust the
latest-release validation policy. Do not delete or modify a failed release.

## Development parity correction — October 9, 2026

All ten Development widgets were aligned with the latest committed releases.
Contracts had remained at `1.61.5`, which excluded manual Acquisition even after
Production gained it in `1.61.34`. Eight Development mappings required updates;
Budget and Settings were already current. The release command now advances
Development and CI rejects drift, preventing another Production-only update
from leaving Development tests on old code. Stage/Production mappings and native
Creator schemas/functions were not changed by this correction.

Regression: release CLI success/failure/immutable replay, numeric latest-version
selection, incomplete folders, stale/missing Development pins, preservation of
other environments/widgets, native environment routing, all ten built assets
matching their selected releases, full validation and Pages build.
Rollback of this tooling change: revert its commit; retain all immutable releases.
