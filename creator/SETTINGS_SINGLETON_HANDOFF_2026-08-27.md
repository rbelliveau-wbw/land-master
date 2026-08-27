# Creator handoff — Settings singleton guard + Settings Manager widget

Two deliverables, independent of each other:

1. **Deluge only** — a form workflow that makes a second `Settings` record impossible.
2. **Widget** — `settings-manager`, a grouped editor for the single Settings record, to be
   added to the existing `Settings1` page below the current iframe snippet.

No form fields, no report layouts, no Custom API changes.

---

## Why a second Settings record is a real problem

`Settings` is a singleton by convention only — nothing enforced it until now.

**1. Six daily schedules are anchored on this form.** They are declared as
`type = schedule, form = Settings, start = Next_Workflow_Run, frequency = daily`.
Creator fires a form-anchored schedule once **per record**, so a second row runs every one of
them **twice a day**:

| Schedule | What a double-run does |
|---|---|
| Test Add Hours | Advances `Next_Workflow_Run` twice — the anchor drifts |
| Set Close Date - Lots | Duplicate Close Date / Status writes across Lots |
| Update Sold/Contracted - Forecast Year | Forecast Year totals recomputed twice |
| Update Actual Lots - Forecast | Forecast actuals recomputed twice |
| Check for Stuck Budget Approvals | Duplicate alert emails |
| Update Budgets w/ Projects Info - Budget | Duplicate Analytics pull + budget writes |

**2. `Settings[ID != 0]` appears 24 times** across the export and `creator/functions/*.dg`, and
it is consumed as a **single record**, not a collection — e.g. `sendApprovalReminders.dg`:

```
settingsRec = Settings[ID != 0];
vInterval = ifnull(settingsRec.Approval_Reminder_Interval_Days,0).toLong();
```

With two rows that read becomes ambiguous and silently picks one.

**Current state (verified live 2026-08-27): exactly one record, `4410926000000769023`.**
The All Settings report reads `Showing 1 of 1`. So this is purely preventative — there is
nothing to clean up first.

---

## Component 1 — "Only One Settings Record - Settings" (NEW form workflow) — REQUIRED

Source: `creator/workflows/Only_One_Settings_Record.dg`

App builder → **Workflow** icon → **New Workflow** →

| Setting | Value |
|---|---|
| Workflow type | Form |
| Form | `Settings` |
| Record event | **A record is added** — *not* "added or edited" |
| Trigger | **On validate** (before the record is added) |
| Name | `Only One Settings Record - Settings` |

```
existingCount = Settings[ID != 0].count();
if(input.ID != null)
{
	existingCount = Settings[ID != input.ID].count();
}
if(existingCount > 0)
{
	alert "Only one Settings record is allowed. A Settings record already exists - open Settings from the menu and edit that record instead of adding a new one.";
	cancel submit;
}
```

> ### ⚠ The one way to get this wrong
> **Never set the record event to "on add or edit."** On an edit the record already exists, so
> `Settings[ID != 0].count()` returns 1, the guard cancels **every** Settings save, and the form
> becomes permanently unusable. 25 of the 31 on-validate workflows in this app use
> "on add or edit" — do not copy one of those by reflex. The pattern to copy is
> **"Field Validations - Mass Create Forecasts"**, one of only three that use "on add".
>
> The `input.ID` branch is belt-and-braces: if someone later flips the trigger anyway, the guard
> excludes the record being saved instead of bricking the form. On an add `input.ID` is null and
> it degrades to the plain count.

### What this covers

| Vector | Covered? |
|---|---|
| Native `Settings` form Add (menu, form-perma URL) | ✅ |
| `All_Settings` report **Add** button | ✅ |
| Quick-create / add-from-lookup on Settings | ✅ |
| Data API add **without** `skip_workflow` | ✅ (the alert text comes back as the error) |
| Data API add **with** `skip_workflow` | ❌ caller-chosen bypass, not closable from Deluge |
| Deluge `insert into Settings [...]` | ❌ `alert`/`cancel submit` are no-ops server-side |
| CSV / bulk import with workflows suspended | ❌ |
| Admin creating a record with workflows suspended | ❌ |

There are **zero** `insert into Settings` statements in the app today, so the uncovered rows are
future-regression vectors rather than live holes. Components 2 and 3 close what is left.

