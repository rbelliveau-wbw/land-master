# Equipment export and HCSS cleanup repairs — October 22, 2026

Two new Production failures were investigated using the native Workflow Log,
the current Development actions, read-only native Analytics helper executions,
and the Production mapping report. Private record identities and source export
samples are kept in the user's local evidence folder, outside this repository.

## Equipment export

`Equipment_Sync_Create_Equ` requested `PurchaseYear`, which does not exist in the
live E360 Equipment source. A direct execution of the unchanged
`analyticsExportRows` helper with only that selected column reproduced the same
HTTP 400 before any source row was processed. A second read-only execution with
the corrected full column list succeeded. Both tests used an empty audit ID;
neither executed the Equipment workflow nor changed Equipment records.

The action now selects `PurchaseDate` and requests `Description` only once.
The native destination `Equipment.Purchase_Date` is a date field. Observed export
values use `dd/MM/yyyy HH:mm:ss`, including dates whose day exceeds 12, so the
action explicitly parses that format rather than relying on locale guessing.
[Zoho documents the date mapping argument](https://www.zoho.com/deluge/help/functions/common/todate.html).

The source also contains `01/01/0001 00:00:00` placeholders. Blank/null or that
placeholder leaves an existing purchase date unchanged and supplies no date on
an inserted Equipment record. A malformed non-placeholder date throws before
that row's Equipment writes. The log key is set to the current Equipment code
before parsing or destination lookup. All other assignments, source identity,
duplicate-destination checks and insert fields remain unchanged.

## HCSS budget cleanup

`Budgets_Check_HCSS_Budget` resolved `External_Code` across every external system.
The Production report confirms that the same code can validly have one HeavyJob
mapping and one Great Plains mapping to the same subdivision. The existing HCSS
imports already scope this lookup to HeavyJob. The cleanup now reuses that
same criterion and retains its zero-match skip, exact single-match requirement
and non-null subdivision requirement.

The current source job/minor identity is recorded before mapping validation;
mapping failures now include the job and HeavyJob match count. The failed
historical run omitted its job key. Fresh exports can have a different row
order, so their second row does not establish the historical failing job.

No mapping records were removed or edited. The two allowed cleanup writes
remain exactly `existingItem.Cost_Code_ID = newCostCodeId` and
`existingItem.Cost = 0`, behind the existing source-completion, identity, budget,
nonempty-active-list and duplicate-stable-key protections. The workflow was not
manually executed; no costs were zeroed or IDs refreshed during debugging.

## Verification and deployment

The two action scripts are saved and independently reopened in Creator
Development. Native compilation accepts them. Fixtures exercise the actual
mapping criterion and date-preparation/update guard, covering cross-system
matches, same-system duplicates, null and placeholder dates, day/month order
and malformed dates. Preparation preservation checks explicitly allow only the
Equipment purchase-date repair and duplicate selected-column removal; all other
native assignment/insert/schedule/source-column contracts still compare against
the original snapshots.

Full repository validation and Pages build passed before publication. This is a
Creator backend change: no widget release, environment mapping, connection,
permission, global helper or Custom API changes are required. Repository
publication does not promote Creator actions. The user must promote exactly
these two actions through the normal Creator environments before claiming a
successful Production run. Full business imports were not replayed, and failed
Workflow Log records remain intact.

Rollback: restore these two Development actions from their unchanged
`creator/integration-audit/deployed-source/` snapshots and promote the rollback
through Creator. That restores the previous behavior and its known failures.
