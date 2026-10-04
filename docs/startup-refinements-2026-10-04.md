# Startup and report refinements — 2026-10-04

This batch changes widget JavaScript and presentation only. It uses existing
Creator reports and the already deployed lean access API; no Creator schema,
Deluge publication, permission grants, financial writes or emails are required.
All six widgets already use SDK2. It does not change their SDK version.

| Improvement | Before | After / verification |
| --- | --- | --- |
| Pro Forma first screen | Waited for companies, sellers, properties and templates before showing the list | Complete headers, approvals and access show first. A controlled actual-source fixture with 2,139 properties and 204 companies makes 29 → 9 initial requests. The 20 deferred requests still load every record before a dependent action. |
| Legal access | Full Get_User_Access included a Pro Forma owner scan unused by Legal | Get_User_Access_Lean supplies the same flags and full-name roster without that scan. Production GET and Development POST alias shapes pass the whole-source native-boundary fixtures. |
| Insights recent years | A Hide Empty off guard hid the already loaded recent data until full history arrived | Current and previous calendar years display immediately. Selected-period totals match the completed-history fixture exactly. Historical First Lot Sale, complete inventory and exports stay gated; failed history retains recent results and Retry. Production promotion remains held pending verification authorization. |
| Tax Arbitrate | Negative Yes/No comparisons excluded null picklists and could show Undecided 0 | Row filters and server facets share an explicit null-aware clause. Counts always come from Creator for the exact base criteria; no page or local row subset supplies a total. Old-scope cached counts stay hidden; failed counts remain unknown. |
| Fill Project Territory | Bulk fill button, modal, planner and write path were present | All entry points and source assets are removed. Normal Project/Territory behavior, core completeness, dirty-draft and save guards remain tested. Existing immutable releases remain available for rollback. |
| Builder Takedowns | Subdivision groups, dense lot chips, no report detail view, search after Subdivision | Flat newest-first report; search first; searchable Builder multi-select after Subdivision; amber Scheduled chips; six-chip preview and complete read-only detail modal with stored financial/tax values, dates and notes. Entered/Purchase pills retain their actual field meaning pending the user's Close Date decision. |

## Accuracy checks

The shared complete-count/cursor reader and unique string-ID guards are unchanged.
Pro Forma reference collections publish together for the captured actor and load
generation. Pending, denied and stale reads cannot seed a new draft or send a
dependent action; retry remains available. The main-list approval readiness
message says it needs checking until reference data is complete, then the
unchanged business checks run before a Send confirmation.

Insights' held-history test executes the actual application functions with Hide
Empty off, checks equal selected totals after background completion, preserves
scroll, gates historical export, rejects stale publication and performs no lot
reads for a denied dashboard. Existing adapter tests cover full native-shaped
counts/cursors and error propagation. This is code evidence, not an authorized
native Dev graph pass: all existing Dev actors have dashboard access disabled.
The prior automatic approval review rejected the stricter shared-adapter
promotion for that missing individual gate. Production remains on 1.5.40 until
the user authorizes an alternate check or supplies an authorized Dev actor.

Tax retains its 800-row editing limit, fresh complete-ID preflight, verified
per-record updates, unknown-outcome quarantine and no blind write replay.
Regression fixtures retain 152/151 completeness, 12,017 reference rows and
800-destination batch scenarios. The new Arbitrate test checks null/empty/Yes/No
partitions, displayed row filtering, shared criteria, stale caches and denied
counts. No live mass update was used as a test.

The Takedowns whole-widget fixture checks global ordering across subdivisions,
combined filters, all eight fixture lots in the modal versus six in the preview,
stored currency formatting, escaped Notes, focus return and zero requests/writes
on opening details. Existing create/claim/preflight tests remain in force.

## Affected contracts and rollback

- Pro Forma reads the existing Pro Forma headers/approvals on startup and defers
  All_Companies, All_Builders, All_Property, Proforma_Item_Report and
  All_Construction_Cost_Curves. Full field payloads, saved lookups, templates,
  calculation engines and write contracts are retained. Roll back to 1.80.69.
- Legal calls Get_User_Access_Lean / Get_User_Access_Lean_DEV; roster and Legal
  flags have full-versus-lean parity coverage. Roll back to 1.60.48.
- Tax changes only Arbitrate1 criteria/count presentation and scope-aware facet
  caching. Other native criteria and field mapping remain compared to baseline.
  Roll back to 19.17.6.
- Land removes the special All_Projects.Territory bulk-fill path. Normal editors
  and existing Project Territory inheritance/read-only behavior remain.
  Roll back to 8.14.4.
- Manage Lots reads the existing complete All_Builder_Takedowns snapshot;
  Subdivision1/Builder1 ID filters, Added_Time ordering, Entered_Date and
  Purchase_Date pills, stored financial/tax fields and Lots/Notes detail use that
  snapshot. Missing fields are unavailable. Roll back to 0.9.17.
- Insights keeps its two-year Close_Date/Purchase_Date OR window and complete
  background All_Lots_All_Fields read. Roll back to Production 1.5.40.

## Further improvements found

1. Move the common search, multi-select and read-only detail shell into shared
   code with small module adapters. Focused Markdown guides define the design;
   actual shared code and targeted tests prevent spacing/behavior drift.
2. Expose report metadata and a safe original-author/count summary endpoint so
   startup badges need fewer full file/comment records. Verify report field
   visibility and permissions before narrowing any payload.
3. Add date-aware native pagination ordering or snapshot support for large Tax
   searches. Count/cursor/ID reconciliation must remain mandatory; throughput
   gains cannot trade away completeness or batch preflight.
4. Separate template options from seller/property options in Pro Forma if live
   timings justify it. This batch deliberately publishes those dependent
   collections together to avoid half-ready drafts.
5. Capture first-usable and complete-load timings on the same actor, filter and
   data set over several refreshes. Request counts show reduced initial work;
   they do not prove a fixed latency improvement.

Budget and Land already use their earlier first-screen optimizations. Manage
Lots must retain all current takedown claims before offering available lots;
Gantt needs the complete selected milestone scope; Tax needs complete results
before edits. No speculative truncation was applied to those safety dependencies.

SDK2's useful primitives are custom field projections, up to 1,000 records per
request, cursor pagination and record counts. The custom HTML/CSS/JS widgets
remain customizable. Startup speed comes from the loading strategy above;
the SDK version by itself does not remove service limits. See the official
[Get Records documentation](https://www.zoho.com/creator/help/js-api/v2/get-records.html).
