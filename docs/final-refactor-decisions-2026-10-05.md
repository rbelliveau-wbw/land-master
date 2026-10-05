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
