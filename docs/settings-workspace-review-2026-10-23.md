# Settings workspace review — October 23, 2026

The user subsequently approved implementation and main/Production publication
with the Configuration label and Open in Creator/Refresh buttons removed. That
follow-up is release **1.6.1**; see the [release notes](settings-workspace-release-2026-10-23.md).
The 1.6.0 candidate observations below remain historical review evidence.

## Requested outcome

Replace Settings Manager's horizontal jump links and continuous form with a left
menu. Each destination displays a separate screen. Include the existing approval
administration in the same workspace and retain the current settings, workflow
history, native access checks and audited saves.

The starting Production widget is **Settings Manager 1.5.20**. This review does
not authorize a Production promotion or changes to approval recipients, role
order, scope precedence, monetary thresholds or Creator field meaning.
The resulting frontend candidate is **1.6.0**.

## Findings addressed by the design

- The old menu only called `scrollIntoView`. It did not separate screens, so long
  AI instructions and the construction table made ordinary settings hard to find.
- Approvals lived in a second full modal with a separate navigation system.
  Reuse the existing approval editor within its Settings destination so its
  people, rules, route tests, history and recovery remain consistent.
- A verbose green singleton banner occupied the top of every ordinary visit.
  Healthy record status can be compact. Duplicate-record and unavailable-data
  warnings must stay visible and keep their existing consequences.
- Budget's old `COO_Approval_Threshold` description implied that this field still
  controls new Budget Modifications. The published Budget Modification approval
  rule supersedes it after the existing October 19 Creator function promotion.
  Preserve the stored legacy value and explain that approval rules now own the
  condition; do not silently migrate or delete it.
- `Multi_Line` has no verified business meaning beyond its existing native
  textarea. Preserve its meaning and value instead of inventing a new purpose.
- AI model/provider values are stored configuration. Layout cleanup must not
  replace a selected model or silently change provider behavior.
- Workflow Log is a current feature, not obsolete settings. Keep its complete
  native reads, explicit loading, search, date range, failure filter, pagination
  and retained authorized results.

## Interaction and data boundaries

Keep the Settings screens mounted during navigation. Selecting a destination
must not rebuild an input, erase invalid text, lose a draft, redownload the
workflow history or manufacture a saved state. Ordinary Settings drafts retain
their existing autosave timing. Approval navigation retains the existing guard:
finish a valid inline change, or correct/check an unresolved change before
leaving. Preserve complete snapshot and permission guards during refresh.

Reuse `LMApprovalAdmin` with an embedded presentation option. Its existing
standalone modal remains available to existing callers and fixtures. Preserve:

- Environment-specific `Manage_Approval_Policies` and lean User Access identity
  transport, with exact string IDs and unchanged caller/access checks.
- Approval Rules, Approvers, Roles, Test Route and Change History labels.
- Permanent territory/department scope, Territory VP and all selected Dev Mgr
  recipients, and existing published rule editing.
- Existing 650 ms inline saves and unchanged exact decimal threshold strings.
- Explicit creation/publication flow, distinct operation tokens, pending locks,
  unknown-reply retention, read-only Check Status and explicit activation.
- Anchored picker geometry, first-Escape dismissal and focus restoration.
- Required PO CFO, existing drag/keyboard ordering and stable-key row movement.

Register Settings screen changes with the shared interaction-motion engine.
Reduced motion uses the same immediate real state. Numeric presentation retains
the existing shared number-transition and field-exit contract.

## Verification fixture

`scripts/test-settings-workspace.mjs` serves the actual widget, styles, shared
engines and approval editor with an in-memory native SDK fixture. It replaces
only the remote SDK load and exposes the existing controller immediately before
the real startup. Requests are restricted to that local fixture; it never writes
Creator records or sends approval emails. `--serve` leaves that review fixture
available in a local browser.

The focused browser checks cover:

1. Exactly one visible Settings screen and no mutation from opening screens.
2. Invalid integer text, draft state and editor identity through navigation;
   correction then saves through the actual Settings controller.
