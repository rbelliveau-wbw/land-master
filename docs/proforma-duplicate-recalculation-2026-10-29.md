# Pro Forma duplication and recalculation — October 29, 2026

Proforma Manager **1.80.135** permits anyone who can view a saved source to
duplicate it. The old owner/Edit All requirement blocked non-owners. The copy
uses the existing fork/save path: separate parent and child IDs, source owners
plus its creator, unlocked Draft, cleared approval state. Source edit/save,
approval, visibility and native Creator permissions remain enforced. Read-only
widget access can create a staged copy; this does not grant editing rights to
existing records. Ordinary New permissions remain unchanged.

The final native header update runs the Creator engine synchronously. Its former
30-second deadline could report Save failed while Creator was still calculating.
Only that update (and its existing definitive precision-rejection fallback) now
uses 180 seconds. This changes the wait budget, not calculation speed. Ordinary
writes remain at 30 seconds. Actor checks, pending-save locks, retained unknown
outcomes and no replay after a lost/late reply remain in force.

## Creator change and promotion

In **Development**, Add_Pro_Forma → workflow **Calc IRR/XIRR - Pro Forma**
(`Calc_IRR_XIRR_Pro_Forma`) → Deluge action was saved and accepted by the native
editor. Promote this workflow to Production separately; PMP leaves Creator
promotion to the user. No new fields, functions, APIs, profiles or permissions
are required.

The existing workflow fetched all Proforma_Months rows, fetched month numbers
again, then ran a separate Cash_Flow sum query per month. It now aggregates
Month1/Cash_Flow from the first scoped collection into a Map. A 106-month schedule
uses **one query instead of 108**. Existing month-count/iteration semantics,
overlapping phase sums, null/negative cash flows, ROI, IRR and XIRR formulas are
preserved. This reuses the existing native collection and Map/List patterns;
there was no reusable aggregate helper for this workflow.

Affected data: Add_Pro_Forma.ROI1/IRR/XIRR; reads Proforma_Months.Proforma,
Month1 and Cash_Flow. Existing Save_PF and SDK writes are reused without API or
schema changes. Approval, LOI, PDFs and emails are outside this change.

Exact live baseline and optimized action bodies are under
`creator/workflows/proforma-recalculation/`.

## Verification

- Executed the actual before/after Deluge bodies against empty, zero, null,
  negative, overlapping, gapped, 106-month and 600-month schedules: identical
  ROI/IRR/XIRR, scoped to the selected parent, month rows unchanged, 108 → 1
  queries for 106 months.
- Actual widget save fixture verifies non-owner/read-only duplicate creation,
  distinct parent, retained source, creator ownership, protected source edits,
  approval protection, invalid/missing source and unchanged ordinary New access.
- Actual transport/save fixture holds the engine request beyond the ordinary
  deadline, completes on acknowledgement, and checks the 180-second expiry,
  retained draft, duplicate-save block and late-reply no replay.
- Native Development financial recreation, 106 months, was saved before and
  after the workflow edit. Final engine request was 4,335 ms before and 3,900 ms
  after; whole saves were 8,179 ms and 8,141 ms. Both completed, with ROI 123.35%,
  IRR 41.53% and XIRR 50.43%. This is one small test pair with fewer cost items
  than the reported production record; it does not establish a production time
  guarantee. The deterministic improvement is removal of per-month queries.

Release gates passed: `npm run validate`, `npm run build:pages`,
[GitHub CI](https://github.com/rbelliveau-wbw/land-master/actions/runs/40991215264)
and [Pages](https://github.com/rbelliveau-wbw/land-master/actions/runs/40991215281).
After deployment, native Development preview as demouser_1 (Dev/Land Acq,
read-only widget flags and not a source owner) showed Duplicate while source Edit
remained disabled. Saving the financial recreation produced a distinct record,
retained the source owner, added the creator and returned the same ROI/IRR/XIRR.
The saved record reopened at Ready. Desktop screenshots and private save timing
logs are retained in the local `proforma-test-results` folder outside this repo.

## Release and rollback

Changed implementation: widget.html, pf-controller.js, duplicate/recalculation
regressions, package validation command, module guide, version/hash metadata,
immutable 1.80.135 assets and Development/Production mappings. Permanent Creator
widget URLs remain the same. Stage is not promoted.

Frontend rollback: set the Production Proforma Manager mapping to **1.80.134**
and rebuild/publish Pages. Development stays on the latest complete release per
repository policy. Creator rollback: restore
`Calc_IRR_XIRR_Pro_Forma.before.dg` in the same Development workflow action and
promote it if the optimized action was already promoted. No data migration or
record deletion is involved.
