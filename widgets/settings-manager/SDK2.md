# Settings 1.3.3 SDK2 migration

The migration changes transport and the save/refresh controller. It preserves the grouped
full-field editor, generic Other fields, unknown selected lookup IDs, single selected
Settings record, duplicate warning, existing workflows and 700 ms autosave batching.
It never creates Settings records or changes the backend, approval routes or schedules.

## Session and read contract

- Load SDK2 and perform a fresh native `UTIL.getInitParams` handshake with a five-second
  deadline. Ignore late results. Retry remains available after failure. Require a recognized
  environment and connected string actor; the canonical runtime allows genuine SDK global
  actor strings. Embedded failures cannot switch to demo business data. Offline preview is read only.
- Use the canonical `creator-data.js` scheduler, at most three active SDK requests, counted
  cursor pagination, `max_records:1000` and `field_config:all`. No capped SDK1 page loop or
  fallback that drops fields. Failed/incomplete reads never become successful empty collections.
- Read `All_Settings` unfiltered to retain singleton count/warning. Choose the first record
  initially; later reloads retain that selected ID or fail closed if it disappears. Stage the
  core and optional resource results before publication. Freeze edit/write/navigation actions
  during refresh and retain the old bindings until a safe commit.
- Curve reads require the selected `Settings` parent on every returned row. Builder approval
  criteria retain their previous meaning. Actions use the complete-read contract below.
  Unavailable option resources retain their
  last complete collections while disabling the affected picker; other readable scalar fields
  remain available. Unavailable curves are labeled unavailable, never empty/zero.

### Complete Actions choices — authorized 2026-10-05

The native Production 1.3.3 Actions count failed without a response code for
`Contract_Template != ""`, leaving the picker unavailable with its seven persisted
selection IDs preserved. The successor reads the same `All_Contract_Actions`
report without that additional criteria. Both count and cursor reads use the
same unfiltered report; existing report filters and signed-in permissions still
apply. There is no alternate report, permission grant, capped page loop, or
fallback to an uncounted read.

The current native Development `Contract_Actions` form confirms the Template
Action checkbox link name `Template_Action` and the Action textbox link name
`Contract_Action`. On 2026-10-05, Robby authorized checked Template Action rows
as the Settings action picker's eligibility rule. This decision applies only
to Actions; the separate Builder approvals criterion remains
`Contract_Template == "Builder"`.

Only after the canonical reader verifies the full expected count and unique
string ID set does the controller select rows whose `Template_Action` checkbox
is checked. It accepts native boolean values and explicit true/false, yes/no,
1/0 strings or numbers; null and blank returned values are unchecked. Arbitrary
objects and unrecognized strings cannot become truthy options. Missing checkbox
fields, malformed checkbox values, duplicate/missing IDs, or incomplete pages make Actions
unavailable while retaining the previous complete option rows and all saved
selection IDs. The affected picker cannot queue a write until a fresh complete
load succeeds; independent readable scalar fields retain their existing grants.
Known, unchecked and unresolved selected IDs retain the exact mutation/readback
contract. Eligibility never automatically removes a saved selection. Options
show the current `Contract_Action` text, type and sort order; the removed
`Contract_Template` field does not determine an action option or its label.

The whole-IIFE suite replays the observed failure using the untouched immutable
1.3.3 controller, then checks that the successor sends no Actions criteria,
filters native checked/unchecked shapes only after a complete 2,001-row cursor
read, preserves unknown selections, rejects failed/incomplete scopes, and
recovers through a complete retry. It also verifies that Actions eligibility
does not alter the Builder approval rule or submit any automatic mutation.
These are local SDK-shaped fixtures. Native
unfiltered-count availability and exact Production checkbox eligibility are pending
root-owned gates; this candidate does not claim a native successor test.

The native Development 1.3.4 gate still reported Actions unavailable despite
successful count and page requests. The filtered-count explanation is therefore
not established. Version 1.3.5 adds a safe resource name, error message and code
console diagnostic, without logging records or changing reads, permissions or
writes. The diagnostic and native form inspection established that the removed
`Contract_Template` field was missing. The authorized checkbox rule resolves
that mismatch without adding a backend field. No Creator backend change is
part of this frontend fix; a missing checkbox in the environment's report must
still fail closed and be identified for Robby to promote separately.

## Autosave contract

