# Budget Exceptions Access

The new permission is independent of Lot Sales, Forecasts, budget editing and
budget approval grants. It defaults off. The frontend stays hidden and performs
no Budget Exceptions data reads until the signed-in user's existing access API
returns `hasRow: true` and `budgetExceptionsDashboard: true`.

## Creator Development

1. Open Land Master Development's existing **User Access** form (`User_Access`).
   Its **Data Insights** section link name is `Data_Insights`, verified in the
   October 21 DS source; it contains **Lot Sales Dashboard**, **View Total Lot
   Revenue**, and the subsequently installed **Forecasts Dashboard** grant.
2. Add a **Decision Box** in that section, labeled **Budget Exceptions
   Dashboard**, with exact field link name `Budget_Exceptions_Dashboard`.
   Keep Initial Value and Mandatory unchecked. Use the tooltip in `changes.json`.
   Save, close, reopen, and confirm the field properties before editing functions.
3. Save the checked-in complete bodies of
   `creator/functions/getUserAccess.dg` and `getUserAccessLean.dg`. Both add the
   independent flag and return the Creator application date when Forecasts or
   Budget Exceptions is granted. Close/reopen and compare their complete bodies.
   Existing Development wrappers delegate unchanged. Do not change API bindings,
   audiences, login identity handling, or unrelated permission flags.
4. On **User Access** (`User_Access_Report`), make the new permission available
   beside the other dashboard grants for administrator selection. Do not copy
   unrelated existing grants or bulk-enable this field. No user has been selected
   for a new grant in the repository change.
5. Intended viewers also need native **View** access to the existing reports and
   fields in `budget-exceptions-adapter.js`. The dashboard grant never grants
   editing, approval, or additional native report access. Do not add write rights
   solely for this dashboard.

Development app: <https://creatorapp.zoho.com/wbdevelopment/environment/development/land-master/#Page:Data_Insights>

Existing production app: <https://creatorapp.zoho.com/wbdevelopment/land-master/#Page:Data_Insights>

The permanent external widget remains
<https://rbelliveau-wbw.github.io/land-master/prod/insights/>. Keep the existing
page and widget registration. No extra page variables or new Custom API are needed.

## Verification And Promotion

Record saved/reopened field, function, User Access availability and signed-in
runtime evidence in `changes.json`. Test no grant, unrelated grants,
Budget-Exceptions-only access, revoked access, an explicitly denied dashboard
route, report denial and an incomplete report. A revoked/failed check must clear
previous data and prevent further reads. Existing Lot Sales and Forecasts grants
retain their current meaning.

PMP authorizes the repository release to main and production. Creator native
Stage/Production promotion stays with the user; do not promote it from this task.
The new production dashboard remains hidden until its field/functions are
promoted and an administrator grants an intended viewer access. Roll back the
widget mapping to the prior immutable release if needed. The optional field can
remain; revert only the additive function flag/date condition when rolling back
native access, preserving all unrelated flags.