---

## Component 2 — "Neutralize Extra Settings Record - Settings" (NEW, optional backstop)

Source: `creator/workflows/Neutralize_Extra_Settings_Record.dg`

Same form, **record event = on add**, trigger = **on success**. It cannot stop an insert that
skipped validation, but it clears `Next_Workflow_Run` on the new row so the six schedules keep
firing once, and emails you to delete it.

The keeper is **derived as the oldest row (lowest ID)**, never hardcoded — so it can never null
the anchor on the legitimate record. If only one row exists, `keeperId == input.ID` and it does
nothing.

> Nulling `Next_Workflow_Run` on the *legitimate* record would silently stop all six nightly
> jobs, and only "Test Add Hours" re-advances the anchor — they would never self-recover. That is
> why the keeper is derived rather than pasted in. Ship it deactivated first if you want to watch
> it before trusting it.

---

## Component 3 — revoke `Create` on Settings from the portal profile — RECOMMENDED

One non-admin profile can currently create Settings records. Everything else has no `enabled=`
line on Settings at all.

Profile **"Portal - Aynsley - Forecasting & Tax"** (`Customer_Portal`, `ApiAccess: true`):

```
Settings
{
    enabled= Create,Viewall,Modifyall,Tab
```

Change to:

```
    enabled= Viewall,Modifyall,Tab
```

This is the only real control against a Data API caller that passes `skip_workflow`, since that
bypasses both Deluge layers.

---

## Component 4 — register the `settings-manager` widget

The widget is hosted on GitHub Pages by the repo's normal pipeline — merging to `main` **is** the
deploy. Creator just needs to point at the URL once.

1. App builder → **Settings → Widgets → Create Widget**
   - Name: `Settings Manager`
   - Hosting: **External**
   - URL: `https://rbelliveau-wbw.github.io/land-master/prod/settings-manager/widget.html`
2. Page builder → page **`Settings1`** → drag a **Widget** element in **below the existing HTML
   snippet** → bind it to `Settings Manager` → Save.

That URL is a permanent integration contract. Every later version bump changes only
`deploy/environments.json` in the repo — never re-register the URL.

### What the widget does

- Groups the record into **Automation & Scheduling / Forecasting / Contracts & Legal / Budget /
  Pro Forma Defaults / Construction Curve** instead of one flat form.
- **Autosaves** on change — one debounced `updateRecord` carries every field you touched, so
  editing five fields is one write.
- Shows the **six schedules** that `Next_Workflow_Run` reschedules, right next to the field.
- Renders `Receive_Legal_Notifications` as **validated email chips** instead of a raw comma string.
- Gives both template lookups a **searchable multi-select**. Creator's own display format on
  `Builder_Contract_Action_Template` is `[Contract_Template + " - " + Contract_Template]`, which
  renders every option as `"Lot - Lot"`; the widget shows the actual `Action` text.
- Edits the **Construction Curve** grid as child records on the `Construction_Curve` form
  (the grid's `Settings` link is the back-pointer), grouped by curve with a **% total** badge that
  flags any curve not summing to 100%.
- Flags that **all 8 Pro Forma percentage defaults are currently blank**.
- Renders a **red banner listing every extra record** if it ever sees more than one Settings row —
  a visible tripwire in case the guard is removed.
- Renders any field on the record it does not explicitly model under **"Other fields"**, so a field
  added to the Creator form later is never silently hidden. (This mattered: the
  `2026-08-06` export is missing `Approval_Reminder_Interval_Days`,
  `Next_Approval_Reminder_Date` and `COO_Approval_Threshold`, all of which exist live.)

---

## Test plan after installing Component 1

1. Open the `Settings` form directly and click **Add** → expect the alert, no new row.
2. Open the `All_Settings` report and click **Add** → same.
3. Confirm record `4410926000000769023` still saves normally from the `Settings1` iframe.
4. Confirm `Settings[ID != 0].count()` is still exactly **1**.
5. Confirm `Next_Workflow_Run` on `4410926000000769023` was not touched.

## Note on the export

`creator/exports/Land_Master_2026-08-06.ds` is **stale** — it predates three fields that exist
live. Re-pull the app definition before relying on it for anything else.
