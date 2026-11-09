# Request list

Budget Manager also exposes Requests as its second main tab. Load that index
only after explicit activation; use a complete bulk snapshot and the same rail
renderer/actions. Default to newest first with Date groups. Offer Project,
Territory, Request Type, Status and None through searchable single-select Group
By, with searchable Type/Status filters. Use the existing pale-blue group bands,
compact rounded toolbar and native smooth disclosures. Keep PO children with
their parent through search/filter/grouping, including Bud Mods filtering. Show
project/phase context above each row and distinguish primary from linked counts.
Do not preload line items or attachments for the index. Unknown attachment
counts remain omitted until their existing scope has been loaded. Preserve
same-scope rows and disclosures during refresh; surface incomplete reads with
Retry. Use the phase's current visible action after detail readiness, retaining
native permissions and a Back route to the index. See the
[implementation and regression notes](../../docs/budget-all-requests-2026-11-09.md).
New Request uses the existing Add menu without Budget, followed by its global
budget picker/composer. Preserve the blue action with intrinsic width and a
fixed eight-pixel label/chevron gap. See the [API repair](../../docs/budget-requests-api-repair-2026-11-09.md).

Repository-wide rule for applicable surfaces; see [scope and exceptions](README.md).

The phase Requests tab uses the selected Connected Rail layout: one newest-first
list of Purchase Orders, Check requests, Wire requests and budget modifications.
Keep one shared column grid so type pills, names/descriptions, approvers, dates,
amounts, statuses and icon actions line up across request types. Omit separate
Budget Modifications/Payment Requests headings and modification summary tiles.
Keep aligned columns on narrow screens with list scrolling; preserve keyboard
focus and action names.

Keep the action column shared, but pack only available icons together at its right
edge with 6px gaps. Do not reserve blank slots for an unavailable Edit or other
action. Linked modifications use that same right edge.
Saved request paperclips open their Attachments tab and show scoped file counts.
Saved Check/Wire rows also offer a read-only View action. Keep file associations
separate from approval administration; see [Attachments](attachments.md).

An unknown PO operation must not redirect saved-record View, Edit or Attachments
back to its progress result. Read the requested saved PO, retain its warning and
offer Check Status. Keep its fields, vendor creation, decisions, recovery and
request-file mutations read-only until the original actor/token is verified.
Close/reopen and another PO in the same phase must preserve that original
operation. Only explicit Check returns to its captured progress and reads its
status; opening a saved record never retries a mutation. Ordinary Budget files
and other request contexts retain their established permissions.

PO-created modifications sit immediately beneath their owning PO, with a fixed
indent and branch connector. Match exact PO identity, current revision and phase
using the stored PO reference; never use a vendor name or reason-text match.
Unmatched modifications remain standalone rows. The child displays item/code,
signed budget change and its approval relationship to the PO. Its budget increase
is separate from the parent payment amount. Keep underlying aggregates unchanged.
All rows use actual saved data; missing dates are last in the sort and show a dash.

Use a 2px warm-gold trunk with rounded SVG elbows into each child. Keep the last
trunk end relative to the child's center so rounded joins stay continuous at any
row height. Connectors are decorative and do not intercept pointer events.

The modification report may expose only records created by the current profile.
For submitted managed POs, the phase load reads the existing authenticated Get
snapshot with at most three requests in flight. Render its verified captured
children together with report rows, once per exact child ID. Preserve actual
report dates when available; missing dates stay unknown. Keep these supplemental
rows out of financial report caches. Failed child reads retain the PO and expose
an explicit unavailable/Retry state; changed actor/phase replies cannot publish.
An exact successful same-PO/phase/revision Get for a Submitted, Reserved PO with
Not Configured approval state and no captured bundle instead shows the neutral
"Approval history unavailable for this older PO." notice. Do not offer repair or
infer children from its historical link. Modern malformed or denied reads keep
the unavailable/Retry state and diagnostics.

After an acknowledged submitted PO save, approval decision or deletion, refresh
both request headers and budget modifications from native reads before the final
Requests repaint. Draft saves only refresh request headers. Retain navigation,
phase and actor guards; failed display reads expose the existing Retry state and
never replay a successful write.

# Payment request cards

Managed POs in Budget's phase Requests tab use the approved Soft rail row: PO pill,
vendor, captured approver circles, request date, amount, status and actions on one
horizontal line. Omit column headings and repeated Purchase Order text. Use a
white surface, blue left rail, fine border, 9px corners and compact padding.
Request dates use MM/DD/YYYY; unavailable dates show a dash. Keep Date needed in
the request-date tooltip. Currency is green and tabular; statuses keep their palette.