`settings-controller.js` owns durable drafts, field revisions, session identity, selected ID
and load generation. Every batch captures cloned, frozen values/revisions/identity before
request scheduling. Edits made while an earlier autosave is active retain their newer revision.
They are neither cleared nor painted Saved by the older acknowledgement. Failed drafts remain
in `curVal`, including Other fields, and survive later rendering. Local invalid whole-number
entries remain failed drafts without a write; decimals are never silently converted into counts.

One native `DATA.updateRecordById({report_name,id,payload:{data}})` is sent. A confirmed result
requires outer code 3000 and one direct/array result with code 3000, no failure/error, and the
exact numeric string record ID. Empty, malformed, mixed, unsafe or wrong-ID responses fail.
Failure codes and raw responses are retained. No envelope probes or automatic mutation retries.
An acknowledgement containing both top-level data and result, any nested per-record result,
or multiple/duplicate results is uncertain even when IDs match. A mixed success/failure retains
the raw failure code but cannot authorize discard or another write. Only exact fresh read-only
recheck can settle that operation. Failure flags beside an acknowledgement ID also remain uncertain;
this check inspects mutation acknowledgement data, not business fields in report records.
Native mutation helpers remain private to captured controller flows.

Before Saved, a fresh full-field `All_Settings` read must return the one captured ID and match
every captured field. Scalars compare their displayed type without changing their meaning;
text normalizes line-ending representation, numbers normalize report formatting, and date/time
round trips retain the existing date basis. Lookup lists compare exact unique ID sets: order is
irrelevant, missing/duplicate/extra/same-count wrong IDs fail. Known and unresolved IDs are
preserved. Generic lookup fields display IDs rather than an empty object label.

Definite Creator rejection retains a failed draft; a later deliberate corrected edit or explicit
Discard rejected edits may resolve it. Lost responses, malformed success and failed readback
retain an uncertain operation and pause all edit/write entry points. Recheck saved values reads
only the captured ID and values; it never sends another update. A successful recheck can settle
the older revision while preserving a newer queued draft. Reload/reconnect cannot discard drafts.

## Construction Curve contract

Capture the selected parent, row ID, generation, actor and immutable values before sending.
Block duplicate actions and all edit controls while the operation is active. Send only one
native create/update/delete envelope. Creates always set the existing `Settings` field and
cannot target the Settings form. Verify a confirmed created/updated ID from a fresh per-ID read,
the exact parent and submitted fields. Verify deletion by fresh absence of the exact ID. A row
under another parent cannot verify. Option failures disable the Pro Forma picker without losing
its unresolved selected ID.

Failed row values are retained separately from persisted curve totals. Uncertain results block
further writes; read-only recheck uses a known exact ID or refuses an unknown create. It never
creates or deletes another row. A definite rejection can be discarded explicitly. Delete uses
an in-widget decision/result dialog with centered SVG Close, inert background, focus trap,
disabled Close/Escape while active and a terminal verification status. No native confirm or
beforeunload prompt remains. Each action changes one child record, so no multi-record transfer
or approval/send flow is introduced.

## Verification and live gates

Run `node scripts/test-settings-sdk-v2.mjs`. The test evaluates the whole actual widget IIFE,
actual controller, current canonical runtime/data helper and native SDK-shaped responses.
It covers complete counted pages/bounded concurrency, the Actions successor and
frozen 1.3.3 failed-count reproduction, partial/error/status read envelopes,
singleton count/selected-ID failure, unknown fields/lookup IDs, duplicate event wiring, retained
failed/newer drafts, immutable captures, exact scalar/multi-ID readback, no mutation replay,
session changes, atomic refresh/edit guards, Curve CRUD/parent/absence checks, uncertain-create
rechecks, deletion dialog locks, native handshake timeout/late results/retry and fail-closed preview.

No live verification is claimed by this source change. Root owns immutable release, mappings,
metadata, Git/CI and native browser gates. Use the existing 1.3.1 production source as the SDK1
baseline (legacy Dev routing did not use the old Dev mapping). Required native Dev gate: exact
field values/options/counts and controller availability, then a reversible `Multi_Line` edit,
fresh persisted readback and restoration. Preserve all unknown IDs and singleton count. Production
verification is read-only; the reversible free-text write/read/restore gate is Dev-only.
No arbitrary curve, threshold, model or schedule changes are authorized for live testing.

Root should compare the first-usable/startup metrics in `script#lm-performance`, estimated bytes,
request count and SDK response errors. Native layout/focus, permission behavior and mutation
readback remain external gates; the VM cannot establish those platform results. Rollback is the
previous immutable Settings release through the existing stable environment mapping.
