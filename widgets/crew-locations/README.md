# Crew Management

Creator-only scheduling in authenticated Development, Stage or Production.
Milestone date saves always keep Push_Update false; no Projects writes.
Crew_Management and the existing Milestone_Gantt_View use the same new widget.

- [Module contract](../../knowledge/modules/crew-locations.md)
- [Installation and remaining integration dependencies](../../creator/crew-locations/INSTALL.md)
- [NEW schema](../../creator/crew-locations/schema.json)
- [Verification evidence](../../creator/crew-locations/verification.json)

`npm run package:creator -- crew-locations` creates the Creator widget ZIP.
`node scripts/preview-crew-locations.mjs` serves an isolated local fixture preview;
add `?checks=1` to run the actual browser integration checks. Fixtures are outside
widget source and are never packaged. Normal widget execution requires an
authenticated Creator session and its environment-specific Custom API.
