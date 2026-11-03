# Preliminary Element Fields — Creator Handoff

## Verified Production Backfill — November 3, 2026

The user completed both imports after the importer-control handoff. A fresh
Production `All_Budget_Items` JSON export was compared with the pre-import
snapshot and both exact-ID update files. All **10,125 Final** and **988
Preliminary** allocations match, and every split reconciles to its corresponding
current line total. Development allocations are Other; Engineering allocations
are Labor. These tier counts cover **10,279 distinct updated Budget Items**.

All **24,516 unique record IDs** remain present, with no added or removed records.
Across all **34 exported fields**, the only changes are the planned ten component
fields on their intended rows. Totals, actuals, department codes, and all other
exported values are unchanged. No data correction or import replay was needed.
The agent performed no Production record writes; the user applied the imports.
Audit metadata/history and separate approval records were not part of this export.
Local evidence: `tmp/budget-elements/backfill/post-import-audit.json` and
`production-after-import.json` in the same directory; keep raw records uncommitted.

The earlier preparation/handoff notes below describe the prior state; their
pending/unapplied statements are superseded by this verified result.

The five Preliminary fields and `All_Budget_Items` layouts were saved and
verified in native **Development** on November 3. Exact display/link names
survived Done/reopen, and form-preview input names confirmed the bindings. See
[native installation progress](native-install-progress.json). Actual SDK/API
full-field response capture remains unverified. A normal Development Preliminary
save persisted the five elements, and Stage/Production promotion completed as
Creator **9.142** (18 scoped components). Production backfill is prepared but
blocked at the native upload control. All 14 Development function requirements are ready:
12 editor saves were acknowledged without compiler errors; two existing
modification functions already matched the candidate and were preserved.
The user explicitly approved the remaining native Development setup.
A read-only native ALL_DETAIL execution returned 90 parent rows, each with
five labeled elements and the original 16 parent columns. One Development Budget
Item initialized Preliminary components through the normal widget save while
keeping its existing total unchanged and Final blank. No Production records
changed and no business approval emails were sent; native publication notices
were retained. The November 2 export predates the fields.

The five optional fields in [schema.json](schema.json) are present on the
existing `Budget_Item` form in Development. Retain them; do not create duplicates.
[The form merge fragment](planned/Budget_Item.ds.fragment) records the settings
for review or an environment where the fields are absent. Each is USD with
four decimal places, Max Digits 16 (`maxchar = 16`), no default and no mandatory
requirement. The capacity matches the existing Preliminary budget input.
Keep the existing `Labor_Budget` through `Other_Budget` fields unchanged.

All five fields were added once and verified on the existing `All_Budget_Items`
list and quick-view layouts. Detail-view Configure Fields already included all
five automatically; that inclusion was verified. Existing report fields remain
intact. [The report fragment](planned/All_Budget_Items.ds.fragment) records the
additive field list. This is the only report associated with `Budget_Item` in
the November 2 catalog. Full native SDK record reads must still be checked for
all five keys, including explicit blanks on old records. Export the updated
native schema/catalog after the remaining native work.

A single classification field could reconstruct a one-element split from the
aggregate Preliminary amount. Five amount fields persist the requested element
values directly and retain explicit allocations, including future multi-element
splits; they also keep Preliminary separate from frozen Final snapshots.

The widget's existing user-triggered Preliminary save owns the related component
amounts. Development defaults to `(5) Other`, Engineering to `(1) Labor`. No field
default, scheduled workflow, background record migration or recurring automation
is added. Preserve native permissions and existing approval locks. The total
`Prelim_Budget_Ttl` remains the existing source value; do not change it while
populating child amounts.

Finalization uses the existing approval handlers and
`snapshotBudgetItemComponents`. Dev/Eng freeze a complete, reconciled Preliminary
split into the five existing Final fields. If all five Preliminary fields are
blank, the legacy fallback uses the finalized `Budget_Ttl` in the department's
default element. Partial Preliminary data is unavailable and cannot be silently
reallocated. Any existing explicit Final allocation is preserved, including
partial or all-zero values. A new approval cycle clears Final components while
retaining Preliminary components. Construction keeps its existing HeavyJob
source and frozen-snapshot behavior.

PMP alone publishes repository/frontend changes. The later explicit instruction
authorized agent Creator promotion, completed through Stage and Production as
**9.142** with five fields, one report and 12 functions. Native Development save
verification used exact item `4410926000003558652` (AR04-4410): its unchanged
255000 Preliminary input persisted 255000 under Other and zero under the other
four elements. Preliminary/Unapproved totals, blank Final and zero actuals stayed
unchanged. A separate native report/form showed the values. The fresh Production
JSON export contains all five new field keys. Full raw SDK response capture and
live approval finalization/email delivery remain separate acceptance limits.

The lifecycle function set is `snapshotBudgetItemComponents`,
`applyBudgetTrackFinalState`, `handleApprovalAction`, and `startApprovalChain`.
The existing `syncBudgetApprovalStatus` is status-only and does not need an
element change. A non-writing Dev/Eng preflight checks every intended item
before the financial finalization loop; the helper uses staged Unapproved for
that preflight and finalized `Budget_Ttl` for the actual frozen snapshot.
Existing approval decisions may already be recorded if finalization fails;
retain targeted reconciliation and never blindly repeat an approval write.
The track-state condition explicitly groups Development plus Engineering so a
Construction clear cannot select Engineering through boolean precedence.

Run `node scripts/test-budget-element-lifecycle.mjs`. It executes the checked-in
native helper and track-state bodies for complete/partial/mismatched/blank
Preliminary values, signed four-place amounts, explicit frozen allocation
preservation, no total/actual writes from the helper, read-only preflight,
Construction source parity, whole-track validation and isolated new-cycle
clearing. Check `node scripts/test-budget-approval-permissions.mjs` and
`node scripts/test-send-approval-progress.mjs` for existing authorization and
reconciliation behavior. Native Creator compilation is complete; end-to-end finalization
acceptance remains pending. These local checks do not establish live writes.

For an explicitly requested one-time existing-record backfill, use
`scripts/prepare-budget-element-backfill.mjs` with `--tier preliminary` only
after a fresh export contains all five new fields. That mode reads only
`Prelim_Budget_Ttl`, writes only the five Preliminary component columns, and
preserves any nonblank existing component. Default `--tier final` instead uses
only `Budget_Ttl` and the existing Final component fields. Never reuse one
tier's values for another. The tool prepares an update-only CSV, exact rollback
preimage and sanitized summary; it neither connects to Creator nor applies data.

Rollback the widget mapping through the normal immutable-release process.
Retain saved component data and compatible native functions; old scalar callers
remain supported. If a native rollback is needed, use saved prechange native
bodies and preserve the five new fields/report columns rather than deleting
data. No scheduled automation needs to be removed.
