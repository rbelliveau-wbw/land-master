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

## Production Handoff

PMP leaves Creator publication to the owner. Publish the five Payment_Request fields, poSupplementContext and ten changed functions listed in the schema contract through Stage to Production. Preserve unrelated pending changes. No new Custom API or audience change is required; Manage_Purchase_Order and Manage_Purchase_Order_DEV retain their existing contracts.

Hosted Budget Manager 122.29.138 is already mapped in Development and Production. This repair changes native functions, tests and installation evidence only; a new hosted release would not install the missing Creator code. After Creator publication, verify Somerset's original in Supplemental Purchase Order and open its prepared supplement before saving. Its approval remains valid independently of the missing PM notification configuration accepted for this test.

## Rollback

Hosted rollback remains Budget 122.29.133 via the permanent Production mapping. Preserve the current Development mapping and immutable releases. Once any supplements exist, retain all supplemental-aware native accounting, linkage and deletion guards, fields, records and audit history. Do not restore the formatter-sensitive conditions.
