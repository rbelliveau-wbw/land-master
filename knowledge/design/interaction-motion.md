# Interaction motion

Repository-wide rule for applicable surfaces; see [scope and exceptions](README.md).
Approved by Robby on October 16, 2026 after the interactive Land Master preview.
Use these patterns for every new feature and when revising existing features.
They complement [number transitions](number-transitions.md); numbers retain
their existing 420ms/16px Sliding push and field-exit contract.

## Eight required patterns

| Interaction | Required behavior |
| --- | --- |
| Tabs and view changes | A shared selection pill moves to the real active control in about 190ms. Pane content settles with a short fade; retain the frame, focus and intended scroll position. Preserve an existing moving slider rather than adding a second one. |
| Expand/collapse | Native disclosures reveal and close smoothly in about 200ms; custom chevrons rotate. Table groups use keyed row movement/reveal inside their existing scroller. Labels and expanded state update immediately. |
| Adding, removing or reordering rows | Surviving rows move into their real new positions in about 230ms. Editable subform boundaries expand/contract over the same interval, including first insertion, bottom-row removal and removal to empty. New rows ease in and receive a soft highlight above their actual cell fills. An opacity-only insertion and instant last-row deletion do not satisfy this rule. Key persisted rows by string record ID and drafts by stable object identity, never array position. Preserve existing Legal/Settings/takedown FLIP implementations. |
| Refresh without blanking | Keep the current complete, authorized report mounted while a refresh is pending wherever the existing access/identity guards permit it. Use the existing truthful loading state and settle the completed replacement in about 160ms. Never clear a view solely for a spinner. |
| Inline save feedback | The actual pending, verified, error and unknown states transition in place in about 150ms. Keep existing inline checks and the shared black success popup. A save is successful only when its existing native success predicate says so. |
| Dialogs, drawers and popovers | Open the real anchored surface with a short fade; dismiss it without delaying the handler or focus restoration. Native dialogs use discrete display/overlay transitions. A small authorized user-dismissed legacy surface may leave an inert, inaccessible 140ms exit visual. |
| Changed-row highlight | Briefly wash the affected row in soft blue after a real insertion or verified save. Never flash an entire financial matrix, mark an unknown write saved, or highlight intermediate typed calculations. |
| Progress meters | Move to actual new meter widths/stops in about 260ms. Numeric labels/ARIA retain their real new values. First appearance and unrelated schedule identities remain static. No invented completion or time-based progress. |

Normal UI motion is 150–260ms with `cubic-bezier(.22,.7,.25,1)`, with no bounce
or exaggerated scale. Reduced motion switches state immediately. Never delay
requests, calculations, saves, validation, selection, dismissal or navigation to
finish an animation. Native editable values, precision and carets remain intact.
Keep animation overflow inside its component; no temporary horizontal scrollbar,
right-side strip, moving table border or hidden incoming value that changes layout.

## Shared implementation

Use [interaction-motion.js](../../shared/interaction-motion.js),
[interaction-motion.css](../../shared/interaction-motion.css) and the explicit
[adoption registry](../../shared/interaction-surfaces.js). All ten standalone
widgets load versioned copies. `scripts/sync-interaction-motion.mjs` synchronizes
them before validation; do not fork module-specific timing engines.

New feature registration:

- Use semantic `role="dialog"`, `role="listbox"`, `role="menu"` and
  `role="status"`; native `details` and `dialog` receive their shared behavior.
- Use `data-lm-motion="tabs"` on a strip with real `role="tab"` controls,
  `data-lm-motion="panel"` on its pane, `data-lm-motion="popover"` on a custom
  anchored surface, `data-lm-motion="feedback"` with `data-state` on a status,
  and `data-lm-motion="meter"` on a filled meter.
- Register keyed lists, scope, native sliders and legacy selectors explicitly in
  the adoption registry. Configure visible row identity from the actual model.
  Read the old layout before the original handler and play after it; do not
  intercept, clone or replace live editors. Keep originals mounted when possible.
