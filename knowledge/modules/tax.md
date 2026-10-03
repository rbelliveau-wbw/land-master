
# Tax Module

## Scope

Tax parcels, parcel years, jurisdictions, rates, tax tables, protest/appeal stages, and associated company/subdivision/property matching.

Tax parcel-year matching should use `Property_ID` and populate the appropriate Property/Subdivision/Company relationship according to existing workflow rules.

## SDK2 candidate and completeness

The candidate preserves the immutable19.17.4 tax business engines and uses native SDK2 counted cursor reads with exact string IDs. Count mismatches, duplicate/missing IDs, changed snapshots and failed report reads leave the scope read-only. In particular, the earlier native scope with152 claimed records and151 rendered rows must become complete or blocked; a successful transport response alone cannot authorize editing.

Properties, Companies, Subdivisions and Jurisdictions require complete reference snapshots. Projects is explicitly unavailable on failure and blocks dependent selectors. Parcel searches retain the existing800-record limit. Fresh whole-scope preflight and exact persisted-field readback gate all four multi-record paths. Per-ID ledger states retain partial/unknown results, prevent replay of verified or uncertain writes and support read-only reconciliation. Unidentified creates retain their draft for manual review rather than finding a parent by name.

Existing `Property`, `Tax_Parcel_Year`, their report fields, generated field types, parcel-year matching, currency/date semantics, copy-from values and default Creator workflows remain unchanged. No function, Custom API, schema or permission change is required. See [Tax SDK2 contract](../../widgets/tax-center/SDK2.md) for transport, field verification, regression scenarios and rollback19.17.4.

Actual-source offline suites pass against native-shaped in-memory fixtures; native Development/Production gates and release promotion remain pending. The fixtures do not perform Creator writes or establish live field availability. Release metadata, routes and full repository validation/build are owned by the release task.
