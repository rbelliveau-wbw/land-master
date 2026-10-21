# Orphan records and child lifecycle — October 20, 2026

## Findings

Production report filters identified **581 candidates**:
424 Proforma_Item, 43 Construction_Curve, 38 Land_Installments, 31 Attachment,
18 Lot_Mix_Row, 17 Additional_Items and 10 Contract_Pricing.
Some report URL filters are silently ignored: a known linked cost row did not
filter its parent's subform membership. Do not authorize a purge from report
counts alone. System-date URL filters were also inconclusive.

The temporary owner-only inspector subsequently checked all 581 in Production,
including reverse grids, explicit template exclusions, Added/Modified timestamps
and saved approval/operation/configuration history. After a fresh Production
recheck and explicit approval of the exact batch, **579 records were deleted
through the native reports and verified absent**. The two recently changed
Lot_Mix_Row records remain intact.

| Form | Deleted | Retained |
| --- | ---: | ---: |
| Attachment | 31 | 0 |
| Proforma_Item | 424 | 0 |
| Construction_Curve | 43 | 0 |
| Land_Installments | 38 | 0 |
| Lot_Mix_Row | 16 | 2 |
| Additional_Items | 17 | 0 |
| Contract_Pricing | 10 | 0 |

Each native selection was matched to the certified IDs, including all virtualized
cost-report rows. Each family's inspector result was checked after deletion.
The exact ID manifest, timestamps, deletion ledger and screenshots are kept
locally with the audit evidence, not in this public repository.

