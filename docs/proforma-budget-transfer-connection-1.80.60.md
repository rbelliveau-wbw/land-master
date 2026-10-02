# Transfer connection status — 1.80.60

Remove the vague “Budget edits require the Creator transfer update.” sentence. Missing/failed capability checks now show “Budget transfer connection unavailable.” with a “Transfer unavailable” footer state; supported connections with unsupported drafts show only “Edits unavailable” in the footer. Existing capability, edit, permission and server-token guards remain intact.

On 2026-10-02, the live Creator Microservices list contained only `PF_Budget_Transfer_DEV`; no Production `PF_Budget_Transfer` endpoint was registered. The promoted Production function exists. A Production endpoint has been prepared for review: POST, OAuth2, All users, application/json, Key and Value, `payload:string`, Standard response, Land Master Production / Default / `PF_Budget_Transfer`. Enabling it is separate from function promotion. The function enforces authenticated User_Access transfer and Budget edit grants; no access records change. Endpoint enablement is pending confirmation at this release's preparation time.

Changed files: `budget-transfer-ui.js`, asset versions in `widget.html`, widget config/manifest, immutable release 1.80.60, Production mapping and module/handoff documentation. No form fields or function source changes; no new Creator function promotion is needed. This release does not enable an unavailable connection or discard draft edits.

Verification: repository validation and Pages build; browser preview with four phases/four destinations, connection failure status, and removal of the requested sentence. No actual Budget apply is performed. Rollback: Production widget 1.80.59; leave the API disabled if its enablement must be reversed.
