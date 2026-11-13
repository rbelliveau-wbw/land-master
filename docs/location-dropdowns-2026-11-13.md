# Location Dropdowns

Land & Projects City, County, and Territory record pickers are searchable and
alphabetical with single selection. Pro Forma Territory reuses the proven Land
picker adapter scoped to its record field. Existing Offer City/County search
and canonical-choice validation cover existing and staged Properties; their
choice lists use case-insensitive alphabetical ordering. Report filters retain
their existing multi-selection behavior. Location controls use 14px text.

Only widget presentation changed. No forms, fields, functions, Custom APIs,
permissions, persisted values, or Creator publication changed.

## Verification

All available JavaScript prevalidation/validation checks and the Pages build
passed. Four Python checks could not run locally because Python is unavailable;
CI runs the complete validation suite. Greptile is signed out and did not run.
The design detector reported existing legacy UI warnings; no unrelated redesign
was applied. Desktop demo verification covered Land Project City search, no
matches, selection, and Territory search; Pro Forma Territory alphabetical
choices, case-insensitive search, and replacement selection. Native Creator
saves were not exercised. Offer preview could not load connected record options.

## Release And Rollback

Production: Land Master 8.17.31 and Pro Forma 1.80.155.
Rollback: restore Production mappings to Land Master 8.17.30 and Pro Forma
1.80.152 in deploy/environments.json. Stable Creator widget URLs stay unchanged.
