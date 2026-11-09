# Budget All Requests — 122.29.116

Requests is the second main Budget Manager tab. Opening it explicitly (or using
the Requests deep link) starts its reads. Startup, Approvals and All Budgets do
not initialize or fetch the index. Reopening the tab reuses the current scoped
snapshot. Refresh explicitly re-reads the sources.

The Connected Rail list defaults to newest first, grouped by Date. Group By also
offers Project, Territory, Request Type, Status and None. Named groups sort
alphabetically; requests within each group retain the selected chronology.
Missing dates stay last in either direction. Search includes vendor, description,
project, phase, territory and available linked item labels/reasons. Type and
Status use the existing searchable multi-select presentation. Selecting Bud Mods
also includes owning POs with verified children. Group settings use searchable
single-select pickers. Disclosures and filters survive refresh and tab reopening.

## Existing Native Contracts

The index uses the existing scoped request loader with attachment preloading
disabled, for each Budget already returned by the startup report. At most three
phase loads run concurrently; each phase preserves the existing bounded-three
submitted-PO child reader. It does not load Budget Items or files to build the
index. First display waits for the modification read and complete phase results;
PO headers and children never reveal as separate intermediate snapshots. A
same-scope complete index stays mounted during refresh, without rebuilding its
rows for each phase completion. Failed phases are removed and identified with
Retry. Modification/report denial has its own honest notice. Actor, permission,
environment or accessible-budget changes clear retained rows and invalidate
in-flight publication; a changed existing scope forces fresh reads.

PO children keep the exact Budget/PO/revision match and display-only fallback.
The shared rail renderer preserves a native item lookup's display label only
when its string ID matches the verified child. Supplemental child values never
enter financial caches. Counts separate primary requests from linked Bud Mods;
there is no combined payment/modification dollar total. Unknown attachment counts
are omitted in the index because those files have not been requested.

View/Edit/Download/Attachments and modification actions first open the exact
phase Requests view, wait for current detail, then invoke its current visible
action through the existing dispatcher. A stale or no-longer-permitted action
cannot use a retained index button. Native modals restore focus to a visible
phase action. Back/Escape returns to the global Requests tab. New Request selects
an eligible phase and opens its existing request-type menu. No approval path,
create/update payload or PO-addition behavior was introduced.

## Change Inventory

- Widget: `widget.html`, new `budget-requests-workspace.js/css`, config, manifest,
  immutable release and Development/Production mappings.
- Shared registries: Requests pane/keyed rows and numeric request/group/phase
  counts/amounts, with synchronized standalone registry copies in other widgets.
  No other widget's branch behavior changes.
- Existing forms read: Add_Budget, Subdivisions/Projects through existing hydrated
  startup data, Payment_Request, Budget_Modification and existing approval data.
  Fields reused include ID, Budget, Budget_Item, Request_Type, Request_Amount,
  Request_Date, Added_Time, PO_Status, PO_Approval_State, PO_Revision,
  PO_Description, Vendor, Effective_Date, Reference_Number, Status, Amount,
  Modification_Type and Reason. No new or modified native fields.
- Existing reports: All_Wire_Requests and All_Budget_Modifications.
- Existing function/Custom API: managePurchaseOrder / Manage_Purchase_Order,
  read-only List, Vendors and Get. Existing native action handlers remain intact.
  No new function, API, permission or Creator deployment is required.

## Verification and Rollback

`test-budget-requests-workspace.mjs` exercises inert initialization, deduplicated
bounded loading, cache reuse, native lookup/string ID shapes, close-ID/date ties,
both chronology directions, all grouping/filter rules, exact PO children,
partial denial, changed actor cancellation and guarded existing-action handoff.
Existing PO Requests and Connected Rail tests exercise the shared renderer and
scoped loader regressions. Desktop in-app-browser verification uses an explicit
read-only native-shaped fixture: second tab, date/project/territory grouping,
linked-child search and Bud Mod filtering, collapse retention and refresh.
Financial submissions remain stopped at the user's direction.

Release gates: `npm run validate`, `npm run build:pages`, design/motion/numeric
adoption checks. Production promotion follows the permanent URL environment map.
Rollback the Budget Manager Production mapping to **122.29.114**. Development
retains the latest complete immutable release under the standing release rule;
use a new fix-forward release if Development also needs the previous behavior.
No data migration or Creator rollback is needed.
