# Legal and Construction tasks

Construction requests share the Contract Management widget and the existing
`Contract` request records, `Contract_Actions` checklists/templates, `Attachment`
files, and comment system. This adds a second mode to the Legal workspace; the
request form uses the Project sidebar mockup.

## Access contract

The new User Access permissions are **Edit All Construction Requests** and
**Submit Construction Requests**. Both default to off. Either permission makes
the Construction mode available. Existing Legal permissions do not grant
Construction access, and Construction access does not grant Legal editing.

| Permission | Construction capability |
|---|---|
| Neither | Construction tab hidden; direct Construction mode entry denied. |
| Submit Construction Requests | Submit new requests, read requests, add attachments, and add comments. Existing request fields and checklist actions remain read-only, including the user's own requests. |
| Edit All Construction Requests | Submit and edit open requests, review submissions, maintain actions, and manage Construction task templates. |

The link names are `User_Access.Edit_All_Construction_Requests` and
`User_Access.Submit_Construction_Requests`. Submission permission is not an
owned-edit permission. Files and comments use
their own authorization paths so they remain available to submitters without
enabling request, owner, status, action, approval, or template edits. The existing
completed-record lock remains unless a separate product decision changes it.
All four full/lean standard/Development permission functions return the
`constructionEditAll` and `constructionSubmit` booleans without changing
existing Legal permission keys.

## Request form and context

The user selects one **Subdivision**. Project, Territory, phase, company, City,
and County come from that exact Subdivision and its Project relationship; there
is no independently editable Project or Territory picker in Construction mode.
Missing context must be reported before submission rather than filled with a
placeholder Project or fabricated Territory.

| Form input | Existing storage or additive storage |
|---|---|
| Subdivision | Existing `Contract.Subdivision1`, constrained to one selection in Construction UI. |
| Budget Type | Existing `Contract.Contract_Type`; Construction choices are Internal, Offsite, Amenity, and MUD Bid. |
| Construction Plans | New optional `Contract.Construction_Plans` picklist: Prelim, First Round, Final. |
| MUD | New optional `Contract.MUD` checkbox, default false; the UI uses a required Yes/No picker. |
| Priority | New optional `Contract.Priority` picklist: ASAP, High, Medium. |
| Date Needed | New optional `Contract.Date_Needed` date; separate from each action's existing `Due_Date`. |
| Description | New optional `Contract.Description` textarea; separate from action `Dev_Notes`. |
| Request name | Existing `Contract.Contract_Name`; the existing native uniqueness requirement remains. |
| Requestor | Existing `Added_User` audit stamp when create equals submission. |
| Date Submitted | Existing `Added_Time` audit stamp when create equals submission. |

All additive fields remain optional in Creator. The Construction request UI
requires its own inputs on submission; Legal requests do not gain Construction
requirements. Do not turn on native Mandatory flags or add global validation
that rejects historical/Legal rows lacking Construction values.

`Subdivision.Projects_Status` supplies the synced schedule status in the sidebar.
`Project.Status` is the existing Active/Inactive/Forecast Placeholder field and
must not be relabeled as the schedule status. The October 11 Development export
does not contain the proposed CP Release Estimate/Goal or Construction Start
Estimate/Goal fields on `Project` or `Subdivision`. Those date mappings require
source verification before implementation; missing dates must remain empty or
unavailable. There is no date-entry requirement for requestors.

## Shared UI and data separation

Legal and Construction modes preserve the existing expansion, list/detail,
submission, editing, attachment, and comment patterns. The template tab is
**Manage Task Templates** in both modes. New-task buttons are **New Legal Task**
and **New Construction Task**.

The page variable selects the initial work mode. It is a navigation preference,
not an access grant. A user with access to both modes can switch modes within
the shared widget. Every mode-specific list, review queue, type/status picker,
new-request flow, parent picker, and template editor must use the active mode.

`Contract.Work_Module` and `Contract_Actions.Work_Module` persist the
Legal/Construction classification. Legacy blank classifications are Legal. Child actions inherit
their parent's classification; template actions have their own classification
because they have no parent. Budget types reuse `Contract_Type` and action
`Type_field`, with Construction choices added to both native picklists while
the widget only offers the choices for the current mode.

Templates are selected by **mode + type**. New Construction requests must not
copy Legal approvals or Legal action templates. Changing a template affects
future requests and does not rewrite existing request checklists.

Construction submission creates a **Proposed** parent with no seeded actions.
An editor accepts that request through Review, which initializes only the
matching Construction templates. This separates the requestor's submission
from the editor's task checklist setup and reuses the Legal Review interaction.
Construction status choices are Proposed (shown as **Pending Review**), New,
Rejected, Feasibility, Awaiting Purchasing, Awaiting Development, Awaiting Other,
Approved, Complete, and Cancelled. Existing Legal choices remain unchanged.

## UI refinements for 1.62.1

