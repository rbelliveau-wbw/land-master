# Pro Forma SDK2 lot-mix verification and API pacing

The Production 1.80.73 audit captured HTTP 429 / native code 2955 during the
record's detail load, followed by two failed lot-mix writes after the header and
phase-sales steps succeeded. A native lookup/currency/decimal fixture reproduced
the lot-mix verification failure: both private field maps lacked
`All_Lot_Mix_Rows`. The previous save fixture copied submitted scalar values into
its read response and therefore missed the native representation.

## Fix and affected contracts

- `Lot_Mix_Row` / `All_Lot_Mix_Rows`: `Pro_Forma` is an Add_Pro_Forma lookup,
  `Lot_Count` is numeric, `Lot_Size_Ft` decimal, and `Price_LF` currency. Both private
  verifiers now normalize these types while retaining exact ID, parent, price,
  field-presence and child-count checks. Native Production report inspection
  confirmed the report and existing QA rows are accessible.
- PF read/write target audit: header, approvals, phases, months, installments,
  additional items, curves, companies, builders, properties, LOI worksheet,
  attachments and comments already have serving-report metadata. Lot mix was the
  missing directly written collection. AI review history remains a read-only
  report in this flow. No form/report alias, Creator permission, Custom API,
  Deluge function or financial formula is changed.
- The Production first detail view issued 50 requests in approximately four
  seconds. Zoho documents 50 API calls per user per minute. PF now opts into a
  45-request/61-second rolling budget. An explicit 2955 on an explicitly read-only
  call permits one delayed read retry. Mutation calls are never automatically
  replayed. Read verification allows time for the quota window; dispatched native
  write deadlines remain 30 seconds.
- Reference-only unfiltered/template reads retain initial count, cursor, exact
  row-count and ID checks without a redundant final count. Scoped child reads,
  mutation verification and all final persisted-save checks retain final counts.
- Native `responseText` errors preserve their code and reason. Lot-mix batch audit
  entries include per-row errors, without dumping returned business records.

## Other widgets

The canonical adapter's pacing and throttle recovery are opt-in. All other
widgets keep their original default request timing and retry behavior. Their
published immutable releases and environment mappings are unchanged. The full
repository suite covers the adapter and Budget, Land Master, Insights, Gantt,
Settings, Contracts, Manage Lots and Tax native transport fixtures.

## Regression and deployment

New whole-widget save cases cover create/update with native lookup objects,
formatted prices and decimals in both environments; wrong parent, wrong price,
missing fields, retained drafts and no replay. Virtual-clock tests cover the
minute budget, native 429 decoding, one read retry, no write retry and cancellation
before dispatch. Existing comment, cost, phase/month, file, duplicate and lock
checks remain required. Native successful Save is recorded separately from these
automated fixtures; loading a page alone is not a save test.

Deploy only Proforma Manager 1.80.75 to Development and Production. No Creator
deployment is required for this change. Native comment workflow promotion remains
with the user. Rollback reference: 1.80.73, which retains the reported defects.
No rollback is requested.
