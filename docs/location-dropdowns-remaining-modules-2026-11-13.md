# Location Record Dropdowns Across Modules

## Changes

Tax County uses Tax’s existing searchable-select adapter in Add Parcel Year,
Add Property, Edit Property, parcel-year rows, and Property rows. The popup
sorts case-insensitively while preserving original option indices and native
change/save handlers. Search, result text, and record controls use 14px text.
The selected location uses a centered SVG check.

Settings approval Territory scope choices sort by display name with
All Territories first. Search and single selection use the existing picker.
The popup and trigger use 14px text. Approval scope and persistence are unchanged.

## Remaining Module Inventory

- Legal: Territory record picker already searchable, alphabetized, single-select.
- Construction: location values are inherited read-only from Project/Subdivision.
- Crew Management: employee Territory record pickers already searchable, sorted, single-select.
- Budget: Territory is inherited; report filter keeps multiple selection.
- Forecasts and Insights: location controls are report filters; preserve multiple selection.
- Manage Lots and Milestones: location values are inherited/displayed, without editable City, County, or Territory dropdowns.
- Land & Projects and Pro Forma: covered by the preceding release; current Pro Forma global City changes are preserved.

No forms, schema fields, functions, Custom APIs, native permissions, or save
contracts changed. No Creator publication is required. Tax bulk County text
input is not an existing dropdown and remains unchanged.

## Verification

Focused tests execute actual Tax popup rendering/selection and Settings choice
sorting: alphabetical order, case-insensitive search, no matches, exact original
option identity, a single change event, unchanged unrelated lookup order, exact
string IDs, and no mutation of approval configuration. Existing approval-admin
checks passed. Desktop component preview verified alphabetical results, mouse
selection, search and keyboard selection; no live Creator records were written.
Full available JavaScript checks and Pages build are required before push.
Local Python is unavailable; CI runs the complete validation. Greptile is signed
out and did not run. The design detector’s full-file legacy findings were
reviewed against the narrow changes; no unrelated UI redesign was applied.

## Release And Rollback

Tax Center 19.17.38; Settings Manager 1.6.16. Restore Production mappings
to Tax Center 19.17.37 and Settings Manager 1.6.15 to roll back.
