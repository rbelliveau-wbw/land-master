# Requests API Repair — 122.29.120

122.29.116 scanned all 102 phases, repeatedly downloading the whole vendor
catalog and adding per-PO reads. Creator rejected calls with minute quota 2955;
phase workers and detail-report fallbacks continued adding traffic.

The index now uses one authenticated PO header call, one complete request-report
read and the existing shared modification read. Report pagination still verifies
the complete count. There are no per-phase List/Vendors, per-PO Get, attachment
or detail calls. New Request reuses the existing Add menu/composer with Bud Mod,
Check Request, Wire Request and Purchase Order, excluding Budget. The blue action
keeps an intrinsic width and fixed eight-pixel label/arrow gap.

## Creator Contract And Deployment

The existing managePurchaseOrder(string payload) function adds read-only
ListRequests. It accepts existing authenticated userAccessId, anchor budgetId,
and 1–500 unique exact-string budgetIds. All phases must exist and the anchor
must match before any PO rows are read. Read capabilities match existing List.
The response identifies requestIndexContract po-request-index-v1. Existing List
headers gain phase ID, used vendor name, description, commitment state, linked
modification ID and the existing captured approval bundle. Existing List shape,
writes and approval behavior remain unchanged.

**Creator compilation/publication and live verification remain required.**
Publish the function update before expecting the global index to load. The
frontend shows Requests Update Pending against older functions, without falling
back to a phase scan. Existing individual-budget Requests and New Request paths
remain available. The existing Manage_Purchase_Order API registration is reused.

The complete scope and exact identities are checked before snapshot replacement.
Embedded children pass existing PO/revision checks and stay outside financial
caches. Denied/columnless generic reports retain authorized POs with an honest
Check/Wire notice. Actor/scope changes clear rows. Failed same-scope refreshes
retain complete rows with explicit Retry. Ordinary reopening/filtering uses
cache; request write refreshes invalidate the index. Category/item fallback
reads stop on quota, permission, cancellation and transport failures.

## Inventory, Verification And Rollback

Frontend files: widget HTML, Requests JS/CSS, config/manifest, immutable release,
Development/Production mappings and regression scripts. Backend: existing
managePurchaseOrder and its test fixture. Existing forms read: Add_Budget,
Payment_Request, Vendors, PO_Operation, Budget_Modification and existing approval
bundle forms. Existing ID, Budget, Budget_Owner, Archived, Vendor, Vendor_Name,
PO header/receipt and approval/modification fields are reused. No forms, fields,
grants, API names or persisted data change.

Actual-source JavaScript/Deluge regressions cover 102 phases in one API call,
captured children, original List shape/permissions, used-vendor lookup, unsafe/
duplicate/foreign IDs, actor change, denied reports, old backend, quota failure
without fanout, cache reuse, Add menu permissions/keyboard flow and suppressed
detail fallbacks. Existing PO, Connected Rail, create, reallocation and approval
checks remain required. Full gates: npm run validate and npm run build:pages.
Desktop visual verification uses actual assets with a read-only fixture. No
financial Save/Submit is used for testing.

Published 122.29.117 is preserved; 122.29.118 and 122.29.119 remain immutable candidates. 122.29.120 contains final presentation
and cache invalidation. Frontend rollback: Production Budget Manager 122.29.114,
before the global tab. Development retains the latest complete release. Backend
rollback: managePurchaseOrder from commit 872117da. No data rollback is needed;
older frontends ignore the additional action.
