# Settings Manager

## Shared approval administration candidate (1.4.0)

Development-only Roles, Assignments, versioned Policies, Preview and audit UI.
No adapter is enabled and existing approval workflows remain unchanged. Native
helper compilation, access guards and execution migrations remain required;
see the [implementation and native handoff](../../creator/functions/PURCHASE_ORDER_HANDOFF.md).

A grouped, autosaving editor for the **single** Land Master `Settings` record.

Before this widget, `page Settings1` was a bare iframe hardcoded to
`.../Settings/record-edit/All_Settings/4410926000000769023/` — the raw Creator form, with the
record id baked into the page source.

## Creator contracts

| Kind | Link name | Use |
|---|---|---|
| Form | `Settings` | The singleton record |
| Report | `All_Settings` | Read + update target |
| Form | `Construction_Curve` | Child rows of the curve grid |
| Report | `All_Construction_Curves` | Read/update/delete curve rows |
| Report | `All_Contract_Approvals` | Options for `Builder_Approval_Template` |
| Report | `All_Contract_Actions` | Options for `Builder_Contract_Action_Template` |
| Report | `All_Pro_Formas` | Options for the curve row `Pro_Forma` lookup |

Existing Settings and curve data use native `ZOHO.CREATOR.DATA` SDK2 methods.
The unpromoted approval administration candidate proposes the owner-only
`Manage_Approval_Policies_DEV` Custom API; it is not yet registered.
The existing critical-error reporter retains its separately configured Custom API.

## Sections

- **Automation & Scheduling** — `Next_Workflow_Run`, `Approval_Reminder_Interval_Days`,
  `Next_Approval_Reminder_Date`. The six daily schedules anchored on `Next_Workflow_Run` are
  listed inline next to the field, because changing it reschedules all of them.
- **Forecasting** — `Open_Forecasting_Window`, `Unlock_All_Forecasts` as toggles. Both are
  treated as danger switches: the row highlights amber while on.
- **Contracts & Legal** — `Receive_Legal_Notifications` as validated email chips;
  the two template lookups as searchable multi-selects.
- **Budget** — `COO_Approval_Threshold` (money), `Multi_Line`.
- **Pro Forma Defaults** — the eight percentage fields in a grid, with a banner counting how many
  are blank (all 8 were blank as of 2026-08-27).
- **AI Review** — `PF_Review_Criteria` (auto-growing textarea, sent verbatim to the model by
  `PF_AI_Review`), `PF_Review_Provider` (`openai` only), `PF_Review_Model` (an OpenAI model id,
  passed through as-is), `PF_Review_Criteria_Updated` (stamped by the widget whenever the criteria
  change, so each review can record which version it judged against).
- **AI Plat Import** — `Plat_Review_Criteria` (auto-growing textarea). When filled in it replaces the
  built-in transcription instructions inside `Plat_AI_Ingest` for every plat tile; empty keeps the
  default. Shares the AI Review provider and model.
- **Construction Curve** — the `Construction_Curve` grid, grouped by `Cost_Curve` with a
  per-curve **% total** badge that flags any curve not summing to 100%.
- **Other fields** — anything on the record this widget does not explicitly model, rendered as
  plain text inputs so a newly added Creator field is never silently hidden.

## Behaviour worth knowing

- **Batched autosave.** Controls retain revisioned drafts and schedule a flush 700 ms later;
  one `updateRecordById` carries every valid field touched in that window. Saved means a
  fresh full-field readback matched the captured record and every submitted value.
- **Singleton tripwire.** The widget reads `All_Settings` unfiltered. One record → green banner.
  More than one → red banner listing the extras, because a second record makes all six nightly
  schedules fire twice a day and makes the app's 24 `Settings[ID != 0]` reads ambiguous. See
  `creator/SETTINGS_SINGLETON_HANDOFF_2026-08-27.md`.
- **Exact lookup verification.** SDK2 writes lookup ID arrays once. Fresh readback must
  contain exactly the intended unique IDs; missing, extra or same-count wrong IDs retain
  the draft. Unresolved selected IDs remain visible. No alternative-envelope retries occur.
