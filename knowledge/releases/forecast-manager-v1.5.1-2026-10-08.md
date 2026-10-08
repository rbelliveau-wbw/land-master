# Forecast Manager v1.5.1 — October 8, 2026

Remove the visible Builder schedules/count heading and the entire bottom matrix
autosave/Editable/Locked/Missing year legend row. Per-cell save/lock status and
keyboard navigation remain available. Schedule progress now has a
contrasting full-length track and outline; monthly progress has a muted green empty
track with an outline. Native segment positions, counts and meter widths are
unchanged. The inventory track also retains a visible empty surface.

Shade the complete current-month column green, including the totals footer.
Column backgrounds carry the highlight behind missing-year cells. Match the
Creator server calendar month/year, and patch the highlight during snapshot
refresh without rebuilding focused inputs. The table separator is a continuous
2px solid line beneath the month and pinned Builder headings.

Frontend-only source changes: forecast.css, forecast-summary.js, forecast-app.js
and versioned widget.html; config/manifest, focused browser assertions, design and
deployment documentation, immutable 1.5.1 and Dev/Production mappings. Forms,
fields, native functions, Custom APIs and permissions are unchanged. Creator 9.59
needs no deployment. Production verification is read-only.

Supported browser inert fixture verified the removed heading, visible track
outlines/empty portions, unchanged native meter widths (0%, 50%, 33.3333%), one
current October 2026 header, both builder cells, one totals cell and neutral October
2027. All 27 header boundaries used the same 2px solid separator. CLI Playwright
runner is not executed. Required validation/build and live evidence follow below.

Permanent URL: https://rbelliveau-wbw.github.io/land-master/prod/forecast-manager/
Rollback: remap frontend to **1.5.0** and deploy Pages. No data or backend rollback
is needed.

Every Add Forecast/Create Forecast action, including the selection-modal commit
button, uses the shared navy (#0b2345) surface and white text. Hover uses #173f70.

Final local validation: `npm run validate` passed (exit 0), including forecast
model/API/summary/compact-summary and repository JavaScript checks. Supported
browser fixture verified no bottom legend and all three forecast actions at
navy rgb(11,35,69) / white rgb(255,255,255); no writes were made.

Build: `npm run build:pages` passed (31 paths). Main commit f33a2d5.
[CI](https://github.com/rbelliveau-wbw/land-master/actions/runs/37809785727)
and [Pages](https://github.com/rbelliveau-wbw/land-master/actions/runs/37809785664)
completed successfully. Live read-only combined verification is recorded with the
succeeding 1.5.2 chooser release.
