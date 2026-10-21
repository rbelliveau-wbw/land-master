# Crew Management 1.1.0 installation

Latest user direction: enable real Creator milestone editing, including Production;
never write to Zoho Projects. PMP pushes repository main/Production assets and
leaves pending Creator promotion to the user. Earlier Development-only testing
instructions in [historical installation notes](INSTALL-1.0.6-history.md) are superseded.

1. Read [native-install-progress.json](native-install-progress.json) and
   [removal-inventory.json](removal-inventory.json). Reuse the six existing forms,
   four access fields, ten core functions and `crew_locations` widget registration.
2. Compile the updated Config, Read, Validate, DirectValidate and Widget functions
   from `creator/functions/`. Config derives `thisapp.environment.type` and
   `.linkname`; mode is `testingMode=false`, `creatorOnly=true`,
   `projectsPushEnabled=false`. Do not replace the logged-in-user connection.
3. Keep all five existing importer/push guards and the milestone On Validate
   workflow. Preserve newer workflow audit/error handling. Both outbound schedules
   remain inactive. Crew/task adapters stay disabled until verified.
4. Bind the existing `crew_locations` widget to the permanent external URL
   `https://rbelliveau-wbw.github.io/land-master/prod/crew-locations/`.
   Keep the new page identity `Crew_Management` (display Crew Management) and the
   existing `Milestone_Gantt_View` embed on that same registered widget.
5. Configure OAuth2, Admin-only POST JSON APIs, Key and Value argument
   `payload:string`, standard response: `Crew_Locations_Widget_DEV` targets
   Development, `Crew_Locations_Widget_STAGE` targets Stage, and
   `Crew_Locations_Widget` targets Production. Do not expose a public endpoint.
6. In each environment, grant the existing intended administrator
   View_Crew_Locations and Edit_Crew_Milestones through the existing User_Access
   record. Keep task and crew management permissions false while adapters are off.
   Other users retain default denial and native report/sharing restrictions.
7. The user promotes pending Creator changes through Stage to Production after
   the native edit/save check. Do not infer native publication from Pages success.
8. Verify actual native capability routing, real report data, a future milestone
   endpoint save with Push_Update=false, durable audit, Undo, and no Projects call.
   A native error now reports its actual Creator response code/details. Do not
   bypass validation or claim a save worked without a native acknowledgement.

The controlled earlier failed save was operation
`549235cd-65d3-40fb-8b2e-7349cb14f45b`; the original End remained 03/17/2027.
Preserve its audit and any marker until deliberately reconciled. Completed/closed
phase and historical endpoint protections remain active.

Run `node scripts/test-crew-locations.mjs`, `npm run validate`, and
`npm run build:pages`. Use `npm run package:creator -- crew-locations` if an internal
ZIP is needed. Fixtures are isolated and do not establish live save behavior.

Rollback restores the original milestone embed from
`native-before/Milestone_Gantt_View.zml`, disables the new page/APIs and preserves
all existing milestone data, audit records, markers and active locks. Do not
remove outbound guards while marked records remain. Keep this inventory current.