Keep the Legal/Construction chooser in the persistent white header beside the
breadcrumb, so it stays available across the request list, Review, templates,
and full workspace. The existing permission check still controls whether
Construction appears.

The Construction form pairs half-width **Subdivision** and **Date Needed** in
its first row, and pairs **Request Name** with **Parent request**. Date Needed
displays `MM/dd/YYYY` using the existing custom date picker. Its hidden input
continues to carry ISO `yyyy-MM-dd`, and the saved Creator date format is
unchanged. Numeric display is scoped to this Construction field; Legal action
dates keep their existing formatting.

Expanded Construction rows use a single compact facts rail, Parent control,
and description on the left, with a 280px desktop width. Actions occupy the
remaining main area on the right; omit a repeated full request-summary block.
Stack the rail and actions on narrow screens. Keep the full Construction
workspace's header controls aligned at 32px and use Request labels for its
record/navigation context. Legal expanded rows retain their established layout.

Construction Review uses responsive cards. The main area shows request name,
Subdivision, requestor, submitted date, and a short description. The three
facts are Budget Type, a Priority badge, and numeric Date Needed. Keep Accept
and the soft red Reject action paired and reachable when the card stacks.

These frontend presentation changes are in immutable `1.62.1`, with `1.62.0`
as the widget rollback. Development, Stage, and Production mappings select it.
Creator remains on `9.81`; no new publication, Custom API, function, field,
or permission changes are required. The existing Contract, Contract_Actions,
Attachment, and comment contracts remain unchanged.

The source update is `e5057583`, and the release/promotion commit is
`8cb7c2febe7b7f88731b2e7392e6a72f81c245d8`. Full `npm run validate` and
`npm run build:pages` passed locally. Desktop actual-source browser checks
covered the header chooser, New Construction Task form and custom calendar,
expanded three-action request row, workspace toolbar, and Review cards using
isolated sample data. No live request, decision, file, comment, or grant was
created or changed for these checks. Permission, owned-edit, family-report,
attachment, and SDK regressions passed; date checks confirm numeric display,
ISO storage, and unchanged Legal date formatting.

