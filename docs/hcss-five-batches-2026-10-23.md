# HCSS budget line check — five batches

The user approved replacing the fixed daily HCSS line-existence check with a
Settings-anchored schedule and deleting the old workflow after verification.
They also requested Current Batch in Settings Automation and PMP. PMP promotes
repository main/Production frontend assets; the user publishes Creator changes.

## Contracts and scope

- New native workflow: `Budgets_Check_HCSS_Budget1`, **Budgets - Check HCSS Budget
  Lines - 5 Batches**, Settings → Next Workflow Run, daily field schedule,
  America/Chicago. The existing timer moves the anchor forward three hours.
- Stable group: native `Subdivision.ID % 5`, values 0–4. Related budget lines
  stay together. Native BIGINT arithmetic avoids JavaScript ID precision loss.
- Existing `Settings.Current_Batch` is captured once. Null/out-of-range legacy
  values select batch 0. Only a successful/protected no-op completion advances
  `(batch + 1) % 5`; failures preserve the cursor. Each group repeats every 15h.
- `Test_Add_Hours` retains its +3h date update and loses its cursor update.
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

Settings Manager 1.6.2 places Current Batch in Automation using its existing
SDK2 controller, native singleton/access checks and retained autosave drafts.
Only 0–4 whole numbers can be saved; existing invalid values remain visible
until deliberately corrected or normalized by the batch workflow. No native
form fields, Custom APIs, connections, permissions or global helpers are added.
Stage frontend mappings remain unchanged. Frontend rollback: 1.6.1.

Backend rollback requires restoring **both** old timer and old HCSS schedule
and removing/disabling the replacement as one Creator change. Never run both
checks or leave two cursor owners. Restore source from `rollback/`; no business
data deletion is part of this rollout.

## Verification

Development installation is complete: the new schedule and date-only timer were
saved and independently reopened, the old workflow was deleted, and a refreshed
schedule list confirmed zero old rows and one replacement row. Development
executions remain suspended. Current Batch was explicitly initialized to 0 in
Development; Production Settings values were not edited.

All five native read-only previews passed. Bucket subdivision counts were
**1, 0, 1, 2, 1**; the nonempty source bucket returned and checked **75** lines,
all unchanged. Other buckets were protected no-ops. These are Development's
five budget subdivisions; Production batch sizes/write performance have not
been exercised. No cleanup, source-date, log or cursor writes occurred during
previews. The saved deployment action has `dryRun = false`; it was not executed.
The existing Production cursor 6 will select batch 0 and advance to 1 on the
first successful run after Creator publication.

`scripts/test-hcss-batches.mjs` executes the actual source classification and
destination decision blocks with native-shaped adapters. It covers recreated
GUIDs, deleted lines, duplicate protection, late malformed source, empty source,
read-only previews, exact long-ID bucket coverage, other-bucket isolation,
cursor wrap, timer ownership and old-candidate exclusion. Settings SDK2 tests
cover Automation placement, exclusion from Additional Fields, rejected values,
valid 0/4 saves and unchanged readiness behavior. Native previews and saved-body
checks are recorded in the installation manifest; Production cleanup is not a
test gate and remains unexecuted.
