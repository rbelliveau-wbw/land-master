# Crew Management desktop QA kit — October 23, 2026

Deployed release **1.1.4**; rollback **1.1.3**. Scope covers Crew Management and
the existing Milestones page that reuses its widget. The user approved test crews
in the open Production app and will delete them later. Existing milestone data
supplies schedule coverage. PMP published main/Production repository assets;
the user promotes the prepared Creator changes.

## Implemented changes

| Finding | Implemented behavior |
| --- | --- |
| Long schedules put the editing surface far below the timeline. | Bounded timeline/editor workspaces retain vertical scrolling, frozen phase labels, and sticky calendar/table headings. Filters wrap within the card. |
| Unconfigured Tasks created a large empty matrix. | Compact paired Tasks rows preserve crew badges and explicitly say Task source unavailable. No empty editable task fields are invented. |
| Reaching a later stage required long horizontal scrolling. | Edit Schedule / Back to Timeline links and a searchable Jump to stage control expose the intended stage beside the frozen phase column. |
| Reset could return an unavailable crew source to an empty assignment view. | Initial load and Reset share source-aware defaults: real upcoming milestone phases when crews are unavailable, Crew Assigned Phases when configured. Explicit cleared selections stay empty. |
| Filter popups could leave the viewport or lose keyboard focus. | Picker placement respects available space above/below the anchor; long options scroll beneath fixed search/footer controls. Arrow navigation, toggling, Escape, and focus restoration remain usable. |
| A successful native save could omit optional display dates. | Exact confirmed destination IDs establish success. Acknowledged requested dates preserve duration deltas/propagation until normal reload; returned display fields are restricted to intended records. |
| Native crew visibility was coupled to disabled external ingestion. | Separate nativeCrewReadsEnabled=true enables authenticated native report reads while crewsEnabled=false and blank import actor/source keep external imports off. |
| The proposed assignment report alias did not exist. | Active reader, preview, schema, preparation tool, tests, and manifest now use the existing Crew_Assignment_Report; no native report was renamed. |

Calendar arithmetic, hidden-stage propagation, sold-out/past-date protections,
prepare/apply auditing, native permissions, and existing Projects guards remain.
Tasks/source writes stay disabled. creatorOnly=true, projectsPushEnabled=false.

## Native changes prepared in Development

crewLocationsConfig and crewLocationsWidget were saved and reopened; saved
native bodies were confirmed and stored under creator/crew-locations/native-installed/.
The Widget matched its pre-edit native body with only the two capability flag
references and dependency message changed. Previous native references are under
native-before/ with suffix desktop-qa-20261023.dg.

Both report layouts were auto-saved and final native columns verified from DOM:

| Existing report | Saved native columns |
| --- | --- |
| All_Crews | Crew_Code, Crew_Name, Badge_Color, Active, Source_System, Source_Record_ID, ID |
| Crew_Assignment_Report | Subdivision1, Crew, Assignment_Date, Source_System, Source_Key, Source_Updated_At, ID, Source_Record_ID |

The deployed Development widget completed native empty Crew/Assignment SDK reads
as owner with crews enabled; no report error or native-crew-unconfigured warning
appeared. Populated Production badges await user promotion. Native validators
remain incomplete (Crew_on_validate unconfirmed; Crew_Assignment_on_validate not
installed). demouser3 was denied by Creator's outer Page gate; broad widget/report/
row restrictions were not tested. The original preview identity was restored.

## Changed files and affected contracts

| Area | Files / effect |
| --- | --- |
| Widget | crew-app.js, crew-locations.css, widget.html: desktop layout, controls, acknowledgement display, report contract |
| Creator | crewLocationsConfig / crewLocationsWidget; saved snapshots, inventories, schema report-link contract |
| Verification / release | Fixtures/tests, module/design docs, manifest/version, environment mapping, immutable releases/crew-locations/1.1.4 |

Existing Custom API aliases Crew_Locations_Widget_DEV / _STAGE / Crew_Locations_Widget
are unchanged; no APIs were created. Crew and Crew_Assignment received QA rows
only. No form schema or milestone fields changed during this review.

## Production test data

Source system is MANUAL_QA. All three crews are active. Native record IDs are
strings and must not be converted to JavaScript numbers.

| Crew | Production ID | Source record ID |
| --- | --- | --- |
| TEST-A | 4410926000005393002 | crew-qa-20261023-a |
| TEST-B | 4410926000005393004 | crew-qa-20261023-b |
| TEST-C | 4410926000005393006 | crew-qa-20261023-c |

| Assignment | Date | Source record ID |
| --- | --- | --- |
| TEST-A / Cameron Ranch - Phase 01 | October 23, 2026 | assignment-qa-20261023-1 |
| TEST-B / Cameron Ranch - Phase 01 | October 22, 2026 | assignment-qa-20261023-2 |
| TEST-C / Lakeside at Granger - Phase 01 | October 16, 2026 | assignment-qa-20261023-3 |

All three native form submits succeeded. The native assignment report confirms
three IDs: 4410926000005393008, 4410926000005393010, 4410926000005393012.
The individual ID-to-row mapping is not yet recorded; do not infer it from order.
Source_Key is MANUAL_QA: plus Source_Record_ID. The badge window is inclusive
October 16–23 in America/Chicago; the third assignment covers its lower boundary.

## Verification and handoff

| Check | Current result |
| --- | --- |
| Crew rule/contract suite | 24 groups passed |
| Independent native-read/import/report contract checks | 5 groups passed |
| Design-document checks | Passed; links/discovery only |
| Normal browser integration suite | 21 cases passed |
| Desktop geometry: 1250×600, 1366×768, 1440×900, 1920×1080 | 23 cases at each size passed |
| Full repository validation / Pages build | Passed; 33 widget paths built |
| Repository deployment | 1.1.4 asset commit 3141c9f84bbeb784de10940dc12021b3a898047d on main; CI and Pages successful |
| Native Production Milestone_Gantt_View | 1.1.4 verified; Reset showed 38 actual upcoming phases; Enter opened exactly Cameron Rough Cut Start 01/01/2027, then Escape dismissed it without a date write |
| Native Development Crew_Management | 1.1.4 verified as owner; empty native Crew/Assignment SDK reads completed |

Deployment used the existing permanent widget URLs. The remaining Creator package
is exactly two functions (crewLocationsConfig, crewLocationsWidget) and two report
layouts (All_Crews, Crew_Assignment_Report), for the user to promote. Then verify
populated Production crew filters/badges and refresh in the target app. Preserve
milestones, connection/sharing, audit/history, markers, and locks. Repository
rollback maps the widget to 1.1.3; reconcile native changes separately and retain
Projects guards. Detailed identities/status:
[installation](../creator/crew-locations/native-install-progress.json) and
[removal inventory](../creator/crew-locations/removal-inventory.json).

Full rendered check evidence: [desktop QA verification](../creator/crew-locations/desktop-qa-verification.json).
Native source snapshots normalize trailing whitespace only.
Deployment: [CI](https://github.com/rbelliveau-wbw/land-master/actions/runs/39965582034),
[Pages](https://github.com/rbelliveau-wbw/land-master/actions/runs/39965582041).
Production screenshot: C:/Users/R/Desktop/claude/outputs/crew-desktop-qa/production-1.1.4.png.
