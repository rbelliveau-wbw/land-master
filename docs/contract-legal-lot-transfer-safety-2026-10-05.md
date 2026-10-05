# Legal to Lots transfer safety

The candidate transfers information only to the exact Lots selected on the
Contract. Eligible Open or blank-status Lots with no purchase/close date and an
unassigned or native **Placeholder** builder receive missing information. Complete
sets their Status to **Contracted last**, after verifying the expected price,
builder and Contract/schedule links. Populated prices, including numeric zero,
remain unchanged. The function never writes `Lot_Size`.

## Authoritative source and deployment scope

The fresh Production **V9.43** export is the baseline, not the historical August
export or newer unpublished Development function. Its provenance is retained in
[`Complete_Lot_Contract.production-V9.43.2026-10-05.json`](../creator/functions/baseline/Complete_Lot_Contract.production-V9.43.2026-10-05.json),
beside the [original function](../creator/functions/baseline/Complete_Lot_Contract.production-V9.43.2026-10-05.dg).
Export: `Land_Master-production (3).ds`, modified
`2026-10-05T20:55:16.747Z`, SHA-256
`9c0e529be609ef73fcf771598b547b5d69d595bde78d59d347009ed9fe05f55b`.
Production Check is read-only before any writes.

Native candidates are
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

The earlier safety-only candidate function and explicitly grouped workflow compiled
and saved during Creator Development preparation. The function was then restored
to its captured prior Development body to preserve unrelated pending Second
Closing work. The combined Second Closing function requires fresh native
compilation and publication by the user. Their selective Stage/Production
publication was not completed;
the user requested GitHub publication first and supplied a schema for the next
review. Production V9.45 still contains the legacy transfer function and trigger,
as confirmed by `Land_Master-production (4).ds`, modified
`2026-10-05T21:25:14Z`, SHA-256
`8339d8f49f6e1b7cf7832e79bab107113c8757b4b2d5ed7fc0bfea4ca0d52cf9`.
The widget therefore blocks lot transfers until the native capability is live.
Do not treat a widget promotion or passing fixture tests as native deployment
evidence. Rollback uses the retained Production
function/workflow bodies and prior widget release; those native bodies restore
their prior safety limitations. No Lot migration or bulk repair is included.

## Write policy

The additive capability is `lotTransferPolicy: "open-blank-placeholder-v1"`.
Read-only Check returns the exact Contract/builder/selected Lot IDs and the native
Builder IDs whose `Builder_Name` is exactly Placeholder. The widget requires this
policy, a matching captured session/selection and fresh complete Lot snapshots
before dispatch. Production V9.43 lacks this capability, so the candidate widget
blocks transfer and completed-parent edits until the safe native function is
published. It never attempts a browser repair against the older backend.

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

## Regression evidence and native gate

`node scripts/test-contract-lot-transfer-policy.mjs` executes the entire saved
Deluge candidate through a narrow query/update/insert adapter. It covers read-only
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

After native compilation/publication, use disposable selected Lots to confirm
eligible Open plus Placeholder becomes Contracted, populated zero remains zero,
all protected values remain unchanged, and LinkOnly writes only an absent
Contract1. Verify the published Contract workflow fires only for completed Lot
types. No live financial transfer is claimed by the fixture runs.
