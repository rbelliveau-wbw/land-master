# Crew Management 1.1.4 installation

Latest user direction: enable real Creator milestone editing, including Production;
never write to Zoho Projects. PMP pushes repository main/Production assets and
leaves pending Creator promotion to the user. Earlier Development-only testing
instructions in [historical installation notes](INSTALL-1.0.6-history.md) are superseded.

Repository 1.1.4 is deployed; CI and Pages passed. Production Milestone_Gantt_View
and Development Crew_Management displayed version 1.1.4. The owner Development
session completed empty native crew/assignment SDK reads. Remaining Creator
promotion is exactly **crewLocationsConfig**, **crewLocationsWidget**,
**All_Crews** and **Crew_Assignment_Report**. Populated Production badges await
the user's promotion; no native milestone dates were written in this review.

1. Read [native-install-progress.json](native-install-progress.json) and
   [removal-inventory.json](removal-inventory.json). Reuse the six existing forms,
   four access fields, ten core functions and `crew_locations` widget registration.
2. Compile the updated Config, Read, Validate, DirectValidate, Status and Widget functions
   from `creator/functions/`. Config derives `thisapp.environment.type` and
   `.linkname`; mode is `testingMode=false`, `creatorOnly=true`,
   `projectsPushEnabled=false`. Do not replace the logged-in-user connection.
3. Keep all five existing importer/push guards and the milestone On Validate
   workflow. Preserve newer workflow audit/error handling. Both outbound schedules
   remain inactive. External crew/task adapters stay disabled until verified.
   The independent `nativeCrewReadsEnabled=true` capability permits authenticated
   native Crew/Crew_Assignment reads only. Keep `crewsEnabled=false`, blank
   `importActor`/`crewSourceSystem`, and tasks/write verification false. Compile
   Config and Widget together after verifying `All_Crews` exposes ID, Crew_Code,
   Badge_Color, Active and `Crew_Assignment_Report` exposes ID, Subdivision1,
   Crew, Assignment_Date, Source_System, Source_Record_ID. Production All_Crews
   exists but currently has no exposed columns. Native builder/Access Dev Live
   confirmed `Crew_Assignment_Report`; do not rename it or recreate a report named
   All_Crew_Assignments. Config/Widget save persistence is confirmed by reopened
   native editors, and both native report layouts are auto-saved/DOM verified.
   Development empty SDK reads passed as owner; user Creator publication remains pending.
   Required-field failure must stay closed.
   The Development assignment layout is now auto-saved with its native columns
   verified from DOM; the required assignment Source_Record_ID is the field on
   Crew_Assignment, not the related Crew.Source_Record_ID field. All_Crews layout
   now exposes Crew_Code, Crew_Name, Badge_Color, Active, Source_System,
   Source_Record_ID, ID. Populated Production reads await user promotion.
4. Bind the existing `crew_locations` widget to the permanent external URL
   `https://rbelliveau-wbw.github.io/land-master/prod/crew-locations/`.
   Keep the new page identity `Crew_Management` (display Crew Management) and the
   existing `Milestone_Gantt_View` embed on that same registered widget.
5. Configure OAuth2, Admin-only POST JSON APIs, Key and Value argument
   `payload:string`, standard response: `Crew_Locations_Widget_DEV` targets
   Development, the optional `Crew_Locations_Widget_STAGE` targets Stage, and
   `Crew_Locations_Widget` targets Production. Development and Production aliases
   are installed; Stage is not configured by this PMP. Do not expose a public endpoint.
6. In each environment, grant the existing intended administrator
   View_Crew_Locations and Edit_Crew_Milestones through the existing User_Access
   record. Keep task and crew management permissions false while adapters are off.
   Other users retain default denial and native report/sharing restrictions.
7. The native save blocker is resolved by the prepare/apply protocol. Development
   save and audited Undo both returned complete destination acknowledgements;
   see creator-only-save-verification.json. Promote the controller, direct
   validator and status cleanup together with the Creator-only configuration.
   The user promotes pending Creator changes through Stage to Production after
   the native edit/save check. Do not infer native publication from Pages success.
8. Verify actual native capability routing, real report data, a future milestone
   endpoint save with Push_Update=false, durable audit, Undo, and no Projects call.
   A native error now reports its actual Creator response code/details. Do not
   bypass validation or claim a save worked without a native acknowledgement.

The controlled earlier failed save was operation
`549235cd-65d3-40fb-8b2e-7349cb14f45b`; the original End remained 03/17/2027.
Preserve its audit and any marker until deliberately reconciled. Completed/closed
phase and historical endpoint protections remain active.

Run `node scripts/test-crew-locations.mjs`,
`node scripts/test-crew-native-capabilities.mjs`, `npm run validate`, and
`npm run build:pages`. Use `npm run package:creator -- crew-locations` if an internal
ZIP is needed. Fixtures are isolated and do not establish live save behavior.

Rollback restores the original milestone embed from
`native-before/Milestone_Gantt_View.zml`, disables the new page/APIs and preserves
all existing milestone data, audit records, markers and active locks. Do not
remove outbound guards while marked records remain. Keep this inventory current.