- For editable subforms register each actual table wrapper separately with a
  stable `hostKey` and `resize:true`. PF uses `data-lm-row-list` to identify
  lot pricing, PID/MUD, installments, curves, costs and Offer lists. Keep widths
  stable when the list becomes empty, preserve real horizontal scrolling, and
  release the animated height back to native layout. No spacer records, retained
  removed inputs or delayed model/delete operations. Hidden/initial/unrelated
  lists stay still; reduced motion applies the final boundary immediately.
- `LMMotion.refresh(host, action, {allowed, completed})` starts `action`
  immediately, marks only the host busy and settles a real completed update.
  The action retains ownership of data, errors and access checks. It must not
  clear an already permitted complete view merely to display a loading message.
- For replaced meters use `data-lm-meter-key`,
  `LMMotion.captureMeters(host)` and `LMMotion.applyMeters(host, previous)`.
  Use the same record/schedule fingerprint gates as numeric reconciliation.
  Forecast uses its validated native gradient stops without changing their meaning.

## Boundaries and performance

Permission/actor/environment changes cancel animation history and exit visuals
immediately. Initial connection, permission revalidation, failed/partial history,
new records and unrelated schedules retain their existing clear/deny/static
behavior. Refresh animation never bypasses an authorization or complete-history
gate. Do not keep private data on screen after an access failure.

Legacy exit visuals are only for actual user dismissal of a still-authorized
surface after its original handler closes it. Remove record/data/DOM identities,
inline handlers and media/network-loading nodes. Mark the visual inert and
aria-hidden, disable pointer events, remove it within 140ms, and cancel it on
context reset. Never create one for programmatic denial, a blocked close, a
pending write, native dialogs, reduced motion or a large report (>600 elements).
Large synchronous dismissals remain immediate rather than copying heavy content.
Composite workspaces whose geometry or appearance depends on their surrounding
overlay must set `data-lm-motion-exit="none"` on that overlay. It excludes the
workspace and nested surfaces from detached exit copies while retaining the real
opening fade and immediate original dismissal/focus handling. A sanitized clone
cannot reliably preserve ancestor CSS, backdrop blur or data-driven styling;
never redraw a different-looking surface after the real dialog has closed.

Pro Forma AI Review applies this composite-overlay exception to `#aiReviewModal`.
Verify repeated X/footer Close with normal and reduced motion; dismissal must
not create detached dialog or backdrop copies.

Coalesce observations in one frame, ignore numeric animation mutations, and
bound row geometry to small groups (100 rows by default). Bulk report changes
use one short surface settle rather than thousands of per-cell measurements.
Keyed row snapshots must exclude the shared engine's active vertical translation.
Numeric decoration or a rapid second action may resample a row during reveal;
never retain that temporary visual offset as its next layout position. A reveal
must settle within its original duration rather than restart on observer updates.
Do not animate mounted inputs themselves or force layout for every numeric cell.
Exports, date semantics, save acknowledgements, approval/progress locks and
record identity remain under the existing component guides.

## Verification

Run the adoption check and desktop motion/browser fixtures, including actual
module renderers. Cover repeated/rapid tabs, row add/remove/reorder and draft
identity, expanded groups, retained refresh data and errors, pending/verified/
unknown feedback, focus after dismissal, inaccessible sanitized exit visuals,
actor resets, native progress stops, reduced motion and bounded large reports.
Row checks must prove an intermediate boundary and settled natural layout for
append, last/only-row removal, empty-to-first and rapid opposite actions. Merely
finding an Animation object does not prove the interaction is visibly complete.
Rerun the numeric, Pro Forma, Insights geometry/performance and Forecast suites.
Release notes must record actual coverage, remaining native exceptions and rollback.

### Budget Requests initial readiness

The first Requests reveal waits for both payment/PO rows and modification data,
including linked PO child reads. Never paint an intermediate orphan modification
then insert its PO above it. Keep a same-scope complete list during refresh;
actor/phase scope changes and failed authorization clear retained PO rows.
The existing panel/row motion registry handles the final completed reveal.
