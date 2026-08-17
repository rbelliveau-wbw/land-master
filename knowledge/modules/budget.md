
# Budget Module

## Scope

Budget landing, phase/category/item editing, HCSS and GP actuals, preliminary/unapproved/final states, approval tracks, attachments, PDF generation, and Proforma comparison.

## Approval tracks

- Development track locks Development and Engineering.
- Construction track locks Construction.
- Both tracks can be active independently.
- Finalization moves the applicable Unapproved amounts into Final and clears workflow-owned Unapproved values according to current Deluge logic.

## Attachments

Attachments use one `Contract_Version` record per file:

- lookup: `Budget`
- file field: `File_field1`

The working in-widget PDF preview uses `Get_Budget_Attachment_Preview`.

Do not replace it with `ZOHO.CREATOR.API.readFile`, blob URLs, direct Creator download URLs, or Creator stock preview links; those approaches previously produced blank pages or downloads instead of embedded previews.

## Diagnostics

The Audit Log control lives at the top-right of the application bar. It opens a right-side drawer consistent with Pro Forma Manager and must remain available in every Budget view.

## Pro Forma comparison

- The comparison table header remains visible at the top of the comparison view while its rows scroll.
- Acres, Lots, and LF header metrics have a bounded width and stay aligned to the right edge of their comparison column.

## Budget Modifications (after-finalized changes)

Created 2026-08-13 in the live Creator app as the backbone for post-finalization budget changes.
An approved modification is a delta on top of the approved Final (`Budget_Ttl`); it never overwrites Final.
Revised Final = `Budget_Ttl` + sum of approved modification amounts (Increase positive, Decrease negative).

- Form: `Budget_Modification` (display "Budget Modification")
- Report: `All_Budget_Modifications` (display "All Budget Modifications"; auto-created with the form)

Fields (link name — type — notes):

| Link name | Type | Notes |
|---|---|---|
| `Budget_Item` | Lookup → `Budget_Item` (displays `Item`) | mandatory |
| `Budget_Category` | Lookup → `Budget_Category` (displays `Category`) | for category rollups |
| `Budget` | Lookup → `Add_Budget` (displays `Budget_Name`) | for phase rollups |
| `Modification_Type` | Dropdown: Increase, Decrease | mandatory |
| `Amount` | Currency (USD) | mandatory; always positive, sign comes from `Modification_Type` |
| `Reason` | Multi line | mandatory; audit trail |
| `Reference_Number` | Single line | e.g. CO-014 |
| `Effective_Date` | Date | |
| `Status` | Dropdown: Draft, Submitted, Approved, Rejected | default Draft |
| `Approval_Track` | Dropdown: Development, Construction | which approval track gates it |
| `Approved_By` | Single line | stamped on approval |
| `Approved_On` | Date-Time | stamped on approval |

Only records with `Status == "Approved"` count toward Revised Final. Pending (Submitted) amounts
are displayed separately in the widget (amber), mirroring the Unapproved convention.

### Modification approval track

Modification approvals reuse the existing `Budget_Approvals` form (added 2026-08-13):

- `Type1` gained a fourth choice: `"Modification"` (existing choices untouched).
- New lookup `Budget_Modification` → `Budget_Modification` (displays `Reference_Number`) so each
  Modification-type approval row references the specific modification it gates.
- Chain rows carry the usual `Approver`, `Title` (VP/CFO/COO...), `Status`, `Sort_Order`,
  `Sent_Date`, `Responded_Date`, and the phase `Budget` lookup.

### Rejection semantics differ by approval system (added 2026-08-17)

All three approval systems share `Budget_Approvals`, but rejection does not mean the same thing in
each, and this is the single most confusing part of the table:

| System | Row key | Parent status | Reject |
| --- | --- | --- | --- |
| Budget track | `Budget` + `Type1` (Development/Construction) | `Add_Budget.*_Budget_Approval_Status` | Bounces back one step; chain stays alive |
| Pro Forma | `Proforma` | `Add_Pro_Forma.Status` | Bounces back one step; chain stays alive |
| Modification | `Budget_Modification` | `Budget_Modification.Status` | **Terminal** |

