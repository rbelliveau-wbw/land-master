
# Tax Center

Tax parcel, tax year, jurisdiction, protest, and appeal management.

## SDK2 candidate

The current source adopts the reviewed SDK2 controller and mounted multi-record progress adapter. Release version, immutable packaging, environment routing and native Development/Production gates remain owned by the release task. No live Tax gate or deployment is claimed here.

Reads use native counted cursor snapshots with exact string record IDs. Incomplete, duplicated or changing scopes remain read-only; the existing 800-row parcel-search limit remains. All four bulk paths capture each destination and payload, preflight the complete fresh scope, and verify persisted fields by exact ID. Lost, mixed or unsettled writes retain their draft and ledger without automatic replay. Read-only Recheck can reconcile an authoritative record ID; an unknown create without one requires manual review.

The existing business mapping, tax criteria, date conversion, per-record copy-from values, parcel identifiers and default Creator workflow behavior are preserved from immutable `19.17.4`. Property writes remain on `All_Property`, parcel-year writes on `All_Tax_Parcel_Years`; no schema, function or Custom API changes are required. See [SDK2 contract](SDK2.md) for fields, verification and rollback.

Focused verification:

```text
node scripts/test-tax-sdk-v2.mjs
node scripts/test-tax-sdk-v2-effective.mjs
node scripts/test-creator-data.mjs
node scripts/validate-widget-javascript.mjs
```

These actual-source fixtures use in-memory native-shaped responses and the immutable SDK1 release. They do not perform browser or Creator writes. The release task still runs full repository validation/build and native gates. Rollback: route Tax to immutable `19.17.4`; no data migration is involved. Its preexisting count mismatch can expose incomplete rows, so rollback does not preserve the candidate's new completeness protection.

## Baseline

- Version: `19.0.0`
- Original upload: `tax_center_widget_19 (2).zip`
- Extracted source: `src/`
- Immutable original: `baseline/tax_center_widget_19 (2).zip`
- Initial external release: `../../releases/tax-center/19.0.0/`

The extracted source is intentionally preserved as a monolithic Creator widget baseline. Do not refactor it merely to make it look cleaner. Establish behavioral tests first, then make targeted changes.

## Entry points

- Creator package entry: `src/app/widget.html`
- External-hosting entry after release: `index.html`
- Creator package manifest: `src/plugin-manifest.json`

## Common commands

```bash
npm run validate
npm run package:creator -- tax-center
npm run release -- tax-center <new-version>
npm run build:pages
```

## Edit TPY currency formatting (19.17.4)

Dollar-value fields in the Edit Tax Parcel Year modal display as US currency when the modal opens and whenever focus leaves the input. Focus removes the dollar sign and grouping commas for editing, and saves continue to send normalized numeric values. No functions or Custom APIs change. Regression: all eight Edit TPY dollar fields, blank values, focus/blur formatting, and save normalization. Rollback: restore the production mapping to `19.17.3`.

## Tax Parcel Year acreage source (19.17.3)

The parcel-year Acres column shows only `Tax_Parcel_Year.Acres`. A blank TPY acreage remains blank instead of falling back to the linked `Property.Acres`. No functions or Custom APIs change. Regression: TPY acreage display, inline edit, and linked-property enrichment for County, legal description, and Company. Rollback: restore the production mapping to `19.17.2`.

## Navarro County (19.17.2)

Property and parcel-year County editors always offer Navarro, including before the first Navarro record exists. Existing record-derived choices and data-filter counts are retained. No functions or Custom APIs change. Regression: Navarro selection, existing choices, and County save payloads. Rollback: restore the production mapping to `19.17.1`.

## Routine success feedback (19.17.11)

Uses the shared [success-feedback guide](../../knowledge/design/success-feedback.md). Existing inline green verification and progress/result dialogs remain. Routine confirmations describe the actual completed action; inline saves are grouped without delaying writes. Frontend only; no Creator deployment is required.
