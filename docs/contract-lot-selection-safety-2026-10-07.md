# Lot selection safety — Contract Management 1.61.29

Contract Management refreshes both Contract membership and Lot-side ownership
before allowing a selection or saving a new/edited Lot Contract. A Lot selected
in another `Contract.Lots1` is unavailable, including archived/rejected Contracts
and related Masters/Amendments. A valid foreign `Lots.Contract1` also blocks it.
The exact Contract being edited may retain its own selections and reverse links.
These rules satisfy the accepted minimum that another parent Contract's `Lots1`
membership must prevent selection; there is no family or status exemption.

This is a frontend release. Existing native completion, schedule assignment,
forms, fields, permissions, workflows, functions and Custom APIs are unchanged.
No Creator deployment is needed for 1.61.29.

## Fresh availability and selection checks

Opening the picker reads complete fresh Lot rows for the chosen subdivisions
from `All_Active_Lots_Contracts_View` and the complete authorized Contract snapshot
from `All_Contracts1`. The two snapshots publish together after validation.
Missing or malformed `Contract.Lots1` or `Lots.Contract1` fields leave availability
unavailable; the widget cannot infer that an omitted or unreadable link is blank.
Failed reads retain prior data without authorizing a new selection.

`lpToggle` and `lpSelectBlock` repeat the current scope and ownership checks.
Unknown IDs, out-of-scope Lots and unavailable/claimed Lots cannot bypass a locked
tile through direct calls, forced selection or block selection. Pending or failed
availability reads block selection. Ordinary deselection remains supported after
availability settles. Subdivision changes continue pruning disallowed choices.

Each picker refresh captures a new `S.lpLoadGeneration` in addition to its actor,
navigation, draft/editor and subdivision scope. Only the latest refresh may
publish data, clear loading, or publish an error. An older success cannot replace
newer verified claims, and an older failure cannot clear a newer pending refresh
or replace its successful result. This also covers overlapping refreshes of the
same unchanged draft, where draft identity alone was insufficient.

Immediately before new Contract creation or Lots & Pricing save,
`clpValidateLots` reads both reports afresh and validates every captured selected
string ID. It uses the explicit edited Contract ID; new creation passes an empty
owner and cannot inherit another open editor's ownership exception. A newly
established claim stops the operation before parent, pricing or Lot writes.
Persisted verification and existing unknown-response/no-replay handling remain.

## Sold Lots and the accepted schedule exception

The existing temporary backfill rule still permits unassociated Lots of any
status to be selected. Selection records Contract membership; selecting a Sold
Lot does not authorize changing its stored financial, buyer or lifecycle values.
The existing `Complete_Lot_Contract` source skips the entire Lot for Complete and
LinkOnly when Status is neither Open nor blank, or Purchase_Date/Close_Date exists.
Its conditional writes repeat the captured lifecycle and null-date guards.
This protection is unchanged in 1.61.29.

The user accepted the independent daily schedule-link behavior: a Sold Lot with
blank `Contract_Schedule` may receive a matching subdivision/builder schedule.
That exception is retained. The historical `Update_Contract_Schedule_` workflow
contains that assignment; the later Scheduled-status note documents extending
assignment to Scheduled Lots. This release neither changes that job nor treats
a schedule-link fill as permission to overwrite Sold prices, dates, buyer, taxes
or sale amounts. A completion-created schedule can become available to that daily
job, including for Lots outside the selected Contract.

No synchronous Sold-Lot writer was found in the inspected current completion and
schedule-recalculation source. Both schedule creation paths use `insert into`;
[Zoho documents](https://www.zoho.com/deluge/help/data-access/add-record.html)
that this task does not execute the target form's On Validate/On Success scripts.
The inspected recalculation actions read Lots and write the schedule itself.

## Evidence and limits

The audit compared the Production frontend baseline 1.61.26, checked-in source,
immutable assets, regression behavior and deployment documentation. The
[Parent Contract deployment record](contract-parent-assignment.md) records
`Complete_Lot_Contract` among the components compiled and published as Creator
9.54 through Stage to Production on October 6. This supersedes the historical
October 5 note that the transfer function was unpublished at V9.45.

Current live native source was not inspected and no live Contract or Lot was
created, completed or repaired during this audit. The committed August export
is historical evidence for the daily job, not a current Production snapshot.
Offline source/fixture verification cannot establish native workflow execution,
current profile visibility or transaction isolation.

The widget prevents selection when either association direction is present in
its complete authorized reads. It does not provide an atomic reservation shared
by every writer. Two simultaneous submissions can both observe an unclaimed Lot
before either commits, and other native/API writers are outside the browser
guard. Absolute global concurrent uniqueness is not claimed. The existing
transfer regression also records a cross-record claim race that produces a
partial, unverified result; the Sold/date guards remain independent.

## Affected code, verification and release

Frontend functions: `contractLotScopeCurrent`, `ncLoadPickerLots`,
`lpVerifyClaimRows`, `lpClaimedBy`, `lotPickable`, `lpPruneDisallowed`,
`lpSelectBlock`, `lpToggle` and `clpValidateLots`; existing picker rendering and
create/edit save callers consume their results. State adds `S.lpLoadGeneration`.
Read fields include `Contract.ID`, `Contract.Lots1`, `Lots.ID`, `Lots.Subdivision`
and `Lots.Contract1`, with existing status/name/builder fields for display.
Parent `Contract.Lots1` saves use the existing payload. No Lot write payload,
backend function or Custom API changes.

`scripts/test-contract-lot-selection-safety.mjs` executes actual widget handlers
and SDK fixtures for reverse-only links, fresh parent claims, own-owner editing,
explicit new scope, archived/rejected and family claims, missing/malformed fields,
direct/block selection, changed actor/draft and overlapping same-draft refreshes,
and rejected create/edit saves with zero writes. Existing backfill, picker-access,
pricing-loading and scope fixtures retain their behavior with complete association
columns. Existing transfer-policy/safety tests cover whole Sold/date-protected
Lot preservation, zero writes for Complete/LinkOnly, zero preservation, exact
readback, unknown outcomes and shared schedule reuse.

Release gates are the focused selection regression and complete Contract SDK2
aggregate, `npm run validate`, `npm run build:pages`, diff checks and exact
source/immutable-release/Production-output byte checks. No fixture result is
presented as a live financial-transfer test.

The user authorized main and Production promotion. The frontend promotion sets
`deploy/environments.json` Production `contract-management` to **1.61.29** and
publishes its immutable assets under `releases/contract-management/1.61.29/`.
The permanent Creator widget URL is retained; CI and Pages publish the mapped
release. Development/Stage mappings and native Creator components remain unchanged.
Rollback sets the Production frontend mapping to **1.61.26**. No data migration,
schema rollback or native publication accompanies this release.

Changed files are the widget HTML/config/README, widget manifest and Production
mapping; selection and supporting frontend regressions/SDK2 aggregate; this audit,
the historical transfer note and Contracts module guide; and immutable 1.61.29
assets. The release contains no native workflow changes.
