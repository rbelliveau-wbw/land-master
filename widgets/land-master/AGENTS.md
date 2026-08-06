# Land Master Codex Instructions

- Performance matters with more than 2,000 records. Avoid full rerenders, repeated linear scans, and unnecessary Creator calls.
- Subdivision and Company tabs intentionally have no pagination in this baseline.
- Name, Code, and Status are read-only in Subdivision editing.
- Display Projects_Status where the UI calls for project status; do not invent a replacement status field.
- Facility IDs must remain strings because leading zeroes are significant.

## Required reading

- `../../AGENTS.md`
- `../../knowledge/modules/land-master.md`
- `../../manifests/widget-dependencies.json`
- Applicable Creator field metadata under `../../creator/generated/fields/`