3. Workflow Log search/failure filter and loaded rows retained through navigation,
   without another native history download.
4. Published Budget Modification rule editing in the actual approval renderer;
   inline save retains the threshold node and exact valid decimal cents in
   transport. Existing policy validation rejects more than two fractional
   digits, keeps the invalid text, makes no write and prevents silent navigation
   away from that draft.
5. Leaving and returning to Approvals keeps the current editor mounted.
6. Keyboard activation, announced current destination, picker Escape/focus and
   reduced motion.
7. Bounded desktop layout at 1440 px and 1008 px. No phone/tablet verification is
   required by the standing October 13 testing direction; supplemental 760 px and
   390 px checks cover outer overflow without claiming complete mobile QA.
8. Add Rule remains visible above a complete five-workflow rule list, and
   opening every destination makes no record/configuration mutation.

**Passed October 23, 2026:** `node scripts/test-settings-workspace.mjs --export`
against the completed 1.6.0 shell, pickers and embedded approval editor. The
actual widget had no browser errors at the checked widths. The exported HTML
also opened directly from disk with working approval navigation and no network
requests.

The durable deliverable is
`outputs/settings-workspace-mockups/index.html`. Every current widget script and
stylesheet is inlined into that single interactive file. It contains explicit
sample-data labeling and simulated records. Changes remain in memory and reset
on reload; no Creator records are read or changed and no approval emails are
sent. `README.txt` and clean screenshots are beside the HTML. Screenshot sources
are also written to `tmp/settings-workspace-preview/`.

The primary mockups show Automation & Scheduling, Approval Rules, Approvers,
the existing Budget Modification rule editor and Pro Forma Defaults. They show
the actual new renderer with sample data; they must not be represented as native
Creator verification. Existing date/time controls retain their native calendar
and time behavior; this release does not claim a new custom calendar.

## Release and rollback

The redesign is frontend-only when it reuses the existing contracts above; it
does not require new forms, fields, functions or Custom APIs. Existing Creator
function promotion dependencies remain in their original handoffs.

Before declaring a deployable change complete, run the focused workspace test,
existing Settings SDK2, workflow-log, approval-admin/recovery/layout/browser,
design discovery and applicable motion checks, then `npm run validate` and
`npm run build:pages`. Record actual outcomes with the release; fixture coverage
does not prove live native permission or data behavior changed successfully.

Rollback restores the Settings environment mapping to immutable **1.5.20** and
rebuilds Pages. The existing stable Creator URL remains unchanged. No record
repair should be needed for a presentation-only rollback.

## Candidate 1.6.0 verification

Completed October 23, 2026:

- `npm run validate` passed with the bundled Python runtime on PATH. The suite
  retains an unrelated existing Crew Locations source/manifest warning.
- `npm run build:pages` passed and built 33 environment paths.
- Settings SDK2, Workflow Log, approval administration/recovery/layout,
  embedded approval browser checks and the complete workspace `--export`
  checks passed. The curve picker also passed its focused browser fixture.
- Every file in immutable `releases/settings-manager/1.6.0/` matches the final
  source. Development maps to 1.6.0; Production still maps to 1.5.20. No changes
  have been pushed or deployed for this redesign.

Changed Settings files are `src/app/widget.html`, `settings-workspace.css`,
`settings-pickers.js`, `settings-pickers.css`, `approval-admin.js`,
`approval-admin.css`, `workflow-log.js`, `widget.config.json` and `README.md`.
The release, Settings entries in the widget/environment manifests, focused
browser fixtures, existing fixture API markers, and design/review documentation
complete the candidate. Unrelated work already present in this shared checkout
is outside this change.

Affected forms/fields: the existing Settings and Construction_Curve editors
retain their field names, values, meaning and write contracts. The visible
COO_Approval_Threshold label is now Legacy COO Threshold. Approval configuration
continues to use its existing forms. No form or field is added, deleted or
migrated. Functions and Custom APIs: no changes; the existing
Get_User_Access_Lean and Manage_Approval_Policies environment routing is reused.
This presentation change requires no Creator deployment.