Use the attachment-style 28px square eye, eligible pencil, download and red trash
icons, with accessible names, tooltips and visible keyboard focus rings. Preserve
exact PO identity, edit eligibility and phase scope. On narrow screens keep the
row horizontal with internal scrolling; truncate vendor names with a full tooltip.
Check, Wire and legacy PO rows share the request-list presentation while retaining
their existing behavior and permissions. Do not invent unavailable row actions.

Captured approvers use their recorded role (VP, CFO, COO) in connected 28px circles: green Approved, amber
Pending, red Rejected and muted Not Sent. Show every captured step; drafts with
no recorded route show a dash. Hover outlines the clickable chain. Its compact
read-only modal shows names, roles, sent/responded dates and statuses; a targeted
Get refreshes only the selected PO. Escape, backdrop and Close restore focus.
List supplies approval summaries. Submitted PO child completeness is verified
during the bounded phase load, never by a render-triggered request.

The PO title card contains Purchase Order, status, phase, Vendor and Add New
Vendor. The vendor link opens the existing form in the current Creator environment.
Details, Attachments and Approvers share one tab strip. Approvers shows the
number of resolved route steps: the current preview for an eligible draft, or
the captured chain for a saved PO. Unknown counts show a dash (checking shows
an ellipsis); never infer zero. Keep Summary visible across all three tabs,
matching the main desktop card's full height with its Total pinned below its
own scroller. Preserve entries, file state, selected tab and Summary disclosures
when the PO refreshes. Use the existing tab motion, keyboard navigation and
scoped numeric transition for the count.

The desktop PO workspace is 12% taller (1058 px before the viewport cap), with
12 px screen gutters. Add Vendor, Delete PO and progress/result dialogs also
receive 12% more natural height, bounded by their existing viewport caps.
Keep identity, Close and footer actions reachable and scroll long bodies;
never scale typography, controls or business timing to create the extra room.
Body fields are Request date, Date needed and optional PO Description (1000
characters). The viewport-bounded editor height stays stable after row changes,
with internal scrolling. Keep 9px padding above ledger headers and below the last
row, 6px above the first editable row beneath the column titles, and 2px between
subsequent rows. Omit the Line items/count heading. Retain 250-line guards.
Closing the PO workspace must remove its card, Summary and backdrop together and
restore focus immediately. Mark the composite overlay `data-lm-motion-exit="none"`
so shared motion never redraws a detached, differently sized or styled copy on
Close, X or Escape; retain the opening fade and pending-write close locks.

Row / Spreadsheet mode supports validated TSV range copy/paste, fill-down, keyboard
navigation and local range Undo. Shift-click/Shift-arrows select, Ctrl+C/V copies
and pastes, Ctrl+D fills down, F2 edits, and Tab/Enter moves between cells. Item name
remains derived and immutable. Paste validates eligible cost codes, UOM, ELEM and
exact decimals atomically, up to 250 rows. Formulas and imported formatting are
unsupported. Structural row changes clear range Undo history. Downloads read the
existing authenticated native SpreadsheetML response and use Budget Manager's
existing workbook library to write genuine ZIP/OOXML `.xlsx` bytes with the
matching filename and MIME type. Preserve typed values, dates, text identifiers,
literal descriptions, totals/formulas, merges, compact sizing and every sheet.
Opening a saved PO without an explicit intent, including an existing email or
approval-queue link, selects read-only review. Show decisions only when the
existing captured bundle grants them. A global editor who is also the current
approver must still see Approve/Reject in review. The explicit pencil retains
amendment mode and its separation of decisions from unsaved edits. New POs
continue to open in composition mode. Keep unresolved-operation guards intact.

Keep budget context to the left of the PO total: Available and Remaining or
Modification on the first line. Editable drafts use the server's read-only route
preview with ordered approver pills. Hide this forecast panel when the current
actor cannot compose the PO, matching the existing preview request gate; a
foreign read-only Draft or older submitted PO must never wait for an unrequested
forecast. Saved POs show their captured chain once in the
Approvers tab, without repeating the draft preview. Group linked
modification rows beneath an Attached budget modifications heading in a pale
amber panel, keeping their item names, amounts and recorded statuses.
CFO is required for every PO; a new modification can route VP → CFO → COO.
Show unknown budget/route data as unavailable. Keep Add New Vendor beside the
Vendor label, using navy text on a pale-blue solid button with adequate contrast in the navy title, and open
the existing vendor form in the current Creator environment.

Approval chains use a green heading and green completed steps/status pills;
Pending stays amber and Rejected stays red. Remove Saved POs and Refresh
balances from the footer; retain automatic balance reads. The Requests card
shows the native approval state when available, including Approved/Rejected.

