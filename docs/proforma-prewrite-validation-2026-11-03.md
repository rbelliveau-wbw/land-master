# Pro Forma Prewrite Validation — 1.80.137

The November 3 incident saved the main Pro Forma and recalculated its schedule,
then Creator rejected the separate Offer operation: `Acquisition_Email` was not
a valid email address. The diagnostic did not contain the rejected value. A
later read of the production UI showed a populated Offer and approval in
progress, so that later record cannot establish the original rejected input.

The existing validation result dialog now receives typed-field checks before
any Save_PF, native child write, phase save, or engine trigger. Each issue names
the tab, row where applicable, and field. The draft stays dirty and no retained
write/recovery operation is opened for a local validation rejection.

Coverage:

- Acquisition and new/edited Seller email syntax, single address and length.
  Surrounding Acquisition Email whitespace is trimmed consistently in the
  worksheet/header payloads. Optional blank email remains allowed.
- US Seller/header phone format; malformed phone text is preserved for correction
  instead of silently deleting its letters on field exit.
- Real calendar dates, project month/year, finite decimal syntax, whole counts,
  safe integer bounds, configured integer lengths, and the 19-character numeric
  ceiling. Existing high-precision currency entry is retained. Historical decimal
  maxchar/decimal-place settings are not reintroduced from the export: see
  `creator/handoffs/proforma-currency-capacity-1.80.79.json`.
- Header, Offer, Seller/Property and child-row text lengths, multiline UTF-8 byte
  capacity, Property web URL syntax, and catalog choices (including counties,
  cities, agreement type and phase frequency).
- Duplicates against loaded Seller/Property records and staged rows, missing
  selected records/company, and Property-to-Seller membership. Existing required
  fields, installment/curve totals, acreage/price reconciliation and phase-plan
  rules remain in force.
- Calculated numeric header values are checked before writes as well.

`scripts/build-proforma-input-rules.mjs` derives rules from the committed
November 2 catalog, with explicit current-contract exceptions for construction
length, Specific Months, Seller's existing 50-character API limit and decimal
capacity. The regression checks the generated artifact for drift. No permission,
approval, Writer, PDF, email delivery or Creator backend behavior is changed.

Limits: frontend checks cannot predict concurrent duplicate creation, deleted
records after load, permissions/workflows changing on the server, transport
failure, or unexported field-property changes. The native server remains final
authority. This release does not promise transactional saves or eliminate all
possible partial writes. It does not add automatic post-save equality checks.

Validation: `node scripts/test-proforma-input-validation.mjs` exercises the real
save function and SDK fixture: 32 invalid draft cases dispatch zero writes,
retain the draft, and create no ambiguous-write review. Valid optional blanks,
email/phone/date/URL formats, decimal precision and financial saves are covered.
Run full `npm run validate` and `npm run build:pages` before promotion.

Forms: Add_Pro_Forma, LOI_Worksheet, Builder, Property, Land_Installments,
Proforma_Item, Construction_Curve, Lot_Mix_Row and Proforma_Phase. Existing
`Save_PF1` / `proforma_save` and native writes receive validated inputs; no API or
function change and no Creator deployment is required.

Rollback: restore Pro Forma Development/Production mappings to 1.80.136 and
rebuild Pages at the permanent URLs. No data migration or schema rollback.

Reference behavior: [Creator email fields](https://help.zoho.com/portal/en/kb/creator/developer-guide/forms/add-and-manage-fields/articles/email-understand),
[numeric limits](https://help.zoho.com/portal/en/kb/creator/developer-guide/forms/add-and-manage-fields/articles/understand-max-digits),
and [native API validations](https://www.zoho.com/creator/help/api/v2.1/update-records.html).
