
# Milestone Gantt

## Native acknowledgement guards (1.1.5)

Native writes remain private to the captured Save Changes flow. Contradictory top-level
data/result, nested results, multiple results or an unexpected ID cannot acknowledge a date
update. Failure flags beside an acknowledgement ID are also uncertain, without inspecting report
business fields. The raw failure is retained; drafts remain until exact fresh persisted dates verify.
Read-only recheck never repeats an uncertain update, and refresh blocks every public commit path.
`node scripts/test-milestone-gantt-sdk-v2.mjs` exercises actual save/preflight/progress/readback,
including stalled refresh and malformed acknowledgement recovery. These fixtures do not claim
a native live date write; the live controller write gate remains separately documented by root.

Subdivision milestone timeline and inline schedule editing.

## Baseline

- Version: `1.0.0`
- Original upload: `gantt (1).zip`
- Extracted source: `src/`
- Immutable original: `baseline/gantt (1).zip`
- Initial external release: `../../releases/milestone-gantt/1.0.0/`

The extracted source is intentionally preserved as a monolithic Creator widget baseline. Do not refactor it merely to make it look cleaner. Establish behavioral tests first, then make targeted changes.

## Entry points

- Creator package entry: `src/app/widget.html`
- External-hosting entry after release: `index.html`
- Creator package manifest: `src/plugin-manifest.json`

## Common commands

```bash
npm run validate
npm run package:creator -- milestone-gantt
npm run release -- milestone-gantt <new-version>
npm run build:pages
```

## Routine success feedback (1.1.8)

Uses the shared [success-feedback guide](../../knowledge/design/success-feedback.md). Existing inline green verification and progress/result dialogs remain. Routine confirmations describe the actual completed action; inline saves are grouped without delaying writes. Frontend only; no Creator deployment is required.
