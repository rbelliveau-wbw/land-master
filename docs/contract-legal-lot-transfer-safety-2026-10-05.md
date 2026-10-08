# Legal to Lots transfer safety

The existing guarded source transfers information only to the exact Lots selected
on the Contract. Eligible Open or blank-status Lots with no purchase/close date and an
unassigned or native **Placeholder** builder receive missing information. Complete
sets their Status to **Contracted last**, after verifying the expected price,
builder and Contract/schedule links. Populated prices, including numeric zero,
remain unchanged. The function never writes `Lot_Size`.

## Authoritative source and deployment scope

**Current scope, October 7:** frontend release **1.61.28** strengthens fresh Lot
selection and save checks in both association directions; it does not change
this native transfer policy. No Creator deployment is needed. The user accepted
the independent daily fill of a blank Sold `Contract_Schedule`, and accepted
another parent Contract's `Lots1` membership as the minimum selection blocker.
See [the current audit, verification and rollback](contract-lot-selection-safety-2026-10-07.md).
The [Parent Contract deployment record](contract-parent-assignment.md) states
that the guarded `Complete_Lot_Contract` was included in Creator **9.54** published
through Stage to Production on October 6. That later record supersedes the
V9.45 unpublished status recorded below. Current live native source was not
inspected in the October 7 source/fixture audit.

The October 5 fresh Production **V9.43** export was the baseline, rather than the
historical August export or newer unpublished Development function. Its provenance is retained in
[`Complete_Lot_Contract.production-V9.43.2026-10-05.json`](../creator/functions/baseline/Complete_Lot_Contract.production-V9.43.2026-10-05.json),
beside the [original function](../creator/functions/baseline/Complete_Lot_Contract.production-V9.43.2026-10-05.dg).
Export: `Land_Master-production (3).ds`, modified
`2026-10-05T20:55:16.747Z`, SHA-256
`9c0e529be609ef73fcf771598b547b5d69d595bde78d59d347009ed9fe05f55b`.
The guarded function's Check mode is read-only before any writes; the retained
V9.43 body lacks that capability.

