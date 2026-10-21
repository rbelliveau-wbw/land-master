# Construction board correction — October 21, 2026

Contract Management **1.62.30** corrects the Signal rail implementation:

- The board and lanes size to their card stacks. Its bottom border ends at the
  last lane, with no viewport-filling white block. Headings and alternating lane
  backgrounds use the muted report palette.
- Dragging across lanes updates Priority. Dropping on the rail changes only
  Priority; diagonal moves save Priority and Status in one native header write.
  Pending Review can change priority but remains pending until accepted in Review.
- Construction cards follow the mockup's fields using the saved request and its
  actual checklist: name, current action, budget type, action counts and progress.
  Duplicate subdivision text and parent/child metadata are omitted on this board.
  Legal cards and Construction list/detail family information remain intact.

Reused behavior: `updateRecord` and its captured native permission/identity,
unknown-write and preflight handling; existing `statusCellChange`, completion
confirmation/cascade, FLIP movement, numeric transitions and meter registry.
The priority-only UI patch is needed because the full Construction form save
resubmits unrelated fields and the status handler intentionally guards Proposed.
Combined moves pass an optional validated Construction priority into the existing
status path; no alternate backend save implementation is introduced.

Changed files: widget HTML/CSS/config, widget manifest, environment mappings,
immutable release, focused Construction native/browser tests, module notes and
the [board design guide](../knowledge/design/boards.md)/index.

Existing `Contract.Priority` and `Contract.Status` are written through the
existing scoped Contract report. Completion retains its existing action writes.
No forms, fields, backend functions, Custom APIs or permissions are changed.
**No Creator deployment is required.** Development and Production use 1.62.30;
Stage is retained.

Verification: actual native-SDK-shaped fixtures cover priority-only, diagonal,
horizontal, rail and Pending Review moves; completion with changed priority;
read-only/locked/invalid/Review status rejection and failed-save preservation.
Desktop browser fixtures match the screenshot's three Arroyo Ranch request
names/types/priorities/statuses and assert content height/background/card fields,
real drag events, native acknowledgement timing, intermediate motion, sticky
rail/headings, wrapped names, scroll, keyboard, reduced motion and large boards.
These fixtures do not write business records. Passed: `npm run validate`,
`npm run build:pages`, `node scripts/test-contract-construction.mjs`,
`node scripts/test-design-docs.mjs` and `npm run test:construction:board:browser`.
CI, Pages deployment and live artifact/view checks gate completion.

Rollback: restore only Production Contract Management to **1.62.29** in
`deploy/environments.json` and rebuild Pages. Keep native URLs and permissions;
Development continues tracking the latest complete immutable release.
