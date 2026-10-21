# Construction board headings — October 21, 2026

Contract Management **1.62.31** makes the Construction board's status column
headings and priority rail labels uppercase and heavier (900 weight). Card text
retains its normal case. This is CSS presentation only: no record values, forms,
fields, functions, Custom APIs, permissions or save behavior change. No Creator
deployment is required.

Changed files: board CSS, host version stamps/config/hash, widget manifest,
immutable release, Development/Production mappings, board guide and module notes.
Stage retains its current release. Required checks: full repository validation,
Pages build and the existing desktop Construction board fixture, including
priority/status drag and compact layout. No new tests are needed for this style
adjustment; desktop inspection checks label weight, case and fit.

Rollback: restore only Production Contract Management to **1.62.30** in
`deploy/environments.json` and rebuild Pages. Keep permanent widget URLs and
native permissions/functions. Development tracks the latest complete release.