PO deletion uses the attachment-style 28px red square trash icon. Its preview
matches the budget Delete dialog: centered red trash circle, compact title,
vendor/amount/phase identity, pink child-record list with exact counts, Cancel
and red Delete PO. Show all-revision line items, operation receipts, approval
routes, approval records and PO-created budget modifications, plus the release
of the commitment. Cancel, Escape and backdrop return to the same PO. Keep the
captured preview and existing deletion progress/recovery guards. From Requests,
open this compact confirmation immediately with a read-only PreviewDelete using
the row identity/revision. Do not open or fetch the worksheet, vendors or balances.
Keep Delete disabled until exact child counts arrive. Cancel, Escape and backdrop
return to Requests and restore its trash-button focus, including during loading.
Failures expose Retry preview; late reads cannot reopen a cancelled dialog.

The editing toggle reads Row / Spreadsheet. Spreadsheet Undo includes typed cell
edits as well as range paste and fill-down. Double-click or F2 edits a cell;
keyboard focus entering the ledger updates its active cell. Retain exact amounts,
atomic paste validation and the 250-line limit.

## Named Cost Elements and Budget Math

PO Quantity and Unit Price stay editable after a manual Total override. Entering
either returns to Quantity × Unit Price in both Row and Spreadsheet views. A
Manual save still has null quantity/price; never send stale calculated values
with a manual total. Keep active text/caret and unrelated rows mounted while
derived amounts update on the established field-exit boundary.

New lines leave Description and Cost Element blank. Choosing or pasting a Budget
Item must not fill Description or select an element. Preserve user-entered and
saved values, including an explicitly selected Other; require an element before
Save or Submit. Quantity, Unit Price and Total show comma grouping on render and
blur, retain raw decimal strings while focused, and preserve exact fractional
precision. Grouped pasted numbers must have valid thousands separators.

Use the full labels **(1) Labor**, **(2) Materials**, **(3) Equipment**,
**(4) Subcontractor**, and **(5) Other** in PO and standalone Modification
pickers, selected values, detail rows, downloads and approval mail. Keep the
stored PO element identifiers as strings 1–5. Five options need a compact
single-select without a search field; preserve keyboard selection, focus and
the existing draft/read-only/pending gates.

Group the PO Summary once per Budget Item/base cost code, with affected elements
visible underneath by default. The owner's November 3 selection replaces the
separate aggregate table and repeated equation cards. Put the code/name,
**Available**, **This PO**, and **Remaining** together on one horizontal header
row. Omit per-item element counts. Retain the overall cost-code count and PO
total. Each element has those same three amounts and an expandable vertical
calculation: **Final + Approved Mods = Modified Budget**, **Modified Budget −
Existing POs = Available**, then **Available − This PO = Remaining**.

Parent values use the authoritative aggregate allocation including untouched
elements; never add only the visible element balances to manufacture a parent
total. Consolidate repeated lines by exact Budget Item and element identity.
Keep disclosure state, scroll and focus when amount edits refresh the Summary.
Use native disclosures for shared motion and stable item/element numeric slots
for Sliding push. Right-align tabular currency, preserve exact-cent reservations
and restore this saved PO's own allocation once. Keep pending automatic
modifications and element shortfalls distinct. Unknown balances and unallocated
historical PO/mod amounts stay visibly unavailable; never turn missing detail
into zero or replace aggregate authorization with browser arithmetic.

Standalone Modification entry uses the same labels and displays **Final + Prior
Mods + This Mod = Revised** for all five elements. Highlight the chosen row;
only it receives the current signed change. Increase/Decrease supplies the
sign, while persisted component amounts remain unsigned. Prior modifications
exclude the exact record being edited. Persist all five allocation values
together through the existing native contract and retain the governing PO for
automatic modifications. Missing/legacy component detail stays unknown.

The owner-approved department attribution may fill an entirely blank saved
Dev/Eng split: Development uses Other, Engineering uses Labor. Identify that
attribution where it supplies PO context. Preserve explicit allocations,
including partial/all-zero data; Construction has no corresponding inferred
default. These detail surfaces leave source totals, approval routes, native
permissions and parent reservation calculations unchanged.

Saved PO View/Edit opens an explicit loading state. Hide entry fields, zero totals
and the Summary until the exact snapshot and vendor roster arrive together. Read
them in parallel. Failed loads show the error and Retry load; retain close/focus
handling and never expose a blank editable draft for a saved PO.

Review PO after a save or decision refreshes budget balances before rendering
calculations for the new saved snapshot. Show checking/unavailable figures until
the current read completes; an older balance reply cannot replace a newer one.
Retain exact-cent reservation and pending-modification reconciliation.

