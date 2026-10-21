# Delivery strip and Construction report edit access — October 21, 2026

The approved Delivery strip composer is shared by Pro Forma, Legal, Construction,
Budget and Project conversations. It places the pale-blue mail notice above the
resolved author name/initials and existing editor. The login identity remains
available on focus/hover. The rounded editor retains the same nine formatting,
emoji and Preview actions. Post keeps its stable pending/Posted timing and
succinct inline post/email result.

Changed source: `widgets/proforma-manager/src/app/comments.js` and `comments.css`;
the three host HTML asset/version references and widget config hashes; the
existing comment desktop/action/SDK fixtures; and the shared comments guide.
Owner lookup, recipients, mail sending, native create/update behavior and existing
permission gates are reused unchanged. No new form, field, function or Custom API.

## Construction Permission Denied

The Construction page selects the existing `Construction_Actions` report for
action updates. Native inspection confirmed CFO's edit report selection included
`All_Contract_Actions` but omitted `Construction_Actions`. The same mismatch
affected request edits: `All_Contracts` was selected, `Construction_Requests`
was omitted. An explicitly authorized Construction editor could therefore see
the controls but have Creator reject the report-level write.

Added those two scoped edit reports to CFO in Creator Development and reopened
both selections independently to confirm persistence. Existing Legal grants,
delete access and unrelated profiles were preserved. Construction Budgeting
already had the correct scoped request/action/file/comment access; its native
profile was separately inspected and left unchanged. The existing
`Edit_All_Construction_Requests` and native validation still decide who can edit;
CFO does not gain an unconditional backend editor grant.

[Native permission evidence](../creator/schema-changes/construction-report-permissions-2026-10-21.json).
After the user's subsequent instruction to publish all remaining changes, the
CFO permission update was published to Stage and Production in Creator 9.112.
No native business record was manually changed or real comment/email sent during
this work. A CFO production save remains the live confirmation step.

## Release, verification and rollback

| Widget | New Development / Production release | Previous Production |
|---|---|---|
| Pro Forma | 1.80.131 | 1.80.130 |
| Contract Management | 1.62.27 | 1.62.26 |
| Budget | 122.29.67 | 122.29.66 |

Desktop browser checks use all three real host style cascades and the shared
component: delivery strip placement, authoritative name/initials and identity
tooltip, formatting/Preview/emoji, retained draft and read-only state. Existing
four-parent notification outcomes, duplicate blocking, unknown outcomes, refresh
failures, parent/destroy races and reduced motion remain covered. Full
`npm run validate`, `npm run build:pages`, and the focused desktop browser checks
passed. The Production mappings use the new immutable releases.

Frontend rollback: restore the Production mappings to the previous versions in
the table and rebuild Pages. Development continues tracking the latest complete
release. Native rollback, if requested: remove only the two newly selected CFO
edit reports; preserve the earlier report selections and all validation guards.
