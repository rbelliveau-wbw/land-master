# Land create acknowledgement and Budget approval timing — November 5, 2026

## Reported failures

Land Master 8.17.9 reported `Creator did not confirm the record change.` after
a Property create. Its subsequent read loaded 2,145 Properties, compared with
2,144 at startup, but recovery failed because the response parser had no record
ID. The count increase is consistent with a saved create; these reports do not
identify the additional record or include the original native response.

The user explicitly requested removal of this create confirmation check.
General native creates must therefore accept a resolved reply without an actual
Creator failure, without imposing a particular response envelope or requiring a
returned ID merely to call the create successful. Existing Contract Management
handling provides the precedent for this policy.

Budget Manager 122.29.99 showed phase 1 of Construction approval submission as
failed even though the user received its approval email. Read-only Production
inspection confirmed Turnbo Ranch - Phase 08 is locked and its Construction
track is Pending, with VP twhitis active and CFO/COO Not Sent. No approval,
resend, cancel, repair or financial action was executed during inspection.

The frontend starts its 20-second verification deadline before the native
submission finishes, but schedules the first targeted check only after that
submission settles. A slow successful write can therefore reach terminal failure
before any check, enable Close/Retry while still pending, and ignore the eventual
completion. This is a demonstrated code defect consistent with the screenshot;
the original request duration and check response were not available to prove
that it was the sole cause of this occurrence.

## Scope and retained behavior

Land Master changes the general `createRecord` path used by the record editor,
staged Project subdivisions, External System Mappings and spreadsheet Lots.
Actual Creator failures remain errors. Captured user/environment, input and
permission checks, pending duplicate prevention and genuinely lost-reply
recovery remain. Follow-on operations still need a real destination ID; no
synthetic ID or guessed record authorizes a child write. Successful creates do
not acquire an unknown-outcome lock solely because the response omits an ID.
Unrelated update/delete acknowledgement handling and the dedicated Takedown
workflow retain their existing protections.

Budget changes only the progress lifecycle. The bounded reconciliation window
starts after the native mutation settles, and pending mutations keep Close,
Retry and duplicate sends locked. Attempt identity protects against stale
callbacks. Targeted routing, delivery and finalization predicates and backend
permissions remain in force. This does not mark email delivered merely because
a submission request resolved.

## Release and rollback

Frontend releases: Land Master **8.17.11** and Budget Manager **122.29.100**.
The user's November 5 PMP authorizes main and Production promotion alongside
Insights 1.6.25. Development and Production map these immutable releases.
The prior Production versions were **8.17.9** and **122.29.99** respectively.

No Creator forms, fields, functions, Custom APIs, email recipients, approval
decisions or financial calculations change. No Creator publication or data
migration is required. Existing native create payload fields are preserved.
Existing Budget `startApprovalChain` and `handleApprovalAction` API contracts
are unchanged.

The existing general-create forms are `Property_Transfer`, `Property`, `Project`,
`Subdivision`, `Company`, `Milestones`, `Forecast`, `Forecast_Year`,
`Builder_Takedown`, `Builder`, `Lots`, `Additional_Items` and
`External_System_Mapping`. Their field payloads are unchanged. Budget progress
continues to use the existing budget/approval records and native functions.

Rollback the affected frontend mapping to Land Master 8.17.9 or Budget Manager
122.29.99 and rebuild Pages. No data rollback is required.

## Changed files

- Frontends: `widgets/land-master/src/app/widget.html` and
  `widgets/budget-manager/src/app/widget.html`.
- Regression scripts: `scripts/test-land-master-sdk-v2.mjs`,
  `scripts/test-land-master-create-safety.mjs`,
  `scripts/test-land-master-mapping-draft.mjs`,
  `scripts/test-land-master-second-closing.mjs`,
  `scripts/test-property-transfers.mjs`,
  `scripts/test-send-approval-progress.mjs`,
  `scripts/test-budget-draft-attachments.mjs` and
  `scripts/test-budget-modification-settings-routing.mjs`.
- Packaging: both widget configs, `manifests/widgets.json`,
  `deploy/environments.json`, and the two immutable release directories.
- Policy and documentation: `AGENTS.md`,
  `docs/automatic-save-check-removal-2026-10-08.md`,
  `knowledge/design/approval-progress.md`, both module guides, and this note.

## Verification

Focused regressions cover accepted ID-less and differently wrapped native
creates, actual native failures, lost replies, pending duplicate prevention,
dependent writes that require real IDs, slow approval submissions and repairs,
bounded reconciliation, stale attempt callbacks and read-only retry of an
already-active approval track. `npm run validate`, including its prevalidation,
and `npm run build:pages` passed. All 23 Land and 26 Budget source assets match
their immutable candidate releases, and edited-source whitespace checks passed. No live
creates or approval emails were used for regression testing.
