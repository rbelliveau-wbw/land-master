# Tax SDK2 contract

Version 19.17.5 is a Development candidate. Adoption and offline verification are complete; native gates and Production promotion are separate. The original SDK1 baseline is `releases/tax-center/19.17.4/index.html`. No backend or schema change accompanies this migration.

## Native transport and readiness

The page uses Creator SDK2 `UTIL.getInitParams`, `DATA.getRecordCount`, `DATA.getRecords`, `DATA.updateRecordById` and `DATA.addRecords`. Configuration names are native snake_case; update and create payloads remain `{data: capturedFields}` inside `payload`. Creator IDs and parcel identifiers remain strings. There is no SDK1 API fallback, envelope probing, demo fallback or custom authentication path.

The initializer has a five-second deadline and rejects malformed or unidentified actors/environments. A fresh retry gets a fresh native handshake; a late old handshake cannot replace its identity. Captured operations also retain their actor/environment and data generations. Native Creator access remains authoritative; this migration adds no user grants or permission endpoint.

`creator-data.js` and `runtime-context.js` are byte-identical copies of the current shared SDK2 implementations. The sync script and shared-copy test include Tax. Internal `LMTaxPreparation`/`LMTaxUIPreparation` names are retained from the reviewed implementation to avoid unnecessary logic changes.

## Complete reads

| Resource | Existing report | Availability requirement |
| --- | --- | --- |
| Properties | `All_Property` | Complete counted cursor snapshot |
| Companies | `All_Companies` | Complete counted cursor snapshot |
| Subdivisions | `All_Subdivisions` | Complete counted cursor snapshot |
| Jurisdictions | `All_Taxing_Jurisdictions` | Complete counted cursor snapshot |
| Projects | `All_Projects` | Complete snapshot, or explicitly unavailable |
| Parcel years | `All_Tax_Parcel_Years` | Complete current criteria, at most 800 records |

A native count before reading, exact unique decimal-string IDs through cursor exhaustion, and a matching post-read count are required. Count/code/known-wrapper failures, a missing/duplicate/numeric ID, repeated cursor, count mismatch or a changing scope cannot publish editable rows. A verified zero is distinct from unavailable data. Previous complete rows may remain visible but cannot authorize writes after a failed replacement. Failed optional Projects blocks dependent project selectors instead of becoming an authoritative empty choice list.

Original business criteria, status normalization, record mapping and `MM/dd/yyyy` payload conversion are preserved from SDK1. Existing advisories and facet counts retain their debounce/spacing rules. Changed criteria or a newer token prevent an old success or failure from repainting current counts. Starting a write invalidates old advisory totals and leaves unmeasured components unknown.

## Writes and persisted verification

Updates target `All_Tax_Parcel_Years` or `All_Property` with one intended string ID; creates target existing forms `Tax_Parcel_Year` or `Property`. The original field builders determine which fields are sent. The controller uses the generated `Tax_Parcel_Year` and `Property` field metadata for comparison; there are no new fields. It preserves deliberate blank/Undecided choices, each row's own copy-from source, leading-zero `Property_ID`, exact lookup ID sets, booleans, formatted currency/decimals and equivalent valid dates. Missing requested fields and malformed values fail before dispatch.

An update is confirmed only by an unambiguous native code3000 acknowledgement of its exact ID and a fresh full-field exact-ID read matching every captured field. A single create requires one authoritative returned string ID and the same persisted-field evidence. Competing `result`/`details`/`response`/`output` envelopes, including recognized JSON text, are unverified and prevent replay; raw responses and native failure codes remain available. A uniquely identified create ID may be used only for read-only reconciliation. Conflicting/missing IDs cannot choose a parent by name or authorize another insert.

Native write and persisted readback deadlines are each 30 seconds from dispatch. A deadline cannot cancel an already dispatched native promise: its bounded queue slot remains occupied until that promise actually settles. Unknown results retain inputs and model locks; a late result releases the pending slot without publishing fields or accepting a late create ID. Recheck is disabled while the original native operation remains unsettled.

All four multi-record paths—parcel Status, parcel fields, Property Land Type/Company and subdivision-group Status—capture immutable per-ID payloads. Preflight rereads the complete scope, checks its exact ID set and selected original field values, then sends at most three native operations concurrently. The ledger distinguishes verified, rejected, unknown and not-sent destinations. Unknown stops queued sends. Progress counts only fresh persisted verification and remains mounted until a safe terminal dismissal. Recheck performs reads only; explicit retry sends only rejected/not-sent destinations after unknowns are resolved. Verified destinations are not resent.

Refresh, Search, sorting, filters, paging, navigation and affected form controls cannot replace drafts or mutate selections during a captured operation. Explicit Cancel may discard a definitely rejected local draft; unresolved writes cannot discard their review lock. Saved-flash callbacks check ownership before closing or repainting a later form. Verified Property creation resumes Add Tax Parcel Year using that exact created ID, including after read-only recovery.

## Verification and limits

`scripts/test-tax-sdk-v2.mjs` evaluates the entire actual page's inline scripts, parsed static/dynamic DOM and actual handlers with native SDK2 fixtures. It also checks preserved business engines against immutable19.17.4. `scripts/test-tax-sdk-v2-effective.mjs` covers actual effective functions, late facet/status ownership, metadata comparisons, rejected modal behavior, timeout/retry and recovery. Supporting fixtures live under `scripts/fixtures/tax-*`; no generated source transform is used.

Coverage includes the historical 152/151 mismatch, complete100+52 paging, 12,017 Properties, 800 unique verified destinations, changed same-count ID sets, partial/rejected/unknown results, count and mutation JSON-wrapper failures, per-ID ledgers, no-replay, exact create-parent selection, native deadlines, retained form nodes and draft ownership. These are synthetic offline scenarios, not native captured failure events. Browser geometry and actual Creator report-field availability are not proved by the fixtures.

Required native Development gate: confirm the current complete scoped count/unique IDs, paging, groups, search, financial display and normal selectors; use only an authorized reversible nonfinancial write with fresh per-ID readback and restoration. Production gates remain read-only unless separately authorized. The earlier native SDK1 Bexar scope reported152 while rendering151 editable rows; the SDK2 candidate must either reconcile a complete scope or remain read-only, never claim152 from151.

Release task owns `npm run validate`, `npm run build:pages`, version/config/manifests, immutable packaging, routes and Git. Rollback is immutable19.17.4. No backend rollback is needed, and its old incomplete-scope behavior remains an acknowledged limitation.
