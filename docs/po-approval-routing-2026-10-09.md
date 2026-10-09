# PO approval routing — October 9, 2026

Every new PO submission requires CFO approval. When the PO's combined lines for
any budget item exceed that item's available budget after other POs, COO and the
territory VP are also required. Pending modification credits do not suppress
that approval trigger. Automatic item modifications continue on the PO's one
combined approval chain.

PO VP resolves from exactly one current `User_Access` identity in `Territory.VP`.
CFO and COO use role assignments. All-companies defaults are available for PO
policies and assignments; company-specific configuration takes precedence.
Other workflow scopes retain their existing company requirement. Submitters
cannot approve, and each required step must have a different person.

## Deployment and native verification

- Main implementation commits: `9ad29ab` and `b5ce4c9`.
- Settings Manager 1.4.4 is mapped to Development and Production. Validation,
  Pages build, CI and Pages deployment passed.
- Updated existing functions: `managePurchaseOrder`, `resolveApprovalRoute`,
  `approvalConfigurationSnapshot`, `manageApprovalPolicies`. All four compiled
  in Creator Development. Stage is version 9.65.
- No new forms, fields, functions or custom APIs were added for this change.
  Existing APIs `Manage_Purchase_Order` / `_DEV` and
  `Manage_Approval_Policies` / `_DEV` continue to call the existing functions.
- Native Production Settings initialization, configuration List and audited
  CFO/COO/VP role saves passed. Production identity uses GET without a client
  username; Development retains its registered POST contract.
- Existing CFO and COO User Access records were enabled for approval routing;
  other access flags were preserved.
- Creator Production remains 9.63 pending explicit confirmation after automatic
  approval review rejected Creator's combined selection of versions 9.64 and
  9.65. The two versions contain only these four functions (seven function
  updates across the two incremental versions).
- Final PO policy publication and positive native route verification still need
  the user-confirmed sequential order and valid distinct territory VP data.
  The native Production Territory report currently has one record with the
  same User Access person as CFO and VP; other territory records are absent.

## Existing approvals

Pro Forma and Budget policy templates guide creation of existing linked
`Budget_Approvals` records. Decisions, notes and statuses remain on those child
records. Existing chains are not rebuilt when a template changes. Their
execution adapters retain their existing activation gates; this PO change
does not activate or rewrite those workflows.

## Regression and rollback

Focused checks cover the mandatory CFO, item overrun condition, direct
territory VP lookup, missing/ambiguous VP, inactive/unroutable people,
submitter exclusion, duplicate people, all-companies defaults and specific
overrides, unchanged Budget VP behavior, and Production GET / Development POST
identity transport. Full repository validation and Pages build passed.

For a frontend rollback, map Settings Manager back to the prior working 1.4.2
immutable release and rebuild/deploy Pages. Creator function rollback requires
restoring the four pre-change functions from commit `586b041`, compiling in
Development, then publishing a new Stage and Production version. A widget
mapping change alone does not revert Creator functions or saved policy data.
