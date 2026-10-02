# Land Master SDK v2 transport increment

Land Master now uses the [Creator JavaScript SDK v2](https://www.zoho.com/creator/help/js-api/v2/). Initialization always performs one fresh `UTIL.getInitParams()` handshake and applies the returned environment before resolving Custom API names. Cached loader parameters cannot bypass that handshake after the loader replaces the document and reloads the SDK. A failed or timed-out connection in an embedded widget shows a connection error; direct previews can still show the demo. A late handshake cannot restart a timed-out session.

Report reads use the shared `LMData.readAll` adapter with full fields, count reconciliation, cursor pagination, and bounded SDK concurrency. This increment retains the existing fourteen-report plus location-choice barrier. A failed or incomplete report blocks that render and leaves the previous complete snapshot intact; it cannot silently supply empty counts. Full reads preserve the fields needed by existing editors, search, sorting, and counts. Location-choice API failures still recover from the committed snapshot.

Writes use documented `DATA.addRecords`, `DATA.updateRecordById`, and `DATA.deleteRecords` payloads. Their per-record results are checked even when the top-level response says success. A rejected create keeps the original error code for existing draft and permission handling. Record IDs and leading-zero facility codes stay strings. Default Creator workflows remain enabled.

The lot importer rereads both selected-subdivision reports with `fresh:true`. Missing cursor pages or inconsistent counts fail the read before duplicate validation can use an incomplete result. The existing spreadsheet review and explicit import confirmation remain in place.

`LMPerf` publishes `creator-init`, `land-load`, `land-render`, and `first-usable-render` events with shared request metrics in the `lm-performance` JSON script element. Response-size metrics estimate serialized SDK responses; they do not measure bytes transferred over the network. Local tests verify transport behavior and do not establish live Creator latency.

Validation:

```sh
node scripts/test-land-master-sdk-v2.mjs
node scripts/test-land-lot-import.mjs
node scripts/test-land-master-mapping-draft.mjs
node scripts/test-land-master-project-choices.mjs
```

This increment does not change versions, release manifests, deployments, or the loading order. Deferred loading should follow only after this transport increment is verified.
