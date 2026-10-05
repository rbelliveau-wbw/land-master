# Supplied Contract schema audit

Read-only review began after GitHub main push
`14dbc06cab4aaff2b6f70a4c76672e38aa9a8f0c` (widget 1.60.56), as requested.
Supplied file: `C:/Users/R/Downloads/Land_Master (2).ds`, 2,854,460 bytes,
modified `2026-10-05T21:31:32Z`, SHA-256
`d97cd93deab91c80acff34b6f8798128446801c81496e59710d24c0cbbf868c0`.
The header says generated `05-Oct-2026 14:31:03`, Version `1.0` (lines 3–5).
It does not identify a Creator deployment revision or environment. Its inclusion
of the unpublished transfer candidate is consistent with Development at the time
of export; the file alone does not prove Production deployment.

## Transfer and review guards

`Complete_Lot_Contract` at lines **19826–20476** matches the saved
Production-based candidate apart from whitespace and parentheses. Check returns
the policy before mutation (**19916–19928**). Scoped target-buyer rejection,
per-Lot buyer protection and LinkOnly conditional updates are at **19957**,
**20196** and **20214**. The emitted expressions retain their intended meaning:
Zoho documents **NOT, OR, AND** precedence specifically for Creator. The apparent
loss of parentheses does not create an unrelated-Lot write path under that rule.
[Official logical-operator documentation](https://www.zoho.com/deluge/help/operators/logical-operators.html).

The completion workflow at **43992–43998** likewise requires Complete for all
three Lot types under Creator precedence. The earlier claim that its original
unparenthesized form completed Masters on every save was incorrect. The Proposed
approval guard at **48590–48594** matches the replacement and preserves Review
parents while retaining the existing non-Proposed count rule.

## Confirmed second-closing mismatch

Contract and Takedown_Schedule already contain numeric Second_Closing_Lots and
Second_Closing_Days (**1671–1685**, **5378–5392**). These fields and the validation
below also exist in the authoritative earlier Production V9.43 export; they are
not solely unpublished Development fields.

The supplied Contract on-validate rule applies only to Lot/Lot (Master)/Lot
(Amendment) with at least one Subdivision or selected Lot (**42644–42646**):

- `termsChanged` begins true. Only when input.ID is nonnull and its old Contract
  exists does the rule replace it with comparisons of Number_of_Lots, both
  Initial fields, both Second fields and both Subsequent fields (**42649–42655**).
- `hasSecond` means either Second field is nonnull. When `termsChanged ||
  hasSecond`, both Second fields must be supplied, lots must exceed zero and days
  must be zero or greater (**42658–42664**), followed by the native cadence check
  (**42666–42679**).
- Untouched existing legacy terms with both Second fields null bypass that pair
  check. An unscoped Master bypasses the entire scoped rule. Remaining lots after
  initial plus second closing require positive recurring lots/days
  (**42682–42688**).

Widget 1.60.56 does not collect/send the Second pair. A new or changed scoped save
reaching this validator with no existing pair is rejected; this is not a claim
that every creation fails. Its SDK add/update payloads do not skip workflows;
the [official JS2 add documentation](https://www.zoho.com/creator/help/js-api/v2/add-records.html)
says associated workflows run by default. No live save was performed in this
audit and no closing values were invented.

The supplied completion function still uses the older unconditional recurring
term checks (**20021–20040**) and omits the Second pair from schedule insertion
(**20088–20100**), while the existing native schedule workflow inserts it
(**43964–43965**). This confirms the mismatch. The release owner restored the
original Development completion body, including its prior Second validation and
insertion, after this export; the supplied file is no longer that restored body's
snapshot. A future transfer publication must preserve that behavior or explicitly
resolve this schema difference, with native validation and readback.

## Field and permission evidence

Lots Status is required, defaults Open, and enumerates Open/Contracted/Scheduled/
Sold (**2714–2719**). Buyer, Contract and schedule are optional native lookups
(**2961–2966**, **2824–2829**, **2804–2809**). Base_Price is optional USD
(**2890–2897**); Escalator is percentage (**2926–2929**); lifecycle dates are date
fields (**3026–3030**, **3044–3048**). Zero is a populated numeric value, and the
candidate's null-only fills preserve it. The schema does not prove every legacy
row's actual null/blank representation.

Contract Mgmt grants all-field visibility and Contract create/edit
(**56769–56775**) plus approval create/edit (**56804–56810**), but Lots is View
only (**56813–56819**), consistent with removing browser Lot writes. Its profile
has PII access but ApiAccess false (**56623**); this export does not establish
Custom API invocation entitlement for a particular logged-in user. The approval
quickview contains all seven captured fields (**62250–62261**), including required
email Approver and Type1 (**8823–8837**). No missing report field or profile mask
is established as the original fresh-read mismatch's cause.

Release-owner evidence confirms widget 1.60.56 live and the Proposed safeguard
published to Production V9.45. The new native Lot transfer remains unpublished.
This review made no native changes, record writes or additional deployment.

## Subsequent source integration

While this audit was being recorded, main advanced to
`b75b885143e6aee4880ab2c975cd471bf162a46e`. Contract release **1.61.4** adds the
Second Closing inputs and preserves the guarded transfer function while merging
the second-closing validation and schedule fields. The missing-input finding
above describes 1.60.56, not that later release. The Development Contract route
is being aligned with the same 1.61.4 release selected for Production. This source
integration does not establish publication of the combined Creator function.
