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
At the initial release, Greptile could not run because the CLI was signed out.

## Affected Contracts

- Forms and fields: none.
- Functions and Custom APIs: none.
- Creator publication: not required.
- Regression focus: global Budget/PO choices, PO Email Activity disclosures and
  refresh, attachment association, long result lists, empty/error states, tab
  changes, native dialog closed behavior and short viewport scrolling.

## Greptile Follow-Up

Greptile is now signed in. Review 1 (`e87ad51e-d48b-448f-8f97-9d59aa0f02d8`,
4/5 confidence) found the inline Settings approval card sizing regression and
missing native closed/progress regression coverage. The frame selectors now
exclude ordinary inline approval screens while preserving real overlays and
inline-to-modal progress. The fixture uses native close/showModal and checks
PO progress, long results and return-to-activity geometry. It also verifies
that inline Settings content can grow and shrink.

Desktop-only verification: 612 checks passed at 1280×900, 1024×768 and 800×600.
The first review covered actual committed source and release metadata against
623648d8. Copied immutable assets were omitted only after verifying all 250
assets against source (two Windows line-ending-only differences); HTML source
hashes matched. No secret exclusions were overridden.

Settings release 1.6.15 replaces 1.6.14 in Development and Production. The
canonical stylesheet and its source mirrors are synchronized; the changed
selectors apply only to Settings, so this follow-up does not promote the other
nine widgets. Concurrent main-branch releases are preserved. Rollback Settings to 1.6.14 restores the preceding behavior,
including its inline-height regression. No Creator publication is required.

Second Greptile review (`1312cf8b-1430-47d4-b55c-209eb53ae07f`) completed
against source commit `1b3094da491cb23b64104644b33d5536716ecc77`: 5/5
confidence, zero findings, both prior findings confirmed addressed. The
automatic loop stopped after two completed reviews. All 22 assets in Settings
1.6.15 match the follow-up source bytes and its HTML hash matches metadata.
Full `npm run validate`, `npm run build:pages`, and the 612 desktop browser
checks passed for this follow-up; the layout detector returned no findings.
