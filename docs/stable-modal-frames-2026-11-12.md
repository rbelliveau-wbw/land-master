# Stable Modal Frames — November 12, 2026

Search results, loading/errors, expanded details and editor results now remain
inside explicitly sized, viewport-capped windows. The Budget global picker uses
one shared results/status scroller, keeping search and actions fixed across both
supplemental-PO steps. No business logic or Creator contracts changed.

## Releases And Rollback

| Widget | Previous Production | New Production |
| --- | --- | --- |
| proforma-manager | 1.80.145 | 1.80.146 |
| budget-manager | 122.29.138 | 122.29.139 |
| land-master | 8.17.15 | 8.17.16 |
| tax-center | 19.17.36 | 19.17.37 |
| milestone-gantt | 1.1.20 | 1.1.21 |
| manage-lots | 0.13.19 | 0.13.20 |
| settings-manager | 1.6.13 | 1.6.14 |
| lot-sales-explorer | 1.7.1 | 1.7.2 |
| forecast-manager | 1.9.2 | 1.9.3 |
| crew-locations | 1.10.2 | 1.10.3 |

Development and Production select the new immutable releases. Stage is unchanged.
Legal/Construction was already top-anchored and is not promoted by this change.
Rollback changes only the affected Production mappings to Previous Production;
retain the permanent widget URLs and all existing Creator records.

## Verification

The in-app browser fixture exercised 35 dialog layouts at 1280×900, 800×600,
390×420 and 390×280: 700 passing state checks, zero failures. It checks fixed
frame, header, search and footer coordinates across many/empty/loading/error/
expanded states, viewport fit and a working internal scroll region. It loads
actual widget styles and static source markup (representative markup for
runtime-created dialogs) without SDK scripts or Creator writes.

Full `npm run validate` and `npm run build:pages` passed locally.

The layout detector found no issues in the new stylesheet; its 16 findings in
existing source concern pre-existing padding/card structure outside this change.
Greptile could not run because the pinned CLI reports Not signed in.

## Affected Contracts

- Forms and fields: none.
- Functions and Custom APIs: none.
- Creator publication: not required.
- Regression focus: global Budget/PO choices, PO Email Activity disclosures and
  refresh, attachment association, long result lists, empty/error states, tab
  changes, native dialog closed behavior and short viewport scrolling.
