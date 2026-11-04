# Contract Development VP Defaults

The owner requested Development approvals for future Legal contracts to use
the contract Territory's VP users, including both selected VPs when a Territory
has two. Retain Travis Parks and other manually configured approval recipients,
and retain sent approvals and completed decision history. North and South Austin
therefore resolve to Brian Bekker using his existing `User_Access.Approver_Email`.

The Production Settings page has a published Contract rule: all territories,
all departments, one enabled VP step with condition Always. Saving that rule
alone does not connect the Contract execution rows. Remote-main source was
checked at `1e696f787aad79f861804b7d9574e3af32f9afd5`: Contract creation still seeds
the Builder template, and Contract dispatch still uses existing rows in parallel.
`applySharedApprovalPolicy` does not support Contract.

## Native Installation

Install and compile these functions in Development, comparing any live changes
before replacing source. The user explicitly authorized the agent to install,
test and promote these Creator changes; verify Development before promotion.

For the native Contract form, verify that Settings.Builder_Approval_Template
selects the intended existing parentless Builder template rows for Travis Parks
and the reserved Paul Shepherd Development marker. An empty selection produces
no default rows for the adapter to replace. Keep the marker in the template;
the saved contract's Territory determines its VP recipients. Do not replace it
globally with Brian or create additional Builder template rows to repair a
selection. The widget independently reads all parentless Builder template rows.

The existing Created → On Load workflow Load_Approval_Template_Co clones rows
into input.Approvals1; it does not attach template record IDs. Its captured body
copies only Approver and Approval_Sequence. Verify Type1 before native-form
submission: it is required and has no initial default. If omitted, the minimal
loader correction is to copy the selected template's Type1. Keep the existing
Construction exclusion, and do not clear/reseed the subform. Email remains off,
Status defaults to Not Sent and reminders default to five days.

1. Update `resolveApprovalRoute` from `creator/functions/resolveApprovalRoute.dg`.
   Only Contract expands all unique `Territory.VP` users. Every other workflow
   retains exactly one VP. Existing routing-enabled, login and email checks remain.
2. Create the private map-returning function `applyContractDevelopmentDefaults`
   with one string argument, `contractId`, from its matching `.dg` source.
3. Update `Send_Contract_Approvals` and `Send_Contract_Approval_Email` from their
   matching `.dg` sources. They block a fresh send of the unresolved legacy
   Development default. They do not mutate or reroute submitted approvals.
4. On the existing **Contract** form, add a **Created → Successful Form
   Submission** action after native template seeding:

   ```deluge
   developmentDefaults = thisapp.applyContractDevelopmentDefaults(input.ID.toString());
   if(developmentDefaults.get("success") != true)
   {
       info developmentDefaults.get("message");
   }
   ```

5. On the existing **Contract_Approvals** form, add a **Created → Successful Form
   Submission** action for widget Data API child creation:

   ```deluge
   if(input.Contract1 != null)
   {
       developmentDefaults = thisapp.applyContractDevelopmentDefaults(input.Contract1.ID.toString());
       if(developmentDefaults.get("success") != true)
       {
           info developmentDefaults.get("message");
       }
   }
   ```

Use a created-only event for both hooks. Do not add either hook to approval
decision edits. Direct Deluge inserts do not recursively run the child form's
successful-submission workflow. No new form, field, report or Custom API is needed.

## Scope and Recovery

The legacy `pshepherd@wbdevelopment.com` template recipient is the Development
slot marker. There is no existing Type1 value that means Development: Type1
must remain unchanged. The helper replaces only untouched Not Sent markers,
retaining their type, sequence, reminder interval and Email switch. Extra VPs
receive rows at the same Development sequence because Contract dispatch remains
parallel. Travis Parks and every other template recipient remain unchanged.

Construction, archived and terminal Rejected/Cancelled/Complete parents are
excluded. Any sent, awaiting, approved, rejected or responded row causes the
existing chain to be retained. The helper never changes parent status, sends
mail, deletes a row or detaches a row. An Approved parent with no sent/decision
evidence may be the existing child workflow's temporary all-Not-Sent result
during widget creation; child history is the guard. The widget retains its
existing final parent-status save.

The published Contract rule must resolve only VP steps. Missing VPs, missing
routing email/login, disabled people, duplicate emails, duplicate legacy slots,
or a duplicate first VP row fail before source updates. Additional VP rows are
inserted before replacing the marker, and an existing extra VP row with the
same parent/type/sequence is reused. A stopped execution can be rechecked and
retried without repeating those extra rows. Do not automatically retry an
ambiguous native execution.

Creation-hook failures are logged, and unresolved markers are blocked by the
fresh-send guard with an actionable message. Reminders and submitted recipients
remain unchanged. The helper is not a backfill tool for Awaiting Approval rows;
that requires a separate reviewed, explicit migration preserving old decision
and delivery evidence. Normal report edits can run status/decision workflows,
so they are unsuitable for that migration.

## Verification and Rollback

Local policy checks cover two VPs, duplicate selected IDs, unique keys, inactive
second VP and missing VP, with unchanged single-VP behavior for other workflows.
Contract hierarchy checks cover Legal and Construction pill removal while
preserving child rows, grouping and parent-assignment guards. Full repository
validation and the Pages build passed for the 1.62.52 candidate.

The resolver, default adapter, two send functions and both created-only hooks
have been saved in Development. A native parent-hook test retained Status New,
Travis Parks and untouched approval history. Development widget creation and
immediately reopened approval-list verification are still pending. Verify North/South Austin, a two-VP territory, missing/invalid VP data,
unchanged other recipients, no emails, no changed parent status, retained sent
history and retry after an interrupted extra-recipient insert. Do not send live
approval emails just to test installation.

Verify the widget's approval list immediately after creation as well as the
persisted rows. Creation hooks can add another VP row outside the widget's
captured seed operations. Hosted Contract 1.62.52 addresses the cache gap with a fresh exact-parent
approval read on modal open and before Send confirmation. Failed/pending reads
keep Send disabled; no writes or emails occur during refresh. Verify the actual
native hooks and immediately opened widget together before promotion; a
successful function return alone does not establish that recipients are current.

Native installation, live verification and Creator promotion are separate
requirements. The Settings rule is saved, but future-contract routing requires
the verified helper, resolver, created-only hooks and send guards in Production.
Existing Production approval reassignment is a separate data migration; the
hosted/source release does not perform it.

Live migration status on November 3: 20 existing approval recipient rows were
reassigned. Four additional Bryan/College Station VP rows were created and
confirmed by a subsequent read-only recovery: all four exact rows were reused,
with no blocked parents or duplicate POST. The future-contract adapter remains subject to the separate
Creator installation, verification and promotion gates above.

Hosted Contract Management rollback is `1.62.51`; hosted Settings rollback is
`1.6.6`. Roll back the matching Creation hooks and native functions together if
the Creator change is withdrawn. Hosted pill removal is independent of Creator.
