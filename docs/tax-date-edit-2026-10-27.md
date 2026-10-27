# Tax date field exit repair — October 27, 2026

Tax Center 19.17.36 saves each inline date on field exit or Enter. Native date
controls emit change events for each temporarily valid year fragment; the old
handler started a save and made the table inert while the year was still being
typed. This caused focus loss and premature dates such as 0202. Short-year
fragments rejected by the existing controller also produced critical reports.

All five Tax_Parcel_Year dates share the guarded exit handler:
Notice_Received, Protest_Deadline, Protest_Hearing_Date,
Arbitration_Notice_Received and Arbitration_Hearing_Date. Unchanged dates do
not write; duplicate exits share the pending save. Native incomplete blank
controls cannot silently clear a value. Local validation reuses the existing
controller calendar parser before inline, detail, enabled bulk and Add saves.
Explicit clears, calendar/year semantics and Creator contracts remain intact.

## Verification

The original report's parcel 209012 was absent from Development. An existing
DEV test parcel 5002444 (record 4410926000003548308) reproduced the same problem:
partial typing saved 10/02/0262, made the report inert and removed focus before
entry was finished. Its original blank arbitration date was restored.

After DEV deployment, native Creator loaded all assets at 19.17.36. For every
one of the five date controls, actual keyboard entry traversed 0002, 0020, 0202
and 2026 while retaining focus, leaving the table interactive and starting no
save. Original values were restored before exiting each no-op test. Enter on
the completed arbitration date wrote 10/26/2026 once; a fresh Search returned
2026-10-26. The test value was then cleared to its original blank.

The whole-widget, effective-function and native-shaped bulk suites pass.
Regressions cover all rendered date handlers, incomplete blanks versus clear,
no-op and duplicate exits, modal/bulk/Add validation and existing save/recovery
behavior. Full npm run validate and npm run build:pages pass. The DEV candidate
commit 40438ac15db5f3963be04ad88d8c4ff36dbc8bdd passed CI and Pages deployment.
Workspace evidence: reports/2026-10-27-tax-date-edit/ in the parent workspace.

## Release and rollback

Development and Production map to immutable 19.17.36. Intermediate 19.17.35
is retained unmapped; 19.17.36 preserves the prior controller parser semantics.
Permanent Creator widget URLs remain unchanged. No form, field, function,
Custom API, workflow, permission or Creator publication change is required.
To roll back Production, map Tax Center to 19.17.34 and rebuild Pages.