- **Complete Actions choices (authorized 2026-10-05).** Count and read the same Actions
  report completely, then offer only rows whose `Template_Action` checkbox is checked.
  The current native form confirms this checkbox and the `Contract_Action` text field;
  the removed `Contract_Template` field does not determine Actions eligibility. Failed,
  incomplete, missing-checkbox or malformed-checkbox reads keep the picker unavailable
  and preserve every saved ID, including unchecked or unavailable selections. Existing
  report permissions, scalar editing grants and the separate Builder approval rule remain
  unchanged. Native successor verification is a release gate.
- **Curve rows are child records, not a nested subform array.** They are written to the
  `Construction_Curve` form with the `Settings` back-pointer set — matching how
  `proforma-manager` handles the same grid. A row written without that link gets reaped by
  `Delete_Orphaned_Objects`.
- **`Builder_Contract_Action_Template` display.** The widget shows `Contract_Action` text
  with the existing type and sort order. It does not use the obsolete lookup display format
  `[Contract_Template + " - " + Contract_Template]`.
- **No add path.** The widget can create `Construction_Curve` rows but never a `Settings` record.
- **Safe reload.** Reload retains the selected singleton ID, publishes a staged snapshot,
  and is blocked by drafts or active writes. Failed lookup/curve reads keep their last
  complete data with unavailable controls. No browser navigation prompts are used.
- **Uncertain writes.** A lost or malformed response retains the draft and pauses further
  writes. Recheck saved values performs only fresh reads. Definitively rejected edits can
  be discarded explicitly; unknown creates require record review when no ID was confirmed.

See [SDK2 controller and validation gates](SDK2.md) for the 1.3.3 contract and test command.

## Local preview

Serve `src/app/` over http and open `widget.html`. With no Creator SDK the widget falls back to a
read-only demo record so layout can be checked offline.

## Spreadsheet import instructions (1.3.0)

AI Spreadsheet Import reuses Settings.Plat_Review_Criteria for CSV/XLSX column mapping and subdivision matching. Use starter instructions fills the editable field and saves through the usual autosave path; stored instructions are never replaced automatically. Publish the updated Plat_AI_Ingest function before promoting this version alongside manage-lots 0.9.3.

## Spreadsheet wording (1.3.1)

The section is Spreadsheet Lot Import and the field is AI Import Instructions. Help text describes CSV/XLSX column mapping, selected subdivision matching, and uncertain rows. Existing Plat_Review_Criteria values and autosave behavior are preserved. This wording update can deploy independently of the importer backend.

## Money input precision (2026-10-05)

The COO Approval Threshold money control displays at least two decimal places
and preserves every entered fractional digit on render, verified reload and
blur. Grouping formats the decimal text without converting it through Number or
rounding it. Money controls and the autosave controller share the same strict
currency parser, including signed-dollar, accounting and Unicode-minus credits.
`readControl` sends the cleaned decimal text; exact persisted verification uses
canonical decimal strings without Number conversion or tolerance. Blank and
invalid input retain their text, and malformed currency is rejected before a
native write. Count/percentage fields, lookup IDs and Creator field precision
retain their existing rules.

`scripts/test-systemic-currency-display.mjs` verifies repeated formatting and the
actual money control's autosave value, including high-precision amounts and
credits. The whole Settings SDK2 fixture verifies equivalent credit readbacks,
rejects changed signs/fractional digits and malformed grouping, preserves exact
record IDs and proves recovery performs only fresh reads. No Creator deployment
is required. Rollback uses the prior Production widget.

Percentage readback also compares exact decimal strings after validating grouped
numbers and an optional trailing percent sign. Neighboring high-precision rates
and malformed grouping remain unverified. Percentage controls, rate values,
calculations and integer-count validation retain their existing behavior.
Finite typed Number exponent representations expand exactly into decimal text
for currency and percentage verification; entered exponent strings remain invalid.

## Routine success feedback (1.3.11)

Uses the shared [success-feedback guide](../../knowledge/design/success-feedback.md). Existing inline green verification and progress/result dialogs remain. Routine confirmations describe the actual completed action; inline saves are grouped without delaying writes. Frontend only; no Creator deployment is required.
