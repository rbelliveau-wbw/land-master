# Actual Element Queries

The installation targets are `gp-development-costs.sql`,
`gp-construction-costs.sql`, and `hcss-actuals.sql`. They add element columns to
the existing query projections while preserving parent totals, filters, joins,
grouping and ordering. The corresponding original queries are in `baseline/`.

GP elements use numeric `Cost_Element` 1 through 5. Development retains signed
nonzero costs and its existing code ranges. Construction retains positive costs
only, codes 3000 through 3999, and its existing two-place parent total. Component
amounts retain source precision independently of that total. No element-sum or
residual-amount equality is required. The historical audit's rounded comparison
is informational only. Unsupported GP elements remain a separate classification
check through `Unclassified_Count`; cancelling amounts cannot hide an unsupported
numeric element identity.

HCSS Other uses `Actual_Misc1_Cost`, following the user's requested source check:
the native preview found 158 nonzero Misc 1 rows and no nonzero Trucking, Supplies,
Misc 2 or Misc 3 rows among 1,817 mapped rows. The first four source columns are
`ActualLaborCost`, `ActualMaterialCost`, `ActualEquipmentCost` and
`ActualSubcontractCost`. `ActualLaborEquipCost` is a combined amount and is excluded
to avoid double counting. The user's final rule selects Misc 1 for Other and
ignores Trucking, Supplies, Misc 2 and Misc 3. The two explicitly named Other
alternatives remain review artifacts; neither is a separate installation target.

The user's November 3 rule accepts the five source elements and original parent
total independently. Their sum need not equal the total. `Unclassified_Actuals`
and historical residual counts are informational and must not block the revised
import or rollup. No implied element is calculated from the total, no residual is
allocated, and no source precision setting is changed. Public verification
status and counts are in
`source-audit-evidence.json`. Full financial evidence and record examples remain
local in the git-ignored `tmp/actuals-install/private-source-audit-evidence.json`.

## Complete Read-Only Comparisons

For each source, execute these files in Analytics using **Execute Query** and
leave the editor without saving the audit text:

- `audits/<source>-summary.sql` returns Baseline and Candidate counts and grand
  totals at four places, negative grouped amounts, underlying signed credit
  counts/amounts, component residual counts/net/absolute amounts and unknown
  element counts. The baseline and candidate parent/credit metrics must match.
- `audits/<source>-saved-view-group-comparison.sql` compares every original grouping field,
  metadata value, row count, null-total count and four-place total. It returns only
  changed or missing/added groups; a preserved projection returns zero rows. It
  compares the original raw query with the actual saved query table.
- `audits/<source>-saved-view-duplicate-keys.sql` reports duplicate existing import identities
  separately for Baseline and Candidate. It does not collapse descriptions or
  change source grouping to conceal an existing duplicate.

Execute HCSS saved-view audits in the GP Development editor and GP saved-view
audits in the HCSS editor, preventing a query from referring to its own saved
view. Use Execute Query only; never save the audit text.

All audits read the complete source scopes. No sample, LIMIT or positive-only
audit filter is added. The residual absolute sum and row count expose differences
that would cancel in a grand total. Native Analytics rejected comparisons with
two derived source queries. The saved-view comparisons use one derived original
query and a direct saved query table per LEFT JOIN branch, with null-safe original
grouping keys. Duplicate audits use at most one derived source per UNION branch.
All derived references are explicitly qualified. The older source-to-source
comparison files are local regression references; use the saved-view versions live.
Regenerate after a query revision with
`python creator/workflows/budget-actual-elements/analytics/prepare_read_only_audits.py`.

The complete native summaries preserve all original grouped row counts and grand
totals: HCSS 1,800 rows; GP Construction 1,660 rows; GP Development 235 rows.
GP Development retains six negative groups and their original total. Both GP
sources have zero residual and unclassified rows. HCSS has 409 residual groups
with opposing differences, so the audit checks counts and absolute amounts as well
as net amounts. Per-group and duplicate audits also completed successfully in
native Analytics for all three sources: zero changed, missing or added original
groups; zero changes to projected metadata or per-group totals; and zero duplicate
import keys in either baseline or saved candidate. The complete original parent
data is preserved. The historical HCSS count of 409 differing element sums is
informational under the independent-value rule; its cause remains unconfirmed,
and no source values or precision settings were edited. The revised importer
and rollup helper were saved, compiled and independently reopened in Development
with exact whitespace-normalized current candidates and the old amount gates
absent. Creator Production promotion remains user-owned. All six compatible
audits used Execute Query only
and were never saved. Financial values remain in the ignored private evidence.

Local verification:
`python creator/workflows/budget-actual-elements/analytics/verify_read_only_audits.py`.
The 18 passing tests execute the actual SQL against fixtures and deliberately
inject changed totals/keys to verify the comparison detects them. These tests
also check explicit derived-table aliases required by the native Analytics
parser. They do not establish native compilation or the complete live audit results.
