# Budget transfer progress — Proforma Manager 1.80.61

The transfer review now names the source Pro Forma and destination Project, shows the all-phase amount and record counts in the header, and replaces the tiny post-send status with a persistent result dialog. The dialog follows Contracts' lot-completion pattern: verify destination Budgets, send costs, then verify saved values. It shows the confirmed destination Budget names, item counts, amounts and verification states, with Done and Review transfer actions.

Requests start immediately; only display transitions are paced. Success requires the existing Creator apply response to confirm the exact unique Budget IDs and expected total after its persisted-field read-back. A failed preflight sends nothing. A partial or lost apply response retains confirmed IDs, labels other amounts Planned, blocks replay in the current session and asks for destination review. Request deadlines are 30 seconds for preflight and 90 seconds for apply. Background controls, Close and Escape are blocked while active; focus is trapped and reduced motion disables animations/pacing.

Forms/fields/functions/APIs: no schema, permission, endpoint or Creator deployment changes. Existing `PF_Budget_Transfer` and its preview/apply contract are retained. Transfer payloads and Pro Forma records are unchanged. `widget.html` preserves structured failed apply results so the dialog can show confirmed destinations.

Reusable instructions are in root `AGENTS.md`, `knowledge/design/transfer-progress.md` and the style guide. Object-specific verification is documented there rather than assuming an API acknowledgement proves success.

Regression: allocation/phase/credit/note/lock suites; exact/missing/extra/duplicate Budget confirmation, incorrect amount/action, immediate open, delayed/fast success, one apply call, blocked Close/Escape, persistent terminal screen, failed preflight, partial and unknown outcomes, focus, narrow layout and reduced motion. UI screenshots use the implemented component with a local fixture and perform no Creator writes.

Rollback: remap only Production `proforma-manager` to `1.80.60`. No backend rollback is needed.
