
# Contract Management

Contract management and token-based LOI legal review.

Release `1.61.18` reduces the pricing-only black success confirmation another
10%. Colors, scope and behavior remain unchanged. No Creator deployment.
[Changes and rollback](../../knowledge/modules/contracts.md#pricing-confirmation-reduced-another-10-16118).
Rollback Production to `1.61.17`.

Release `1.61.17` reduces the black pricing-save confirmation by 30% after user
review. Scope, colors, behavior and dismissal remain unchanged. Frontend only;
no Creator deployment. [Changes and rollback](../../knowledge/modules/contracts.md#pricing-success-banner-reduced-by-30-16117).
Rollback Production to `1.61.16`.

Release `1.61.16` removes the initial yellow pricing flash while selected Lot
sizes load, preserves the originating screen after pricing saves and uses a
larger black success banner for that pricing-save confirmation only. Other
success banners await user verification before adopting this style. Frontend
only; no Creator deployment. See [regression and rollback](../../knowledge/modules/contracts.md#pricing-loading-retained-screen-and-scoped-success-banner-16116).
Rollback Production to `1.61.15`.

Release `1.61.15` adds the optional Escalator % input to creation and Change
Lots & Pricing rows. Enter `5` for 5%, with up to two decimal places. Existing
Contract Pricing and null-only Lot propagation are retained; populated Lot
escalators, including zero, stay unchanged. Frontend only; no Creator deployment.
See [regression and rollback](../../knowledge/modules/contracts.md#escalator-in-shared-lot-pricing-rows-16115).
Rollback Production to `1.61.14`.

Release `1.61.14` replaces the lot-completion text list with the Clear summary
confirmation and removes the sentence below the heading. It separates contract
pricing, completion outcomes, preserved values and expandable eligibility rules,
while retaining fresh preflight checks and the existing completion/progress path.
Frontend only; no Creator deployment. See
[regression and rollback](../../knowledge/modules/contracts.md#clear-lot-completion-confirmation-16114).
Rollback Production to `1.61.12`.

Release `1.61.12` restores normal request timing by removing the artificial
per-minute budget. Exact saved-data checks, max-three concurrency, actual
Creator throttle handling, live audit and five-second confirmation remain.
The accepted test contract is left for the user to test. See
[regression and rollback](../../knowledge/modules/contracts.md#normal-request-timing-16112).
Rollback Production to `1.61.11`.

Release `1.61.11` fixes the native creation failure caused by verifying a parent
Current Action value that Creator's on-success workflow clears. Creation keeps
the captured editor and live audit visible after confirmation. It also finishes
creation from the exact verified setup ledger, removes
the unbounded whole-report refresh, bounds extra setup reads, and adds an
accessible live audit with elapsed time, verified counts and Creator queue waits.
The save footer wraps on narrow screens. See [diagnosis, regression and rollback](../../knowledge/modules/contracts.md#creation-settlement-and-live-audit-16111).
Rollback Production to `1.61.8`.

Release `1.61.8` uses stacked Initial / Second / Cont'd closing summaries, matches
subdivision preview fonts, confirms verified creation with a prominent five-second
green banner, and accepts verified deletion despite inconsistent reply IDs.
See [regression and rollback](../../knowledge/modules/contracts.md#closing-summaries-creation-confirmation-and-delete-feedback-1618).
Rollback Production to `1.61.6`.

Release `1.61.5` uses action-button feedback for routine create/save, keeps
read-only Check status and the captured verification ledger for unknown writes,
and retains one diagnostic email attempt on failure. Completion opens immediately
with a disabled Checking action while fresh details are verified. Exact selected
Lot reads are batched, and closing cards are compact with Copy to Subsequent in
the section heading. No backend change is included. See
[regression and rollback](../../knowledge/modules/contracts.md#save-feedback-and-completion-readiness-1615).
Rollback both Contract Development/Production mappings to `1.61.4`.

Second Closing baseline: `1.61.4`. Initial, Second and Subsequent Closing terms
are edited together, with an explicit copy from Second to Subsequent. Existing
schedules remain independent of later Contract edits. See the
[implementation and activation handoff](../../docs/second-closing-handoff-2026-10-05.md).

Release 1.60.54 uses compact Contract creation progress and distinguishes a
verified created contract from unfinished setup. Verification failures name only
the affected fields in diagnostics; writes and backend workflows are unchanged.
See [diagnosis, regression and rollback](../../knowledge/modules/contracts.md#compact-contract-creation-and-setup-diagnostics-16054).

## Baseline

- Version: `1.0.0`
- Original upload: `Contract_Management_Widget_LOI_Review_tokenId (1).zip`
- Extracted source: `src/`
- Immutable original: `baseline/Contract_Management_Widget_LOI_Review_tokenId (1).zip`
- Initial external release: `../../releases/contract-management/1.0.0/`

The extracted source is intentionally preserved as a monolithic Creator widget baseline. Do not refactor it merely to make it look cleaner. Establish behavioral tests first, then make targeted changes.

## Entry points

- Creator package entry: `src/app/widget.html`
- External-hosting entry after release: `index.html`
- Creator package manifest: `src/plugin-manifest.json`

## Creating contracts (1.12.0)

`+ New Contract` opens an in-widget form that mirrors the Contract Info section of
Creator`s Add Contract form, including the six Lot-only fields that form reveals
when Type is `Lot`. The record is written with `createRecord(CFG.forms.contract, ...)`.

Because a Data API create never loads a form, the two `on load` workflows that
normally populate a new contract do not run. The widget therefore seeds the rows
itself after the insert:

- 7 `Contract_Actions` rows, the first flagged `Current_Action`
- 2 `Contract_Approvals` rows at `Not Sent`, reminder interval 5
- `Contract.Current_Action` pointed at the first action title

`ncActionSeed()` / `ncApproverSeed()` prefer live template rows fetched from
`All_Contract_Actions` / `All_Contract_Approvals`, and fall back to the
`DEFAULT_ACTIONS` / `DEFAULT_APPROVERS` constants. Neither report returned template
rows when checked in production on 2026-08-22, so the constants are the live path.
If Legal edits the templates in Creator, update those constants.

`Subdivision1` is a multi-select lookup that had never been written from a widget.
`ncFixSubdivision()` verifies the exact saved ID array and, when necessary,
captures one repair in the creation ledger before reading it back. An uncertain
repair supports read-only status checking; it never tries another encoding or
replays the write automatically.

The footer`s `Creator form` button is the escape hatch back to the native form.

## Project and staged Lot entry (1.60.45 candidate)

Project lookup and staged Lot entry are updated in candidate 1.60.45: Masters require Project; Amendments derive Project from Subdivision. Territory and the matching same-Project/same-Builder Master appear in the title card. See [the Contract module guide](../../knowledge/modules/contracts.md) for progressive entry, required report columns, verification and rollback.

## Action templates (1.13.0)

Release 1.60.53 keeps the Actions panel visible immediately after choosing Lot (Master) or Lot (Amendment), including before location, Builder and name are complete. Checked-template membership, seeding and the staged lot fields retain their existing behavior.

`Manage Actions` (third tab beside Contracts and LOI Reviews) edits the checklist a
new contract of each type is seeded with. A template is a `Contract_Actions` row
with `Type_field` set, `Template_Action` true, and no `Contract1`.

On 2026-10-05, Robby confirmed checked Template Action records are eligible
templates. Current native Development metadata confirms the `Template_Action`
checkbox and `Contract_Action` text field. The widget now requires the checked
flag, a nonblank `Type_field` and no `Contract1` in every template membership
path. A typed ordinary action orphaned from its contract is not a template.
The removed `Contract_Template` field no longer determines action eligibility.
The separate Builder approval predicate is unchanged.

Reads use complete counted cursor scopes and validate every returned checkbox,
type and parent field before selecting templates. Missing or malformed current
fields show **Action templates unavailable**, retain existing checklist/template
drafts and block template saves or new-contract creation. An empty template for
a type is reported only from a verified current scope. The existing Master/old
Lot fallback remains. Generic defaults remain only when complete returned rows
prove the genuine old schema (`Contract_Template`, with neither current field);
partial/mixed schema and an empty report never imply that legacy policy.

The optional new-contract template read keeps a separate verified snapshot with
actor/environment and load-generation guards. It does not replace ordinary
action records or active drafts. Failed, incomplete or denied reads retain the
last snapshot as unavailable; a successful complete retry can restore the seed
without deleting an existing custom checklist. No automatic business write is
performed by loading or retrying templates. Creator schema/report publishing
remains with Robby; this frontend does not publish backend changes.

Regression: `node scripts/test-contract-sdk-v2-scopes.mjs` verifies exact IDs
through `templatesFor`, `ncSeedSource` and `maBaseline`, checked native values,
false flagged orphans, saved contract actions, missing/malformed fields, legacy
versus unknown capability, 2,001-row pagination, incomplete/denied scope recovery,
retained drafts and no load mutations. Release 1.60.52 passed its native
Dev and read-only Production list/template/seed checks; see the
[final evidence](../../docs/final-refactor-decisions-2026-10-05.md).
Rollback is Legal 1.60.51 through the stable environment mapping.

The create modal asks for Type first and shows nothing else until it is set, then
lists exactly the actions that will be created and names their source.

## Common commands

```bash
npm run validate
npm run package:creator -- contract-management
npm run release -- contract-management <new-version>
npm run build:pages
```

## Action popovers and Legal assignment filter (1.60.1)

The three inline action dates keep `type=date` inputs as their persisted value carriers, but
the date-cell wrapper is now the only interactive target and opens the widget quick-date
popup. Searchable combos remain attached to their trigger while the surrounding Contracts
view scrolls. Contract list counterparty pills occupy a fixed subcolumn within Contract Name.
The Review toolbar's Assigned to me pill filters pending LOIs, proposed contracts/actions,
and waiting approvals using their existing assignment fields; it does not change the global
Review badge.

## Send for Approvals (1.60.0)

The Internal Approvals modal's **Send for Approvals** button calls the Custom API
`Send_Contract_Approvals` (Development: `Send_Contract_Approvals_DEV`, resolved by
`runtime-context.js`) with a JSON POST body `{"contractId":"…","user":"<bare Creator username>"}`.
Both APIs expose the Deluge function `string Send_Contract_Approvals(string contractId)`
(`creator/functions/Send_Contract_Approvals.dg`), which sends the styled email from
`Send_Contract_Approval_Email` to every approver whose Email switch is on and who is still
Not Sent, attaches every Contract_Version flagged `Email_Attachment`, flips those rows to
Awaiting Approval, stamps `Last/Next_Reminder_Date`, and moves the contract to Awaiting
Approvals. The daily `sendApprovalReminders` job re-sends the same email when a row's
`Next_Reminder_Date` arrives. The button is enabled only when at least one approver is
pending (Email on, Not Sent) and at least one file is attached; the function enforces the
same rules server-side plus `User_Access.Edit_Contracts` for the caller.

## Routine success feedback (1.61.19)

Uses the shared [success-feedback guide](../../knowledge/design/success-feedback.md). Existing inline green verification and progress/result dialogs remain. Routine confirmations describe the actual completed action; inline saves are grouped without delaying writes. Frontend only; no Creator deployment is required.
# Parent Contract — 1.61.22

Parent assignment is available for every type from the expanded left panel,
detail header, three-dot menu, and new flow. Contracts with children display a
counted Master badge and cannot be assigned parents. Lot Amendment matching
remains same-Project/same-Builder Lot Masters. Native deployment and rollback:
[Parent Contract assignment](../../docs/contract-parent-assignment.md).

## Parent-led creation — 1.61.25

Compact Parent (Optional) follows Type, inherits Territory/Counterparty read-only, and restores prior draft values when cleared. Status is a title-row pill. Lot Amendment matching and existing relationship-only edits remain intact. Regression, affected fields and rollback: [Parent flow](../../docs/contract-parent-assignment.md#earlier-parent-flow--16125).

## Lot availability checks — 1.61.29

Picker opening refreshes scoped Lots and all Contract claims. Both Contract.Lots1
and foreign Lots.Contract1 associations block selection and save; exact own links
remain valid. Missing association fields fail closed, direct and block selection
recheck eligibility, and overlapping reads can only publish the latest refresh.
Existing sold-lot completion protection and daily schedule assignment remain unchanged.
Frontend release only; no Creator deployment is required. Verification, affected
fields and rollback to 1.61.26: [lot safety audit](../../docs/contract-lot-selection-safety-2026-10-07.md).

## Attachment uploads in the existing workspace (1.61.29)

Contract attachments accept either documented root or data file receipts and
keep exact saved child/parent/path verification. Uploads now show a spinner and
inline errors/Check status in the original mounted attachment modal; the extra
Contract-fields dialog is removed for file batches. Native failure causes remain
visible, and read-only create recovery repeats the email-flag predicate. Pending
requests, duplicate guards and unknown/no-replay behavior remain. No Creator
deployment is needed. See [diagnosis, regressions and rollback](../../docs/contract-attachment-upload-response-2026-10-07.md).

## Saved attachment reconciliation (1.61.30)

After a settled unrecognized/lost FILE reply, automatically verify the exact saved
child and parent/file before reporting failure. Never replay an upload from that
check. Contract uploads preserve the Email switch without requiring it to be on;
Budget phase rows omit the direct Approvals shortcut and reserve space for their
remaining controls. No Creator backend deployment is required. See
[regression evidence and rollback](../../docs/attachment-upload-reconciliation-2026-10-07.md).
