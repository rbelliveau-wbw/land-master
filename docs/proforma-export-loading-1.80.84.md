# Excel export without report navigation — 1.80.84

Production 1.80.82 successfully downloaded Excel but left the widget on “Loading
complete record options…”. Excel used the generic reference navigation helper,
which replaced the screen. The first prepared candidate, 1.80.83, restored and
re-rendered the report; it was never promoted. The user explicitly requested that
export leave the main report untouched and authorized main/Production promotion.

Excel now loads reference options directly with `preserveView:true` and displays
loading only in the existing export dialog. Reference publication skips its list
re-render for this caller. The report remains mounted, with its row nodes, search,
scroll, global status and editor draft intact. The main report is not re-read.
Reference failures leave the dialog open with choices enabled for retry. XLSX
returns its completion promise. Other reference-navigation callers are unchanged.

## Verification

- `node scripts/test-proforma-export-loading.mjs` checks cold and repeated exports
  from the list, actual Dashboard and an editor with an unsaved draft, valid XLSX
  generation/readback, unchanged report nodes/render count/search/scroll/status,
  no header refresh, dialog-only loading, failed reference/workbook retries, and
  zero business writes.
- Release 1.80.82 fails this regression while options load (`loading !== vList`).
  The final source and immutable 1.80.84 release pass.
- Existing lazy-startup, phase/workbook and Word export regressions pass.
- Full `npm run validate` passed. `npm run build:pages` and repository validation
  passed with the Production PF mapping on 1.80.84 (29 environment paths).
  CI and Pages deployment are monitored after the authorized push to main.
- Test transport/DOM boundaries are synthetic; no live Creator records are changed.

## Scope and release

Changed files: PF widget source/config, `manifests/widgets.json`, `package.json`,
`scripts/test-proforma-export-loading.mjs`, module documentation, widget README,
general style guide, this note, and immutable `releases/proforma-manager/1.80.84/`.
Only Production's PF mapping in `deploy/environments.json` changes to `1.80.84`.

No Creator forms, fields, functions, Custom APIs or workflows change. No Creator
deployment is required. Development/Stage and other widgets retain their mappings.

Rollback: restore the Production PF mapping to `1.80.82` (previous live release).
It restores the original loading-state bug; no data rollback is needed.
