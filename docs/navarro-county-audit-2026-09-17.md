# Navarro County audit — 2026-09-17

Inspected all 62 live Land Master form definitions through Creator's Application IDE.
Fourteen forms have County picklists or multi-select lists; Add_Pro_Forma.Property_County
is a text field and requires no choices. The other 47 forms have no County field.

## Creator changes

Added only `Navarro` to the existing County choices on these nine forms and reopened
each definition to confirm persistence and an otherwise identical source:

- Contract
- Tax_Rate
- Taxing_Jurisdiction
- Forecast_Search
- Lot_Search
- Mass_Create_Lots
- System_Search
- Tax_Rate_Template
- Tax_Table_Search

Property, Project, Subdivision, Lots, and Tax_Parcel_Year already included Navarro.
Published the nine County changes through Stage to Production as Creator version
**8.42**, titled **Add Navarro County to remaining County lists**. Both environments
showed 8.42 and Development showed no changes available after publication.
No Creator functions, workflows, or Custom API contracts changed.

The generated metadata remains tied to its historical export; this live audit takes
precedence until a fresh export is imported. Do not hand-edit generated field files.

## Widget releases

| Widget | Production release | Changed County choices | Rollback release |
| --- | --- | --- | --- |
| Land Master | 8.11.7 | Property, Project, Subdivision, Lot | 8.11.6 |
| Proforma Manager | 1.79.13 | Existing and staged Property rows | 1.79.12 |
| Manage Lots | 0.7.1 | Import Plat review | 0.7.0 |
| Tax Center | 19.17.2 | Property and parcel-year editors | 19.17.1 |

Tax Center edit choices include Navarro even before a Navarro record exists and retain
all record-derived counties. Data-filter dropdowns continue to show counties present
in their underlying records. No other widget has an independent County entry list.

Changed files include these widgets' HTML, configuration, README, immutable releases,
manifests/widgets.json, deploy/environments.json, and the Land Master TerraVault test's
version assertion (now reads the current widget configuration).

## Verification and rollback

`npm run validate` and `npm run build:pages` passed for both release batches.
The production artifacts contain Navarro exactly once in each static County list.
Tax Center County generation was checked with empty data and with existing Navarro
and other county records to verify availability, sorting, and deduplication.
No business records were created or changed as part of verification.

Widget rollback changes only the production version mappings to the releases above.
Creator rollback, if necessary, removes only the appended Navarro option from the
nine changed County fields and publishes that change through Stage to Production;
review any records using Navarro before removing an option.
