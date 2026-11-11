# PO type and department

The existing Purchase Order editor requires a PO Type selection before its
Budget Item picker opens. Construction permits Construction items. Development
permits Development and Engineering items. The native Budget Item Department
is authoritative; an empty legacy item department uses its budget category's
existing `Deparment` field. Surveying and unknown departments are excluded.
All existing finalization, template, cost-code and modified-budget rules remain.

The selected value is sent as `department` and stored in the existing
`Payment_Request.Department` picklist. No schema or widget Custom API registration
change is required. A temporary admin-only maintenance API was created with
explicit approval, used for the Production backfill, and disabled afterward. `poSnapshot` returns the choice. Previously untyped records
remain
readable and show "PO type needs review"; saving requires a valid choice and
matching items. Changing type never silently deletes existing lines: remove
incompatible lines first. Spreadsheet paste/fill uses the filtered picker rows;
changing department clears spreadsheet undo history so an old range cannot
restore items from another type.

`poValidatePayload` rejects missing or unsupported choices for Save and Submit.
`managePurchaseOrder` checks every native item department under the existing
phase lock before any PO/child/financial writes, including zero-amount lines,
then persists Department for both new and updated headers. Reallocation remains
restricted to the selected PO items. Approval routes, captured approvers,
financial calculations, notifications and request permissions are preserved.

## Existing records

The owner-approved rule is to backfill blank departments only when every current
item resolves to one type, mapping Engineering to Development. Preserve all
nonblank values. Flag mixed, unsupported, missing-item, incomplete-revision and
busy records for review without changing them.

`backfillPurchaseOrderDepartments(afterId, apply)` is an owner-only maintenance
function with 100-record cursor batches and an explicit read-only preview. It
uses only the active PO revision, or the legacy header Budget Item. Results list
each exact PO identity and disposition. Repeated runs preserve previously filled
values. It changes only Department, retaining line revisions, amounts, financial
reservations and approvals.

## Validation and deployment

Focused tests execute the shipped domain/picker and actual native Deluge for
required choices, Construction/Development/Engineering mapping, mismatched and
zero-dollar lines, saved Department readback, active/legacy backfill, exceptions,
preview and idempotence. Existing PO entry, spreadsheet, controller, create-only,
approval and reallocation tests retain explicit valid department fixtures.
The actual editor was exercised in the agent-owned browser: initial item picker
disabled; Construction exposes only its items; Development exposes Development
and Engineering; incompatible type changes preserve the chosen line.

Creator components: `poValidatePayload`, `managePurchaseOrder`, `poSnapshot`,
and the new owner-only `backfillPurchaseOrderDepartments` maintenance function.
Existing APIs `Manage_Purchase_Order` and `Manage_Purchase_Order_DEV` keep their
registrations and `po-v1` response contract. Both Creator publication and the
immutable hosted widget promotion are required.

The four scoped native functions were compiled in Development and published
through Stage to Production as Creator 9.183 on November 11, 2026. The native
Development read-only preview found seven eligible blank departments and no
exceptions. Production backfill completed after explicit temporary API approval: six
Construction and one Development PO were updated, with zero exceptions. A
read-only follow-up returned seven already-set records, zero eligible records
and no further pages. The native Production report independently showed all
seven saved Departments. See `po-department-production-backfill-2026-11-11.json`.

Hosted release 122.29.133 integrates current main's shared deletion-reconciliation
runtime; 122.29.132 remains an immutable candidate and was not promoted. Full
`npm run validate` and `npm run build:pages` passed for the integrated release.

Rollback: hosted widget 122.29.131 plus the captured prechange native copies for
the three existing functions. Preserve backfilled Department values; do not undo
or delete existing POs, lines, approvals, modifications or operation receipts.

Production verification: commit 5f64b5b1 passed CI run 43061784812 and Pages
deployment 43061784809. The live Production editor was checked in its existing
Windmill Preserve workspace: item selection is disabled before Type; Construction
shows construction items; Development shows Engineering Design and development
soft costs. No test PO was saved or submitted. The temporary OAuth2, admin-only
API was explicitly approved by the user,
created, used for preview/apply/read-only verification, then disabled. The
Development invocation wrapper was never published and was restored exactly to
the original helper after completion. Only the seven blank PO Department values
were changed in Production; amounts, lines, revisions and approvals were retained.
