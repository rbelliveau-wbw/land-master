# Resumable Daily Analytics Exports — November 9, 2026

Four active daily workflows still used the short synchronous export wait. Employees and GP Engineering failed before reading source rows on November 9 because Analytics still reported `1001` after twelve checks. Equipment and Milestones used the same wait and are eligible for the same migration. A live inventory of all 48 installed schedules is in `schedule-inventory.json`; inactive jobs remain inactive.

## Behavior

The original daily schedule now calls the existing canonical enqueue. The existing primary wake, shared recovery, unique tick/process claims, pending-status backoff and fixed fifteen-minute export deadline handle Analytics waiting. The duplicate Continue filter applies through the existing `shared-recovery-30m` policy. No new repeating recovery schedule is introduced.

`workflowExportPlan`, `workflowExportEnqueueCaptured`, `workflowExportTick` and `workflowExportRun` add only these four routes. `workflowExportDailyRun` contains the original Engineering, Equipment and Milestone action bodies, using the prepared completed export and original audit. A separate worker is necessary to keep the already large common processor small and preserve each native action's business rules. `crewSyncEmployeesRun` follows the existing Timecards adapter; `crewSyncEmployees(bool dryRun)` remains the synchronous manual/dry-run entry.

Original start dates, clock times, America/Chicago timezone, daily frequencies and activation states are preserved. The shared five-hour cycle and Settings batch rotation are untouched. No widget, Custom API, permission, connection or form schema changes are required.

## Affected Native Data

- Employees: existing BU identity, source activity flags, name/code, sync timestamp and new-employee defaults. Territory, Labor Type, Crew and retained inactive employees remain protected.
- Engineering: existing Budget Import Item Engineering/Surveying mappings, source keys, costs, dates, exclusion and audit/count guards.
- Equipment: existing equipment source fields, meter hours and purchase-date parsing/null rules.
- Milestones: existing source identity, subdivision link, names/dates and Crew schedule lock/snapshot guards.
- Workflow Run Log and Workflow Export Lock: existing queue/audit fields and native protocols only.

The exact original source is retained in `native-before/`. Regression tests compare every business token after substituting only the audit handoff and prepared export reader. Historical workflow logs and business records are not deleted.

## Quota Effect

This migration primarily prevents premature failures and removes external sleep requests. It does not promise fewer schedule units than a successful synchronous daily job. Each daily start remains one schedule execution; the resumable route adds primary wake executions while Analytics is pending. The normal polling delays are one, two and then four minutes, bounded by the original fifteen-minute export deadline. Shared recovery is already installed and parks while idle. No duplicate Continue callbacks are scheduled for the new routes.

The old wait could make eleven ten-second external delay calls plus twelve status reads per job before failing. The new path returns between checks and retains the original export job; it does not keep calling the external delay service. Exact daily/monthly savings depend on observed Analytics completion times and manual retries avoided. Four daily jobs alone do not justify claiming hundreds of schedule units saved per day.

The real Development tests needed one employee wake and two wakes for each other daily job. If Production completes at similar points, that implies about seven additional primary schedule executions per day, or 210 per thirty days, before existing shared recovery traffic. These tests manually dispatched the original due primary wakes because Development schedules were suspended; this is a projection from the native continuation state, not a measured Production billing delta. Queue audit/claim/wake writes also use Creator REST APIs. Therefore neither net external-call nor Developer-API savings should be promised from this reliability migration without measuring a full normal Production day.

## The Two Daily Counters In Plain English

External calls count requests sent by Creator to an API, including Analytics export/start/status/download requests and the old external sleep service. Developer APIs count standard REST requests received by Creator. Our independently saved workflow logs, ownership claims, recovery records and wake-ups call Creator's REST API from inside Creator, so one such request increases **both** counters. This overlap explains why reducing internal REST traffic can lower both meters together. Source-code inspection establishes these consumers; aggregate billing totals alone cannot attribute every request to a workflow.

Zoho explicitly says its widget JS API tasks do not consume these two counters. Do not automatically blame ordinary widget SDK reads/writes, confuse one counter with an independent group of requests, or add the two totals as if they were separate operations. See [Zoho billing definitions](https://help.zoho.com/portal/en/kb/creator/developer-guide/billing/articles/view-and-manage-billing) and [Creator API limits](https://www.zoho.com/creator/help/api/v2.1/api-limits.html).

Low-risk quota savings come from suppressing duplicate timers, avoiding checks after terminal completion, parking recovery while idle, grouping independent claim/wake records into supported bulk requests, and retaining the original Analytics job rather than restarting it. Keep durable logs, exact claim ownership and ambiguous-reply no-replay protections; removing these blindly can trade a small quota saving for duplicate or untracked business writes.

## Verification And Release

Local tests cover all four canonical enqueues and captured source configurations, fixed-deadline 1001/1002 backoff, no writes while pending, exact schedule timing/state preservation, original employee manual/dry-run behavior, prepared-run identity rejection, staffing/inactive retention and business-token preservation. Existing starter, claim, recovery and integration regressions remain required.

Native Development compilation and real export tests are required before promotion. Development and Stage global schedules remain suspended; bounded tests dispatch the original due primary wake through the existing dispatcher. The temporary Development-only diagnostic driver must be restored to its exact original source and excluded from publication.

Creator **V9.166** was published to Stage and promoted to Production on November 9, 2026. All eleven components match the reviewed candidates independently in Development, Stage and Production; normalized source hashes are in `verification/`. The restored Development diagnostic matches its exact original 2,964-character source and was excluded from the eleven-component release. No production diagnostic was installed.

Real Development results (original due primary wakes dispatched while global schedules stayed suspended):

| Daily Workflow | Received / Processed | Created | Updated | Skipped | Failed | Final Status |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Employees | 592 / 592 | 0 | 72 | 520 | 0 | Success |
| GP Engineering | 862 / 862 | 0 | 0 | 862 | 0 | Success |
| Equipment | 378 / 378 | 141 | 237 | 0 | 0 | Success |
| Milestones | 19 / 19 | 0 | 2 | 17 | 0 | Success |

Engineering intentionally skipped rows under its unchanged destination eligibility rules in Development. This demonstrates the real export and preserved processing path, not that Production destination counts will equal Development. No extra Production business imports were forced; the next natural daily runs provide the remaining Production execution check. The two original failed historical audits remain intact.

Windows validation passed the JavaScript checks through integration preparation, then reached the unavailable local Python launcher. `npm run build:pages` passed. Full Linux CI is the final repository validation gate. No widget release or environment mapping change belongs to this backend-only release.

## Rollback

Restore the four original schedule actions from `native-before/` first, preserving all schedule properties. Let already queued migration audits reach terminal outcomes; never replay ambiguous processing claims. Restore the five modified functions only after no new-route audit remains Running. The two added workers can remain dormant until references are removed. Use a scoped Creator publication of those changes. No data/log deletion, global timer toggles or connection changes are needed.
