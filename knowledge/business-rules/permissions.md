
# Permissions

UI visibility is not sufficient authorization. Creator functions and Custom APIs must enforce permissions server-side for sensitive changes.

Known permission concepts include editing all versus owned records, editing approval configuration, sending approvals, and editing owners. Verify current fields in `User_Access` before implementation.

## Ross's Lot Permissions

Ross uses **Accounting - Lot Management - Ross**, a native duplicate of the
original accounting profile with Create removed only from `Lots`,
`Mass_Create_Lots`, and `Mass_Create_Lots_Subform`. Preserve all inherited edit
grants, including Lots Modify All and report Edit. **Create on
`Mass_Update_Lots` must remain enabled** because that helper submits mass edits
of existing lots; preserve `Lot_Search` Create and existing takedown rights too.
The original profile and other users remain unchanged. See the
[Production 9.160 change record](../../creator/schema-changes/ross-lot-create-2026-11-06/README.md)
for native evidence, verification limits, and Ross-only rollback.
