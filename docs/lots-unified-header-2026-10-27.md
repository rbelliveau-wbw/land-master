# Unified lot inventory header — Manage Lots 0.13.17

Implements the user-selected Unified header concept, with both Block and Lot
headings and values bold. A single white inventory surface contains the phase
identity and existing code, totals, centered List/Grid switch, native status
counts, Edit/Columns, block pills and independently scrolling report. Pale blue
group bands, matching rectangular block pills, one count divider, consistent
padding and quiet column headings connect the controls to the rows.

The mockup's preview rows/counts are not shipped. The existing native model
supplies all data, including subdivision codes, visible counts and exact block
identities. All real columns remain, including read-only dates and separate
Status/Linked to/Builder columns. Multi-subdivision groups remain distinct.

Select visible keeps its existing matching-row scope. The new top selected count
includes retained selections across filters, and top Clear invokes the existing
guarded Clear action. Block selection, range selection, collapsed selections,
block jump/scroll, editing, note popovers, takedown eligibility, native save
handling and unknown-result recovery retain their established handlers.

Changed files: Manage Lots HTML, lots-list.js, lots-list.css, config/version and
widget manifest; shared number-surfaces.js plus synchronized standalone copies
for the two new count slots; design/module notes; existing desktop browser
regression; immutable release and Development/Production mappings.

Forms/fields: read-only presentation of existing `Subdivision.Subdivision_Name`,
`Subdivision.Subdivision_Code`, and `Lots.Block`, `Lot_Number`, `Lot_Code`,
`Status` and existing report fields. No field definitions change.
Functions and Custom APIs: none changed. Permissions and business rules: unchanged.
Creator deployment: not required. Permanent widget URLs remain unchanged.

Verification: full repository validation and Pages build; existing actual-widget
desktop tests cover read-only/edit modes, bold Block/Lot identities, native code
and counts, one count divider through numeric reconciliation, unified geometry,
selection/Clear/filter retention, block jumps/collapse, notes, precise inline
saves, unknown recovery and takedown detail. Screenshots cover 1366px and 1920px.
Browser fixtures use native-shaped inert responses and do not write live records.
The 312-lot mode-performance check covers mounted rows/scrollers and no writes.

Rollback: restore Production `manage-lots` to `0.13.16` in
`deploy/environments.json` and rebuild Pages. The source-only shared count slots
are inert in widgets without these IDs. No native rollback is required.
