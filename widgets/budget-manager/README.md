
# Budget Manager

## Native attachment upload receipts (122.28.31)

Accepts the documented SDK `data.filename/filepath` and REST root
`filename/filepath` acknowledgements, then verifies the exact saved child,
Budget parent and file path. Duplicate/malformed/failed receipts remain
unverified and cannot replay uploads. Existing inline spinner and read-only
Recheck stay in the attachment workspace. Frontend only; no Creator deployment.
See the [upload audit](../../docs/budget-attachment-upload-response-2026-10-07.md)
for regression evidence and rollback to 122.28.30.

Budget management, approvals, attachments, and pro forma comparison.

Current release: `122.26.3`. Compact project cards with every phase always visible and Pro Forma styling; searchable multi-select project, territory, and lifecycle filters with external clear controls; direct owner/mapping editing. Category and item sizing remains at the original dimensions. See `../../knowledge/modules/budget.md` for regression and rollback notes. The release includes `src/app/budget-layout.css` alongside the existing widget files.

## Baseline

- Version: `121.0.0`
- Original upload: `budget_widget_v121_compact_comparison_metrics.zip`
- Extracted source: `src/`
- Immutable original: `baseline/budget_widget_v121_compact_comparison_metrics.zip`
- Initial external release: `../../releases/budget-manager/121.0.0/`

The extracted source is intentionally preserved as a monolithic Creator widget baseline. Do not refactor it merely to make it look cleaner. Establish behavioral tests first, then make targeted changes.

## Entry points

- Creator package entry: `src/app/widget.html`
- External-hosting entry after release: `index.html`
- Creator package manifest: `src/plugin-manifest.json`

## Common commands

```bash
npm run validate
npm run package:creator -- budget-manager
npm run release -- budget-manager <new-version>
npm run build:pages
```

## Routine success feedback (122.28.24)

Uses the shared [success-feedback guide](../../knowledge/design/success-feedback.md). Existing inline green verification and progress/result dialogs remain. Routine confirmations describe the actual completed action; inline saves are grouped without delaying writes. Frontend only; no Creator deployment is required.

## Saved attachment reconciliation (122.28.32)

After a settled unrecognized/lost FILE reply, automatically verify the exact saved
child and parent/file before reporting failure. Never replay an upload from that
check. Contract uploads preserve the Email switch without requiring it to be on;
Budget phase rows omit the direct Approvals shortcut and reserve space for their
remaining controls. No Creator backend deployment is required. See
[regression evidence and rollback](../../docs/attachment-upload-reconciliation-2026-10-07.md).
