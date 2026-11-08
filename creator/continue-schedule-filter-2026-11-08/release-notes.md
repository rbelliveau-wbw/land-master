# Filter Redundant Continue Timers

`Workflow_Export_Continue` now selects only Running records whose serialized Export State does not contain `shared-recovery-30m`. Shared-recovery imports already have independently acknowledged primary wake records and the shared recovery clock. Selecting them again through Resume At can dispatch a second callback to the same tick. The existing tick claim prevents repeat business processing, but does not prevent the redundant native timer execution.

## Scope

The only Production component change is the native schedule's form eligibility predicate. Its `Resume_At` start, daily rearming, America/Chicago timezone and `workflowExportTick(input.ID.toString())` action are unchanged. Running legacy imports retain Continue. Terminal records and shared-recovery runs are excluded before dispatch. No audit, lock, import data or history is deleted.

Affected form and read fields: `Workflow_Run_Log.Run_Status`, `Export_State`, existing `Resume_At` and `ID`. No form or field definition changes, function body changes, Custom API changes, widget release, permanent URL change or environment mapping change is required. The whole shared five-hour cycle, Settings batch cursor, deadlines, claims, fallback recovery and failure reporting retain their existing contracts.

## Verification

The regression requires the candidate to equal the previous Production schedule after only adding the reviewed predicate. It rejects removed/inverted eligibility, OR instead of AND, changed date/frequency and changed action. Native-shaped tests execute the existing dispatch and tick bodies: a primary wake alone reaches actual and plan import workers; a later duplicate cannot repeat the claimed work. These workers are test doubles, so this is not represented as a complete live import.

A temporary Development-only diagnostic used the actual native record criteria. It returned legacy eligible **1**, shared eligible **0**, terminal eligible **0**. Both diagnostic records finished Success, with no business importer invoked. The existing diagnostic function was restored exactly afterward and excluded from publication. Its temporary body is not part of this release.

The focused native source check compares the installed Continue workflow and twelve related import/recovery functions. This verifies thirteen component copies from the native IDE, rather than claiming a fresh full-application export. Private record IDs, captured source payloads, billing and screenshots remain outside this public repository.

Stage and Production **V9.165** contain this single workflow. Development, Stage and Production each pass **13/13** focused source checks. The existing diagnostic helper was excluded from both publications. Focused quota, claims, audit, starter, idle-recovery and historical-verifier tests pass, as does the local Pages build. Full local validation stops at the existing Windows Microsoft Store Python alias; complete Linux CI validation remains the release check.

The user authorized one additional live Production import. The HCSS budget-cost import was manually queued through the existing native audit and lock forms using its unchanged export-plan contract, independently saved primary wake and a confirmed shared recovery record. This tests actual native timer delivery and downstream processing without adding a Production helper or Custom API. It does not test the unchanged startup-hold/enqueue entry point. Creator-native date conversion supplies its numeric checkpoint/deadline and recovery key; JavaScript UTC milliseconds are not interchangeable with Creator `toLong()` values. Test setup values were corrected before the first callback.

At the source-release checkpoint, the first primary callback started a new Analytics export, the next primary callback received the completed original job, and native HCSS preflight began with zero failed rows. The import remains under observation; a terminal result is not yet claimed at this checkpoint.

## Savings And Limits

The eligible reduction is the shared-recovery subset of Continue callbacks, plus terminal callbacks that previously passed through the unconditional schedule. Count a comparable post-release interval rather than assuming every paired timestamp represents the same audit/tick. Existing queued events may survive publication, and native execution logs do not establish a one-to-one relationship with Billing's schedule counter. The previously measured Continue pool is an opportunity ceiling, not a guaranteed billed reduction. Earlier cadence and timeout reductions must not be counted again.

## Regression And Rollback

Verify a native Running legacy state matches the criteria, shared and terminal states do not, and a new shared import progresses through primary wake callbacks to a truthful terminal result. Retain predecessor guards, unknown-outcome no-replay, actual preflight/apply, fixed deadlines and failure delivery. A manual live handoff test does not establish that unchanged timed starter confirmation errors have been fixed.

Rollback: restore only the prior unfiltered [Continue definition](../quota-five-hour-recovery-2026-11-06/native-before/production-v9.160/Workflow_Export_Continue.ds), then publish that single workflow through Stage and Production. Preserve V9.163 timeout eligibility, recovery parking, five-hour cadence, current batch, next-run time, active imports and unrelated releases. Do not replay a claimed import.
