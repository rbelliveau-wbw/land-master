# Crew Management 1.2.7 — CFO roster loading

The Production CFO screenshot reports `Error at line: 121, Invalid Connection`
while loading Crews. That line is in the reopened native management-list report
request using the existing logged-in-user connection. Schedule report reads
already use the signed-in Creator SDK through the shared `LMData.readAll` adapter.

Reuse that adapter for the roster's All_Crews, Crew_Assignment_Report and
All_Subdivisions reads. Refresh module capabilities before every roster load.
Retain complete native report pagination/count checks, exact string identities,
required exposed fields, all-date assignments, source locks, phase locks and
read-only permissions. Publish a new snapshot only after every source completes.
Never fall back to management-list or owner-level reads on a denied SDK report.
Revoked access clears previously loaded private records.
The 1.2.7 follow-up includes the 1.2.6 SDK read change and handles the shared
adapter's structured permission-denied flag even when Creator supplies no
human-readable error. The browser refresh test covers both module revocation
and native code-only report denial after a successful complete roster load.

Changed source: crew-manager.js; isolated SDK fixture and browser checks; new
executable client regression suite; module/design/contract documentation;
versioned HTML/config, manifest, immutable release and environment mappings.

No forms, fields, functions, Custom APIs, OAuth connections or profile/permission
grants change. No Creator deployment is required for this fix. Existing native
save preparation, form validation, actual errors, unknown-reply recovery and
Creator-only/Projects-push-off protections remain unchanged. Server-side save
preparation/recovery and milestone writes retain their existing connection
requirements; this release removes the connection from roster loading only.

Validation: five executable client groups exercise SDK-only reports, full-date
records, module/source denial before reads, report denial, missing fields,
native row scope, read-only rights, imported assignments, phase locks and unsafe
or missing IDs. Eighteen desktop management browser groups include the exact
Invalid Connection route failing while the SDK roster loads, native pagination,
revoked module access, native CRUD/rejection and no-replay recovery. Twenty-one
schedule browser groups cover the existing scheduling behavior. Full repository
validation and Pages build are required before PMP.

The isolated CFO-connection regression does not claim an authenticated CFO login
or a live CFO write. Production owner-session SDK loading was independently
observed on the deployed 1.2.6 read path: four active crews, one inactive crew,
latest dated work and future work loaded without a roster error. The 1.2.7
permission-denial follow-up preserves that same native SDK read path. No live
business records are changed for this roster fix.

Rollback: map crew-locations back to immutable `1.2.5`; stable widget URLs remain
unchanged. That restores the prior connection-dependent roster path.
