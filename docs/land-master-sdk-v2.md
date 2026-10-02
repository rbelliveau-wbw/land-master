# Land Master SDK v2 transport increment

Land Master now uses the [Creator JavaScript SDK v2](https://www.zoho.com/creator/help/js-api/v2/). Initialization always performs one fresh `UTIL.getInitParams()` handshake and applies the returned environment before resolving Custom API names. Cached loader parameters cannot bypass that handshake after the loader replaces the document and reloads the SDK. A failed or timed-out connection in an embedded widget shows a connection error; direct previews can still show the demo. A late handshake cannot restart a timed-out session.

Report reads use the shared `LMData.readAll` adapter with full fields, count reconciliation, cursor pagination, and bounded SDK concurrency. The verified `8.13.3` transport increment retained the fourteen-report plus location-choice barrier; candidate `8.13.4` uses the [four-core loading contract](land-master-lazy-data.md). Report aliases are tried only for explicit missing-report code `2894`; denied, incomplete, and canceled reads retain the requested report and fail. Failed core reads leave the previous complete core snapshot intact; a failed deferred dependency leaves its editor or scope unavailable and retryable. Neither failure supplies empty counts. Full reads preserve the fields needed by existing editors, search, sorting, and counts. Location-choice API failures still recover from the committed snapshot.

Writes use documented `DATA.addRecords`, `DATA.updateRecordById`, and `DATA.deleteRecords` payloads. Every record change must return a success code and confirmed string record ID, either in the native direct response or in a nonempty per-record result array. A bare success code or empty result cannot mark a change saved and does not trigger an automatic replay. Per-record failures are checked even when the top-level response says success. A rejected create keeps the original error code for existing draft and permission handling. Record IDs and leading-zero facility codes stay strings. Default Creator workflows remain enabled.

Land's location-choice Custom API GET has no arguments and omits `query_params`. Audit-error delivery and lot ingestion use POST JSON payloads. They do not pass query objects to the native SDK.

The lot importer rereads both selected-subdivision reports with `fresh:true`. Missing cursor pages or inconsistent counts fail the read before duplicate validation can use an incomplete result. The existing spreadsheet review and explicit import confirmation remain in place.

`LMPerf` publishes `creator-init`, `land-load`, `land-render`, and `first-usable-render` events with shared request metrics in the `lm-performance` JSON script element. Response-size metrics estimate serialized SDK responses; they do not measure bytes transferred over the network. Local tests verify transport behavior and do not establish live Creator latency.

Validation:

```sh
node scripts/test-land-master-sdk-v2.mjs
node scripts/test-land-lot-import.mjs
node scripts/test-land-master-mapping-draft.mjs
node scripts/test-land-master-project-choices.mjs
```

Deferred loading follows the verified Development and Production transport gate. Release creation and environment mappings are managed separately; local tests do not establish candidate live latency or deployment status.
