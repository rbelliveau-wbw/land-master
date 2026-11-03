# Contract Development VP Defaults

The owner requested Development approvals for future Legal contracts to use
the contract Territory's VP users, including both selected VPs when a Territory
has two. Retain Travis Parks and other manually configured approval recipients,
and retain sent approvals and completed decision history. North and South Austin
therefore resolve to Brian Bekker using his existing `User_Access.Approver_Email`.

The Production Settings page has a published Contract rule: all territories,
all departments, one enabled VP step with condition Always. Saving that rule
alone does not connect the Contract execution rows. Remote-main source was
checked at `ae91088b17ca8562ae3225aa8f38ebc2c1def761`: Contract creation still seeds
the Builder template, and Contract dispatch still uses existing rows in parallel.
`applySharedApprovalPolicy` does not support Contract.

## Native Installation

Install and compile these functions in Development, comparing any live changes
before replacing source. Creator promotion remains with the owner.

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
validation and Pages build remain release gates.

Native compilation and created-only hook execution must still be verified in
Development with a representative native-form contract and a widget-created
contract. Verify North/South Austin, a two-VP territory, missing/invalid VP data,
unchanged other recipients, no emails, no changed parent status, retained sent
history and retry after an interrupted extra-recipient insert. Do not send live
approval emails just to test installation.

Verify the widget's approval list immediately after creation as well as the
persisted rows. Creation hooks can add another VP row outside the widget's
captured seed operations. The immediately reopened modal can retain the legacy
Paul recipient or omit the extra VP until Refresh. A fresh scoped approval read must expose every
resolved recipient before the first send; a successful function return alone
does not establish that the in-widget list is current.

Native installation, live verification and owner promotion are separate
requirements. The Settings rule is saved, but future-contract routing requires
the verified helper, resolver, created-only hooks and send guards in Production.
Existing Production approval reassignment is a separate data migration; the
hosted/source release does not perform it.

Live migration status on November 3: 20 existing approval recipient rows were
reassigned. Four additional Bryan/College Station VP rows still require a
verified import. The future-contract adapter remains subject to the separate
Creator installation, verification and owner-promotion gates above.

Hosted Contract Management rollback is `1.62.49`; hosted Settings rollback is
`1.6.6`. Roll back the matching Creation hooks and native functions together if
the Creator change is withdrawn. Hosted pill removal is independent of Creator.