A modification is a discrete proposal, so bouncing it back to a VP who already approved would just
re-approve an unchanged request. Terminal rejection is deliberate — but it left the record with no
way forward, because Submit only renders for `Draft`. `modificationAdmin("reopen")` is the exit:
it deletes the chain, clears `Approved_On`/`Approved_By`, and sets the record back to `Draft`, where
the normal edit-then-submit path takes over. The chain is rebuilt rather than reset so a resubmit
picks up the current territory VP and the current COO threshold. Surfaced in the widget as
**Revise & Resubmit**, gated behind `canSubmitMod` (Edit Owned Budgets, or modification admin).

Anything walking this table generically must classify rows by **which lookup is populated**, not by
`Type1` — pro forma rows do not reliably carry a `Type1` value.

### Approval watchdog (`approvalWatchdog`)

Sweeps every chain and repairs the ones stalled with no active approver; emails a summary only when
it finds something. Auto-repairs: budget tracks (promote next / activate first), pro formas (promote
next, or stamp `Approved` when every step already approved), and modifications (delegates to
`sendModificationEmail` with `created`/`approved`/`rejected`, which already picks the next approver
and runs the rollups). Also rebuilds chains for `Submitted` modifications that own no approval rows,
and counts orphaned Modification rows as a health signal.

Reports without touching rows: a budget or pro forma chain where a rejection never landed back on a
prior approver (guessing which row to reopen could reverse a decision someone made), a chain fully
approved while the parent still reads Pending (may mean finalization failed — flipping the parent
would hide it), and rejected modifications, which are listed separately as awaiting revision rather
than counted as stuck.

### Modification email function / Custom API

- Deluge function: `sendModificationEmail(int modificationId, string action)` — source mirrored at
  `creator/functions/sendModificationEmail.dg`. Actions: `created` / `approved` (emails the next
  pending approver in the Modification chain and stamps `Sent_Date`; on `approved` with no pending
  approver left it stamps the modification Approved + `Approved_On`/`Approved_By`), `rejected`
  (stamps Rejected and notifies approvers who had already approved).
- Custom API: `Send_Modification_Email` — POST, OAuth2, All users, `application/json` key-value
  `{modificationId, action}`; endpoint `https://www.zohoapis.com/creator/custom/wbdevelopment/Send_Modification_Email`.

### Revised Final on Budget_Item

`Budget_Item.Revised_Final` (currency, added 2026-08-13) persists Revised Final on the item record
for reports and downstream consumers. It is maintained by:

- `recalcItemRevisedFinal(int itemId)` — sets `Revised_Final = Budget_Ttl + sum(approved mods)`;
  called by `sendModificationEmail` when a modification chain completes (action `approved`).
- `recalcAllRevisedFinals()` — batch: recalcs every item with modifications and resets stale
  values on items without mods. (The nightly schedule that ran this was removed by Robby on
  2026-08-13; the function remains available for manual/on-demand runs.)
- `createBudgetModification(...)` / Custom API `Create_Budget_Modification` — creates the
  modification record, a two-row approval chain (VP + CFO, both rbelliveau@wbdevelopment.com,
  recipients editable in the widget), and sends the first approval email atomically. The widget
  no longer inserts these records client-side.

The widget computes Revised Final live from `All_Budget_Modifications`; the field is the
persisted mirror, not the widget's source.

- `submitBudgetModification(modId)` / Custom API `Submit_Budget_Modification` — promotes a Draft
  modification: builds the two-row chain if missing, marks Submitted, sends the first email.
- `modificationAdmin(action, ...)` / Custom API `Modification_Admin` — admin operations gated by
  `User_Access.Edit_Delete_All_Modifications`: `update` (edit any modification's fields; recalcs
  Revised_Final when Approved), `delete` (removes the modification AND its approval rows; recalcs),
  `repair` (relinks orphaned Modification approval rows on a budget to their modifications and
  removes unreachable leftovers; idempotent, no email — the widget auto-invokes it when it sees a
  Submitted modification with no chain).
- Email deep links carry `budgetId` + `modificationId`; both are declared page variables on the
  Budgets page (`Budget_Management1`), and the widget opens the phase in Modifications mode with
  that modification's detail.

### COO approval threshold (added 2026-08-14)

