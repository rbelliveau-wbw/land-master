# Multi-item purchase orders and shared approval administration

## Current status â€” 2026-10-08, supersedes the earlier notes below

Creator Development now has working native PO persistence. Complete unbalanced
draft save/reload, zero draft reservation, mismatched submission rejection,
balanced submission with repeated budget items, full reservation, and read-only
Check all passed. Evidence and actual fixture IDs are in
`creator/workflows/purchase-orders/native-results.json`. The isolated Development
PO is `4410926000005121026`; it reserves $3.01. Production was not changed.

The owner approved Creator's supported maximum: Currency Max Digits **16**, two
decimal places, maximum **9999999999999.99**. That boundary persisted exactly in
native probe `4410926000005117756`. The earlier 19-digit failure is historical,
and no longer blocks persistence.

All shared configuration, resolver, and submission snapshot functions compile in
Development. Native List and audited SaveRole readback passed. User Access has
`Approval_Routing_Enabled`, initially off, with descriptive help text explaining
routing, notification email, and the permissions it does not grant.

Confirmed PO rules: no submitter self-approval; different people for each step;
COO applies only when a specific modification is linked to the PO; rejection
retains reservation; resubmit resets decisions and keeps notes. The new
`Payment_Request.PO_Budget_Modification` lookup and dependent functions compile,
and old receipt Check remains compatible. The default PO chain remains TBD.
Super administrator/CFO override authority was tentative; no new grant was made.
The approved test address is exactly `rbellivea@wbdevelopment.com`.

Native draft edit, a specific linked modification, full reload, balanced submit,
reservation and read-only recovery also passed for PO `4410926000005121122`.
The Vendors action returns only vendor IDs and names through the PO API.
The four Budget/Modification/Pro Forma initiation hooks compile in Development;
existing decision and email handlers retain their prior execution behavior.

Budget Manager **122.29.5** and Settings Manager **1.4.1** are validated immutable
candidates. Full repository validation passed. The owner now requests the PO
screen in the existing Budget widget, without any Creator widget registration
change. The existing stable loader already routes the Development release using
Creator initialization. Publish only the Budget Development mapping; preserve
current Stage/Production and all other widget mappings from latest main.

Still outstanding: actual native widget save/submit proof, PO default approval
chain (TBD), Contract sequential execution, positive shared-route native tests,
and notifications. Profile testing and permission changes are deferred at the
owner's direction. No main push, Stage/Production Creator publication or email
has occurred. Do not describe the whole task as done.

## Earlier implementation notes (historical; deployment status below is superseded)

## Delivery status â€” 2026-10-08

Rebuilt on `feature/multi-item-purchase-orders` from remote main
`9b51f0aa0ad6c0dd985d630c1703d25557d72879`. The referenced original commit and
branch were absent from the remote. This implementation is a review candidate;
it is **not an enabled end-to-end Creator deployment**.

Immutable frontend candidates: Budget Manager **122.29.2**, Settings Manager
**1.4.0**. Existing Development, Stage and Production mappings remain unchanged.
No main push, frontend promotion, Stage/Production publication, approval email,
or financial PO submission occurred.

## Blocking native currency evidence

The required native Currency Max Digits 19 / Decimal Places 2 contract failed in
Creator Development. The property editor caps Max Digits at 16, and the schema
parser rejects 19. Exact Deluge conversion succeeds, but native Currency
write/readback rounds `9999999999999999.99` to `10000000000000000.00`.

Two isolated `PO_Currency_Probe` rows preserve this evidence:

| Row ID | Input to Currency | Expected | Readback |
|---|---|---|---|
| `4410926000005117247` | `exact.toDecimal()` | `9999999999999999.99` | `10000000000000000.00` |
| `4410926000005117249` | exact string directly | `9999999999999999.99` | `10000000000000000.00` |

The second probe also returns `converted` exactly, distinguishing the Currency
write/readback problem from input conversion. This does not establish the
physical database's internal representation. See
[native-results.json](../workflows/purchase-orders/native-results.json) and
[the native result screenshot](../workflows/purchase-orders/evidence/po-currency-storage-failure.jpg).

`managePurchaseOrder.dg` contains an explicit `nativeCurrency19Verified = false`
gate before all Save/Submit persistence. Do not remove it based on local tests.
The owner must choose between resolving Creator's required 19/2 behavior,
approving authoritative exact text/cents with currency only for display, or
approving a smaller range backed by native boundary tests. Neither alternate
contract has been approved. Planned schemas retain 19/2 rather than silently
downgrading the requested design. The installed PO_Item currency fields are
16/2 diagnostic scaffolding, not compliant production persistence.

