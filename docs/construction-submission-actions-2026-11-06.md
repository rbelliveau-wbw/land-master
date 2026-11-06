# Construction template actions on submission — November 6, 2026

Construction requests receive their template checklist when submitted, while
the request remains **Pending Review**. Acceptance promotes the request and its
Proposed actions to New. Hosted release: **Contract Management 1.62.53**.

## Diagnosis and implementation

The prior behavior was intentional: submission saved only a Proposed Contract,
and `constructionReviewRun` seeded templates on acceptance. The two empty
Production requests were still pending. The user chose to move checklist
creation to submission.

Submit-only users cannot directly create Construction actions. Keep
`Construction_Contract_Actions_Validation` and the request validation's existing
editor-only action guards. Instead, extend the existing Contract **on add / on
success** workflow `Refresh_on_Submit_New_Con` to insert trusted template rows
before its existing parent refresh.

The workflow handles only Construction requests with one of the four existing
budget types. It copies checked, parentless Construction templates matching
the request's `Contract_Type`, in `Sort_Order`, skipping blank titles. Children
receive the exact parent ID, Construction classification, matching type,
`Template_Action=false`, sequential order, `Status=Proposed`, `Complete=false`,
and the first `Current_Action` flag. The parent stays Proposed. Existing
checklists are skipped rather than duplicated or replayed after a partial save;
a type without templates remains empty.

The widget continues using the native parent create, so a successful create
without an echoed parent ID remains successful. There is no client-side replay
or separate submitter action-write permission. Acceptance promotes existing
Proposed children to New and retains its fallback for older requests with zero
actions. Legal templates, approvals and request behavior are unchanged.

## Existing Production requests

The browser backfill added the current type's 11 template action titles to each
previously empty request, preserving Pending Review:

| Request | Contract ID | Added actions |
|---|---|---:|
| Cameron Ranch - Phase 01 · Internal budget | `4410926000005845002` | 11 |
| Turnbo Ranch - Phase 09-BR · Offsite budget | `4410926000005843002` | 11 |

This was a targeted repair, not a bulk migration. Existing accepted checklists
were preserved.

## Deployment and affected components

Source: `creator/workflows/Refresh_on_Submit_New_Con.dg`; schema/deployment
inventory: `creator/schema-changes/construction-tasks.json`. The widget's
post-create display refresh is separate from the native checklist creation.

Affected existing fields are `Contract.ID`, `Work_Module`, `Contract_Type` and
`Status`, plus `Contract_Actions.Contract1`, `Work_Module`, `Type_field`,
`Template_Action`, `Contract_Action`, `Sort_Order`, `Status`, `Complete`,
`Current_Action` and `Added_User`. No schema field, permission or Custom API is
added or changed. Submitter action-edit denials remain in force.

Creator installation and live verification must be recorded separately from
the hosted release. The existing workflow was saved and independently
reopened in Development without compile errors. In a submit-only
`demouser_1` preview, **DEV QA Submission Templates 2026-11-06** saved with one
Proposed action from Development's current one-action Internal template. After
display Refresh, the parent remained Pending Review and action editing controls
were disabled. Construction editor `demouser_4` then accepted that same fixture.
The result showed both saves completed: the existing action's status and the
parent's final status. The request became New with exactly one current New
action (`Actions 0 / 1`), confirming acceptance did not seed a duplicate.

Production Creator publication remains the user's step under the PMP
instruction. A GitHub Pages promotion alone cannot activate the native
workflow in Production.

## Verification and rollback

Focused checks cover template module/type/flag/parent selection, ordering,
Proposed children and parent retention, first-current selection, empty
templates, existing checklist preservation, submit-only edit denial,
acceptance without duplicates, native errors and lost-reply no-replay guards.
Run `node scripts/test-construction-submission.mjs`,
`node scripts/test-construction-schema.mjs`, the Contract SDK suite,
`npm run validate` and `npm run build:pages` before release. Fixtures do not
replace native Development submission and acceptance checks.

The focused submission, schema and whole-widget Construction checks passed.
They include existing Proposed-child acceptance without duplicate actions and
late display replies after a newer action save or navigation change. Required
`npm run validate` and `npm run build:pages` passed locally. Validation used the
bundled Python runtime because the system Python command is an app-store alias. The focused
submission check is included in the package's prevalidation chain.

Native rollback restores `Refresh_on_Submit_New_Con` to its prior sole action:
`openUrl("#Script:page.parent.refresh ","parent window");`. Hosted rollback
maps Contract Management to `1.62.52` and rebuilds Pages. Keep already created
actions and requests; acceptance can use them normally. Do not delete business
records or reverse the targeted backfill as part of rollback.