Deployment evidence is available in the release's [CI run](https://github.com/rbelliveau-wbw/land-master/actions/runs/38468172057)
and [Pages run](https://github.com/rbelliveau-wbw/land-master/actions/runs/38468172188).
Both checks must finish successfully before this update is reported live.
Robby's desktop-only verification preference is recorded in root AGENTS.md
and the general style guide; do not spend time checking phone/tablet formatting.

## Status colors in 1.62.2

Construction status pickers use distinct pastel rows with matching text, dots,
and a centered SVG selection check. Request/action chips, status-filter dots,
and Construction board rails reuse the palette; Legal keeps its existing
colors. Status choices, saved values, callbacks, permissions, and native
fields/APIs/functions are unchanged. This is a frontend-only immutable release;
Creator remains on `9.81`, and widget rollback is `1.62.1`.

## Creator deployment checklist

The schema manifest records exact additive link names, field types, choices,
and Development verification state. The committed October 11 Development
export is the starting snapshot; it is not evidence of a later native save.
The user authorized **push to main and prod** during this implementation. That
authorizes verified main/Production release promotion; record the actual
backend publication and Pages deployment outcomes before reporting activation.

Development independently confirms all nine optional fields, additive type and
status choices, the six Contract fields in all three `All_Contracts1` projections,
and action classification in all three `All_Contract_Actions` projections. Eight
changed backend functions have independent saved source readbacks. New native
validation workflow links are
`Construction_Contract_Act`, `Construction_Contract_App`, and
`Construction_Attachment_V`; their longer source filenames are recorded in the
manifest. Existing User Access grants have not been changed. Production
Creator publication is verified at version **9.81**, matching Stage: 40 actual
components were published from 45 tree entries.

Development backend installation is complete. Native builder repairs reduced
`Field_Validations_Contrac`, `Set_Contract_Approved_Con`, and
`Validate_Comment_Log` from five script actions to one each, and the approval
template loader from six to one. Full source readbacks confirmed the reviewed
bodies. The action template loader compiled/reloaded with exactly one action
and a strict full-body match. Both report approval actions, the daily Legal
digest guard, and all three new validators also have one exact verified action.
Earlier first-block-only comparisons have been superseded by complete
action-count/source verification. The
[backend deployment state](../creator/schema-changes/construction-backend-deployment.json)
records these checks separately from the verified fields, reports, page, and
functions. The main implementation commit `a09757d7` passed CI and Pages
deployment. Development hosting is verified. Promotion commit `d5cfb943`
deploys hosted `1.62.0` for Stage/Production; its CI and Pages deployment passed.
Native permission fixtures passed; no actual user grants or native
profile permissions changed.

1. Inspect live Development `Contract`, `Contract_Actions`, and `User_Access`
   before creating classification fields, to avoid duplicate fields remembered
   by the user. Save all additive fields as optional and both permissions as
   unchecked by default.
2. Extend the existing `Contract_Type` and action `Type_field` picklist choices
   additively. Preserve existing Legal choices. Extend status choices only as
   recorded by the implementation; mode filtering happens in the widget.
3. Expose new request fields and classification in the quick view/API field
   configuration for `All_Contracts1`. Expose action classification in
   `All_Contract_Actions`. Keep `Added_User`, `Added_Time`, existing parent links,
   action ordering, and existing fields available. Update any secondary native
   report used by the changed flows as listed in the manifest.
4. Update both standard and Development User Access API implementations used
   by the widget, preserving existing Legal keys. Missing or failed permission
   responses must not grant Construction access. Native profile grants still
   determine whether Creator permits a record/file/comment operation.
5. Check native Contract template initialization, Legal notifications, and
   shared approval entry points for classification scope. Construction must
   not start a Legal approval route by selecting a new Construction type.
6. Add/update the Construction page entry and initial mode variable using the
   same permanent hosted widget URL. Reuse the existing Legal page entry and
   retain LOI token routing.
7. Compile/save/reopen changed Development backend functions. Exercise the
   native UI/SDK where authorized accounts are available. Submit-only, editor,
   Legal-only, and no-access behavior passed fixtures; those are not four live
   account/profile tests. Do not change actual grants solely to run a smoke test.
8. Publish Creator schema/backend changes before promoting the new hosted
   widget to Production: Legal creation also writes the new optional
   `Work_Module` field. Development, Stage, and Production activation must be
   reported independently; GitHub Pages release promotion does not publish
   Creator forms, reports, permissions, pages, or functions.

The native Development **Construction** page was created by duplicating Legal.
It keeps `contractId`, `loiReviewId`, and `tokenId`, and adds the Text `workMode`
variable. The same `contract_management` widget retains its permanent
`https://rbelliveau-wbw.github.io/land-master/prod/contract-management/` URL.
There are no widget manifest parameter bindings to change. The compiled
[page-load script](../creator/schema-changes/construction-tasks/Construction.page-load.dg)
sets a blank `workMode` to `construction`; SDK query parameters expose page
variable values. Positive opening/default-mode behavior passed whole-widget
fixtures; live Construction access was not granted for testing. The
[page source](../creator/schema-changes/construction-tasks/Construction.page.ds)
records the observed widget component and four variable names; the page-load
script is kept separately because its complete export syntax is unverified.

Live Development Legal is connected and displays **Manage Task Templates**,
**New Legal Task**, and the 14 existing Legal records. Construction stays hidden
without either new User Access grant. The separate Construction page was denied
for `demouser_1` under its existing native profile. The module's User Access
flags and Creator's page access are separate: assign the intended Construction
permission for the mode switch, and native page access for the separate page.
This implementation has not assigned either kind of access to actual users.

Production Legal is live and connected on hosted `1.62.0`, showing the 46 Legal
records, **Manage Task Templates**, and **New Legal Task**. It shows only Legal
because the signed-in user's Construction grants are false. This confirms the
existing Legal workflow and hidden-mode behavior; it does not claim a positive
live Construction session or four live permission-profile tests.
The [final live verification record](../creator/schema-changes/construction-live-verification.json)
contains the native version proof, CI/Pages links, Development/Production Legal
smoke results, and the remaining permission/milestone-mapping limitations.

## Regression and rollback

- Legal creation and owned editing retain their current fields, permissions,
  type choices, approvals, templates, expansion, comments, and attachments.
- No Construction permission hides Construction and prevents a forced mode
  entry. One granted Construction permission exposes it.
- Submit-only can create a Construction request and add comments/files, but
  cannot update its request fields, owners, status, actions, or templates.
- Construction editors can review and edit open Construction requests, with
  current native permission denials surfaced accurately.
- The selected Subdivision determines exact Project/Territory/context; changing
  it replaces inferred context and never retains another subdivision's data.
- Mode-specific type/status/template choices cannot bleed into the other mode.
  Legacy blank classification records stay visible in Legal.
- Submission, failed writes, duplicate-send prevention, unknown-reply recovery,
  and completed locks preserve the shared save policy.

Before reporting a widget release complete, run the targeted Construction
checks, `npm run validate`, and `npm run build:pages`. Record the immutable
release version and previous Development mapping in the change manifest.
Contract Management `1.62.0` is pushed to main and verified on Development.
Stage/Production mappings select it, their Pages deployment passed, and the
Production Legal smoke check passed. Both environments mapped to `1.61.45`
before this change.

Rollback the hosted widget to `1.61.45` and rebuild
Pages. Keep the additive optional Creator fields and existing Construction data;
do not delete or backfill request records as part of a widget rollback. Remove
or disable only the new page/permissions/backend routing if native rollback is
needed, and report that separately from the hosted widget rollback.
