# Budget import assignment review — 122.29.71

The Budget Import Items toolbar count loads automatically after the first usable
Budget screen. It counts all import rows without a Budget Item, independently of
workspace filters, displays the exact number above 99, and refreshes after an
acknowledged assignment. The existing complete counted import loader is shared
with the tab; assignment choices remain deferred until the workspace opens.
Failed/incomplete reads remain unavailable and can retry by opening the tab.

The new **Different code** filter selects assigned rows whose Budget Item code
differs from the import's native `Subdivision_Code + "-" + Minor_Code`.
Missing item and Different code are mutually exclusive; search, Major, Minor and
Source still intersect the selected assignment filter. Leading zeroes are
preserved. The toolbar count always remains the global missing-assignment count.

## Native contract

The latest committed Creator export,
`creator/exports/Land_Master_2026-10-21-development.ds`, builds the original
assignment key from Subdivision_Code and Minor_Code, then queries
`Budget_Item[Budget_Code == itemCode]` (lines 61714–61716). Import `Code`
contains an HJ, GP or B source marker and is not the matching Budget Item code
(lines 59561, 59729 and 59840). The Budget Item lookup display is
`Budget_Code + " - " + Item_Name` (lines 8343–8344); the widget's acknowledged
assignment label uses an em dash. Exact string IDs and both verified display
formats remain supported.

Existing embedded codes and the already loaded assignment roster resolve first.
When a lookup has only an ID, selecting Different code reads a complete counted
`ID,Budget_Code` projection. It never substitutes that projection for editable
item records. Unknown or inaccessible codes retain the normal table and show a
short retry state. No additional roster read is required for ordinary native
lookup labels. Case and leading zeroes follow the native exact-text code rule.

## Verification

`test-budget-import-count.mjs` executes the actual boot, scheduler, counted
pagination and assignment wrappers: nonblocking first screen, authorized/view-only
reads, no eager assignment choices, exact zero/127 counts, native empty/assigned
lookup shapes, failed/partial reads, retries, deduplication, and acknowledged-only
count updates independent of filters.

`test-budget-import-code-filter.mjs` executes the actual code resolvers,
projection, filter, controls and assignment renderer: HJ/GP source markers,
native/widget lookup labels, embedded/flattened codes, exact string IDs and
leading zeroes/case, different subdivision, missing/unresolved components,
view-only projection, denied/partial/omitted replies, retry/deduplication,
mutual exclusion and retained normal rows, search/source intersections, and
successful/failed reassignment.

`test-budget-import-browser.mjs` verifies the complete widget document with local
native-shaped responses at 1540 and 1366 desktop widths. Automatic badge loading,
actual chip/search/source events, view-only ID resolution, assignment combobox
acknowledgements and updated filtered rows/counters pass without clipping or
horizontal page overflow. Existing toolbar numeric motion stays registered in
the shared `number-surfaces.js`. Fixture evidence is under
`tmp/budget-import-browser/`. No live Creator records were read or written;
live Creator data and permissions remain unverified in this session.

Full `npm run validate` and `npm run build:pages` passed. Independent review found
no actionable defects. Both Development and Production publish immutable
`122.29.71`; Stage is unchanged.

## Scope and release

Changed: Budget Manager HTML, its version/hash manifests, immutable release,
Development/Production mappings, focused regression checks and module notes.
Reads: `All_Budget_Item_Imports` / `Budget_Import_Item` fields `Budget_Item`,
`Subdivision_Code`, `Minor_Code`; `All_Budget_Items` / `Budget_Item` fields `ID`,
`Budget_Code`, and existing assignment labels. No forms, fields, functions or
Custom APIs change. No Creator backend deployment is required.

Rollback: map Development and Production Budget Manager to `122.29.70` and
rebuild Pages. Keep the permanent Creator widget URL.
