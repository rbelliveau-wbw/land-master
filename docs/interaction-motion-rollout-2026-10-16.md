# App-wide interaction motion — October 16, 2026

The approved interactive preview is implemented through one shared motion engine,
CSS and explicit module registry, loaded by all ten widgets. The standing
[design rule](../knowledge/design/interaction-motion.md) is indexed from the
design README, general style guide and root AGENTS.md and applies to every
applicable new or revised feature.

## Coverage

| Pattern | Adoption |
| --- | --- |
| Tab changes | PF editor/list, Budget main/mode/tier, Lots views, Legal mode/approval tabs, Tax tabs, Land scopes/record tabs, Settings navigation/approval tabs and Forecast display basis. Existing native moving sliders are retained. |
| Expand/collapse | Shared native-details reveal/contraction, existing custom chevrons, keyed table-group rows and incoming view/pane settling. Native Legal, Settings approval-step and takedown row motion remains authoritative. |
| Row movement | Stable ID/object keys for PF lot mix, installments, PID/MUD, additional costs and curves; Budget items/projects; Lots rows; Tax rows; Land records; Gantt milestones; Settings curves; Insights groups/subdivisions; Forecast builders. Added rows fade/highlight and surviving rows move after add/remove/reorder. |
| Refresh continuity | Forecast keeps its actual complete snapshot mounted during reads, marks the workspace busy and settles only a new successful snapshot. Shared refresh support preserves original return/error behavior and overlapping busy state. Other modules retain existing authorized mounted refresh paths and mandatory initial/access/history clears. |
| Save feedback | Actual pending/verified/error state changes fade in place; verified rows receive a soft highlight. Existing inline checks and the shared black success popup remain. No fabricated success, new write or extra verification request is introduced. |
| Overlays | Semantic and registered legacy dialog/menu/picker/notes surfaces share a short entrance. Native dialogs use discrete enter/exit transitions; permitted small user dismissals use a sanitized inaccessible exit visual. Existing dismiss/focus/lock handlers run immediately. |
| Changed-row highlight | New keyed rows and actual verified inline saves receive a short soft-blue wash; intermediate typing calculations and whole financial matrices do not flash. |
| Progress meters | Mounted native fills transition to actual widths. Forecast's replaced monthly, inventory and lifetime/contract meters reconcile only within the existing complete schedule fingerprint, including the validated native gradient stops. Labels and ARIA are immediately authoritative. |

Large lists (>100 rows) avoid per-row geometry and use a bounded surface settle
when needed. Large/locked/programmatically cleared overlays close immediately.
Permission, actor, environment and record/schedule identity gates remain
authoritative. The existing number field-exit holds, complete text/sign colors
and overflow clipping are preserved. Synchronization also brings the seven
canonical numeric copies up to the existing repeated-unknown/blank hardening.

## Files and contracts

- Shared interaction-motion.js, interaction-motion.css,
  interaction-surfaces.js, their ten standalone copies, synchronization and
  adoption/browser checks.
- Ten widget HTML loaders/installation points and source version markers,
  configs, widget manifest, immutable bundles and Development/Production maps.
- Forecast forecast-app.js uses the shared busy/settle wrapper around its existing
  immediate snapshot read. forecast-summary.js keys and reconciles actual
  meter widths/gradient stops within its existing schedule fingerprint.
- Insights sales-app.js adds presentation-only group/subdivision row identities.
- Shared success feedback and its ten copies add a short entrance only from
  the existing confirmed success callback.
- Existing module browser fixtures now check the installed shared layer and
  actual PF tab/add/remove and Forecast chooser/meter integration; design and
  module knowledge records the repository-wide rule.

Creator forms/fields, Deluge functions and Custom API contracts: **unchanged**.
Affected UI controls are the existing financial editors, report/navigation,
notes/pickers, inline save states and progress meters. No data allowlist,
calculation, date meaning, approval routing, save acknowledgement or export
changes. **No Creator deployment is required.** Stable widget URLs and Stage
mappings are retained.

## Verification

npm run validate and npm run build:pages cover existing business behavior,
source parsing, discovery, synchronized adoption and 31 environment paths.
npm run test:motion:browser exercises all eight patterns, rapid tab changes,
native precise editors, keyed add/remove/reorder, real pending/verified states,
retained/overlapping refreshes, actual progress widths/gradient stops, inert
sanitized exits, immediate focus/close locks/actor resets, reduced motion and a
2,000-row geometry bound. Initial appearances and mismatched scopes stay still.

The existing numeric, seven-module, PF, Insights, Insights geometry/performance
and Forecast browser suites remain required. Actual PF editor tabs and lot-mix
draft add/remove are exercised with native events. Insights retains seven
measures, complete-history/revenue restrictions and steady fitting-table bounds.
The 26,000-lot/four-year fixture remains a mounted measure-only update.
CI, Pages, public version/asset hashes and live Creator presentation are verified
after publication.

## Releases and rollback

| Widget | Release | Rollback |
| --- | --- | --- |
| Budget Manager | 122.29.48 | 122.29.47 |
| Manage Lots | 0.13.7 | 0.13.6 |
| Contract Management | 1.62.9 | 1.62.8 |
| Tax Center | 19.17.20 | 19.17.19 |
| Land Master | 8.16.7 | 8.16.6 |
| Milestone Gantt | 1.1.15 | 1.1.14 |
| Settings Manager | 1.5.14 | 1.5.13 |
| Data Insights | 1.5.57 | 1.5.56 |
| Pro Forma | 1.80.118 | 1.80.117 |
| Forecast Manager | 1.7.14 | 1.7.13 |

Rollback the relevant Development/Production mapping to the prior immutable
release and redeploy Pages. No Creator record repair is needed.
