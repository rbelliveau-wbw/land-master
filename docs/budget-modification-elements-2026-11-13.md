# Standalone Budget Modification Elements

Budget Manager **122.29.147** adds five ordered element amounts with independent
signs to one standalone request and one Settings approval chain. Mixed increases,
decreases and zero-net transfers are supported. Native email and an Excel
attachment include the full ordered breakdown and current/projected balances.

## Creator Promotion

Save and promote these existing function bodies together; no schema or Custom
API changes are needed. Publish before using the new editor for live requests.

1. [createBudgetModification](../creator/functions/createBudgetModification.dg)
2. [modificationAdmin](../creator/functions/modificationAdmin.dg)
3. [submitBudgetModification](../creator/functions/submitBudgetModification.dg)
4. [poBudgetBalancesForItems](../creator/functions/poBudgetBalancesForItems.dg)
5. [sendModificationEmail](../creator/functions/sendModificationEmail.dg)

V2 saves fail without writes against old native functions. Existing V1/scalar
callers remain compatible after promotion. The native email attachment uses the
same SpreadsheetML/toFile/sendmail pattern as PO approval attachments. Net change
controls financial rollups; gross changes control amount-based approval steps.

## Validation And Rollback

Local tests execute actual widget handlers and native source against fixtures,
including mixed signs, net zero, a real captured Settings chain, gross threshold
steps, PO availability and workbook numeric/string round trips. The in-app
desktop fixture verified order, signs, readable controls and mounted-field
continuity. Greptile could not run because its CLI is signed out. Native Creator
compilation and save/reopen verification passed in Development on November 13,
2026 for all five functions. Production publication and real email delivery have
not been performed.

## Development Installation

All five existing functions above were saved in Creator Development and reopened.
Their persisted bodies match the intended source after ignoring comments and
formatting. The pre-install bodies matched the feature base, so no newer native
changes were overwritten. No business function was executed and no approval
email was sent during installation. Production promotion remains with the user.

Creator removed nested boolean grouping while formatting the creation and
administration validation. Separate guards now preserve scalar compatibility and
the signed-component rules; focused backend, routing and read-only tests pass.
No forms, fields or Custom APIs changed. Development backups and verification
evidence are retained locally in `tmp/creator-multiple-elements-development/`.

Rollback the widget mapping to **122.29.145** and restore the previous five
function bodies from the feature base. Preserve already saved signed records:
rolling back the PO balance reader after using V2 can make those allocations
unavailable until the signed-aware reader is restored. Do not rewrite history.
