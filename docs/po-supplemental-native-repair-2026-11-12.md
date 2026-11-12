# Supplemental PO Native Installation Repair

Production showed Unsupported PO action because the hosted supplemental PO UI was already promoted but the matching Creator functions had not been installed and published. The November 11 handoff explicitly recorded that incomplete installation. This is separate from PO approval and outcome-email status.

## Saved PO And Email

Production Somerset Hills Phase 01 PO 4410926000005964006, vendor Brian Bekker, amount $123,456, description TEST and PO Type Construction, is Approved with VP and CFO Approved. Email Activity confirms Julie King and Samuel Spears outcome notices Sent. Construction PM failed because its recipient is Not Configured. The user explicitly directed that this expected test warning remain; no recipient was assigned and no email was retried.

## Native Installation And Formatter Repair

All eleven functions in [the schema contract](../creator/schema-changes/po-supplemental.json) were saved/compiled and independently reopened in Creator Development. Native readback hashes and verification scope are in [the evidence record](../creator/schema-changes/po-supplemental-native-verification-2026-11-12.json).

Creator's formatter removes right-hand grouping after AND. The first saved dispatcher therefore rejected valid PO deletion states; the original source-only checks missed it. managePurchaseOrder now computes separate boolean predicates for original eligibility, draft/submitted state and family ownership. poSnapshot similarly separates bundle-plan eligibility. These preserve the same business rules without depending on parentheses that Creator removes.

## Verification

The complete supplemental workflow matrix passed using all eleven actual native editor readbacks, including exact incremental amounts, immutable originals, sequential approval, $9,999.99/$10,000 routing, two independent $6,000 supplements, stale baselines, same-number exports, family deletion and read-only recovery. Only native getall capitalization was normalized for the offline translator. The new test-po-native-formatting.mjs runs the existing matrix after reproducing Creator's parenthesis removal and is part of npm run validate. Explicit choice tests exclude untyped, revisionless, supplemental, pending and foreign-phase requests. Snapshot checks exclude a null bundle plan when no reallocation contract exists.

The authenticated Development picker now returns its supported eligible-original list. That list is empty for Carlile Hills because the older approved $35 test PO has no PO Type. No test records, financial decisions, emails or deletions were performed. A native save/reopen of an actual supplement remains untested.

Full npm run validate (including the new formatter regression) and npm run build:pages passed. Greptile whoami reported Not signed in; no Greptile review was run.

## Production Publication

After explicit user authorization on November 12, the eleven PO function changes were published from Development to Stage, then promoted to Production as Creator **9.187**. Creator offered exactly eleven pending functions and no form/field changes; the supplemental fields were already present. The Environments page confirmed Stage and Production 9.187 and no pending Development changes.

Authenticated Production Request → Supplemental Purchase Order now lists **PO 4410926000005964006 · Brian Bekker · Construction · $123,456 · TEST** in Somerset Hills Phase 01. Selecting it opens the supplemental editor with vendor and PO Type locked, the approved C_SH01-3532-4 / TEST / Qty 1 / LS / $123,456 line visible, Previously Approved $123,456, This Supplement $0 and Proposed Total $123,456. This exercises the live SupplementChoices and PrepareSupplement API paths and native original approval/baseline validation.

No supplement was saved or submitted. No original PO amount, line, approval or notification setting was changed, and no PO mail was retried. The missing Construction PM warning remains intentionally accepted for this test. Hosted Budget Manager remains 122.29.138; no widget assets, environment mappings, new APIs or API audiences changed during native publication.

## Rollback

Hosted rollback remains Budget 122.29.133 via the permanent Production mapping. Preserve the current Development mapping and immutable releases. Once any supplements exist, retain all supplemental-aware native accounting, linkage and deletion guards, fields, records and audit history. Do not restore the formatter-sensitive conditions.