## Frontend behavior implemented and tested

- Purchase orders use a header plus 1â€“100 complete lines, repeated Budget Items,
  Cost Element strings 1â€“5, searchable pickers and a custom date picker.
- Exact decimal strings and BigInt cents cover the required boundary. Calculated
  lines multiply positive Quantity (up to six fractional places) by Unit Price,
  rounding once to cents. Manual mode clears both values to true null and makes
  their controls read only.
- Draft allows complete unbalanced lines and reserves zero. Submit requires the
  exact header sum and groups repeated items for full reservation. Legacy
  single-item commitments count once; GP Actual remains reference-only.
- Operations capture immutable payloads, block duplicates and dismissal while
  writing, and verify every header/line field. Unknown responses retain the
  operation and expose read-only Check; Check never resends business data.
- Submitted records render read only. Development alone uses the new editor;
  existing Stage/Production Check/Wire/PO behavior remains on the deployed code.
- Settings approval administration provides Roles, Assignments, versioned
  Policies, ordered/conditional steps, Preview, and expanded before/after audit.
  Published policies clone into a new Draft version. No default PO chain or COO
  threshold is invented. Adapters default disabled.
- Routing precedence is Territory+Department, Territory, Company+Department,
  Company, with inclusive start/exclusive end windows. Missing, inactive and
  ambiguous assignments fail; routing uses User_Access IDs and Approver_Email.
  Threshold operators `>` and `>=`, self-approval and duplicate-person rules are
  explicit. Snapshots detach the selected policy/version/people/reasons.

## Source and native installation inventory

See the machine-readable native results for the current installed inventory.
The PO exact currency, multiplication and payload validation helpers compiled
and ran in Creator. The remaining PO persistence/balance/snapshot functions and
the modified `manageBudget` deletion guard are source candidates, not native
compiled deployments. Shared approval function sources are also uncompiled.

All six shared approval forms have verified fields in a fresh Development
builder: Role (2), Assignment (8), Policy (13), Route Snapshot (9), Audit (8),
Lock (2, required unique Lock_Key). No roles, assignments, policies or published
routes were seeded. User_Access.Approval_Routing_Enabled is still a planned
default-false addition: full-schema IDE saves did not persist it, including
placement in the existing Defaults section. Its pre-change schema and proposed
addition are backed up under `creator/workflows/approval-policies/`. The native
shared helper sources depend on this field and remain uncompiled. Direct native
configuration/report permissions and
immutability guards must be verified before activating any adapter.

Proposed Custom APIs are not registered. Configure OAuth2 and initially **Admin
only**, POST, argument mode **Key and Value**, with string argument `payload`.
The widget supplies `{payload: JSON.stringify(businessPayload)}`. Entire JSON
mode would pass a nested wrapper and violate this function contract. Verify
OAuth caller identity using different native users before widening PO access;
do not treat a client-posted User_Access ID as authentication proof.

Dependency order is recorded in each workflow schema manifest. Preserve the
existing Payment_Request Check/Wire required fields until conditional
validation is installed and proven. Managed multi-item PO accounting fields
remain null: the accounting-code formula is explicitly TBD.

## Native gates still required

1. Resolve/approve the currency contract and prove persisted header/line
   boundaries, nulls and whole-revision readback.
2. Install and compile remaining schemas/functions in Development; verify every
   field from a fresh native builder rather than the IDE's current buffer.
3. Prove unique-key/phase-lock enforcement, same-token retry behavior, stale
   revision rejection, two-user overdraw prevention, and interruption after each
   separate child/header/receipt write. There is no cross-record atomicity claim.
   Retain unresolved locks; never expire, steal, replay or auto-delete them.
4. Prove authenticated permissions, phase eligibility, Check/Wire compatibility,
   existing/legacy commitments, manual nulls, over-budget repeated items and GP
   reference behavior using native records.
5. Confirm PO approval chain and threshold/operator, self/multiple-role rules,
   rejection reservation, edit/resubmit rules, reassignment/cancel/override
   authority, and an approved test notification recipient.
6. Complete each existing workflow migration below and its native regressions
   before enabling adapters. Verify Settings Preview against native resolution.

## Development installation and later publication order

1. Export current live components and permissions. Resolve the currency gate
   before changing the parent required fields or enabling PO mutation.
2. Create PO_Operation and PO_Phase_Lock with required unique keys; finish the
   compliant PO_Item and Payment_Request fields. Verify native lookup targets,
   full precision, conditional Check/Wire requirements and exact text mirrors.
