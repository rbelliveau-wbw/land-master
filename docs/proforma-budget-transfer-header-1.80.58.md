# Compact destination header — 1.80.58

The five editable destination metrics are smaller and share the destination Budget identity row on wide screens. The phase chooser moves beneath that header as a centered compact pill slider using the Pro Forma `.pills` palette, spacing and active treatment. Phase buttons omit lot counts; the editable Lots field remains. Ambiguous subdivision assignments still show their searchable picker. Narrow layouts wrap the header and fields without losing inputs.

Changed files: `budget-transfer-ui.js`, `budget-transfer.css`, versioned transfer asset references in `widget.html`, widget config/manifest, immutable `releases/proforma-manager/1.80.58/`, Production mapping and module/style/handoff documentation. This is UI only: no forms, fields, Creator functions, Custom API payloads or bindings change, and no Creator promotion is required. Existing Creator 9.26 still validates destination metric and note drafts before sending.

Verification: `npm run validate` and `npm run build:pages`; full-widget browser checks for the one-row desktop header, centered phase pills without counts, keyboard arrows/Home/End, phase-specific input persistence, footer synchronization, ambiguous mapping, and 390×844/800×400 layouts. Note modal and underlying transfer calculations remain unchanged. Production asset versions/bytes and rendered header are checked after deployment. No real Budget transfer is used for testing.

Rollback: promote immutable **1.80.57** in Production and redeploy Pages. Creator remains at 9.26.
