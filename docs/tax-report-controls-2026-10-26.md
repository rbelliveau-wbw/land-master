# Tax report controls and Search-only counts — 19.17.31

## Requested behavior

- Selecting records must not push the report down. Keep selection actions to
  the left of pagination, with Clear beside the other selection actions.
- Place the compact save progress dialog higher and close the Bulk Edit form
  behind it when a validated batch starts.
- Restore normal scrolling and visible focus after a mass update.
- Start optional parcel counts only after Search, avoiding startup and filter
  edits consuming the request budget before the intended company search.

## Implementation

The existing action nodes and handlers move into a permanently sized report
controls row. Hidden selection actions retain their layout space. Narrower
desktop windows scroll the action group internally rather than adding a row.
Properties hides the parcel controls; pending-operation locks cover the moved
controls. Clear uses a centered SVG X and sits beside Select All.

The progress overlay retains its compact shell and internal results scroller,
with 32px spacing from the top. The Bulk Edit form hides only after its inputs
have passed validation and the batch starts. Progress dismisses to a visible
report action, without reopening the editor. Focus transitions must not scroll
the fixed report shell into an inaccessible position; existing intentional
report scrollers and overflow styles remain.

Progress focus changes use `preventScroll`; the captured page/report offsets
are restored when the dialog opens, completes and closes. This prevents focus
from moving an overflow-hidden ancestor that has no usable return scrollbar.

Initial reference data still loads for valid lookup IDs, permissions and complete
Property data. Optional Tax Parcel Year headline/status/AG and facet count
requests wait for Search. Filter changes invalidate stale counts and cancel
superseded work. Search loads its complete counted scope before starting the
captured-filter count cycle. Filter menus read the cached results and do not
start independent count chains. Authoritative native counts, exact string IDs,
the 800-record load limit and save guards remain.

An explicit Search above 800 records still shows its authoritative counts and
the narrowing message, while the controller blocks fetching those parcel rows.
Only its internal typed limit error takes that path; denied, transport and
superseded reads do not start a replacement count cycle.

## Release impact

- Widget/version: Tax Center 19.17.31.
- Source: `widget.html`, `tax-progress.js` and typed controller limit metadata;
  related focused tests and guides.
- Creator forms/fields, functions, Custom APIs and permissions: unchanged.
- Frontend deployment: immutable release, Development and Production mappings,
  existing permanent widget URLs.
- Creator backend deployment: not required; PMP leaves Creator promotion alone.
- Rollback: Tax Center 19.17.30 with a Pages rebuild.

## Verification

The whole Tax SDK, effective SDK and Arbitrate count suites pass. Tests cover
no parcel calls before Search, row publication before aggregates, cancelled
count chains, no count restart after saves, and an 801-record Search blocked
from fetching rows while still showing authoritative counts.

The actual whole widget passes desktop browser checks for 0/1/135/Clear header
stability, Property-tab hiding and 3400px centered pagination. Pending saves
have one backdrop and no open editor. Success and rejection restore visible
focus, clear inert/overlay locks and never replay writes. The report retains
its original 500px vertical/70px horizontal scroll and can wheel back to zero.
Overflow styles remain unchanged. In an 1800px iframe, the old dialog begins
590px down; the new dialog begins 32px down. That comparison did not reproduce
the original permanent scroll lock; the regression covers cleanup and return
scrolling rather than claiming its precise original cause was proven.

Production UI checks select and clear records only; this release does not
require changing production field values. Deployment and native count audit
evidence are recorded after completion. Local evidence lives under
`reports/2026-10-26-tax-date-clear/` and the browser fixture's
`tmp/tax-progress-preview/` output.
