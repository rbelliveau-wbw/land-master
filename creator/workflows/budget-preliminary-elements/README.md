# Preliminary Element Fields — Creator Handoff

The five Preliminary fields and `All_Budget_Items` layouts were saved and
verified in native **Development** on November 3. Exact display/link names
survived Done/reopen, and form-preview input names confirmed the bindings. See
[native installation progress](native-install-progress.json). Actual SDK/API
full-field responses, save/reload, native function compilation, Production
promotion and data backfill remain unverified or pending. No Budget Item data
records were changed. The November 2 export predates these new fields.

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

PMP publishes repository/frontend changes only. The user installs/promotes these
Creator fields, report changes and lifecycle functions together. Compile and
verify native read/save/reload in Development before selecting only these
components for promotion. A local fixture does not establish live compilation
or saved behavior. Check that an input save updates the correct exact item ID,
keeps every total unchanged, and that each report returns the five fields.

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
reconciliation behavior. Native Creator compilation and end-to-end finalization
are still required after installation; these local checks do not imply them.

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
