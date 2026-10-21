# Modal close and Construction picker fixes

Production Legal reproduced a detached .lm-motion-ghost after the real
attachment dialog closed. Remove the shared engine's dismissal capture and
clone/reinsert path across all ten widgets. Keep real opening fades, native
dialog transitions, authorization resets, immediate handlers and focus return.
The CUA desktop fixture confirms Close and Escape produce zero copies, focus
returns immediately, blocked closes stay open, drafts survive and tabs retain
one moving rail. The existing browser regression expects clone-free dismissal.

Construction selections patch mounted controls and the suggested name instead
of replacing every field. Subdivision changes update context and parent options;
manual names, dates, descriptions, permissions and persistence stay unchanged.
Actual-source regression checks mounted node identity, focus and native payloads.

Construction's menu removes Open in Creator and uses Assign Parent Request.
Its new/edit parent picker uses the existing searchable single-select component.
Eligible roots are grouped by Subdivision, current Subdivision first, and remain
searchable by request, subdivision, type, project and territory. Missing
subdivisions are shown explicitly. Parent eligibility, explicit save, child and
cross-module guards remain unchanged. Legal keeps its existing parent grouping.

No Creator forms, fields, Deluge functions or Custom APIs change. No Creator
publication is required. Each widget receives a new immutable release and
Development/Production mappings; Stage remains independently pinned.

Rollback each mapping to its prior Production version in commit 6c097017.
The new releases are: proforma-manager 1.80.125, budget-manager 122.29.61, land-master 8.16.10, contract-management 1.62.21, tax-center 19.17.24, milestone-gantt 1.1.17, manage-lots 0.13.9, settings-manager 1.5.18, lot-sales-explorer 1.5.59, forecast-manager 1.7.16.
