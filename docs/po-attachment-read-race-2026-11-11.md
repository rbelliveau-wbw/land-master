# PO attachment read recovery — November 11, 2026

The reported Construction profile PO showed a saved file beside `The
attachments:4410926000002289002 read was superseded.` This was a frontend read
race, separate from the November 10 native upload grant.

The request controller rendered before entering its loading state. That render
could start a Budget file read without request association fields. When the
capability check completed, the existing loader correctly replaced that read
with a fresh projection including Payment_Request and Budget_Modification.
The cancelled first promise then wrote its error into the shared attachment
write-status banner, which survived the successful replacement.

Budget Manager **122.29.137** fixes the handoff using the existing loaders:

- Enter request loading before its first render.
- Follow the latest replacement read for the same Budget and actor, including
  successive refreshes; never publish superseded rows or retry a write.
- Bind attachment snapshots to the existing actor/environment/Budget scope.
- Let the feature own read errors and Retry, without persisting them in the
  upload/delete/recovery status.
- Route request-panel Retry to the request controller. It previously targeted
  the separate Budget attachment modal.
- Ignore older request-load completions after a newer retry.

No backend grant, Creator form, field, function, Custom API or upload contract
changes. Existing reads use Attachment / All_Attachments with Budget,
File_field1, Payment_Request, Budget_Modification, date and original author.
Construction Budgeting retains its trusted PO append capability; general
Delete/Link permissions, exact string parents, native FILE acknowledgement and
unknown-write recovery remain unchanged. No Creator deployment is required.

Changed files: Budget `widget.html` and `request-attachments.js`; the new read
race regression and browser fixture; existing attachment presentation,
deferred-feature and background-badge test fixtures; `package.json`; attachment
and Budget guides/design index; Budget widget config, widget manifest,
Development mapping and `releases/budget-manager/122.29.137/`.

## Verification

`scripts/test-budget-attachment-read-races.mjs` executes the actual source
loaders, renderer and request controller. It covers old success/failure after
capability resolution, three overlapping refreshes, real replacement failure,
retry, actor changes before/after a replacement, unchanged write-status
feedback, request-specific Retry and mount/load completion order.

The existing attachment presentation regression now uses the real feature
generation loader for its counted native-shaped transport check. Existing
deferred-feature and background-badge fixtures load the real actor-scope helpers.
The new regression fails against immutable 122.29.133 with the reported
superseded-read error and passes against the fix. Existing
request, draft and Construction-profile suites retain their upload and native
permission coverage. The new race suite is included in `npm run validate`.

Desktop QA in the agent-owned in-app browser used
`node scripts/serve-po-attachment-read-races.mjs`. It deliberately started the
old Budget read, resolved the capability, then settled old/current replies.
The file/count and enabled Choose Files appeared without the false error.
A forced real failure displayed Retry; Retry loaded the files again and
restored the count/picker without a stale banner. Keyboard arrows retained
Details/Attachments navigation. The fixture uses sample transport and makes
no Creator writes; this does not establish live native FILE transfer.

The Impeccable scan reported existing widget-wide styling warnings; this fix
changes no CSS. The focused browser pass verified loading, real failure/Retry,
loaded count, readable original author, upload-only controls and keyboard tabs.

Passed full checks: `npm run validate` and `npm run build:pages` (35 environment
paths). Validation required normal subprocess access for the existing release
guard's child Node processes. All 39 Budget source files, including vendor files,
exactly match the release, and the Production build matches its immutable HTML.
Release/config source hashes match. `git diff --check` passed for the
changed tracked files.

## Release and rollback

The user authorized PMP on November 11. The fix is based on current main
2cf1b11c, preserving the newer supplemental PO release. Development and Production
are promoted to 122.29.137 through the existing permanent hosted URL.
Rollback: map Production to **122.29.136** and rebuild Pages. No native rollback
or record cleanup is required.
