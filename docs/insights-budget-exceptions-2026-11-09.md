# Budget Exceptions — Data Insights 1.7.0

November 9, 2026. A read-only dashboard combines overview cards with an expandable
Subdivision → Category → Budget Line hierarchy. Cards filter the hierarchy;
Search and custom Category, Territory and Project pickers scope cards and rows.

## Confirmed Definitions

- **Actuals, No Final:** GP or HCSS costs exist in a category without a saved
  Final baseline. Final is written on approval, so a persisted Final remains
  authoritative during a pending revision. Current approval status alone does
  not invalidate it. Missing Final is unknown, not a dollar zero. Native cleared
  zeroes need approved-track evidence to establish a genuine zero baseline.
  Unambiguous matching native category/item codes can retain a prior saved Final.
- **Over Final Budget:** flag each category whose GP actuals exceed its Final.
  Phase/card GP Overage adds positive known category overruns without offsetting
  unused budget elsewhere. A missing category Final does not erase a known
  overage in another category. The user explicitly confirmed this category basis.
- **Unbudgeted Costs:** a category has a Final but an active mapped line has no
  Final allocation (missing or zero). These costs are already included in the
  category/phase rollup and are never added again.
- **Approval Aging:** a current Development or Construction budget approval has
  been Pending for more than 14 days, using Sent_Date and Creator's application
  date. Exclude modification, Pro Forma, PO and stale former-cycle approvals.
  Missing dates are disclosed and never assigned an invented age.

GP and HCSS remain separate sources that may overlap. IDs remain strings.
Multiple flags can affect one phase, so phase counts and flag counts differ.

## Data And Coverage

The dedicated adapter reuses the shared count/cursor-reconciled report reader:
All_Budgets, All_Budget_Categories, All_Budget_Items, All_Budget_Approvals and
subdivision/project references. No Lot Sales or Forecasts grant is required.
Missing fields, unreadable amounts, mismatched parents and partial reads fail
visibly; no live synthetic-data fallback is published.

Category Final is Budget_Category.Budget_Total; line Final is Budget_Item.Budget_Ttl.
GP is PROJ_Actual and HCSS is HCSS_Actuals. Engineering and Development share the
Development approval track; Construction has its independent track.

Use the latest saved Budget Item snapshot per Subdivision. Never add earlier
revision actual snapshots together. Coverage includes saved Budget Item actuals
only; external GP/HCSS jobs without a Budget and unassigned import rows are
outside this draft. Archived budgets are not silently excluded. Existing native
report permissions still control readable parents/children. This dashboard does
not create/approve budgets, change costs or initiate imports.

## Interface, Loading And Permissions

The route is dashboard=budget-exceptions in the existing Quiet Workspace shell.
An unavailable deep-linked projectId remains an exact empty/unavailable scope;
Reset restores that route scope. Disclosures keep keyed rows, focus and scroll
mounted. Shared keyed-list/panel motion and Sliding Push numeric transitions are
used. The Forecasts loading card tracks the real complete read. Direct refresh
retains authorized complete rows; real errors expose Retry. Permission/identity
changes clear visible private results and cancel old replies. Same-actor
revalidation restores preferences only after authorization; another actor gets
fresh choices. Missing pending-approval dates are indicated.

User_Access.Budget_Exceptions_Dashboard is a new default-false checkbox.
getUserAccess and getUserAccessLean return budgetExceptionsDashboard and supply
Creator today when this dashboard or Forecasts is granted. Existing
Get_User_Access environment wrappers/APIs remain in use. Navigation, routing and
adapter reads fail closed without a User Access row and the specific grant.
No broad user grants or new native report-read rights are added.

Creator components requiring the user's promotion: the new User_Access field,
its User Access presentation, and the two access functions. The Development
field and both access functions are installed, saved and independently reopened;
the checkbox defaults false and no user grants were added. Native installation
and pending owner-promotion evidence is tracked in the
[Creator handoff](../creator/schema-changes/budget-exceptions-2026-11-09/INSTALL.md).
PMP promotes repository assets only, not Creator. Production keeps the dashboard
hidden until the native permission flag exists and is granted. No new Custom API,
financial field or approval workflow is added.

## Verification And Rollback

Focused tests cover native cursor/count completeness, lookup shapes, category
overruns, authoritative/prior/zero Final, HCSS-only costs, category rollups,
current approval age, multi-flag counts, missing fields/amounts, access/routing,
mounted controls, loading, retained refresh/errors, exact project scope, and
stale actor replies. Fixtures stay outside published widget assets.
Required checks are npm run validate and npm run build:pages before release,
then mapping/build verification after promotion. Desktop/native verification
and deployment evidence are recorded separately by the release owner.

Rollback Production by restoring lot-sales-explorer to 1.6.27 in
deploy/environments.json and rebuilding Pages; retain immutable 1.7.0.
The unused default-false native field/response flag may remain. Do not change
other widgets' mappings or promote/roll back Creator implicitly.

Repository validation parent: b011c0177a31025f1df4396b3dc1ae661b10f737.
The isolated feature checkpoint was rebased onto this latest-main baseline;
Budget Manager 122.29.105 and all other widget mappings are retained. The 1.7.0
release contains the same verified Insights source and remains immutable.

Release verification completed: full npm run validate and npm run build:pages
passed on the rebased b011 baseline before Production promotion and again after
the mapping change. All 35 stable environment paths built successfully. Both
Development/Production aliases (insights and lot-sales-explorer) publish 1.7.0;
all other widget mappings, including Budget Manager 122.29.105, are unchanged.
Every immutable 1.7.0 asset remains byte-identical to its source counterpart.
