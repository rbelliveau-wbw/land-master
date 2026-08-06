
# Refreshing Creator Metadata

1. Export the current Creator application definition.
2. Save it under `creator/exports/` with an ISO date in the filename.
3. Do not delete the prior export until the new snapshot is reviewed.
4. Regenerate:
   - forms and fields
   - reports
   - pages
   - custom functions
   - workflows
   - connections
5. Review meaningful differences in a pull request.
6. Update `creator/generated/application.json` counts and SHA-256.

Custom API definitions are not treated as verified merely because similarly named functions exist. Confirm Custom APIs in Creator Microservices and update `manifests/custom-apis.json`.