`Settings.COO_Approval_Threshold` (currency, Budget Settings section of the single-record
`Settings` form) gates a third approval step on Budget Modifications: when a modification's
Amount exceeds the threshold, `createBudgetModification` / `submitBudgetModification` (and the
`modificationAdmin` repair rebuild) append a COO row (Sort 3, placeholder recipient
rbelliveau@wbdevelopment.com, editable in the widget) after VP and CFO. Empty/0 disables the
extra step. The chain traversal in `sendModificationEmail` handles any chain length unchanged.

### Approval reminders (added 2026-08-16)

`Settings.Approval_Reminder_Interval_Days` (number, default 3) and
`Settings.Next_Approval_Reminder_Date` (date) drive `sendApprovalReminders()`, run by the
**Send Approval Reminders** schedule (daily, 07:00). The function no-ops until
`Next_Approval_Reminder_Date` arrives; on the due date it re-sends the approval email for every
`Budget_Approvals` row still `Pending` — budget tracks via `sendApprovalEmail`, Pro Formas via
`Send_Proforma_Approval_Email`, Modifications via `sendModificationEmail(..., "created")` — then
advances the date by the interval. A blank date arms it (interval days out) without sending.
The schedule runs daily rather than on the date itself because a Creator schedule cannot retarget
itself; the date field is the real gate.

### Modified Final rollups (added 2026-08-16)

Modified Final = Final + approved modification deltas, persisted at two levels:
`Budget_Category.Modified_Final_Total` and `Add_Budget.Modified_Final_Grand_Total`, maintained by
`recalcBudgetModifiedTotals(budgetId)`. It recomputes from the modification records (not from
`Budget_Item.Revised_Final`) so a stale Revised_Final cannot skew the rollup. Called when a
modification chain completes (`sendModificationEmail`) and on admin update/delete
(`modificationAdmin`). The widget's summary matrices compute the same figure client-side and only
render the Modified Final column when the budget has at least one approved modification.

### Territory defaults (added 2026-08-14)

Form `Territory` (report `All_Territories`, app menu section "Territories") holds per-territory
defaults: `Territory_Name` (single line, mandatory, unique), `VP` and `Dev_Mgr` (multi-select
lookups to `User_Access`, display `User` — same record-ID convention as `Budget_Owner`).

`Territory_Name` must match the **Subdivision.Territory** picklist value verbatim (e.g.
"Temple/Belton"); a budget resolves its territory as `Add_Budget.Subdivision1.Territory`
(Add_Budget itself has no Territory field).

**Routing email**: `User_Access.User` is a Users picklist that returns the Zoho *login name*
("jking_wbdevelopment84"), not an email, so it cannot be used to address an approval.
`User_Access.Approver_Email` (added 2026-08-16) holds the routing address, and
`territoryApproverEmail(territoryName, role)` resolves Territory.VP / Territory.Dev_Mgr → that
email. `createBudgetModification`, `submitBudgetModification`, and the `modificationAdmin` repair
rebuild use it for the VP row, falling back to the standing placeholder recipient when the
territory has no VP or that VP has no Approver_Email.

### Modification access model

- Submitting a modification requires `Edit Owned Budgets` (ownership-scoped via `canEditBudget`),
  trumped by `Edit/Delete All Modifications` (`canSubmitMod`).
- `Edit/Delete All Modifications` (User_Access decision box, link name
  `Edit_Delete_All_Modifications`; returned by `getUserAccess` as `modAdmin`) additionally grants:
  edit/delete of ANY modification and approve/reject/recipient-edit on ANY Modification-type
  approval row (`canAdminMods`, `canEditApprovalRow`).

### Report-layout gotcha (v2 API)

The record API (`/api/v2/.../report/<report>`) returns ONLY the columns configured in the report's
quick view. If a field is missing from the layout, the widget never receives it — this is why
modifications once rendered as "Draft" while the records were "Submitted" (no `Status` column in
prod's `All_Budget_Modifications` layout) and chains looked unlinked (no `Budget_Modification`
column on `All_Budget_Approvals`). When adding fields consumed by a widget, add them to the report
quick view AND publish the report component. The `Budget_Modification` lookup displays `Amount`
(was `Reference_Number`, which is usually blank).

### Environment note

The `Budget_Modification` form/report, `Budget_Approvals` changes, the Deluge function, and the
Custom API binding were created in the **Development** environment (`land-master-development`).
They require a Development → Stage → Production push before production users see them; re-verify
the Custom API's function binding after that push.
