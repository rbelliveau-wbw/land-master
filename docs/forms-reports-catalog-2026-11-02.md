# Forms & Reports Catalog

The updated native Creator `Forms_Reports` source opens links in Production by default.
Development remains available in the existing environment switch; Edit always
opens the Development builder. Each form has a plain-English purpose and
relationship explanation on hover or keyboard focus, plus View Fields with every
declared field, native link name, type and explicit linked form. Reports identify
their source form. Catalog navigation does not read or change business records.
The November 2 live Development export contains 83 forms, 100 reports and 1,817
top-level field declarations, plus 20 explicit Name/Address parts. The page also
shows 42 per-form system-field entries attested by exported report columns.
Compound parts include hidden components. Subforms point to their own complete
form cards. Implicit system-field availability outside exported report metadata
is not fabricated or represented as a complete per-form system schema.

## Sources And Build

- [Inventory](../creator/catalog/forms-reports.inventory.json) records every form,
  field and report from the selected native `.ds` export and any explicitly supplied
  installed schema supplements. Its source hashes and coverage audit make omissions
  visible. Never invent a form, field, report or system field absent from native metadata.
- [Descriptions](../creator/catalog/form-descriptions.json) contains reviewed
  executive descriptions keyed by exact form link name. The build rejects a missing
  description instead of fabricating one.
- [Page generator](../scripts/build-forms-reports-page.mjs) creates the reviewable
  [HTML](../creator/pages/forms-reports/forms-reports.html) and complete
  [native snippet](../creator/pages/forms-reports/forms-reports.dg). The baseline
  native source remains in `creator/catalog/forms-reports.baseline.dg` for rollback.

Refresh the inventory from the current native export, then run:

```powershell
python scripts/build_forms_reports_inventory.py --export creator/exports/SELECTED.ds --output creator/catalog/forms-reports.inventory.json
node scripts/build-forms-reports-page.mjs
node scripts/test-forms-reports-page.mjs
```

The generator preserves the established Creator Open and builder URL patterns.
The inventory is a schema snapshot; a newly created Development component may
require Creator promotion before its Production link is available. Switching the
Open destination does not promote or grant access to a component.

## Native Page And Verification

Save the generated HTML inside `Forms_Reports` / `html_snippet3` using its existing
Deluge HTML wrapper. The `.dg` artifact includes the native `htmlpage` declaration
for source review. The editor-ready
[snippet body](../creator/pages/forms-reports/forms-reports.snippet.dg) starts at
`<%{` and ends at `}%>`; paste that body when the HTML-snippet editor does not show
the `htmlpage` declaration. The HTML has no scripts or external requests. Native disclosure
motion and reduced-motion behavior reuse the canonical shared stylesheet, inlined
by the generator; the static page does not install the widget JavaScript engine.

Focused checks verify full inventory coverage, all fields, exact routes,
Production default, unique IDs, tooltip keyboard/hover support, HTML escaping and
reproducible artifacts. Desktop browser checks cover environment switching,
opening field panels and complete field scrolling. Native deployment should be
checked in Creator after saving; an offline preview does not verify Creator access.

No form, field, report definition, workflow, function or Custom API is changed by
the page source. Roll back by restoring the baseline `html_snippet3` content. The
surrounding page/menu and unrelated widgets retain their own deployment history.

## Menu Layout

The native menu is ordered Admin, Construction, Financial, Legal, Setup.
Admin contains the Builder Takedowns heading and its three existing reports,
then Land & Projects, Tax Parcel Management, Territories and Vendors.
Construction contains Crew Locations and Estimating (the original Construction
page link is preserved). Financial contains Budgets, Data Insights, Forecast
Manager and Pro Formas. Legal is a direct link. Setup contains User Access,
Settings and Forms & Reports.

The snippet is kept below Creator's 450,000-character limit with compact HTML.
Optional table end tags follow HTML parsing rules; desktop checks verify the
complete field table after parsing. Full repository validation and Pages build
passed.

## Verified Release

Source commit `dbdaecee5330b9dc731dc84f262539932d76e3f2` was pushed to main;
GitHub CI run `41568524568` succeeded. The native page was saved, reopened,
and verified in Development before promotion.

Creator version **9.138**, "Forms and Reports catalog and app menu", was published
to Stage and then Production on November 2, 2026. The release selected six
components: Forms & Reports, App Menu, and the display-name changes for Estimating,
Crew Locations, Territories and Vendors. Other pending Development changes were
not selected.

The Production page at
`https://creatorapp.zoho.com/wbdevelopment/land-master/#Page:Forms_Reports`
was verified with 83 forms, 100 reports, Production selected by default, the Add
Budget explanation visible, and its 55 declared field rows available in View
Fields. All requested menu groups and their item order were checked in Production,
including Setup > User Access, Settings, Forms & Reports. At narrower browser
widths, Creator places Setup under the navigation overflow menu.
