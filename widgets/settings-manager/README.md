# Settings Manager

## 1.6.2 — Automation batch control

The existing `Current_Batch` field now appears in Automation beside Next Workflow
Run, with whole-number validation from 0 through 4. It is omitted from Additional
Fields. Loading Settings never normalizes the stored value. The schedule impact
disclosure lists the eight confirmed existing schedules and the new HCSS batch
check; its Creator replacement requires separate publication. See the
[HCSS rollout](../../docs/hcss-five-batches-2026-10-23.md). Frontend rollback is
**1.6.1**; keep the permanent widget URL.

## 1.6.1 — sidebar workspace

Settings has a persistent left menu and one visible screen at a time. Approval
Rules, Approvers, Roles, Test Route and Change History are first-class screens
in the same workspace. Screen changes retain mounted controls, drafts, screen
scroll positions and Workflow Log filters. Healthy singleton/record details
no longer dominate the page; actual load, duplicate and recovery warnings remain.

The 1.6.1 release implements the approved mockups and removes the Configuration
caption/badge, Open in Creator and routine Refresh buttons. It adds no Creator
forms, fields, functions, Custom APIs or approval-routing rules. Existing backend availability and permissions still
determine which operations can run. Frontend rollback is Settings Manager
**1.5.20** through the existing permanent environment mapping; keep the Creator
widget URL unchanged. Repository-wide validation and Pages build are required before promotion.

## Screens

| Menu group | Screen | Existing configuration or behavior |
| --- | --- | --- |
| General | Automation | Workflow failure recipients, workflow run anchor, Current Batch and approval reminders |
| General | Workflow Log | Lazy read-only execution history, date range, search and failure filter |
| Approvals | Approval Rules | Workflow scope, ordered roles and applicable conditions |
| Approvals | Approvers | Role-to-person assignments, approval email and enabled state |
| Approvals | Roles | Available approval roles |
| Approvals | Test Route | Evaluated people, order and inclusion/exclusion reasons; no emails or writes |
| Approvals | Change History | Configuration actor, before/after evidence and retained receipts |
| Modules | Forecasting | Forecasting window and global unlock switches |
| Modules | Contracts & Legal | Legal notification recipients and builder contract templates |
| Modules | Budget | Retained legacy COO threshold and `Multi_Line` free text |
| Modules | Pro Forma Defaults | Eight percentage defaults and current blank-default count |
| Modules | Construction Curves | Monthly cost distribution grouped by curve length |
| AI & Data | AI Review | Pro Forma criteria, provider, model and criteria timestamp |
| AI & Data | Spreadsheet Lot Import | CSV/XLSX interpretation instructions |
| Advanced | Additional Fields | Unmodeled Settings fields, only when present |

Automation retains `Current_Batch`, `Next_Workflow_Run`, `Approval_Reminder_Interval_Days` and
`Next_Approval_Reminder_Date`, including the scheduled jobs affected by the run
anchor. `Workflow_Log_Failure_Recipients` remains a User Access multi-select.
Workflow Log loads only when opened and keeps the complete selected date range,
time sorting, failures/search filters and per-run details. Its existing native
audit components require their own deployment; this redesign does not install
them. See [Workflow Log contracts and handoff](../../docs/workflow-integration-audit-2026-10-21.md).

Forecasting switches retain their amber active treatment. Contracts & Legal
preserves validated email chips and searchable builder template multi-selects.
The Budget screen identifies `COO_Approval_Threshold` as legacy and links to
Approval Rules: after the existing routing handoff, standalone Budget
Modifications use their published rule's Above/At or above condition and exact
threshold. Changing the global legacy field does not change that rule.
`Multi_Line` stays free text; no new business meaning is assigned. See the
[Budget routing handoff](../../docs/budget-modification-settings-routing-2026-10-19.md).

AI Review retains `PF_Review_Criteria`, `PF_Review_Provider`, `PF_Review_Model`
and the automatically stamped `PF_Review_Criteria_Updated`. `openai` remains
the supported provider; configured model IDs pass through unchanged.
Spreadsheet Lot Import reuses `Plat_Review_Criteria` for CSV/XLSX column mapping
and subdivision matching. Empty instructions keep the backend default. Use
Starter Instructions fills and autosaves this field only when explicitly
chosen; stored instructions are never replaced automatically. Both AI features
continue sharing the existing provider/model settings.

## Creator contracts

| Kind | Link name | Use |
| --- | --- | --- |
| Form | `Settings` | Singleton configuration record |
| Report | `All_Settings` | Read and update target |
| Form | `Construction_Curve` | Curve child records |
| Report | `All_Construction_Curves` | Read, update and delete curve rows |
| Report | `All_Contract_Approvals` | `Builder_Approval_Template` choices |
| Report | `All_Contract_Actions` | `Builder_Contract_Action_Template` choices |
| Report | `All_Pro_Formas` | Curve-row `Pro_Forma` choices |
| Form | `User_Access` | Approval identities and workflow failure recipients |
| Report | `Workflow_Run_Log_Report` | Read-only Workflow Log |

Settings and curves use native `ZOHO.CREATOR.DATA` SDK2 methods. Approval
administration reuses owner-only `Manage_Approval_Policies` or
`Manage_Approval_Policies_DEV`, selected by authenticated Creator environment.
Production identity uses the existing authenticated GET endpoint; Development
uses its existing POST endpoint. Server authorization and `canAdmin` remain
required. The critical-error reporter keeps its separately configured API.

