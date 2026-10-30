# Crew Management 1.4.0 — foreman review groups

The user authorized PMP, selected review-only employee groups, requested fourteen
calendar dates of labor detail, and subsequently authorized Creator promotion of
the finished sync. The daily entry is set to October 30, 2026, 10:30 America/Chicago
(Central local time; daylight time on that date).

## Recorded relationships and locations

Employees **By foreman** shows each caller-visible employee on every recent
foreman timecard, with work dates, job codes and their unchanged current crew.
The window is today plus the previous thirteen dates. Repeated cost-code rows
become one employee/timecard membership. An employee can appear under multiple
foremen; this is recorded work history, not an automatic staffing assignment.
Territory, Labor_Type, Crew and IsActive are not modified by this feature.

The labor source is Analytics `HeavyJob_TimecardCostcodeLaborResource`, view
`2107789000025629150`. Only Timecard GUID, employee Master GUID and deletion flag
are exported, with a fourteen-day Date criterion. Master GUID joins the directory
view `2107789000036057124`, then the saved roster BU GUID. Ambiguous master joins
are excluded and counted; names and employee codes are not identity fallbacks.
No cost, rate, hours, payroll or full labor-history copy is imported.

Crew location badges retain their original seven-date window. The timecard sync
uses the existing subdivision HeavyJob `External_System_Mapping` rows, trims and
normalizes job-code case, accepts identical duplicate destinations, and logs
conflicting phase destinations rather than choosing one. Production has 536
mapping rows versus Development's 28. The live Production report confirms
`HeavyJob / C_TR08 / Turnbo Ranch - Phase 08`; Development-only unmapped counts
do not describe Production coverage. Mapping data itself is not modified.

## Native changes and retention

`Crew_Timecards.Multi_Line` is the verified native multiline storage field for a
JSON object containing distinct employee BU GUIDs. The report automatically
exposes it. The existing `Crew_Timecards_Source_Gua` continues to deny interactive
source edits. No connection, Custom API or permission grant is added.

`crewSyncTimecards(false)` now enqueues through the installed recovery setup.
`workflowExportPlan`, `workflowExportEnqueue`, the `workflowExportTick` allowlist
and `workflowExportRun` register
`Daily_Crew_Timecards` followed by `Daily_Crew_Labor`; both delegate to the new
`crewSyncTimecardsRun`. The separate native invocations avoid the execution limit
caught by the initial combined dry-run preview. The original native worker's
existing recovery/cost branches are preserved exactly, and the Budget quantity
ownership guard remains enforced. The new source is synchronized from the
captured live native worker, whose later continuations were absent from main.

The queue retains its bounded export retries, acknowledged job IDs, wake-ups,
original audit run, completed-source requirement and one-shot processing claim.
`workflowPreparedExportRows` checks the captured source scope; no unknown business
write is replayed automatically. Each step writes reconciled counts and a
terminal Success, Failed or Partial audit record. Labor logs distinct memberships,
unmatched rows and expired payloads. A failed source/validation does not clear
old membership. Main timecards retain three months; membership older than fourteen
dates is cleared after a complete successful labor import. No separate raw labor
record table is created.

`crewLocationsConfig` and `crewLocationsWidget` advertise the new capability.
Older native versions keep the Roster view working and disable By foreman until
promotion. The same three existing environment API aliases are retained.

## Verification and rollout

Pure model tests cover fourteen-day boundaries, multiple foremen, duplicate
cost-code membership, deleted/future exclusion, caller-scoped employees, malformed
membership, unchanged staffing and large string IDs. Actual Deluge-body fixtures
cover complete-source validation, directory ambiguity, empty labor exports,
Failed/Partial outcomes, retention gates and exact HeavyJob destinations.
Browser verification uses the actual employee renderer with isolated records;
Alex appears under two foremen on different dates and stays Unassigned.

Native compilation succeeded for the runner and modified functions. Native queued
labor verification and Stage/Production publication are recorded in the removal
and installation inventories as they complete. Production already has 72 synced
employees. The first queue entry starts at 10:30; header and labor continuations
complete afterward, then Refresh employees loads the new groups.

## Rollback

Map Crew Management back to 1.3.2. Restore only the scoped
`native-before/*.foreman-20261030.*` snapshots, including the former 05:15 schedule
and prior queue definitions. Preserve all imported records, employee staffing,
external mappings, shared connections and unrelated Creator components. Keep the
added membership field unless its deletion is separately authorized. The existing
DEV, Stage and Production APIs remain required and unchanged.

## Production outcome

Exactly eleven required components were promoted to Stage and Production **9.134**;
the unrelated Pro Forma audit helper was excluded. CI and Pages deployment for
`d67fa0e8` succeeded. Widget **1.4.0** was verified in the actual Production iframe.

The daily schedule started automatically at **10:30:11 America/Chicago**. Its
timecard step finished at 10:32:26 with 1,611 received/processed, 16 created and
1,595 updated. It mapped 1,318 cards; 293 cards remain unmapped across the seven
job codes listed in the verification JSON. No conflicting HeavyJob destinations
were found. The labor step then finished at **10:34:29**, received/processed 1,363
rows and saved 908 distinct memberships on 222 timecards, with zero unmatched
labor rows and zero expired payloads on this first run. Both durable audits show
Success. The live widget's Employees / By foreman view shows **12 foreman groups**
for October 17–30 and all 72 active employees remain available in the roster.
No employee staffing assignments were changed.

The user subsequently clarified that the compact storage approach is acceptable.
No separate labor-resource table/form was created. The source remains
HeavyJob_TimecardCostcodeLaborResource, and only fourteen dates of its membership
data are retained in Land Master. Exact counts, audit IDs and remaining job codes
are in `native-installed/production-foreman-sync-20261030.json`.