PO save/approval/delete progress uses Legal's compact 540px result dialog:
navy header and slim progress bar, numbered stages with colored chips, a clear
outcome, collapsed Saved items and a pinned footer. Done dismisses; Review PO
opens the saved record. Show Check status only for unknown replies. Keep pending
Close/Escape locks, focus handling, exact saved identities and notification
warnings. Saved PO and Summary read together in parallel; preload fresh balances
after a confirmed mutation so Review PO can reveal both together.

## PO vendor and contextual approval workspace (122.29.37)

Center the Vendor picker and Add New Vendor in the title card. Add New Vendor
opens its own nested navy dialog, with the underlying PO inert and focus trapped.
Use native Vendors creation, require one acknowledged exact ID, append that
record to the options and select it immediately without losing PO inputs.
Known native rejection retains the input; lost/malformed replies prohibit a
second create, including after closing and reopening the vendor dialog.

The original desktop main card defaulted to 944 px height (18% above 800 px), capped to
the viewport. Its outer body does not scroll; only the line matrix and lengthy
captured-chain section scroll internally. Keep delete/result card dimensions
isolated. The November 9 layout above supersedes the separate Approvers card
below Summary and increases the workspace and compact dialog heights.
The existing debounced context preview determines CFO-only versus added roles
from actual balance shortfall. Show each resolved person, role, approval email
and order; present unavailable routing truthfully. Do not repeat the captured
saved chain in the draft preview card. Native managePurchaseOrder preview now
includes names and emails; no new fields or endpoints are needed.

Budget 122.29.38 removes the PO approver preview footer sentence; the route, recipient cards and approval behavior are unchanged. Frontend only, with no Creator promotion required.


## Budget Mod row tools (122.29.55)

Standalone Budget Mod rows put View, Attachments, Resend Email, Edit and Delete
in one compact icon group, in that order when available. Reserve room for all
five controls and their badges; keep the shared request columns aligned. Use
accessible action names, tooltips and the existing focus outlines. Omit unavailable
actions without leaving empty slots. Submitted decisions stay in the detail
modal: Approve, Reject and Close. Draft Submit and rejected Revise & Resubmit
retain their existing lifecycle actions.

Edit reuses the prefilled composer. Delete opens the exact modification's identity,
amount and approval history with a consequence, Cancel and Delete modification;
Cancel returns focus to the row trash control without writing. Budget files stay
under the Budget after request deletion. Recheck same-Budget identity, recorded
pending ownership and existing admin permissions on click. PO-linked modifications
retain their governing PO and own Attachments tab; never expose standalone tools
for them. Reuse existing native functions and shared modal/tab motion.

## Single request administration grant (122.29.56)

Use User_Access.Edit_All_Budgets, labeled Edit/Delete All Budgets/Requests, for
request deletion and standalone modification administration. Ignore the retired
modification flag. Budget ownership alone allows editing, never PO/request
deletion. Recheck the global grant and authenticated identity in row openers,
modal controls and native delete APIs. The compatibility modAdmin response is
an alias, not another permission. Check/Wire details retain their existing
view/attachment-only actions; do not invent a payment deletion flow.

Pending PO pencils require the exact global Edit/Delete All Budgets/Requests
grant plus a native in-flight-edit capability. Save changes preserves the
captured approval people and decisions; do not offer Submit or approval decisions
inside an unsaved in-flight editor. Recheck the current grant at entry/save and
in the native phase-locked write. Owned-budget access alone is insufficient.


## PO Reallocation Panel

Place Reallocation immediately to the right of Summary on wide desktop screens.
Each selected cost code has five element Amount controls with Increase/Decrease
buttons, current/revised budgets and one reason. Keep net totals and any Reset
Changes action in the panel footer while its records scroll. Omit the explanatory approval-round
footer sentence (user direction November 9, 2026). On narrower desktops, Summary and
Reallocation remain side by side below the PO. Details/Attachments/Approvers
changes retain the panel and edits.

Render the five controls directly editable when current capability and complete
native balances are available. Do not require Add Reallocation to unlock them
(user direction November 9, 2026). Opening/focusing the pane and recomputing its
defaults must not add a custom request. Initialize the reviewed plan only on an
actual amount, direction or reason edit, preserving ordinary automatic submission
and legacy Pending amendment eligibility when untouched. Show Reset Changes only
after a custom edit; resetting clears the custom plan and leaves valid defaults
editable. Keep that reset available if the plan's source later becomes unavailable.

Prefill exact PO-required increases and show safe reduction limits. Invalid
changes identify the element and block committing controls. Keep editable inputs
mounted while their dependent values update, with shared field-exit numeric
motion and stable cost-code/element/metric identities. Saved approval plans are
read-only and display their captured changes, without revalidating historical
increases against already-approved balances. One approval round covers the PO
and every linked modification, including zero/negative net records. Capability
and permission guards are visible before editing; ordinary automatic PO entry
remains available when native reallocation support is absent.
