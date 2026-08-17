# Creator handoff — rejected-modification recovery + watchdog rewrite

Everything below is Deluge only. **No form fields, no report layouts, no Custom API changes.**
The `reopen` action rides the existing `Modification_Admin` Custom API, which already passes
`action` through.

## Already done — do not redo

- Widget **122.13.0** is live in production. It is externally hosted on GitHub Pages, so the
  `deploy/environments.json` promotion + green Pages deploy is the whole deployment. No ZIP,
  no upload, no URL change.
- The Dev/Land Acq - Proforma & Budgets profile change published to Stage and Production
  (both on version **7.2**).

> **Heads up:** the widget already shows a **Revise & Resubmit** button on rejected
> modifications. Until component 1 below is saved, clicking it returns
> `ERROR: Unknown action.` and shows a failure toast. Nothing is written and nothing is
> damaged — the chain delete never runs, because the action never matches.

---

## Component 1 — `modificationAdmin` (EDIT existing function)

**Signature is unchanged.** Open the existing function and replace the whole body.

```
string modificationAdmin(string action, int modificationId, int budgetId, string modType, string amount, string reason, string reference, string effectiveDate)
```

Source: `creator/functions/modificationAdmin.dg`

The only change is a new `reopen` action inserted immediately before the `repair` block, plus
the action list in the header comment. If you would rather patch by hand than paste the whole
function, insert this directly above the line `if(vAction == "repair")`:

```
	if(vAction == "reopen")
	{
		vModId = modificationId.toLong();
		modRec = Budget_Modification[ID == vModId];
		if(modRec == null)
		{
			return "ERROR: Modification not found.";
		}
		vStatus = ifnull(modRec.Status,"").trim();
		if(vStatus == "Approved")
		{
			return "ERROR: An approved modification cannot be reopened. Delete it instead.";
		}
		if(vStatus == "Submitted")
		{
			return "ERROR: This modification is already in approvals.";
		}
		delete from Budget_Approvals[Budget_Modification == vModId];
		modRec.Status="Draft";
		modRec.Approved_On=null;
		modRec.Approved_By="";
		checkRec = Budget_Modification[ID == vModId];
		if(checkRec != null && ifnull(checkRec.Status,"").trim() != "Draft")
		{
			return "ERROR: The approval chain was cleared but the status did not save. Try Revise & Resubmit once more.";
		}
		return "OK: Modification reopened for revision.";
	}
```

Why it deletes the chain instead of resetting the rows: rebuilding on submit picks up the
current territory VP and the current COO threshold, so a resubmit routes the same way a fresh
create would.

---

## Component 2 — `approvalWatchdog` (CREATE new function)

- **Name:** `approvalWatchdog`
- **Arguments:** none
- **Return type:** `string`

Source: `creator/functions/approvalWatchdog.dg` — paste the whole file.

This replaces the standalone watchdog script you have now. If that script currently lives in a
**Schedule**, change the schedule body to a single line so there is only one copy of the logic:

```
result = thisapp.approvalWatchdog();
info result;
```

### What changed vs. your current version

Your version only ever walked budget tracks, so pro forma and modification chains could stall
invisibly. It also keyed on `Type1`, which pro forma rows do not reliably carry, and it bucketed
every modification row on a budget under one key.

- Rows are classified by **which lookup is populated** (`Budget_Modification` / `Proforma` /
  `Budget`), not by `Type1`. Modifications key individually.
- **Modifications:** repairs delegate to `sendModificationEmail` with `created` / `approved` /
  `rejected`, which already picks the next approver, stamps the record and runs the
  Revised/Modified Final rollups. Submitted modifications owning no rows at all get rebuilt via
  `submitBudgetModification`.
- **Pro formas:** promotes the next step and resends, or stamps `Approved` when every step
  already approved but the record never flipped.
- **Budget tracks:** repair behavior unchanged.
- **No longer skipped silently:** a rejection that never landed back on a prior approver is now
  reported (not auto-fixed — guessing which row to reopen could reverse a decision someone
  made), and rejected modifications are listed separately as *awaiting revision* rather than
  counted as stuck. Orphaned Modification rows are counted as a health signal.
- Returns `OK: no stalled approval chains found.` and sends no email when there is nothing to
  report.

Callee functions it uses, all of which already exist: `sendModificationEmail`,
`submitBudgetModification`, `Send_Proforma_Approval_Email`, `sendApprovalEmail`,
`syncBudgetApprovalStatus`.

---

## Publish

Dev → **Publish → Stage** (Select All → Proceed → Minor, 7.2 → 7.3) → then
**Publish → Production**, select 7.3, Proceed → Publish Now → Publish.

Expected diff: 2 components under Functions (`modificationAdmin`, `approvalWatchdog`), plus the
schedule if you repoint it.

## Verify

1. Open the rejected **Bedding Material / EP01-3417** modification → **Revise & Resubmit**.
   It should return to Draft with no chain, then Submit rebuilds VP → CFO (→ COO if over the
   threshold).
2. Run `approvalWatchdog` once from the editor. With nothing stalled it returns
   `OK: no stalled approval chains found.` and sends nothing.