Retained native source bodies are
[`Complete_Lot_Contract.dg`](../creator/functions/Complete_Lot_Contract.dg) and the
existing Contract on-success workflow
[`Set_Lot_Base_Price_Builde.dg`](../creator/workflows/Set_Lot_Base_Price_Builde.dg).
Production DS line **43625** has an unparenthesized type/status predicate.
Creator evaluates OR before AND, so the original already requires Status Complete
for all three Lot types. The replacement makes that grouping explicit without
changing its behavior; the older diagnosis of completion on every Master save
was incorrect. See [Zoho's Creator precedence documentation](https://www.zoho.com/deluge/help/operators/logical-operators.html).
The function retains legacy closing
behavior when second terms are blank, schedule naming/insertion, shared schedule
reuse and Completion_Date behavior. The later authorized Second Closing release
incorporates its validation and creation-only term copying into this safety
function. Existing schedule terms never synchronize from Contract edits.

At the time of the October 5 preparation, the safety-only function and explicitly
grouped workflow compiled and saved during Creator Development preparation. The
function was then restored to its captured prior Development body to preserve unrelated pending Second
Closing work. Selective Stage/Production publication had not yet completed;
the user requested GitHub publication first and supplied a schema for the next
review. Production V9.45 contained the legacy transfer function and trigger,
as confirmed by `Land_Master-production (4).ds`, modified
`2026-10-05T21:25:14Z`, SHA-256
`8339d8f49f6e1b7cf7832e79bab107113c8757b4b2d5ed7fc0bfea4ca0d52cf9`.
That V9.45 snapshot describes the historical preparation, not the later Creator
9.54 deployment. The widget continues requiring the native capability before
Lot transfers. A widget promotion or passing fixture tests is not evidence of
current native deployment. Frontend 1.61.28 rollback restores 1.61.26 through the
Production mapping and leaves native components intact. No Lot migration or
bulk repair is included.

## Write policy

The additive capability is `lotTransferPolicy: "open-blank-placeholder-v1"`.
Read-only Check returns the exact Contract/builder/selected Lot IDs and the native
Builder IDs whose `Builder_Name` is exactly Placeholder. The widget requires this
policy, a matching captured session/selection and fresh complete Lot snapshots
before dispatch. An older backend without this capability cannot authorize
transfer or completed-parent edits. The widget never attempts a browser repair
against it. The October 7 frontend release retains these existing checks.

| Operation | Allowed Lot changes |
| --- | --- |
| Complete | Fill null Base_Price/Escalator and absent Contract1/Contract_Schedule; replace absent or exact Placeholder Builder1; then change Open/blank Status to Contracted. |
| LinkOnly | Fill an absent Contract1 on an eligible selected Lot. An existing own link is verified without a write. No price, builder, size, status, date or schedule change. |
| Check | Read only. |

Complete protects the entire Lot when its status is neither exact Open nor blank,
either purchase/close date exists, any real builder is assigned, another Contract
is linked or claims it through Lots1, or its existing schedule conflicts with the
computed shared schedule. LinkOnly applies the same lifecycle/parent protections
but permits the same Contract builder and does not evaluate or change a schedule
link. No existing nonblank foreign link is replaced. A scoped Complete target
Contract with a missing or Placeholder builder is rejected before any mutation.

Financial fills require a Lot size and exactly one matching Contract_Pricing row.
Missing or duplicate pricing rows are skipped; no arbitrary row supplies a price.
Only native null numeric fields are fillable: zero is populated. A blank Status
includes null/empty/whitespace; other status names and casing are protected.
Placeholder eligibility comes from the native Builder record, not an unverified
browser display label. Reusing a subdivision/builder schedule is retained even
when another Master/Amendment originally created it; existing Lot schedule links
are still protected individually.

Each conditional native Lot update repeats the captured lifecycle, size, builder
and link predicates and checks the destination field at write time. Status is
last. Parent selection/other-parent claims are freshly checked before each write
and again for verification. Completed-parent pricing reconciliation is verified
before the parent update can trigger automatic native transfer. The widget's
completion verification and former `healLotWrites` path are read-only; all Lot
writes go through this native policy.

The response includes exact requested/updated/linked IDs and one before/after
outcome per requested Lot, with intended fields, preserved/skipped reasons and
verification. The widget verifies these against the preflight and fresh native
readback. Partial, inconsistent, timed-out or changed-session outcomes remain
uncertain and block another write. A retained late LinkOnly response can be
rechecked by reading; the transfer is never replayed automatically.

Conditional field updates are not a cross-record transaction. A new claim on a
different Contract can race between a claim read and one Lot field update. Later
writes stop and final verification exposes that partial result; neither source
nor tests establish atomic isolation across the Contract/Lot records.
[Zoho's conditional-update syntax](https://www.zoho.com/deluge/help/data-access/update-multiple-fields.html)
supports the write-time predicates but does not promise that isolation.

## Independent schedule assignment and evidence limits

Complete and LinkOnly skip every Lot write for Sold/date-protected rows in the
inspected source. Separately, the historical daily `Update_Contract_Schedule_`
fills a blank Sold schedule link by subdivision/builder. The user accepted that
schedule-link exception; frontend 1.61.28 retains it and does not change the job.
That link assignment does not authorize changing Sold financial or lifecycle
values. The current live daily action bodies were not inspected. Existing
schedule recalculation writes schedule fields, and [Zoho's insert documentation](https://www.zoho.com/deluge/help/data-access/add-record.html)
states that `insert into` does not run target On Validate/On Success scripts.

## Regression evidence

`node scripts/test-contract-lot-transfer-policy.mjs` executes the entire saved
Deluge source through a narrow query/update/insert adapter. It covers read-only
Check; selected-ID validation; Open/blank/Placeholder transfer with Status last;
zero preservation; real builders, dates, statuses and foreign links; duplicate or
missing pricing; LinkOnly's single-field writes; target Placeholder rejection;
conditional status/price/size/builder races; partial dropped writes; the explicit
cross-record claim race; retained Production terms and shared schedule reuse.
This adapter cannot establish native Deluge compilation, Creator execution,
workflow interactions or transaction guarantees.

`node scripts/test-contract-lot-transfer-safety.mjs` runs the actual widget with
fixture SDK calls. It checks policy/selection/session gates, immutable and zero
preservation, exact response/readback evidence, absence of browser Lot writes,
unknown-outcome quarantine/no replay, read-only late response checks, and verified
pricing-before-completed-parent ordering. Existing backfill/completion regressions
also run in the SDK2 aggregate.

The 1.61.28 selection regression additionally covers fresh ownership in both
directions, missing/malformed fields, direct selection and fresh save guards,
and exclusion of older same-draft refresh successes/failures. Full repository
validation, the Pages build and exact immutable release checks are frontend
release gates. No live financial transfer or new native deployment is claimed
by these fixture runs.
