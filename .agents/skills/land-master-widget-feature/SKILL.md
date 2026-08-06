
---
name: land-master-widget-feature
description: Implement a targeted Land Master widget feature while preserving unrelated behavior and validating Creator contracts.
---

# Workflow

1. Read root and widget-specific `AGENTS.md`.
2. Read the relevant module and incident documents.
3. Inspect `widget.config.json` and `dependencies.generated.json`.
4. Verify form/report/field names against `creator/generated/`.
5. Identify Custom APIs and matching Creator functions.
6. State whether the request is frontend-only or needs Creator deployment.
7. Make the smallest coherent change.
8. Add or update regression checks.
9. Run `npm run validate` and `npm run build:pages`.
10. Create a new immutable release when requested.
11. Summarize deployment and rollback.
