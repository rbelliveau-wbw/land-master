# Pro Forma SDK2 Save speed and progress, 1.80.76

Fixes the quota-driven wait after ordinary Save and unnecessary Edit prerequisites.
Existing Dashboard/Edit do not load all Company, Builder, Property and template
options. New records and Offer still load the complete actor-bound reference set;
opening Offer retains a typed financial draft. Comment badges reuse current reads.

Exact-ID readback uses native DATA.getRecordById with field_config all and exact
string-ID, actor, cancellation and native error checks. Pro Forma collections opt
into cursor-first reads followed by one independent final count. Other widgets
retain their original count-first default and scheduling. Canonical adapter copies
are synchronized, but other widget release mappings do not change.

Save refreshes only the saved header and reuses its exact final engine readback.
The Dashboard uses this workflow's already verified installments/items/curves,
verified Lot Mix record readbacks, and the final server phase snapshot. Draft
objects and stale child IDs are never used as persisted snapshots. A failed save
does not publish these snapshots. Month/phase parity, intended child counts,
per-field checks, deadlines, retained unknown drafts and no-replay remain enforced.
Fixture Save plus Dashboard requests fall to 24. Pacing remains 45/61 seconds.

Ordinary Save has a spinner, plain-language status and progress bar, no header X,
and no pending footer button. Verified success auto-closes. Failures/unknown
outcomes retain the result and draft with Close available. Other transfers retain
their existing result dialogs.

Changed surfaces: shared adapter and synchronized copies; private Pro Forma
controller, save verifier, progress dialog and widget; fixtures/tests and guide.
Forms/fields and existing Custom APIs are unchanged: Add_Pro_Forma, children
Land_Installments, Proforma_Item, Construction_Curve, Lot_Mix_Row, Proforma_Phase
and Proforma_Months; Save_PF in Development and Save_PF1 in Production. No Creator
deployment is needed. Native Creator changes remain for the user to promote.

Regression gates: complete cursors/final counts, direct-ID malformed/denied/late
responses, original financial/phase/payload functions, preserved Offer choices and
dirty drafts, no unrelated Save refreshes, spinner/pending close lock, verified
auto-close, unknown retained result/no replay, all-nine-widget validate and Pages
build. Native Dev/Prod verification follows deployment. Rollback mapping: 1.80.75.
