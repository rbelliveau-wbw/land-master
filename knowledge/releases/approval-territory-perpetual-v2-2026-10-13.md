# Approval Territory and perpetual assignment migration

The requested Approvals redesign removes Company scope and effective dates from
approval configuration. Assignments apply until edited or disabled. The native
Development migration is complete: all nine functions compiled and all six
fields were deleted after explicit user confirmation. The user owns Creator
promotion to Stage/Production; the frontend is already published as Settings
Manager 1.5.3. Frontend promotion alone does not promote native changes.

The API envelope remains `approval-policy-v1`. Native List advertises
`policyModel: territory-perpetual-v2` only after the new administration function
is installed. Settings permits configuration Save, Publish and Preview only with
that model. Existing configuration remains inspectable before promotion, and
read-only token Check can recover a historical completed receipt.

Policy and recipient precedence is Territory + Department, Territory,
Department, then All. Company and date values do not affect new routing.
Territory-based PO VP lookup, required CFO, optional modification roles, step
order, self-approval restrictions, exact string identities and operation tokens
retain their established behavior. Existing submitted routes and native
decision rows retain their captured recipients, order, notes and timestamps.

## Exact field deletions

Delete only these six native fields. The names are confirmed in the October 11
Development export; verify them and their dependency list live before deleting.
The source removal manifest is
[approval-scope-removal.json](../../manifests/approval-scope-removal.json).

| Form | Field link names |
| --- | --- |
| Approval_Policy | Company, Effective_From, Effective_To |
| Approval_Role_Assignment | Company, Effective_From, Effective_To |

The general Company form, all other Company lookups, financial document
validation and budget-modification business effective dates remain in place.
Legacy policy Version and Duplicate_Person remain for existing explicit receipt
recovery; they do not control routing or appear as editable policy settings.
Do not rewrite historical Creator exports, captured snapshot JSON or historical
configuration audit JSON to remove evidence of the old scope.

## Migration review and installation

1. Export the approval configuration, all six columns, audit JSON and captured
   routes. Retain the original native function bundle with the export.
2. Resolve Started/unknown approval configuration operations and every retained
   `Approval_Config_Lock` through their original owning receipt before replacing
   the native helpers. Never delete a lock to make migration proceed.
3. Audit the prospective scopes before field deletion. Published policies with
   identical workflow/Territory/Department keys will collide when Company is
   removed. Assignment rows with identical role/Territory/Department keys will
   collide when Company and dates are removed. Inactive assignments and disabled
   Published policies still participate in selection; merely disabling a
   duplicate does not fix ambiguity. Choose the surviving recipient/route with
   the user, or give the records distinct valid Territory/Department scope.
   Same-scope Draft/Published policies also prevent future editor saves.
4. For an offline read-only report, save the native List DTO as JSON and add a
   separately verified `locks` array (`[]` only after a complete native lock
   read). Run `node scripts/audit-approval-scope-migration.mjs <json-path>`.
   Exit 2 identifies unresolved collisions, receipts, locks or a missing lock
   inventory. The script never selects, disables, deletes or writes a record.
5. Pause new approval submissions and configuration edits during the native
   bundle installation. Compile these exact checked-in functions:
   `approvalConfigurationSnapshot`, `resolveApprovalRoute`,
   `applySharedApprovalPolicy`, `startApprovalChain`,
   `createBudgetModification`, `submitBudgetModification`,
   `Start_Proforma_Approval_Chain`, `managePurchaseOrder`, and
   `manageApprovalPolicies`. Install the administration function last so its v2
   readiness value cannot precede the routing implementation.
6. Confirm no remaining native dependencies on the six columns, then delete
   them from the two approval forms. Existing default reports have no explicit
   field-column list; confirm their rendered columns after deletion. Do not
   delete any application Company form or unrelated field.
7. Read native List and confirm `territory-perpetual-v2`, no configuration
   `companies` array, and no policy/assignment company or effective-date keys.
   Preview ordinary and modification PO routes, verify VP resolves from
   Territory.VP, and verify other workflow Territory/Department scope. Confirm
   a previously submitted PO retains its saved recipients and decision state.
8. Promote the scoped Creator changes to Stage/Production through the user's
   normal environment release. Do not include unrelated pending components.

New SavePolicy and SaveAssignment reject removed Company/date keys before any
configuration writes. Old saved receipts with nonempty removed scope/date intent
cannot safely be reconciled against deleted columns; v2 keeps their evidence and
lock and directs them to the pre-migration recovery. Completed historical
receipts remain readable through token-only Check with their original after JSON.

## Regression evidence

`test-approval-policy.mjs` verifies no-company/no-date context, perpetual
assignments, all four scope precedence levels, collision failures, PO Territory
VP, required CFO/modification branching and detached captured routes. Its
imported native-source suite executes the actual Deluge helpers with the six
columns absent, exact assignment saves, obsolete-editor rejection, old receipts
and token-only Check. `test-approval-execution.mjs` verifies untouched native
chains can initialize without Company/date context while existing decisions and
notes remain unchanged. `test-approval-scope-migration.mjs` verifies the read-only
collision/lock review without selecting a person.

These offline regressions are supplemented by the native Development checks
recorded below. Repeat the environment checks after Creator promotion.

Settings Manager 1.5.3 passed the complete `npm run validate` and
`npm run build:pages` gates. Desktop fixture checks covered the full ordered PO
editor, visible recipient names/emails, searchable floating picker, Escape
focus return, CFO-only and VP/CFO/COO preview, and the old-native readiness gate.
Development's existing read-only configuration helper returned one policy,
two assignments and ten completed audit records. The owner-view native lock
report showed no records; the exported DTO passed the v2 migration auditor
with no collisions or unfinished receipts. Private backup and desktop evidence
are retained outside the committed release.

## Completed native Development migration — October 13, 2026

The user explicitly confirmed deletion of the six fields and dependency removal.
The fresh preflight again found one policy, two assignments, ten completed
configuration audit records and no retained configuration locks. Native field
values were blank; their original values and native function bodies were backed
up outside the committed release.

All nine functions in the bundle were saved, compiled and independently reloaded.
Native Budget-start and Pro Forma-start bodies differed from the repository
baseline only in Creator formatting of existing conditions. Their native bodies
were preserved and only the Company/date context was replaced; source now
reflects those native bodies with whitespace cleanup. Existing financial,
restart, repair, self-approval and notification behavior was not redesigned.

Creator's View Field References showed zero references for each deletion target.
Company, Effective_From and Effective_To were deleted from both forms. Reloaded
native form previews confirmed all six fields absent. Business Company fields,
transaction dates, policy recovery evidence and captured approval history remain.

The live Settings List handshake unlocked `territory-perpetual-v2`. Native
read-only Preview verified CFO alone without new modifications and VP → CFO → COO
with new modifications, with the requested Gmail/WB Development/Yalgo recipients.
The tests sent no emails and made no configuration or approval decisions.

Promote the nine-function/two-form Creator bundle together. The manifest records
the completed Development checks; native Stage/Production promotion remains the
user's action. After promotion, refresh Approvals and repeat both route previews.

## Rollback

Before field deletion, restore the old native bundle and previous Settings
release together. After deletion, restore the six columns and their exported
record values before restoring native helpers that depend on them. A frontend
mapping rollback alone cannot restore removed native fields. Retain audits,
captured routes and decision history throughout rollback.

The previous frontend release is Settings Manager **1.5.2**. Stage remains
independently mapped; the requested frontend promotion updates Development and
Production to **1.5.3**.
