# Property Transfers — Land Master 8.16.0

The New menu includes Property Transfer. Existing Property editors have a
Property Transfers tab with effective-date history, status, amount, and View / Edit.
Creating from that tab fixes the property and preselects its current Company as
From Company. Creating from the New menu allows a searchable property choice.
The three transfer types are Land Investment, Development Company, and Plat Recordation.

Transfers record history only. Neither widget saves nor native validation update
Property.Company1. Completed is a history status, not an ownership instruction.
There are no attachments. Draft, Pending, Completed, and Cancelled are supported.
Full transfers clear their optional partial amount and unit. Partial transfers
require a positive amount of up to four decimal places and either Percentage or
Acres; percentage must be below 100 and known acreage must exceed the partial area.
From and To companies must differ. Effective date is separate from Creator's
automatic Added_User, Added_Time, Modified_User, and Modified_Time audit fields.

The Property modal groups every existing editable field into Property & location,
Ownership & relationships, Acreage & financials, Designation & coverage, and
Descriptions & notes. Dates use typed MM/DD/YYYY plus a custom calendar; all
record dropdowns retain the existing searchable picker. Changes remain staged
until Save. Keyboard focus stays in the dialog and returns to its opener.

## Backend and promotion

Created and saved in Creator Development:

- Form `Property_Transfer`: Property, From_Company, To_Company, Transfer_Date,
  Transfer_Type, Status, Transfer_Scope, Amount_Unit, Amount_Transferred, Notes.
- Report `Property_Transfer_Report`, labeled Property Transfers, including all
  transfer fields and the four native audit fields.
- Workflow `Validate_Property_Transfe`, labeled Validate Property Transfer,
  Created or Edited / Validations on form submission, one Deluge script action.

The schema ledger is [property-transfer.json](../creator/schema-changes/property-transfer.json).
Native IDE snapshots are stored with it; the new generated metadata uses those
current Development captures while retaining existing export metadata.
No standalone functions or Custom APIs change. Creator promotion belongs to
Robby. Promote this form, report, and validation workflow together. The widget
checks report availability before opening a transfer form; history errors remain
scoped to the transfer tab until the backend reaches the current environment.
Normal Property editing remains available.

CFO profile permissions were saved and independently reopened in Development:
Add Property Transfer; View and Edit through Property Transfers; View all and
Modify all. Existing Land & Projects page, Property, and Company access already
covered the widget's dependencies. Transfer Delete, import, export, report
creation, and comment grants were left disabled. Include the CFO permission
change in the same user-owned Creator promotion.

## Verification and rollback

Regression coverage: required fields, company identity, full/partial behavior,
decimal precision, calendar validation, exact string IDs, native workflow-enabled
creates, no property writes, cached and stale history, denied report retry,
unknown-create quarantine, grouped field completeness, existing Property saves,
New menu, searchable choices, and transfer history reopening.

Widget rollback: map Land Master to `8.15.9` and redeploy Pages. Retain transfer
records and the new backend components; reverting the widget does not erase history.

## Single-select refinement — 8.16.1

Fixed-choice single selects now use text-only modern popovers with no search bar
or checkbox markers, including Transfer Type, Status, Transfer Scope, and Measure
by. The current option remains highlighted, selection closes the popover, and
keyboard navigation/dismissal returns focus to the trigger. Record lookups keep
search and multi-select filters keep their selection controls.

Changed files: the Land Master picker JS/CSS, widget version/config/manifest,
immutable release, environment mappings, and these design/promotion notes.
No Creator forms, fields, workflows, functions, Custom APIs, or permissions change
in this refinement; no additional Creator promotion is required. The original
Property Transfer backend promotion remains user-owned. Verify fixed-choice
menus, keyboard selection/Escape, optional Clear, record lookup search, and
multi-select controls. Roll back this refinement to widget release `8.16.0`.
