# Crew Locations

Development-only local schedule testing, built from the existing milestone
widget's v2 runtime and shared presentation engines. Existing milestone views
are preserved.

- [Module contract](../../knowledge/modules/crew-locations.md)
- [Installation and remaining integration dependencies](../../creator/crew-locations/INSTALL.md)
- [NEW schema](../../creator/crew-locations/schema.json)
- [Verification evidence](../../creator/crew-locations/verification.json)

`npm run package:creator -- crew-locations` creates the Creator widget ZIP.
`node scripts/preview-crew-locations.mjs` serves an isolated local fixture preview;
add `?checks=1` to run the actual browser integration checks. Fixtures are outside
widget source and are never packaged. Normal widget execution requires an
authenticated Creator Development session and the installed custom API.