3. Compile poCurrencyString, poMultiplyExact, poValidatePayload, poSnapshot,
   poBudgetBalances, managePurchaseOrder, then the manageBudget deletion guard.
   Install native mutation/report guards only after proving that approved
   programmatic writes remain possible and unmanaged edits cannot bypass them.
4. Register the Development PO API with the mapping described above. Keep
   owner-only access until native caller identity, phase-read permissions and
   two-user mutation permissions are proven. Complete all native PO gates before
   promoting the Development widget candidate by a new explicit instruction.
5. Persist and verify the default-false User Access routing flag, then compile
   resolveApprovalRoute, approvalConfigurationSnapshot, snapshotApprovalRoute,
   manageApprovalPolicies. Register the owner-only Development administration
   API. Verify audited mutations, unknown Check, native Preview parity,
   publication immutability and direct-report guards.
6. Migrate one existing workflow at a time, using its existing execution history.
   Enable its adapter only after native rejection, finalization, permissions and
   approved-recipient tests pass. Connect PO approvals only after persistence
   works and financial transition rules are confirmed.
7. Stage and Production publication belong to the owner. Re-run native gates in
   each target environment before mapping its frontend/API; source candidates
   and local fixtures alone do not authorize or prove publication readiness.

## Existing approval migration matrix

| Workflow | Existing behavior inspected | Migration state and regression gate |
|---|---|---|
| Budget | `startApprovalChain`, existing Budget_Approvals, locked tracks, Pending/Approved restart checks, Development/Engineering finalization | Not migrated. Snapshot route into existing execution model; preserve rejection, notifications and both finalization tracks. |
| Budget Modification | create/submit routines with existing VP/CFO and conditional COO logic | Not migrated. Preserve amount/budget updates and rejection semantics; confirm threshold and test recipient before replacing routing. |
| Pro Forma | Start_Proforma_Approval_Chain, Budget_Approvals.Proforma, Pending Approval locking, first notification, rejection reset | Not migrated. Preserve VP rejection reset and existing status/finalization behavior. |
| Contract | Send_Contract_Approvals and Contract_Approvals, current Awaiting Approval rows/notifications and rejection/final approval workflows | Not migrated. Current parallel dispatch requires an execution adapter for ordered routes; swapping recipients alone is insufficient. |
| Purchase Order | No established new multi-item approval chain | Not configured. Submitted reservation/approval transitions must follow owner-confirmed rules. |

Published configuration and immutable route snapshots do not create a second
decision history. Existing Budget_Approvals and Contract_Approvals remain the
execution records for their workflows. No existing workflow has been switched.

## Validation and browser evidence

`npm run validate` and `npm run build:pages` passed. Four focused suites are part
of standard validation: exact PO domain, PO controller/recovery, routing policy,
and approval-admin receipt verification. Existing payment-request tests cover
Development grouped balance receipts and malformed/missing/unsafe responses.

Browser fixtures use the real candidate modules with an in-memory fake service,
not Creator persistence. They proved: one-cent Submit mismatch sends zero
writes; Draft saves complete unbalanced lines; repeated Calculated+Manual rows
reload exactly; balanced Submit becomes read only; Escape/close are blocked
during writes; lost-response Check verifies without a second write; Preview
normalizes whole-dollar input; published clone/new Draft/audit details work.
Fixture people use `.invalid` email addresses and no outbound notification code.

Native helper tests proved exact multiplication, boundary conversion, repeated
item grouping, Draft/Submit distinction and invalid transport/null rejection.
They do not prove native full PO persistence, concurrency, approval execution or
financial workflow regressions. Screenshots are in
`creator/workflows/purchase-orders/evidence/`.

## Rollback and recovery

No promoted frontend mapping needs rollback. If a candidate is later promoted,
use the recorded previous immutable release for that environment and verify its
manifest mapping; do not rewrite these candidate directories. Restore Creator
functions/forms from verified pre-change exports before enabling old workflows.
Current live-before backups include Payment_Request, Budget_Item and
Budget_Modification; take fresh exports of all other changed components first.

Do not delete unresolved PO_Operation/PO_Phase_Lock or approval audit/lock rows.
Reconcile actual parent pointer, all revision children, intended payload and
receipt under owner review before any unlock. Preserve orphan revisions as
evidence. Diagnostic currency rows can remain in Development; removing them is
optional cleanup after evidence is preserved. Never publish scaffolding to
Stage/Production as a completed feature.
