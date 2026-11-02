# Schedule Save and Refresh — November 2, 2026

The user selected holding edits until Save. In Milestones & Tasks, the top-right
Save/Refresh controls now remain visible in Timeline and Edit Schedule. Date,
Days, boundary, drag, propagation and history reversal edits update a local
preview. Save shows the count of edited records and is the only committing
action. Refresh offers Keep Editing or Discard & Refresh when drafts exist.
Crews staffing pickers and existing explicit crew/assignment modal saves retain
their current behavior.

`crew-schedule-drafts.js` owns the pending ledger and scoped recovery memory.
Ordinary edits to one record coalesce and reverting removes the pending write.
Duration/arrow and Undo/Redo plans retain their native dependencies and order.
This separate ledger is necessary because the prior editor immediately called
the writer on each field exit or pointer drop. The native writer, CrewModel
validation, exact date mapping, pointer capture, destination confirmations and
read-only status recovery are reused; no alternate save endpoint is introduced.

Save freezes its captured queue. Each operation uses the existing native
prepare/apply sequence with fresh operation IDs; pending arrow references resolve
to their actual saved duration ID. Confirmed work is removed before continuing.
Known failures retain remaining drafts; known partial results block another
Save pending review/Refresh. Lost replies retain their exact request identity and
can only be checked through Review Save. Recovery never sends an unsent apply or
replays a completed operation. Storage is draft/recovery memory, never success
evidence. Fresh source changes or unavailable edited records block stale saves.

Routine pending states stay on the buttons; the existing Crew exception keeps
multi-record milestone saves nonmodal. Native errors and explicit unknown-save
review remain visible. Valid drops show Pending · Click Save beside the edge.
The shared success toast appears only after the explicit Save succeeds.

Changed application files: `crew-schedule-drafts.js`, `crew-app.js`,
`crew-drag.js`, `crew-manager.css` and `widget.html`. Tests add the draft ledger
suite to prevalidate and cover the staged pointer result. Guides, manifests,
removal inventory and the immutable release are updated with the feature.

Existing native fields: Milestones.Start_Date / End_Date and verified
Task_Schedule.Start_Date / End_Date. Existing crewLocationsWidget and its
prepare/apply/status, native validation, audit/lock records and Creator-only
Projects-push guard remain unchanged. No form, field, function, Custom API,
connection, workflow or Creator promotion is required.

## Verification

- Eleven actual draft-controller cases cover staging with zero writes, explicit
  Save, coalescing/revert, discard, duration dependencies, retained failures,
  partial/unknown replies, fresh-ID retries, scoped persistence, actor locks,
  source conflicts, correct baselines and resuming only unsent propagation.
- Eight existing drag/controller cases include Pending · Click Save and preserve
  geometry, guards, cancellation and exact source identity.
- Actual desktop browser: field exit produced zero prepare/apply requests;
  Keep Editing retained its draft; Save sent one prepare/apply pair. Direct Save
  flushed the active field. Discard & Refresh restored the saved date with no
  additional apply. Lost-reply Review Save sent one status read with zero replay.
  A Days adjustment and its arrow remained pending together, then saved in order
  with the arrow pointing at the actual saved duration operation ID.
- Invalid boundary text remains visible in its editor; closing it clears that
  unaccepted field. A corrected boundary becomes pending with zero native writes.
- `npm run validate` and `npm run build:pages` passed. All 22 application files
  in immutable 1.10.1 match current source. Production controls checks use
  read-only views; synthetic browser saves never edit Production dates.

## Rollback

Restore the Production crew-locations mapping to immutable 1.9.1. Review uncertain
saves and save or explicitly discard pending drafts before rollback. Preserve
scoped draft recovery memory, all Creator dates, staffing and native audit/lock
history. Other widget mappings remain unchanged.
