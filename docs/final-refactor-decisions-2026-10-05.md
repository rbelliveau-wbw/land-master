# Final refactor decisions — October 5, 2026

The user resolved all three outstanding decisions:

- Settings action choices are Contract_Actions records with Template_Action
  checked. Current native Development markup confirms the checkbox link name
  Template_Action and action-text link name Contract_Action. Saved selections
  remain exact ID sets, including unchecked or currently unresolved records.
  The existing Builder approval predicate is unchanged.
- Insights 1.5.42 may use a read-only Production gate instead of the unavailable
  authorized Development graph gate. This is the user's explicit exception to
  the earlier Development-only test instruction; no dashboard grant is changed.
  Production 1.5.40's current/previous-year baseline is captured before promotion.
- Takedown Purchase Date is the advance closing date; the existing Creator
  schedule copies it to lot Close Date on arrival. Manage Lots 0.9.20 labels the
  existing Purchase_Date as Close Date in its report and read-only detail modal.
  Date values, scheduled/sold status and business writes are unchanged.

Settings 1.3.7 requires its native Development read/option/selection gate before
Production promotion. Earlier 1.3.3 native Development scalar save/read/restore
evidence remains separate; this change does not introduce another live write.
Whole-source regressions cover complete 2,001-record action pagination, checked
and unchecked rows, malformed/omitted fields, failed/stale scopes, preserved
saved IDs, exact readback and no mutation replay. Native Production checks are
read-only. Manage Lots' whole-source tests verify both date surfaces and no writes.

Full validate and Pages build pass for the new immutable releases. Further
Creator backend promotions remain the user's responsibility; this release makes
no native Creator configuration, workflow, permission or business-record changes.

Rollback mappings: Settings 1.3.1, Insights 1.5.40 and Manage Lots 0.9.19. Stable
Creator widget registrations do not change.

## Native results

Commit 9fa1f73 passed CI 37335015067 and Pages 37335015276. Native Development
Settings 1.3.7 retained every one of the 23 scalar controls and both selected-ID
sets exactly against 1.3.6. Actions became available with 16 checked template
choices; the three saved action IDs and two approval IDs were retained. This
was a read-only gate, with no Settings, curve or schedule writes.

Under the user's approved alternate gate, native Production Insights 1.5.42
marked recent-ready at 3,242 ms (3,327 recent lots), first-usable at 3,289 ms with
historyReady false, and history-ready at 7,903 ms (25,527 complete lots). All 38
tracked requests completed without failure; no reads remained queued or pending.
These are one-run observations, not a controlled latency percentage comparison.
All 218 body rows, selected totals and summary matched the captured 1.5.40
baseline exactly for both the two-year view and all-history view (249 months).
Historical data and recent results therefore remain complete for those scopes.
No data, permission, financial, schedule or approval write was used as a test.

Settings Production promotion commit 9c02d3a passed CI 37337304335 and Pages
37337304073. Native Production 1.3.7 preserves all 22 previously displayed
scalar controls by field, type, value and checkbox state, and both saved lookup
ID sets exactly. Its complete read also exposes Current_Batch, making 23
controls. The approval picker retains two choices and zero selected IDs; the
action picker retains seven selected IDs and now offers 15 checked template
choices. This gate was read-only. All nine Production widget mappings now use
SDK2. The separate earlier mutation and reduced-permission gaps remain in the
live ledger.

Native Production Manage Lots 0.9.20 retains 857 takedowns. Its first record
shows Entered 10/01/2026 and Close Date 10/15/2026 in both the report and
detail modal; the modal retains all 25 linked lots and stored financial values.
Only the date label changes in this successor; the Creator closing schedule
remains unchanged.

The cross-widget caller audit found the same obsolete Actions Contract_Template
assumption in Legal. Release 1.60.52 requires checked Template_Action, nonblank
Type_field and no Contract1 parent. Complete counted reads validate current
fields before selecting templates; unknown/incomplete results remain visibly
unavailable and block new-contract/template writes while retaining drafts.
Fresh seed snapshots do not overwrite ordinary actions. The separate Builder
approval predicate, recipients and Lot type fallback remain unchanged. Affected
read fields are Contract_Actions.Template_Action, Type_field, Contract1 and
Contract_Action; no form, function, Custom API or native Creator change is needed.

Candidate commit 2e4ee27 passed CI 37338981877 and Pages 37338981866. Native
Development Legal 1.60.52 matches all 19 list table rows (15 visible contracts)
exactly against 1.60.51. The complete core remains 21 contracts, 106 actions,
13 files and 37 approvals. Seven Acquisition template titles and six Lot seed
titles match exactly, with no template-unavailable warning. The new form was
cancelled; no contract, template, file, financial or workflow write was made.
Rollback for this frontend correction is Legal 1.60.51.
