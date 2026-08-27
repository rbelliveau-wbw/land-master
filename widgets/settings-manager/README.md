# Settings Manager

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

No Custom APIs. Reads and writes go through `ZOHO.CREATOR.API` only.

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
- **Construction Curve** — the `Construction_Curve` grid, grouped by `Cost_Curve` with a
  per-curve **% total** badge that flags any curve not summing to 100%.
- **Other fields** — anything on the record this widget does not explicitly model, rendered as
  plain text inputs so a newly added Creator field is never silently hidden.

## Behaviour worth knowing

- **Batched autosave.** Every control writes into a pending map and schedules a flush 700 ms
  later; one `updateRecord` carries every field touched in that window.
- **Singleton tripwire.** The widget reads `All_Settings` unfiltered. One record → green banner.
  More than one → red banner listing the extras, because a second record makes all six nightly
  schedules fire twice a day and makes the app's 24 `Settings[ID != 0]` reads ambiguous. See
  `creator/SETTINGS_SINGLETON_HANDOFF_2026-08-27.md`.
- **Multi-select encoding is adaptive.** Creator's list-field write shape is a per-field
  property (array / comma string / bare id) and it can answer `code 3000` while silently dropping
  a value. After a write the widget reads the row back, compares list lengths, and retries with
  the next encoding, memoizing whichever wins.
- **Curve rows are child records, not a nested subform array.** They are written to the
  `Construction_Curve` form with the `Settings` back-pointer set — matching how
  `proforma-manager` handles the same grid. A row written without that link gets reaped by
  `Delete_Orphaned_Objects`.
- **`Builder_Contract_Action_Template` display.** Creator's own display format on that field is
  `[Contract_Template + " - " + Contract_Template]`, so every option renders as `"Lot - Lot"`.
  The widget shows the `Action` text instead.
- **No add path.** The widget can create `Construction_Curve` rows but never a `Settings` record.

## Local preview

Serve `src/app/` over http and open `widget.html`. With no Creator SDK the widget falls back to a
read-only demo record so layout can be checked offline.
