
# Tax Module

## Currency editor precision repair (2026-10-05)

Tax currency formatting now retains cents and additional supplied fractional digits. Previously `utilitiesconvertIntegerToCurrency` rounded values to whole dollars before displaying editable inputs. The parcel table's unconditional blur save could consequently replace an unchanged saved amount with the rounded display. Render, focus and blur now preserve the amount for `Tax_Parcel_Year.Market_Value`, `Assessed_Value`, `Settlement_Offer_Value`, `Assessed_Offer`, `Final_Value` and `Assessed_Final`, as well as the existing detail money input formatter. Ordinary currency displays include two decimal places; compact K/M displays retain their abbreviation.

`scripts/test-currency-edit-preservation.mjs` exercises actual formatting and inline-save payload construction for all six fields, negative/zero values, cents, additional decimals and formatted decimal strings without a Number conversion. Parenthesized accounting values now remain negative through numeric reads, formatting, focus and payload construction. The whole Tax SDK2 suite also verifies all six rendered inputs against native-shaped writes/readback. Existing exact persisted-field verification, complete-scope preflight, parcel-year matching, identifiers and copy/workflow rules remain unchanged. No Creator schema, function or Custom API change is required for this frontend repair. The fixture does not establish current live field precision. Rollback: map Tax Center to `19.17.8` and rebuild Pages.

The currency-only exact comparator also recognizes signed-dollar, accounting and Unicode-minus native representations. Finite typed Number values whose JavaScript representation uses an exponent expand exactly into decimal text; entered exponent strings remain invalid. It still compares canonical decimal strings without Number conversion, rounding or tolerance. Whole SDK2 regressions verify equivalent credit/numeric readbacks, reject conflicting signs/malformed grouping before dispatch, retain real sign/fractional differences and recover only through fresh reads without resending the write. Ordinary quantities, percentages and exact string identifiers retain their existing rules.

Inline monetary saves use that same strict decimal parser for the native payload, retaining entered fractional text rather than converting it through Number first. Actual queued/native fixtures cover `0.0000001`, high-precision strings, typed finite Number exponents and malformed-input rejection without a stuck Saving state. Numeric conversion remains limited to the existing local calculations/display models.

## Scope

Tax parcels, parcel years, jurisdictions, rates, tax tables, protest/appeal stages, and associated company/subdivision/property matching.

Tax parcel-year matching should use `Property_ID` and populate the appropriate Property/Subdivision/Company relationship according to existing workflow rules.

## SDK2 candidate and completeness

The candidate preserves the immutable19.17.4 tax business engines and uses native SDK2 counted cursor reads with exact string IDs. Count mismatches, duplicate/missing IDs, changed snapshots and failed report reads leave the scope read-only. In particular, the earlier native scope with152 claimed records and151 rendered rows must become complete or blocked; a successful transport response alone cannot authorize editing.

Properties, Companies, Subdivisions and Jurisdictions require complete reference snapshots. Projects is explicitly unavailable on failure and blocks dependent selectors. Parcel searches retain the existing800-record limit. Fresh whole-scope preflight and exact persisted-field readback gate all four multi-record paths. Per-ID ledger states retain partial/unknown results, prevent replay of verified or uncertain writes and support read-only reconciliation. Unidentified creates retain their draft for manual review rather than finding a parent by name.

Existing `Property`, `Tax_Parcel_Year`, their report fields, generated field types, parcel-year matching, currency/date semantics, copy-from values and default Creator workflows remain unchanged. No function, Custom API, schema or permission change is required. See [Tax SDK2 contract](../../widgets/tax-center/SDK2.md) for transport, field verification, regression scenarios and rollback19.17.4.

Actual-source offline suites pass against native-shaped in-memory fixtures; native Development/Production gates and release promotion remain pending. The fixtures do not perform Creator writes or establish live field availability. Release metadata, routes and full repository validation/build are owned by the release task.


## Startup/report refinement — 2026-10-04

Tax 19.17.8 explicitly includes null Arbitrate1 values in Undecided. Server facets and row searches share that clause. Counts use the authoritative Creator count API and exact current base criteria, including after inline edits. Facet values from old criteria stay hidden, failed counts stay unknown, and all edit/bulk completeness guards remain. No Creator deployment; rollback 19.17.6.

Evidence and further improvements: [startup refinements](../../docs/startup-refinements-2026-10-04.md).

## Routine success feedback — October 6, 2026

Parcel-year and Property inline editing keep saved field checks and persistent message bars, adding grouped success popups. Modal saves, property/parcel-year creation and verified audit-log copy add contextual confirmations. Failed/unknown and bulk result surfaces remain intact. See [the shared design guide](../design/success-feedback.md) for sizing, wording, inline preservation and reuse. This rollout is frontend only and adds no forms, fields, backend functions, Custom APIs or verification requests.
