
# ADR-004: Immutable Widget Releases

## Decision

Never modify `releases/<widget>/<version>/` after promotion. Create a new release for every change and roll back by repointing the environment mapping.
