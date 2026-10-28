# Crew Management 1.2.5 — milestone feedback

User direction: milestone updates use a toast instead of an automatic save modal;
remove the individual Hide buttons on Start, Days and End. PMP promotes this
frontend release to Development and Production.

The existing shared success helper shows contextual confirmation only after the
unchanged native destination checks pass. Pending status and errors remain
visible inline. Duplicate writes remain blocked. Unknown replies retain the
editing lock and explicit Review save dialog, with read-only status recovery and
no replay. Confirmed in-memory values remain mounted, preserving propagation
deltas without requiring a modal dismissal or a second full data read.

Hide Group, restoration chips and Show All Columns remain, including restoration
of older individual-column preferences. Scheduling arithmetic still uses complete
source records.

Changed implementation: `widgets/crew-locations/src/app/crew-app.js`, browser
regressions in `scripts/fixtures/crew-browser-checks.js`, versioned HTML/config,
widget manifest, immutable release and environment mappings. Focused scheduling,
success-feedback and transfer-progress guides record the explicit user exception.

No forms, fields, functions, Custom APIs or permission grants change. No Creator
deployment is required. Creator-only editing and Projects push-off protections
remain unchanged. No live milestone dates were changed for presentation testing.

Validation: isolated desktop browser checks exercise pending nonmodal status,
shared success toast, exact native destination acknowledgement, retained duration
deltas, propagation, task-table independence, known failure, lost/ambiguous reply,
explicit read-only recovery without replay, durable History, Undo/Redo, access
locks and Hide Group restoration. Model/backend checks and repository validation
cover existing scheduling and native contracts. These isolated checks do not
claim a new live native write.

Rollback: map `crew-locations` back to immutable release `1.2.4` in the desired
environment. Existing stable Creator widget URLs remain unchanged.
