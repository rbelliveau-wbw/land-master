# Manage Lots SDK2 contract

0.10.1 extends this contract with the live receipt and retains the 0.9.20
no-replay/claim-verification safeguards, report filters and read-only detail. Scoped All_Takedown_Templates
and All_Additional_Items reads provide existing defaults. Selected lots also
require Base_Price, Earnest_Money and Additional_Tax; appraisal tax additionally
requires Appraised_Value. Preflight compares those captured financial inputs.
Readback checks saved financial/rate/date/day fields and exact additional-item
values through All_Additional_Items scoped by Builder_Takedown1. The frontend
clones new subform rows without source IDs and submits their calculated Total.
No new form, field, function or Custom API. See the
[logic audit](../../knowledge/modules/takedown-logic-audit.md) for the existing
native date-validator replacement awaiting publication and the pending
additional-tax interpretation. Native verification remains pending.

Version 0.9.17 is a source candidate correcting the immutable Development 0.9.16 release. The native SDK1 repair baseline is 0.9.15: 37 subdivisions, 13 builders, 24 takedowns/six groups, and 155 exact tiles in the exercised subdivision (131 available/24 unavailable). SDK2 0.9.16 Development retained 37 choices, all 155 exact tiles and 30 takedown-table rows against that baseline; its form loaded 13 builders and 36 rate/date controls without committing Create. Independent actual-app fixtures exposed its permissive reverse-claim verification. Production 0.9.14's removed-importer startup failure predates this migration. Native 0.9.17 gates and Production promotion remain pending; no new live records were created by these fixtures.

## Reads and identity

The native `UTIL.getInitParams()` handshake has a five-second deadline and requires the current string actor and recognized environment. Missing/malformed context never starts business reads or demo data; expired results cannot replace a later valid handshake. Refresh retries initialization after rejection. Native identity remains authoritative; no client alias or username inference is added.

SDK2 `DATA.getRecordCount({report_name,criteria})` and `DATA.getRecords({report_name,criteria,max_records:1000,field_config:'all',record_cursor?})` use the shared counted reader. Expected counts, full cursors, exact IDs, cancellation and three-request bounds are enforced. Counts reject native error/status/success:false or failed known result/details/response/output containers; raw native codes remain available. Core snapshots publish atomically. An error or incomplete scope cannot leave an editable selection or display verified zero.

| Existing report | Required purpose/fields |
| --- | --- |
| All_Subdivisions | ID, Subdivision_Name, Subdivision_Code; existing chooser labels |
| All_Builders | ID, Builder_Name; exact selected builder |
| All_Builder_Takedowns | ID, Lots for complete reverse claims; Name, Subdivision1, Builder1, Lot_Count, Added_Time for view/verification |
| All_Lots_All_Fields and All_Active_Lots_List_View | Complete selected-subdivision scope; ID, Subdivision, Status and available-lot Archived/Add_Builder_Takedown_Name; existing Block/Lot_Number/Lot_Code labels |
| All_Contracts1 | Existing optional visual contract claims; failure does not grant or change lot eligibility |
| All_Active_Lots_Contracts_View | Existing optional scoped hover enrichment |

Both lot reports remain mandatory for selection/preflight. All-fields values remain primary, while Sold from either complete report is monotonic. Non-Sold conflicts in Status, Archived or takedown relationship reject availability. Native exact-empty lookup `{}` is an empty relationship; nonempty malformed objects remain unknown. Leading-zero labels and IDs are not converted to numbers. Existing counted subdivision badges remain bounded/incremental; confirmed fresh scope data overrides background results.

## One captured create and persisted claims

Before `DATA.addRecords({form_name:'Builder_Takedown',payload:{data}})`, the controller freezes the current native actor/environment/app, generation, one subdivision, unique selected string IDs and full payload. It fresh-reads both lot scopes and all existing takedown claims, then rejects the entire submission if any selected lot is no longer Open/Contracted, is archived, or has a direct/reverse claim. It checks context again at actual queued send. No envelope, alias or transport replay is introduced.

The unchanged payload contains Name, Subdivision1, Builder1, Entered_Date, Purchase_Date, optional Tax_Proration_Date, Tax_Method, Tax_Status, Status, Lots, Lot_Count, Tax_Per_Lot, Percent_of_Appraisal, optional Additional_Fee_Type, Additional_Fees_Per_Lot, Calculate_Interest:false and Notes. All twelve rate/date periods are preserved, including the existing `Interest_Rate_71` field for period seven and Date1_1/Date1_2 through Date12_1/Date12_2. The fixture compares all 36 captured rate/date fields to immutable SDK1 0.9.15. This is payload parity, not a live persisted rate/date verification claim.

A success acknowledgement requires one decimal string ID in the documented direct or one-record result-array shape, with no competing/failed result. Fresh reads then confirm the exact takedown ID, builder, subdivision, selected lot set/count and every reverse lot relationship. Each selected lot must have exactly one direct relationship entry matching that created ID; a competing ID or duplicate entry remains unverified. A compound/ambiguous acknowledgement or partial/conflicting claim leaves Needs review, preserves selection/draft and blocks another create. A unique safely returned record ID is a read-only reconciliation target, not proof of success; multiple IDs cannot select one. Recheck performs reads only and verifies only when the fresh exclusive relationships match. Without a target ID, Creator review is required. The twenty-second deadline does not release pending native RPC locks or let a late result silently settle an expired create.

The existing takedown table stays read-only. Progress opens before preflight, shows verified destinations, retains terminal results, blocks Close/Escape/duplicate submissions while pending, and restores focus/inert state only when safely dismissed. The 560-ms display pacing respects reduced motion and does not delay native sends or manufacture verification. Drafts and active selection prevent snapshot replacement. Clipboard copying retains the original native fallback.

## Regression and rollout

`node scripts/test-manage-lots-sdk-v2.mjs` evaluates the actual controller, runtime, shared helper, inline IIFE and handlers against inert native responses. It covers complete cursors beyond 1,000 rows, unsafe IDs/leading zeros, dual-report Sold and availability conflicts, incomplete/error counts, native empty lookups, stale actor/context/preflight, immutable payload, one create, persisted claims, ambiguous no-replay, read-only recheck, pending/deadline/late-result locks, paced progress, read-only takedowns and clipboard. `node scripts/test-manage-lots-widget.mjs` retains picker/index/status/count-queue checks against current source. `node scripts/test-manage-lots-sdk1-repair.mjs` executes immutable 0.9.15 as the rollback boot/denial/retry baseline.

Required full repository validation and Pages build still apply. Root owns release stamping, environment mappings, authenticated Development gate, Production promotion and read-only comparison. Native SDK2 schema/count/selection and an authorized safe create/readback gate are separate from inert fixtures. No new Creator backend deployment or permissions are required. Rollback maps to repaired SDK1 0.9.15 and retains the permanent widget URLs.
