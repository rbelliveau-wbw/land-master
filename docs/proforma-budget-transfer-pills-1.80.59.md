# Animated Budget phase pills — 1.80.59

The centered Budget phase chooser is 10% larger in button height, type, horizontal padding and rail spacing. Its selection uses the modal header's navy gradient. A shared background pill slides to the selected phase over 280 ms with an eased finish, starting from its current visible position when users change selection rapidly. Keyboard arrows/Home/End retain the same selection and focus behavior. Reduced-motion users get immediate movement without color transitions, and resizing realigns the selection background.

Changed files: `budget-transfer-ui.js`, `budget-transfer.css`, asset versions in `widget.html`, widget config/manifest, immutable `releases/proforma-manager/1.80.59/`, Production mapping, module/style documentation and this report. No Creator forms, fields, functions, Custom API bindings or payloads change. No Creator promotion is required; the existing transfer endpoint remains unchanged.

Verification: `npm run validate`, `npm run build:pages`, browser checks for click/keyboard selection, moving and settled indicator alignment, phase totals, unchanged draft values, and 390px layout. Reduced-motion behavior is guarded before starting Web Animations and in CSS. Live release bytes and the production rendered selector are verified after deployment. No actual Budget transfer is performed for testing.

Rollback: map Production `proforma-manager` to immutable **1.80.58** and redeploy Pages. No Creator rollback is needed.
