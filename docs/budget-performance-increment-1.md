# Budget performance increment 1

This increment migrates Budget Manager to Creator widget SDK v2 and dispatches its existing startup reads concurrently through the shared bounded data adapter. The first usable landing still waits for budgets, subdivisions, projects, categories, approvals, permissions, Proforma choices and modifications. Critical report failures stop the numeric landing rather than substituting incomplete totals or unlocked actions.

The native v2 CRUD and file envelopes replace v1 envelope probing. A write with an ambiguous result is not replayed; only an explicit missing report can select an existing report candidate. GET Custom APIs use URL-encoded string `query_params`; the runtime-resolved `Get_User_Access_DEV` (and registered lean Development) binding keeps its confirmed POST JSON username contract, page query parameters are awaited, and the live Creator session handshake must identify the user before data reads. The confirmed Budget attachment preview Custom API remains in place.

Startup publishes report state together, records startup/permission/render timings, and deduplicates overlapping detail loads. Successful record or attachment writes invalidate the shared transport cache. Record writes require a native success response with its record ID and successful codes for every returned record. Empty, malformed, validation, permission and mixed responses reject with the failing code and raw response preserved; these responses cannot report Saved or replay an uncertain write. Existing local editor models and approval reconciliation remain intact. Dataset projection, lazy Proforma/modification loading and summary badge states belong to the next independently verified increment.

No Creator form, field, function, workflow or Custom API changes are required. The shared `creator-data.js` asset must be included by the release builder. This source increment does not bump a widget version or promote an environment.

Verification: `node scripts/test-budget-sdk-v2-startup.mjs`, existing Budget permission, manage-action, per-unit, approval, comparison and export regression checks, `npm run validate`, and `npm run build:pages`. Live Development and Production checks must compare project/phase counts, mixed-track totals and lock states, owner filtering, page deep links, file preview/upload and SDK timing results before promotion. Live write checks use an approved test record.

Rollback: promote the prior immutable Budget widget release and its matching asset set. No Creator backend rollback is needed.

Mutation response references: [SDK2 update by ID](https://www.zoho.com/creator/help/js-api/v2/update-specific-record.html), [API v2.1 add-record response semantics](https://www.zoho.com/creator/help/api/v2.1/add-records.html). Tests execute the actual bounded native callbacks and actual success validator with direct, per-record, mixed, failed and malformed response fixtures.
