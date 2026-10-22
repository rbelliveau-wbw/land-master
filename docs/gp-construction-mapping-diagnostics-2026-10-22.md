# GP Construction mapping diagnostics

The GP Construction importer previously assigned its audit key only after
mapping and budget checks. A mapping failure therefore displayed the preceding
eligible row's key. The importer now captures the current job/minor key before
resolving the mapping and includes the job and exact Great Plains match count in
the error.

The mapping query, unique-mapping and linked-subdivision guards, skip rules,
cost calculations, destination writes and schedule remain unchanged. A real
cross-subdivision mapping conflict still stops the import; choosing a destination
requires the owner's business decision.

The native Development action was saved and independently reopened to verify
the complete script. Creator promotion remains with the user under PMP. The
Production data conflict remains pending the owner's destination decision; no
mapping or budget record was changed and no import was replayed.

Regression checks execute the actual mapping prefix with duplicate Great Plains
destinations, a valid same-code HeavyJob mapping, a broken subdivision lookup and
an unmapped job. The conflict must identify the current key even when the prior
key belongs to another job. Existing preparation checks confirm native write
payloads and schedule/source scope are unchanged.

Rollback: restore the GP Construction prepared action and generator from the
preceding main commit. No widget release or Pages promotion is needed for this
backend-only change.