Zoho documents that [parent deletion delinks existing-form subforms](https://www.zoho.com/deluge/help/data-access/delete-records.html)
and [subform clear keeps the child records](https://www.zoho.com/deluge/help/miscellaneous/clear-subform-rows.html).
These are supported leak mechanisms, not proof of which operation created each
historical candidate. No per-record origin or creation-date conclusion is inferred
from Creator ID order.

Confirmed code gaps:

- `proforma_save` omitted independently stored Lot Mix and Attachment rows when
  deleting a Pro Forma. Its original child deletes did not protect shared rows.
- Native Contract, Pro Forma and Additional Items parent deletion lacked complete
  child cascades. The native Budget cascade covered only items, categories and
  approvals. Deluge's parent delete does not provide the missing cascades.
- Request delete paths cleared request links without restoring a missing Budget
  parent on legacy files. Native retention actions ran after deletion, when the
  request lookup can already be cleared.
- `manageBudget` protected POs but allowed a Budget containing Check/Wire requests
  to be deleted. It also deleted files/comments/month rows shared with other owners.

## Changes

There are **no new scheduled deletes and no global null-parent purge**. All
permanent delete actions start from the exact saved parent being deleted.

- `proforma_save`: delete owned lot mix and exclusive files before the parent;
  retain template costs, Settings curves and children owned by another record.
- `manageBudget`: require Archive while any request or PO history remains;
  handle modification-only approvals and file ownership before modification
  deletion; retain shared files, comments and Subdivision month rows. Keep import
  history and clear its deleted item links.
- `managePurchaseOrder`, `modificationAdmin`: restore a legacy file's missing
  Budget link from the genuine request before removing its request link. Keep
  original file/author and existing nonempty Budget associations.
- Native request retention actions belong in **Deleted → Validations on record
  deletion**, not Successful record deletion. A request with no recoverable Budget
  and an exclusive file cannot be deleted until that link is repaired.
- Attachment validation rejects a request association whose request has no Budget.
- Creator rewrites grouped boolean criteria. Multi-owner installment/cost guards
  therefore use separate typed row variables and explicit shared-owner flags,
  followed by exact ID/parent deletion. No OR lookup criterion can widen deletion.
- A regression gate flags new Attachment lookup fields in future schema exports
  so their ownership and retention rules must be reviewed explicitly.

AI review snapshots and approval/operation history are deliberately retained;
they are not disposable merely because a live parent is gone. No financial
recalculation, approval-routing or permission grant changes are included.

## Read-only certification

Temporary function: `previewOrphanedRecords(string formName, string afterId)`, return map.
Temporary page: `Orphan_Record_Audit`, with text page variables `formName` and
`afterId`. No Custom API, database field or report is added. Application owner only. Use `"0"` for
the first cursor; follow `nextAfterId` until `complete=true`, including one final
empty page when the preceding page has exactly 25 rows.

The seven observed families are allowlisted. Each page checks all direct owners,
explicit template flags, **every captured reverse grid**, Added/Modified timestamps
older than seven days, and IDs embedded in approval/operation/configuration history.
Failed reads fail the page closed. Recent, shared, referenced or uncertain rows
remain intact. This is an inspection function: it contains no writes or deletes.

The function was published alone in Creator 9.97; the read-only page was published
alone in 9.99 after explicit user approval. Production checks and the approved
one-time cleanup are complete. The preview was not a transactional lock or an
automatic delete authorization. The temporary page and helper were removed from
Development after cleanup and their two-component deletion was promoted to
Production in **9.101**. Production's fresh component inventory confirms both are
absent; the function had no remaining references before deletion. Their source
and fixture evidence are archived locally, outside the active Creator source
directories.

## Native workflow handoff

`creator/workflows/child-lifecycle/*.delete.dg` are action bodies for **Deleted →
Validations on record deletion**. The Pro Forma, Contract, Subdivision, Builder
Takedown and Takedown Template workflows are installed, and the action of the
existing `Delete_Child_Items_Budget` is replaced with `Add_Budget.delete.dg`.
The request retention workflows were replaced at the pre-delete validation
event; their obsolete after-delete versions were removed.

No edit-time reconciler or field-input deletion is installed. Existing-form
`.clear()` can detach child rows, but this audit does not prove the origin of every
historical candidate. Never introduce an unverified edit-validation cleanup to
compensate: partial SDK updates and cancelled forms must preserve saved rows.

Generation of the permanent parent-delete actions:
`node scripts/build-child-lifecycle.mjs`.
Focused checks: `node scripts/test-child-lifecycle.mjs` (118 cases) and the
temporary inspector's fixture checks. These execute the actual Deluge bodies
against fixtures; they are not a native Creator compiler or transaction test.

Construction access follow-up: ordinary Construction actions inherit the
parent's Budget Type in `Type_field`. When both parent and child are explicitly
Construction and `Template_Action == false`, that classification no longer
mistakes the owned child for a shared template during parent deletion. The
original typed Legal-action protection remains. This narrow amendment is saved
and independently reloaded in Development for the user to promote; no new live
cleanup batch or scheduled deletion is added.
Full `npm run validate` and `npm run build:pages` passed; CI passed for
`307abe3b27824e4a940839a60b067cfdba92417f`. Creator compiled the saved actions and
functions, and their deployed sources/events were checked in Production. The
temporary inspector also passed 147 fixture cases before its live execution.
Live financial parent records were not deleted as test fixtures.

## Deployment and rollback

PMP publishes repository changes to main. Creator delete workflows/functions are
a separate deployment gate requiring explicit approval. Existing API
names/signatures remain unchanged. The temporary inspector has no API.
Widget assets/mappings do not change, so there is no new widget release or Pages
deployment. The approved backend fixes are active in Creator Production 9.100.
`manageBudget` and `modificationAdmin` were already current; the remaining
13-component patch was staged and promoted after explicit authorization.
Existing Custom API names, signatures, reports and database fields are unchanged.

Publish only verified backend/validation/delete-workflow changes. Never select
unrelated or scheduled changes. The preexisting daily cleanup was verified in
Production and Development: it still contains only the original Contract
Approvals/Actions rules. Preserve saved pre-change bodies for rollback.
Rollback code cannot restore deleted data. The one-time deletion is complete;
the private manifest and ledger document exactly which records were removed.
