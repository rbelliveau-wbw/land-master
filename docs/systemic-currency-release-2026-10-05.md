# Currency preservation and save verification — October 5, 2026

The widget fixes preserve currency decimals during editing and distinguish a valid local draft from a verified native save. Native Creator changes remain entirely with the user, including Development edits and Production promotion. This frontend release alone cannot correct the native installment capacity defect or restore previously lost cents.

## Production releases and rollback

| Widget | New release | Frontend rollback |
| --- | --- | --- |
| Proforma Manager | 1.80.80 | 1.80.79 |
| Budget Manager | 122.28.21 | 122.28.20 |
| Land Master | 8.14.8 | 8.14.7 |
| Contract Management | 1.60.55 | 1.60.54 |
| Tax Center | 19.17.9 | 19.17.8 |
| Settings Manager | 1.3.9 | 1.3.8 |
| Manage Lots | 0.10.2 | 0.10.1 |
| Land Master Insights | 1.5.43 | 1.5.42 |

Only the applicable Production mappings change. Stable Creator widget URLs remain unchanged. This release preserves the concurrent Land import fix that omits `Lots.Notes` from creation payloads, and the Contract 1.60.54 defaults/routing fixes.

## Findings and fixes

- Budget rounded monetary reads and editable header/preliminary amounts to whole dollars. Header `Lot_Price` / `Land_Cost`, item `Prelim_Budget_Ttl`, financial aggregates and comparisons now preserve decimals. Actual counts, phase indexes and sort positions retain integer rules.
- Tax rounded six editable currency values before blur/save: `Market_Value`, `Assessed_Value`, `Settlement_Offer_Value`, `Assessed_Offer`, `Final_Value`, `Assessed_Final`. Render, focus, blur and native payloads now preserve decimals.
- Legal currency summaries now display cents; editable amounts and `Contract_Pricing.Price_per_Ft` retain all fractional text through formatting and focus/blur. Native comma-formatted pricing no longer passes through a truncating generic parser before rendering.
- Land currency summaries now show cents and correctly parse native currency formatting. Ambiguous-create recovery compares fields by verified schema/editor type, permitting equivalent decimal/date/lookup representations while preserving string IDs and text identifiers. Missing fields, malformed values, changed cents/signs and unknown IDs still keep the insert quarantined without replay.
- Settings money controls retain fractional text through blur and reload rather than formatting it down to two places.
- Pro Forma labels its green installment check as a **draft** match. Exact saved-value verification remains required. Currency readback accepts equivalent formatted credits, without a rounding tolerance or a repeated write.
- Manage Lots accepts equivalent currency credit representations during receipt verification, preserving its settlement calculations and native workflow parity.
- Insights financial summaries now show cents. It remains read-only.

Currency credit handling covers signed dollars, accounting parentheses and Unicode minus where these controls/comparators accept currency. Invalid grouping and conflicting signs are rejected by exact persisted comparators. Two-place summaries do not become the source for editable or saved amounts.

## Native incident and required follow-up

Production Taylor Farms installment Amount was read directly as `12500109.9`, while the draft contains `12500109.92`. Development `Land_Installments.Cost` is verified as Max Digits 10 / Decimal Points 2. The intended amount occupies 11 characters. Zoho documents right-trimming for Deluge insertions beyond native numeric field capacity; this matches the observed loss. Production field properties and a repaired native write/readback remain unverified.

The widget reconciles small installment drift in its editable draft on load, which explains the green match in the screenshot. That check cannot establish that Creator saved the same amount. A strict save check correctly detects the lost cents; it must not accept `.90` as `.92` or blindly send again.

Apply the [native checklist](systemic-currency-native-handoff-2026-10-05.md) and [230-field inventory](systemic-currency-native-inventory-2026-10-05.json) using the user's Creator process. Review financial inputs and downstream totals across 25 forms. Native Development `proforma_save` also still rounds `Construction_Cost_Base` to whole dollars; the repository already contains the precise assignment. Apply only the documented function delta, preserving newer native code.

The user reports that the installment capacity correction has reached Production. Retesting should start by reloading Creator and reopening the Pro Forma from fresh saved data, then explicitly saving the reconciled draft. The retained prior operation's read-only Recheck cannot rewrite a previously trimmed amount. A successful live native save after promotion remains the user's retest; it is not claimed by the synthetic frontend checks.

Affected frontend files include eight widget sources and their currency/verification helpers, module guides, regression scripts, widget configs/manifests, immutable releases and Production environment mappings. No new Creator forms, fields, functions or Custom APIs are introduced; `Save_PF` and existing SDK routes retain their names/contracts. No native record or schema was changed in this frontend release.

## Regression and completion evidence

Focused tests exercise actual currency render/focus/blur handlers and queued write payloads; all six Tax currency fields through native-shaped write/readback; formatted large values, six-place inputs, credits and strict mismatch rejection; actual Land ambiguous-create/recheck with exact string IDs; and Pro Forma full saves plus 29 persisted-loss cases in both runtime environments. Existing module, approval, import and save/no-replay suites remain required.

Release gates: `npm run validate` (including prevalidation) and `npm run build:pages`, followed by main/Pages deployment verification and live Production HTML hashes. Native completion additionally requires the disposable-record save/reload comparisons in the handoff. Frontend validation does not substitute for that native test.

Rollback changes only a widget's Production mapping to its prior release above. Keep expanded native capacity and precise stored values; do not shrink native fields as a frontend rollback.