The widget reads `All_Settings` unfiltered and never creates a Settings record.
Multiple records retain the duplicate warning and selected-record identity
protection. Curves are child records with the existing `Settings` back-pointer,
rather than a nested Settings subform payload. A missing parent link can cause
`Delete_Orphaned_Objects` to reap a curve row.

## Current approval configuration

Rules and assignments persist until edited or disabled. Scope precedence is
**Territory + Department → Territory → Department → All**. Company and effective
dates do not participate. Rules have no editable version, date window or
duplicate-person mode. Published rules are edited in place and apply to future
submissions; submitted routes retain captured people, order, decisions, notes
and timestamps. A disabled specific match blocks routing instead of falling
back to a broader match. Same-precedence ambiguity fails.

VP resolves exactly one unique person from the document's `Territory.VP`.
Dev Mgr expands unique selected `Territory.Dev_Mgr` people, preserving lookup
order, into individual sequential approvals before the next role. Neither uses
a fallback Settings assignment. Other roles use scoped approver assignments.
Recipients retain their login, routing-enabled and approval-email requirements.
Self-approval is always allowed for shared workflows; every configured recipient
still approves their own step. No override or reassignment authority is added.

Purchase Orders retain two scenarios: CFO alone without new budget
modifications, and the configured ordered route with mandatory CFO when the
server creates attached budget modifications. The requested route is
VP → CFO → COO. Existing pending modifications that cover an overrun do not add
roles. PO rows have no amount thresholds; CFO may move but cannot be disabled
or removed. Other workflows preserve exact Above/At or above conditions; Pro
Forma and Contract use straight chains.

List must advertise `policyModel: territory-perpetual-v2` before configuration
Save, Publish or Test Route can run. Older native functions retain read-only
inspection and historical token Check. The frontend does not enable adapters
or prove an unpromoted execution migration. See the
[approval administration guide](../../knowledge/design/approval-administration.md),
[scope-removal handoff](../../knowledge/releases/approval-territory-perpetual-v2-2026-10-13.md)
and [Pro Forma/Territory routing handoff](../../docs/proforma-settings-approval-routing-2026-10-14.md).

Approvers, roles and existing rules autosave after a 650 ms pause with their
editor mounted. New Approval Rules use Save Rule: save a native Draft, then
publish its verified identity with a distinct operation token. Inline list
actions sit above the list. Configuration progress still uses the compact navy
modal with trapped focus, inert background and a result held until Done. Done
returns to the embedded list. New drafts, pending writes and unknown outcomes
cannot be discarded through parent navigation or Reload. Unknown replies retain
the exact operation and expose read-only Check Status; Check never replays a
mutation or automatically activates a recovered Draft. The existing modal
`open()` API remains compatible.

## Save, precision and recovery

Settings fields keep revisioned drafts and batch valid edits after 700 ms.
Successful native acknowledgements retain exact record identity, required
destination/parent checks, actual API errors and duplicate-send guards. They do
**not** require automatic editable/calculated-field equality with the submitted
payload. Explicit unknown-reply recovery may compare captured values against
fresh reads. This acknowledgement policy also applies to template, curve and
approval configuration writes. See the
[system save policy](../../docs/automatic-save-check-removal-2026-10-08.md).

Lookup writes send exact ID arrays once. Unknown/unavailable selected IDs remain
visible; incomplete option reads keep their picker unavailable. Builder action
choices count/read the complete report and include checked `Template_Action`
rows. `Contract_Action` supplies display text with the existing type/sort order;
the removed `Contract_Template` field is not an eligibility rule. No
alternate-envelope write retries are introduced.

Money inputs preserve entered fractional digits and use the shared strict
decimal parser, including signed-dollar, accounting and Unicode-minus credits.
They display at least two decimal places without rounding through `Number`.
Malformed currency fails before writing. Exact unknown-reply recovery uses
canonical decimal strings; percentage recovery validates grouping and an
optional trailing percent sign. Integer-count validation and Creator field
precision remain unchanged.

Reload retains the selected singleton ID and waits for drafts/active operations.
Failed lookup/curve reads keep the last complete data with unavailable controls.
Lost/malformed replies retain drafts and pause further writes. Recheck Saved
Values reads only; definite rejections may be explicitly discarded. Unknown
curve creates without a confirmed ID require record review, never another blind
create. No native browser dialogs or navigation prompts are used. See the
[SDK2 controller notes](SDK2.md).

Shared [success feedback](../../knowledge/design/success-feedback.md),
[interaction motion](../../knowledge/design/interaction-motion.md) and
[number transitions](../../knowledge/design/number-transitions.md) remain in use.
Curve totals/blank-default counts use Sliding push; editable values, carets,
request timing and reduced motion retain their existing contracts.

## Preview and focused checks

Serve `src/app/` over HTTP and open `widget.html` outside Creator for the read-only
demo. Embedded widgets without a working SDK fail closed. Approval fixtures use
local fake services and `.invalid` email addresses; they make no Creator writes
or outbound notifications.

Focused checks are `scripts/test-settings-sdk-v2.mjs`,
`scripts/test-approval-admin.mjs`, `scripts/test-approval-admin-browser.mjs` and
`scripts/test-settings-approval-workspace-browser.mjs`. The workspace fixture
covers parent navigation, dirty/unknown writes, same-token recovery, new-draft
retention, modal progress, focus/inert restoration and picker scroll behavior.
