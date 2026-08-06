
# ADR-002: Externally Host Widget Frontends

## Decision

Host immutable widget releases externally and point Creator environments to stable Development, Stage, and Production paths.

## Consequence

Frontend-only updates do not require Creator publication, but backend changes still do. Environment promotion and human production approval replace ad hoc ZIP uploads.
