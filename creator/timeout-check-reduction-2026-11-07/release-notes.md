# Skip Completed Workflow Timeout Checks

Creator's `Workflow_Log_Timeout` schedule previously selected every Workflow Run Log record, then returned from its action if the record was no longer Running. The native schedule now selects only `Workflow_Run_Log[Run_Status == "Running"]`, so terminal records are ineligible before the action is dispatched.

## Scope

The entire change is the existing workflow's form eligibility predicate. Its thirty-minute `Started_At` offset, timezone, live-record status guard, shared-recovery deferral, bounded legacy watchdog checks, timeout reporting and action body remain unchanged. Existing Success, Failed, Partial, Skipped and Timed Out records fail the predicate; Running records retain their previous protections. No record, log or timer history is deleted.

Affected form: `Workflow_Run_Log`. Read fields: `Run_Status`, existing `Started_At`. No field or form definition changes, function changes, Custom API changes, widget changes, immutable widget releases or environment mapping changes are required. The batch cursor and whole shared five-hour cycle remain as released in V9.162. Unrelated pending Construction changes are excluded from publication.

## Verification

The candidate must equal the prior Production timeout definition after only adding the Running form predicate. The focused regression rejects the old unconditional definition, an inverted predicate, a changed timeout offset and changed recovery behavior. It runs in repository prevalidation. The native verifier retains the prior 41 checks across functions, workflows, forms, seven-active/five-disabled shared schedules and retired-helper absence, with only this workflow's expected definition overridden.

Stage and Production V9.163 are published with one component. Fresh Development, Stage and Production exports each pass 41/41; sanitized per-environment proof is stored in `verification/`. The focused regression, workflow-log tests, documentation checks and local Pages build pass. Local full validation reached the Python checks but this Windows environment has only a Microsoft Store Python alias; the main commit's CI supplies the complete validation gate.

Source parity proves the installed rule and unchanged actions. It does not prove that Zoho credits each filtered delivery as a billed schedule saving. Existing queued timers may still appear during rollout. Actual timer delivery, complete-day billing reduction and runtime errors require separate observation after publication. Raw account usage and run history stay in the private report rather than this public repository.

## Savings Method

For a complete 24-hour window, count jobs that finished before their thirty-minute timeout would fall inside that window. Keep still-running jobs outside the removable count. Separate shared-cycle jobs from independent daily jobs. With eight eligible log rows per shared cycle, the five-hour planning rate is `8 × (24 / 5) = 38.4` potentially redundant deliveries/day, plus independently scheduled terminal jobs. Multiply a daily estimate by 30 for a 30-day planning month. Do not subtract the earlier three-to-five-hour frequency savings a second time.

Native workflow execution counts and Billing's monthly schedule counter are different observations. Report the opportunity as estimated avoided executions until a comparable post-release billing interval verifies the unit relationship. Do not claim that one cleanup alone guarantees the remaining monthly quota.

## Regression And Rollback

Verify that a completed job is ineligible, a genuinely Running job is eligible, and completion between eligibility and action remains guarded by the unchanged action. Preserve the existing deferral for long imports, fixed deadlines, audit completion/failure handling, batch capture and seven active shared schedules.

To roll back, restore only the form line to `form = Workflow_Run_Log` from the immutable [previous Production definition](../quota-five-hour-recovery-2026-11-06/native-before/production-v9.160/Workflow_Log_Timeout.ds), then publish that single workflow through Stage and Production. Keep the action body, V9.161 recovery parking, V9.162 five-hour cycle, batch cursor, saved next-run time, records and unrelated changes intact. Do not replay business imports.
