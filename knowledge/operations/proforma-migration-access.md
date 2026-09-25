# Temporary Pro Forma Mega Admin Mode

Prepared at the owner's request on 2026-09-24 for Robby's `rbelliveau` User_Access profile only. This enables the browser re-save migration of existing Pro Formas, including approved, pending, manually locked, closed, archived, and non-owned records. Everyone else keeps the original gates. No record migration runs as part of this release.

## One switch to restore normal access

At the beginning of `creator/functions/proforma_save.dg`, change:

```deluge
migrationEditor = "rbelliveau";
```

to:

```deluge
migrationEditor = "";
```

Save the updated function in Creator Development, then promote it through the Creator environment pipeline. On reload the widget's read-only `phase_sales_capabilities` probe receives the empty value and restores Robby's normal restrictions automatically. Other users never receive the bypass. Already-open tabs must reload; the updated server immediately rejects otherwise-protected saves from stale tabs.

Keep the new phase model, migrated data, and all normal profile permissions. No approval reset, unlock, unarchive, ownership reassignment, or status change is required. The original gates remain in the code. The pre-bypass widget rollback release is `1.80.22`; the pre-bypass Creator function is in commit `f34f2e5`. Prefer clearing the switch instead of rolling back the entire phase-sales release.

## Exact scope

- Widget: existing-record Edit, financial inputs, direct edit links, Save, and deliberate no-change re-save require the signed-in SDK login `rbelliveau@wbdevelopment.com` and the resolved User_Access roster row. Production resolves that login to row `4410926000004465004` with User `wbdevelopment`; this exact ID and label are accepted as the migration alias. No generic admin-role grant is used.
- Creator `proforma_save`: uses its existing `userAccessId` requester convention, resolves that User_Access row, and bypasses completed-approval rejection for the ordinary financial save, `save_phase_sales`, and `finalize_phase_sales` only when its User matches `migrationEditor`, that username at `wbdevelopment.com`, or the exact Production alias row above. Missing, malformed, unknown, or non-matching IDs get the original gates. All three save calls carry the current access ID.
- Identity limitation: the existing administrator-scoped Custom API receives requester identity in the payload; this profile check is not a new tamper-proof authentication boundary. Do not use `zoho.loginuser` alone to authorize the bypass because it can identify the API authorizer instead of the widget user.
- Preserve the saved `Lock_Inputs` value in both the header and workflow-triggering touch. A UI bypass never becomes a stored unlock. List lock indicators and owner-edit checks use the original lock calculation.
- Approval actions/routing/reset, LOI worksheet approval locks, explicit unlock actions, owner grants, delete/archive rights, attachments, and the Under Construction access gate retain their checks. Input validation, balanced phase allocations, capability checks, and post-save verification remain enforced.
- Creator profile/report permissions are not changed. No persistent User_Access permissions are edited.

## Deployment and regression

Initial Production widget release: `1.80.23`. The Production alias correction requires widget `1.80.37` and a matching Creator `proforma_save` promotion, used by the existing environment-routed `Save_PF` APIs. No schema or API names change. The user retains control of Creator environment promotion; publishing the widget cannot install this function, and the bypass stays off for the alias until the matching backend is deployed.

Affected existing forms: `Add_Pro_Forma`, `Proforma_Phase`, and `Proforma_Months` through the normal save pipeline. No persisted fields are added. An unchanged migration re-save retains `Status`, `Probability`, `Owner`, `Archive`, `Lock_Inputs`, and approval records.

Regression coverage: designated account versus another account, SDK/roster mismatch, missing identity, empty server switch, approved/closed/archived/non-owned/manual-lock records, no-change Save, unchanged stored locks, and all three backend branches. Financial mathematics and migration defaults are unchanged.

## Copyable removal prompt

Remove my temporary Pro Forma Mega Admin Mode after migration. Read `knowledge/operations/proforma-migration-access.md`. Set `migrationEditor = "";` in `creator/functions/proforma_save.dg`, keeping the phase model and all migrated records intact. Do not reset approvals, change locks/status/owners, or remove my normal profile permissions. Verify that the empty capability restores the original edit/save gates, including approved, closed, non-owned, and locked records. Push the verified source change to main. Save the updated function in Creator Development after checking with me; I will handle environment promotion. Tell me when to reload Production and confirm that the Mega Admin Mode banner is gone. Do not roll back the phase-sales release or re-save any records during removal.
