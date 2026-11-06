# Construction Rejection Installation

Follow [change.json](change.json) in order and verify
[permissions.json](permissions.json) for CFO, Dev/Land Acq - Proforma & Budgets,
and Construction Budgeting. [reports.json](reports.json) lists the only required
existing report-field projections.

`Construction_Review_Log.form.ds` is a new internal form. Its mandatory unique
`Claim_Key` is required for concurrent decision and mail-attempt safety. The
optional parent field is a separate additive fragment. Prepend the Contract guard inside
the existing sole `Field_Validations_Contrac` script, preserving the full current
body and City policy; do not add a duplicate workflow or action. Install the two
internal log guards on their respective events. The form and
its generated reports receive no application-profile access.

Full behavior, profile separation, notification recovery, regression and
rollback are in [the feature guide](../../../docs/construction-rejection-2026-11-06.md).
Actual native source/profile readbacks belong in `native-install-progress.json`;
candidate source and offline checks do not establish live installation or
Stage/Production publication.
