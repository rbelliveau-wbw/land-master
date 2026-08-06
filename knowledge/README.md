
# Land Master Knowledge Base

This directory is the durable context used by engineers, ChatGPT, and Codex.

## Trust model

- `creator/generated/` is generated from the latest Creator export.
- `manifests/` is machine-readable dependency information; some Custom API mappings are inferred and explicitly labeled.
- `knowledge/modules/` describes current intended behavior.
- `knowledge/incidents/` records failures, root causes, and successful fixes.
- `knowledge/decisions/` records architectural choices.
- `knowledge/migration/` supports moving from the personal ChatGPT account to the work workspace.

Update documentation in the same pull request as the corresponding behavior change.
