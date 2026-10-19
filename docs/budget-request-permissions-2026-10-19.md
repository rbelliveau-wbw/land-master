# Single Budget/request admin permission — October 19, 2026

Budget **122.29.56** includes the approved Row tools layout and the consolidated
Budget/request administration permission. 122.29.55 was packaged and committed
before this follow-up; it was not pushed or promoted by itself.

## Authorization

The existing User_Access.Edit_All_Budgets field is labeled **Edit/Delete All
Budgets/Requests**. Its exact link name and assigned values stay unchanged.
The separate Edit_Delete_All_Modifications control is hidden on User Access
create/edit by Retire Modification Permission. Its stored values remain for
compatibility and grant no access. No user's boxes are automatically selected,
and retired values are never copied into the global grant.

Both getUserAccess and getUserAccessLean return modAdmin as a compatibility
alias of Edit_All_Budgets. The Budget widget derives modification-admin powers
from editAll, ignoring legacy modAdmin responses and the retired field. Actual
request admin/delete controls also require a resolved User Access identity;
existing portal display overrides cannot invent one.

Budget owners keep editing/creating and the existing submission paths. Only the
global grant permits standalone modification Edit/Delete or PO Delete, from
both Requests and the PO modal. PO delete openers recheck permission before
preview, and the native PreviewDelete / Delete / CheckDelete actions require
the authenticated actor's Edit_All_Budgets. Modification_Admin checks one
unambiguous authenticated User Access row with that grant before update/delete.
Pending recorded approval ownership and the unified admin override retain their
existing decision flows. PO child mods stay governed by their PO.

Saved Check/Wire details currently provide viewing and attachments without a
delete action. This permission consolidation does not add a new payment deletion
API or lifecycle. Existing Budget Delete & Archive controls and file deletion
permissions are separate and unchanged. Budget files are retained after request
deletion, as approved for the attachment implementation.

## Creator handoff

Development changes: User_Access.Edit_All_Budgets display name and description;
Retire Modification Permission, link Retire_Modification_Permi, Created or Edited
→ Load of the form, hiding Edit_Delete_All_Modifications; and four functions:
getUserAccess, getUserAccessLean, modificationAdmin, managePurchaseOrder.
The function signatures and Custom API contracts stay unchanged. No new API
registration is required; existing registrations were verified in the browser.
Native Save compiled all four functions; reloaded editors confirmed the global
grant mappings and delete guards. The running Development form shows the new
label and hides the retired control. The user promotes Creator. The generated
schema remains tied to its DS export;
[the live contract](../manifests/budget-request-permissions.json) records additive
Development observations instead. No business record, request, attachment or
stored user permission value is changed during this setup.

Promote the field/workflow and all four functions together for Production API
enforcement. The frontend immediately restricts controls, but the server-side
change takes effect in each environment only after its native promotion.

## Verification and rollback

Focused actual-source tests exercise global versus owned/retired/approval/archive
grants, portal identity denial, exact same-Budget scope, PO child isolation,
authenticated native modification authorization including duplicate access rows,
and native PO delete authorization on active/archived phases. Lean/full access
parity keeps every unrelated flag. Desktop tests exercise owned PO editing with
no Delete, a denied direct delete opener with zero extra writes, the real row
controls and modal composer, attachments and the original flicker regression.
Local npm run validate and npm run build:pages passed, along with the focused
permission, access parity, routing, request rail, real request attachment/modal
and PO dismissal desktop suites. All 22 source/release files match. CI, Pages
and fresh live asset verification remain publication completion gates.

Rollback repository Budget mappings to **122.29.54** if required. Keep the native
permission guards and attachment records; an older widget may show an action
that the retained native guard denies. Do not restore the retired grant or widen
native deletion rights as part of a frontend rollback.
