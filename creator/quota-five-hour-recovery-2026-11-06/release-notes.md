# Park Idle Recovery Checks

Recovery previously kept scheduling half-hour checks after all protected import work had finished. This change parks that chain when the backlog is demonstrably idle and rearms it before accepting a new startup. Active imports retain the existing recovery cadence, deadlines, ownership checks and no-replay behavior.

## Release Scope

Creator Stage **V9.161**, titled **Park idle recovery checks**, contains six functions:

- `workflowRecoveryHold` — new durable startup-intent helper.
- `workflowExportRecover` — idle detection and bounded startup reconciliation.
- `workflowStarterFrame` — protected frame creation.
- `workflowStarterDispatch` — settlement of acknowledged route handoffs.
- `workflowExportEnqueueCaptured` — protected unframed audit creation.
- `workflowExportRun` — protected Budget action-successor creation.

The package adds no forms, fields, schedule definitions, widgets or Custom APIs. It reuses the existing lock record's `Cycle_State` and `Wake_At` fields. Marker writes suppress schedule triggers. The current three-hour clock, batch rotation, six route offsets, business importers, validation rules, write limits and fixed deadlines remain unchanged. A five-hour cadence is outside this package.

Stage and Production **V9.161** are published. Independent fresh native exports from both environments pass **41/41 checks**, with zero mismatches.

The repository commit also records the previously deployed quota dependency chain and immutable regression fixtures. Those prerequisite sources are not additional changes in the six-function Creator package.

## Startup and Recovery Guarantees

Startup holds protect frame creation, unframed audit creation and Budget successor creation. Each hold records its exact intended target before arming recovery. Native creation time and exact identity establish whether the target committed within its startup window. Lost or ambiguous acknowledgements never authorize another target creation request.

Recovery checks durable state in handoff order: startup holds, unresolved frames, then Running audits. It parks only when each source of protected work is absent. An unreadable backlog preserves the chain. Concurrent startups must arm a future recovery clock before accepting their targets. Frames settle only when every route has its own child acknowledgement or terminal notice. Legacy frames retain their prior rollout eligibility.

## Validation

- Actual-body tests cover idle/rearm behavior, concurrent handoff boundaries, exact target ownership, lost acknowledgements, late commits, deadline boundaries, terminal and partial frames, bounded scans and finite diagnostics.
- A fresh Development native export passes **41/41 checks**, including the reviewed function bodies, surrounding workflow and form definitions, the existing active schedule group and absence of retired diagnostic helpers.
- Native Development tests verified frame creation and closure, all six queue handoffs, frame settlement, idle parking and metadata-only rearm after parking. Test audits were finished Skipped; business workers were not executed during those queue tests.
- Clean-checkout **`npm run validate`** and **`npm run build:pages`** pass.

Fresh Stage and Production native sources both pass **41/41 checks**. Complete Production scheduled execution, a Production active-to-idle-to-active transition, and measured account-wide savings remain post-release monitoring, not completed observations.

## Regression and Rollback

Regression checks must preserve batch capture, three-hour starts, independent route ownership, fixed deadlines, active recovery, terminal completion, idle parking and startup after parking. A failed or ambiguous handoff must stay visible without replaying claimed business work.

The rollback baseline is **Production V9.160** for the five modified existing functions. Restore those bodies as one coordinated package and ensure the continuous shared recovery chain is armed. Reconcile uncertain startup outcomes before any manual retry. Preserve native history and unrelated releases. After restoring callers, the new helper may remain unused; removal requires a reference review and the applicable deletion approval.
