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
compilation/publication and real email delivery have not been performed.

Rollback the widget mapping to **122.29.145** and restore the previous five
function bodies from the feature base. Preserve already saved signed records:
rolling back the PO balance reader after using V2 can make those allocations
unavailable until the signed-aware reader is restored. Do not rewrite history.
