# Acquisition agreements and current action summary — October 21, 2026

Proforma Manager 1.80.124 adds a PSA / LOI pill at Offer → Agreement. New and
blank legacy worksheets default to PSA; the selection saves with the worksheet.
Contract Management 1.62.18 offers ACQ (PSA) and ACQ (LOI) in place of Acquisition.
The existing Acquisition action-template category becomes ACQ (LOI), with a
separate initially empty ACQ (PSA) category. Legacy template rows still read as
LOI during rollout; PSA never inherits the LOI checklist.

Both Legal and Construction reports replace Approvals and Progress with Current
Action Status, a read-only pill matching the record Status pill. Current Action
shows the action title and due date, with overdue dates in red. Legal also shows
the action assignee. Missing current actions do not borrow another action's
status. Subdivision width changes from 14% to 11.9%; Status receives the freed
2.1 percentage points. Hold has a distinct rose treatment in status controls,
filters and the board.

PF AI Review excludes its composite dialog from the shared detached exit-copy
animation. Its close handler, focus restoration and opening animation stay in
place. This prevents the dialog/backdrop from flashing during dismissal.

## Creator changes and verification

Saved through the signed-in Creator Development builder:

- `LOI_Worksheet.Agreement_Type`: dropdown PSA / LOI, default PSA.
- `LOI_Worksheet_Report`: Agreement Type exposed as a report column.
- `Contract_Actions.Type_field`: existing Acquisition choice renamed ACQ (LOI),
  then ACQ (PSA) added. Creator states that a choice rename updates existing rows.
- `Create_LOI_Contract`: selects the worksheet agreement, creates/reuses the same
  subtype under `ACQ (<agreement>) - <Pro Forma name>`, and selects that subtype's
  action template. Permission, approval, locking and duplicate-submission gates
  remain in force. Old matching names are recognized for the same subtype.
- `proforma_save`: validates and saves the optional Agreement_Type field under
  the existing worksheet operation. Older callers can omit it.

Both changed functions compiled/saved in Creator, were reloaded, and their new
source was confirmed. The native Add Contract Type dropdown was verified to
contain both new types and no selectable Acquisition. Hold was added to the
native Contract by the user. No Custom API was created or renamed. Existing
`proforma_save` and Legal handoff callers retain their interfaces. Writer merge,
document content and approval email content are unchanged.

PMP publishes repository mappings/assets; Creator promotion is left to the user.
Promote the field/report/template schema and both functions together before
using the agreement selector in Production. A full business submission was not
performed solely as a test because it would create a real legal record/document.

## Approval cleanup

Deleted 79 Production `Budget_Approvals` rows matching all three conditions:
Type = Pro Forma, Status = Not Sent, Approver = legal@wbdevelopment.com. Native
filtered report confirmed zero remaining after deletion. The 79-row JSON export
was saved locally before deletion at
`outputs/proforma-not-sent-legal-approvals-backup-2026-10-21.json` outside Git.
Production Settings already routes Pro Forma through VP → CFO → COO → CEO and
contains no Legal step or legal mailbox recipient; no policy edit was necessary.
Development had no Pro Forma policy routing to Legal. Historical sent/approved
rows were excluded. The retired legacy PF approval creation workflow is inactive
in the October 21 Development export.

## Regression and rollback

- Focused offline checks cover PSA default, LOI persistence, payloads, distinct
  templates, contract names, Hold, and both seven-column reports.
- Desktop browser checks cover equal pill dimensions and repeated Close/X
  dismissal of AI Review with normal and reduced motion. No exit copies remain.
- Required repository validation and Pages build are run for the release.
- Rollback mappings: Proforma Manager 1.80.121; Contract Management 1.62.16.
  Keep the additive worksheet field. Restore prior function source separately if
  rolling back Creator behavior; do not undo the user's native type rename.

The record-owner comment email is a visual proposal only, with Legal and
Construction examples. No notification workflow or email send was enabled.
