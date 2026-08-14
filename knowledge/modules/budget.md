
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
