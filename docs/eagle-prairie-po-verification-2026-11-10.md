# Eagle Prairie PO Verification — 122.29.123

The live Production Eagle Prairie Phase 01 PO for A Greater Austin Development
Co.Inc. was inspected in the agent-owned browser. It was Rejected, with one CFO
approval entry and no saved reallocation. No financial Save, Resubmit, approval,
deletion or email was performed.

## Live Calculation Check

| Cost Code | Line Calculation | This PO | Available | Remaining |
| --- | --- | ---: | ---: | ---: |
| EP01-3240 | 9,200 × $15.70 + 125 × $28.50 | $148,002.50 | $149,730 | $1,727.50 |
| EP01-3242 | 2 × $4,760 + 2 × $2,060 | $13,640 | $13,640 | $0 |
| EP01-3635 | 4 × $1,370 | $5,480 | $40,935 | $35,455 |
| Total | | $167,122.50 | $204,305 | $37,182.50 |

EP01-3635 Subcontractor has $8,220 available and $2,740 remaining; the item
total also includes Labor $6,742, Materials $20,575 and Equipment $5,398.
These are different scopes, not conflicting balances.

A temporary unsaved Labor decrease of $100 updated PO context to −$100 and
item Remaining to $35,355. A matching Subcontractor increase of $100 produced
net $0, item Remaining $35,455, Labor Remaining $6,642 and Subcontractor
Remaining $2,840. The payment total stayed $167,122.50. Reset, Close and a fresh
Preview restored the saved no-reallocation state and original amounts.

## Display Repair And Verification

At the default desktop width, Summary squeezed large amounts into narrow columns
and values overlapped. The Summary container now switches to two labeled metric
columns with a full-width name at pane widths up to 440px. Wider panes keep
their existing aligned grid. Amounts, signs, cents, labels, disclosures and the
existing numeric/motion identities are retained. This is a CSS-only behavior
change; source JavaScript and financial calculations are unchanged.

Changed files: `purchase-orders.css`, widget version markers, widget config and
manifest, this record, the Budget module and payment-request design guide,
immutable 122.29.123 and Development/Production mappings. No forms, fields,
functions, Custom APIs, permissions or persisted records change. No Creator
deployment is required. Stage remains unchanged.

Regression checks: actual desktop rendering with large amounts and cents,
with and without Bud Mod; readable names/labels; expanded element calculations;
live signed and zero-net changes and restored saved values. Required checks:
`npm run validate`, `npm run build:pages` and the design-document link check.

## Rollback

Set only Production Budget Manager to **122.29.122** in
`deploy/environments.json` and deploy Pages. Development retains the latest
complete release. No Creator or data rollback is needed.
