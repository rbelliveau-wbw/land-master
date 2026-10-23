# HCSS budget line check — five batches

Follow-up: the user moved counter ownership to the existing timer and renamed it
**Next Workflow Run/Next Batch** (native link `Next_Workflow_Run_Next_Ba`).
This supersedes the initial HCSS-owned completion cursor.

The user approved replacing the fixed daily HCSS line-existence check with a
Settings-anchored schedule and deleting the old workflow after verification.
They also requested Current Batch in Settings Automation and PMP. PMP promotes
repository main/Production frontend assets; the user publishes Creator changes.

## Contracts and scope

- New native workflow: `Budgets_Check_HCSS_Budget1`, **Budgets - Check HCSS Budget
  Lines - 5 Batches**, Settings → Next Workflow Run, daily field schedule,
  America/Chicago. The renamed timer moves the anchor forward three hours.
- Stable group: native `Subdivision.ID % 5`, values 0–4. Related budget lines
  stay together. Native BIGINT arithmetic avoids JavaScript ID precision loss.
- Existing `Settings.Current_Batch` is captured once. Null/out-of-range legacy
  values select batch 0. HCSS never writes the shared cursor.
- **Next Workflow Run/Next Batch** (formerly Test Add Hours) alone rotates
  0 -> 1 -> 2 -> 3 -> 4 -> 0 and updates the date by +3h in one native update.
  Null/out-of-range legacy values reset to 0. HCSS failure does not hold the
  cursor; its failed batch remains identifiable in Workflow Log for review.
  Each group normally repeats every 15h.
- Analytics view `2107789000023687048`, **HeavyJob Budget Costs joined w/
  Subdivs**, retains the three original columns. Its export criteria selects
  only that bucket's mapped HeavyJob job codes. The existing guarded
  `analyticsExportRows` helper/connection is reused unchanged.
- Creator query selects only `Budget_Import_Item` records with `Data_Source ==
  "HeavyJob Budget"`, nonzero Cost, and eligible subdivision codes in the same
  bucket. Each source/mapping collection is fetched once. Maps replace repeated
  per-row mapping queries and quadratic source membership scans.
- Existing Add Budget eligibility, HeavyJob-only mappings, complete source
  identity validation, active GUID protection, stable-code GUID refresh,
  duplicate stable-code protection and zero-only-if-both-absent logic remain.
- Unmapped subdivisions are excluded from cleanup. Ambiguous HeavyJob jobs or
  subdivision codes fail before writes. Incomplete/out-of-scope source rows fail
  before writes. An empty filtered export is a protected Skipped no-op; it never
  zeroes costs. HTTP, schema and incomplete export errors still fail.
- Business writes remain only `Cost_Code_ID` refresh and `Cost = 0`. No inserts,
  cost import, description/Updated Date or other field changes. Logs report
  batch, source/checked counts, GUID refreshes, zeroed costs and protections.

## Deployment and rollback

Canonical new action and timer are in `creator/hcss-batches/`. The old action and
fixed-time schedule are preserved in its `rollback/` folder. The integration
audit retirement registry prevents generation of the old active candidate.
Original export/baseline snapshots remain immutable.

Publish the new workflow, timer change and old-workflow deletion together.
Development schedule executions stay suspended. Do not execute the live cleanup
for verification. Preview uses `dryRun = true`, one `previewBatch` per run, and
changes no business records, workflow log or Settings values.

Settings Manager 1.6.3 places Current Batch in Automation using its existing
SDK2 controller, native singleton/access checks and retained autosave drafts.
Only 0–4 whole numbers can be saved; existing invalid values remain visible
until deliberately corrected or normalized by the batch workflow. No native
form fields, Custom APIs, connections, permissions or global helpers are added.
Stage frontend mappings remain unchanged. Frontend rollback: 1.6.2.

To undo this ownership move, restore the timer and HCSS action from commit
`8c7d8791`, keeping the user's renamed timer identity. To undo the original five-
batch rollout, restore **both** legacy timer and old fixed schedule from
`rollback/` and remove/disable the replacement together. Never leave two cursor
owners or both HCSS schedules active. No business data deletion is involved.

## Verification

Development installation is complete: the new schedule and date-only timer were
saved and independently reopened, the old workflow was deleted, and a refreshed
schedule list confirmed zero old rows and one replacement row. Both renamed
timer and HCSS ownership changes are saved/reopened in the follow-up. Development
executions remain suspended. Current Batch was explicitly initialized to 0 in
Development; Production Settings values were not edited.

All five native read-only previews passed. Bucket subdivision counts were
**1, 0, 1, 2, 1**; the nonempty source bucket returned and checked **75** lines,
all unchanged. Other buckets were protected no-ops. These are Development's
five budget subdivisions; Production batch sizes/write performance have not
been exercised. No cleanup, source-date, log or cursor writes occurred during
previews. The saved deployment action has `dryRun = false`; it was not executed.
The existing Production cursor 6 will reset to 0 on the first renamed timer
run after Creator publication; the next timer run advances it to 1.

`scripts/test-hcss-batches.mjs` executes the actual source classification and
destination decision blocks with native-shaped adapters. It covers recreated
GUIDs, deleted lines, duplicate protection, late malformed source, empty source,
read-only previews, exact long-ID bucket coverage, other-bucket isolation,
actual timer rotation (including null/legacy values), captured-batch stability, timer ownership and old-candidate exclusion. Settings SDK2 tests
cover Automation placement, exclusion from Additional Fields, rejected values,
valid 0/4 saves and unchanged readiness behavior. Native previews and saved-body
checks are recorded in the installation manifest; Production cleanup is not a
test gate and remains unexecuted.

## Schedule order

Zoho documents ordered actions within one schedule workflow, not a priority
guarantee for separate schedules in dashboard list order. Do not treat the
timer's position at the top as proof it starts first. The timer writes batch
and date together. HCSS captures the current batch once; later timer changes
do not abort or change its selected scope. Guaranteed cross-workflow sequencing
would require chaining the operations within one workflow, which this change
does not add. See [Zoho schedule actions](https://help.zoho.com/portal/en/kb/creator/developer-guide/workflows/schedule-workflows/articles/schedule-workflow-actions).
