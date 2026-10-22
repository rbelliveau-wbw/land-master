## Shared interaction motion — 19.17.20, October 16, 2026

Applicable tabs, disclosures, keyed rows, authorized refreshes, actual save
feedback, overlays, changed rows and progress meters follow the approved
[repository-wide interaction rule](../design/interaction-motion.md). Every new
feature must use the shared layer and explicit registry. Native field-exit
numbers, business timing and access guards remain. No Creator deployment is
required. [Coverage, checks and rollback](../../docs/interaction-motion-rollout-2026-10-16.md).

## Complete held numbers and scroll containment — 19.17.19, October 16, 2026

Numeric wrappers contain animation overflow so fitting tables do not acquire
scrollbars. Field-exit holds retain complete scalar results and semantic sign
color, including Pro Forma subforms. Native calculations/save timing and Creator
contracts remain unchanged; no Creator deployment is required.
[Changed files, desktop regressions and rollback](../../docs/number-subforms-and-scroll-2026-10-16.md).

## Stable numeric layout — 19.17.18, October 16, 2026

Held old numbers keep their natural width, baseline and position during typing;
real text sizes the committed transition. Insights also removes its visible
bottom description/page footer and fills that space with the matrix. No Creator
contracts or deployment changes. [Verification, files and rollback](../../docs/number-layout-and-insights-footer-2026-10-16.md).

## Keep old numbers visible — 19.17.17, October 15, 2026

Existing calculated numbers stay visible during typing, then transition on field
exit. Nested renders cannot erase the held old value. No Creator contract or
deployment changes. [Fix, verification and rollback](../../docs/number-old-values-visible-2026-10-15.md).

## Tax Center field-exit numbers — 19.17.16, October 15, 2026

Derived visuals retain their last committed number during typing and replace it
once on field exit. Explicit choices remain immediate; native precision, model
calculations, accessible DOM values, exports and save/API timing are preserved.
No Creator contracts or deployment change. [Release evidence, regressions and
rollback](../../docs/number-field-exit-2026-10-15.md).

## Tax Center number transitions — 19.17.15, October 15, 2026

Sliding push now covers loaded financial summaries, separate server counts, facets, selections, subdivision values, prior-year comparisons and verified batch counts.
Real values update immediately; native editable precision/caret, identities, dates,
financial math, permissions and existing save/approval/recovery gates are retained.
Reduced motion is immediate. No Creator forms, fields, functions or APIs change;
no Creator deployment is required. Production rollback: 19.17.14.
[Changed files, complete coverage and regression evidence](../../docs/number-transition-rollout-2026-10-15.md).



## Save policy — October 8, 2026

Acknowledged successful saves no longer compare refreshed editable/calculated
fields with the submitted payload. Record identity/count, real API errors,
preflight and duplicate-send guards remain; explicit unknown-reply recovery is
read-only. This supersedes earlier automatic field-equality requirements. See
[implementation, regressions and rollback](../../docs/automatic-save-check-removal-2026-10-08.md).
# Tax Module

## Uniqueness warning by Save — 19.17.27, October 21, 2026

The existing live uniqueness notice now sits in the Add Tax Parcel Year action
footer beside Cancel and Save. Duplicate, invalid and unavailable states use
bold red text and a matching dot; checking remains muted and valid results hide
the notice. The existing asynchronous check, stale-response guards, disabled
Save and final prewrite check are reused without changes. No Creator forms,
fields, functions, Custom APIs or deployment changes. Desktop verification:
duplicate notice beside disabled Save, available year clearing the notice and
normal enabled Save. Production rollback: `19.17.26`.

## Live parcel-year uniqueness — 19.17.26, October 21, 2026

Year, Property and Subdivision changes check the unchanged generated
`Tax_Parcel_Year_Code` against `All_Tax_Parcel_Years` immediately. A short amber
notice appears beside the selection; Save is disabled while checking, when a
duplicate exists, or when uniqueness cannot be checked. Success hides the notice.
Stale/closed-dialog replies cannot repaint a newer selection. The final captured
create rechecks the same unique code, including the Creator 50-character limit.
No code suffix, truncation, alternate name matching or automatic update occurs.

Tax's native code 3001 validation rejections retain editable drafts rather than
creating a permanent unknown-write lock. Actual native field messages, failure
codes and response context remain visible; ambiguous, competing, missing-ID and
late replies still prevent replay and require read-only recovery. Native success
still requires the exact string destination ID and fresh counted identity read.
Property/parcel-year matching, payload inheritance and all workflow rules remain.
No form, field, function, Custom API or Creator deployment changes are required.
[Evidence, systemic diagnostics, regression and rollback](../../docs/tax-live-uniqueness-2026-10-21.md).

## Explicit field clears — 19.17.23, October 20, 2026

Parcel inline saves now retain explicit empty strings for `Notice_Received`,
`Protest_Deadline`, `Protest_Hearing_Date`, `Arbitration_Notice_Received` and
`Arbitration_Hearing_Date` on `Tax_Parcel_Year`. Previously deleting a date was
filtered out and failed with "No captured Tax field changes are available."
The detail modal also submits a cleared saved date when its input is present;
missing controls cannot clear fields. Empty requests, loaded-field/scope checks,
exact string IDs, acknowledgement handling and uncertain-write recovery remain.

The same repair covers parcel `Company1`, `County`, `Acres` and `Geo_ID`, and
the detail modal's eight money inputs. Property editing preserves explicit clears
for `Property_ID`, `County`, `Land_Type`, `Company1`, `Legal_Description`, `Acres`,
`Original_Acres`, `Notes` and an empty `Projects` selection. Confirmed local
mirrors retain empty values rather than restoring the previous value with a
truthy fallback. Company IDs and project selections update in both property
edit paths. Required Common Name validation and missing-control protections
remain. Bulk date/money clears already use literal payloads; placeholder Company
or status selections still mean no bulk change. New-record default/inheritance
rules are unchanged.

Changed implementation: `widgets/tax-center/src/app/widget.html`; release,
config, manifest and environment mappings accompany it. No Creator schema,
function, Custom API or Creator deployment is required. Whole-app native-shaped
regressions in `scripts/test-tax-sdk-v2.mjs` cover all five date clears, fresh
search persistence, replacement dates, parcel/modal money clears, property and
project clears with reference reload, bulk date clears, missing controls,
required-name validation and rejected clears retaining the confirmed model.
These tests do not write live Creator records. Production
rollback: map Tax Center to `19.17.21` and rebuild Pages.

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

## Attachment verification and recovery UI (19.17.13)

Global recovery notices no longer lock navigation after settled failures. Contract
and PF attachment uploads verify saved child/parent/file metadata using the
working Budget approach, without a download/byte-comparison gate. PF deletion
verifies absence using a counted collection rather than reading a deleted ID.
Pending requests and duplicate uncertain writes remain protected. No Creator
deployment is required. See [checks and rollback](../../docs/attachment-terminal-recovery-2026-10-07.md).
