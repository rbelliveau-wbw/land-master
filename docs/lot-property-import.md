# Lot And Property Import — 8.17.21

The reviewed spreadsheet action creates one net new Lot and then one net new Residential / L&B Res Property for each selected new Lot. No existing Property is matched, changed or reused. Existing Lot codes are excluded; Property backfill is deferred.

## Native Data Contract

- Lots keeps the existing validated payload, unique Lot Code, source provenance and Notes omission policy.
- Property writes `Common_Name` and `Property_ID` as the generated Lot Code; the latter is an internal reference pending the real CAD parcel ID. No invented CAD IDs, source notes or financial values are written.
- Property writes `Land_Type: Residential`, `Subtype: L&B Res`, `Projects: [Subdivision.Project.ID]`, `Subdivisions: [Subdivision.ID]`, `Lots: newLotID`, and subdivision City/County. Lookup IDs remain strings.
- Reuses the native `createRecord` adapter and response error handling. No Custom API or Deluge changes. Actual API rejection is an error; optional Property response IDs and display refreshes do not gate accepted success. A new Lot ID is needed to populate the subsequent Property lookup.

## Creator Prerequisite

Read-only native UI inspection on November 12, 2026 confirmed Development Property field link name `Lots`, a single lookup to Add Lots displayed as Lot Code. The Production Create Property form did not expose this field. Publish this required lookup through Stage to Production before promoting the widget. Preserve unrelated pending Creator components. The other fields are existing native Property fields.

## Results And Recovery

Review shows matching Create New columns and the fixed classification. Creation patches one mounted progress table with identical status styling for Lot Record and Property Record. Saved counts come only from accepted native writes; a rejected Property never makes its saved Lot appear failed. Lost replies stop later writes and terminal imports cannot be sent again. Missing Lot IDs preserve Lot success and stop Property creation. Background display refresh is optional. There is no automatic rollback, Property matching or replay after a partial result; review the exact saved/failed rows before any manual repair.

## Validation And Rollback

Focused regressions cover exact Property IDs and lookup shapes, native response envelopes, optional IDs, failed Properties, lost Lot/Property replies, pending close/double-click locks, session changes, duplicate codes, deferred backfill and optional refresh failures. Browser fixture uses the actual import UI with simulated native replies and never inserts live records. Full repository validation and Pages build are required before release. Greptile reviews only committed feature changes against the captured base.

Rollback the Land Master environment mapping to 8.17.19. Keep created records; rollback does not delete Lots or Properties. The optional Property Lots lookup may remain in Creator.

The Creator component selector confirms exactly three pending components: Property.Add Lots (`Lots`), the All Property report change, and the added Validate Property Lot form workflow. The workflow requires a selected Lot to belong to one of the Property's Subdivisions and its Project. These are the only components needed for this feature. Publication remains pending explicit authorization under the standing PMP rule.

The manual design detector found two pre-existing selectors (the retired summary-metric accent and the legacy table-row accent). This release no longer renders summary metrics and explicitly removes the row accent in the paired results. Native UI reading verified Development lookup name/target/display and the exact pending validation workflow. No live import records were inserted during testing.

## Greptile Review Ledger

Review 1 of 3: confidence 4/5, four P2 findings confirmed. Stopped preflight stages and unsent destinations now remain truthful; background inertness lasts until actual dismissal while nested confirmation stays usable; the results region is focusable and included in the trap; changing quantities use the canonical numeric registry with stable per-import and per-display keys. Version 8.17.19 is retained as a superseded immutable candidate; 8.17.21 contains the fixes. The shared numeric registry changes only the Land Master adoption branch; other synchronized copies have no behavior change.

Review 2 recovery: the combined two-release diff exceeded Greptile's upload size limit, so the follow-up used the already-reviewed initial commit as its incremental base. Greptile service run `775636ef-929f-4025-9477-125abac2a92d` failed unexpectedly; reopening that run failed with the same service error. The automatic loop stopped as required. All four fixes are applied and locally verified but have no completed follow-up Greptile verdict.

Final verification: full `npm run validate` and `npm run build:pages` passed after the fixes. The browser fixture confirmed identical Saved columns, partial failures, a focusable result region reachable by Shift+Tab, a background that remains inert through results and unlocks on dismissal, narrow-screen layout, and the canonical quantity runtime. Production classification choices Residential and L&B Res were inspected without submitting any record.

## Main Branch Integration

Main advanced to f82b7a37 with the independently completed Property Lot editor, native relationship preflight, subdivision filtering, report exposure and validation workflow. Release 8.17.21 combines that update with this import, preserving its production immutable 8.17.19. Earlier import-only candidates remain on the original feature branch and are not promoted. The import still uses createRecord, so the new native Property lot relationship preflight is reused automatically. User authorized the required Creator publication in this chat.
