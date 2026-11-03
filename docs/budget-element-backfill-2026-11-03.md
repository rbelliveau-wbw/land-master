# One-Time Budget Element Backfill

The user authorized a one-time initialization of existing Development and
Engineering Budget Item element amounts, preserving every existing explicit
allocation. This is separate from Creator code promotion and adds no scheduled
workflow or recurring migration.

## Prepared Production Audit

The signed-in native `All_Budget_Items` report was exported as JSON on November
3. Local preparation used its exact string record IDs and native `Department`
picklist. The export's Budget and Budget Category values are display labels;
they were retained as provenance and were never joined across phases or used
as update identities.

The source contained 24,516 Budget Item rows. The prepared Final-component plan
contains 10,125 non-template rows with a Budget reference, all five existing
Final component fields blank, and a known `Budget_Ttl`: 9,711 Development rows
default to Other, and 414 Engineering rows default to Labor. The plan includes
9,972 known zero Final values and eight signed credits. Another 2,929 Dev/Eng
rows have blank Final amounts and are excluded. No existing explicit Dev/Eng
component allocation was found in this export; the planner nevertheless
preserves any nonblank component, including partial or all-zero allocations.

These are **prepared counts**, not a claim that native import succeeded.
Raw source records, update CSV and rollback preimages remain local under
`tmp/budget-elements/backfill/`; do not commit them. The source JSON SHA-256 is
`a368e1ea8c72ebea0bcc697d996bd2d59d36e2680438619b431181a559d4e377`.

## Preparation and Native Application

Run the offline planner against a fresh native export:

```text
node scripts/prepare-budget-element-backfill.mjs --items items.json --out prepared-final --department-source item
```

The default Final mode reads only `Budget_Ttl` and emits CSV columns for `ID`
and the five existing Final component fields. It never writes Preliminary,
Unapproved, Final totals, actuals, approvals, statuses, relationships or history.
All decimal arithmetic preserves four places without using floating-point ID or
currency conversion. The default category mode alternatively requires a
complete category export with exact record IDs and matching item/category
Budget IDs. Name-based category matching is not supported.

The tool outputs `updates.csv`, `rollback.csv`, `rollback-preimage.json` and a
sanitized `summary.json` with input/output hashes. It refuses to overwrite
existing artifacts. It performs no network request and applies no data.

Before native import, re-audit the intended IDs against the latest native data;
do not overwrite a component allocation added after export. Use Creator's
update-existing-records mode, matching only the native record ID and mapping
only the five component columns. Confirm the exact intended record count and
that no new records, totals or unrelated fields are included. Preserve native
import result evidence. A lost/unknown result requires an explicit read-only
recheck, not a blind replay.

After a settled native acknowledgement, export the same records and compare
IDs/counts and the intended one-time results explicitly. Preserve all unrelated
exported fields, including totals and relationship/status values. This explicit
backfill audit is separate from ordinary automatic widget-save comparisons.

Rollback CSV contains the original blank components. A native rollback must
explicitly clear blanks; an import that ignores blank cells does not restore
them. If the product cannot confirm blank clearing, use the original native
null preimages through the existing authorized record API. Re-audit current
components before rollback so a later explicit allocation is never erased.

## Separate Preliminary Data

The five new `Prelim_*_Budget` fields are planned separately in
[the Creator handoff](../creator/workflows/budget-preliminary-elements/README.md).
Once installed and returned by a fresh native export, the explicit
`--tier preliminary` option prepares a separate file from `Prelim_Budget_Ttl`.
It writes only those five Preliminary components, preserving existing Final
snapshots. It refuses to proceed when the new field columns are absent. Never
import the Final plan into Preliminary fields or reuse Final totals as
Preliminary values.

Verification: `node scripts/test-budget-element-backfill.mjs` executes quoted
CSV/native JSON parsing, exact IDs and signed four-place decimals, field-presence
and scope guards, explicit allocation preservation, Final/Preliminary isolation,
update-only output, rollback preimages, immutable artifacts and sanitized
summaries. Native import, compilation and report publication remain separate.
