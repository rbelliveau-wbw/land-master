# Crew Management desktop QA kit — October 23, 2026

Release candidate **1.1.4**; rollback **1.1.3**. Scope covers Crew Management and
the existing Milestones page that reuses its widget. The user approved test crews
in the open Production app and will delete them later. Existing milestone data
supplies schedule coverage. PMP publishes main/Production repository assets;
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

The reader reuses authenticated LMData.readAll, preserving native report/row
access and required-field failure. Native form validators remain incomplete in
the recorded installation (Crew_on_validate unconfirmed;
Crew_Assignment_on_validate not installed). Restricted-user verification and
the corrected frontend's live SDK crew read remain pending. No broader grants,
external adapter, task source, or new Projects route is part of this release.

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
| Desktop geometry: 1250×600, 1366×768, 1440×900 | 23 cases at each size passed |
| Desktop geometry: 1920×1080 | 23 cases passed |
| Full repository validation / Pages build | Passed; 33 widget paths built |
| Repository deployment | Publishing 1.1.4; final hosted verification pending |
| Corrected live SDK crew read | Pending release; native layout inspection alone does not establish API reads |

Promote the immutable 1.1.4 repository release through the existing permanent
widget URLs. The user promotes Config/Widget and both report layouts in Creator;
then verify real crew filters/badges and refresh in the target app. Preserve
milestones, connection/sharing, audit/history, markers, and locks. Repository
rollback maps the widget to 1.1.3; reconcile native changes separately and retain
Projects guards. Detailed identities/status:
[installation](../creator/crew-locations/native-install-progress.json) and
[removal inventory](../creator/crew-locations/removal-inventory.json).

Full rendered check evidence: [desktop QA verification](../creator/crew-locations/desktop-qa-verification.json).
Native source snapshots normalize trailing whitespace only.
