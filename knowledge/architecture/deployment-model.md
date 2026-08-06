
# Deployment Model

## Widget-only change

```text
feature branch → pull request → CI → merge → create immutable release
→ point Development to release → test → promote same release to Stage
→ human approval → promote same release to Production
```

No Creator application publication is required when only externally hosted HTML, CSS, or JavaScript changes.

## Creator backend change

Changes to fields, reports, pages, Deluge, workflows, permissions, or Custom API configuration require the Creator environment pipeline. Coordinate the external widget release so it is not promoted before its required backend exists.

## Rollback

Rollback by changing the environment mapping to a previously validated immutable release and redeploying Pages. Never edit an old release in place.
