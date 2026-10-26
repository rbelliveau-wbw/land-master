# Critical Error Reporting

All eleven externally hosted widgets send critical runtime failures through the existing Creator Custom API `Report_Proforma_Widget_Error`. The matching Creator function is `reportProformaWidgetError`; it sends the report to the configured engineering recipient.

## Runtime behavior

- Audit entries marked `error`, uncaught browser errors, and unhandled promise rejections are reportable.
- Reports are batched briefly so one failure cascade produces one useful email.
- Equivalent reports are suppressed for ten minutes.
- A browser session is capped at twenty emails.
- The email includes an LLM fix request, primary errors, widget/version context, current view or selected record identifiers, and recent audit entries.
- Reporter-delivery failures are written only to the browser console to prevent recursive email attempts.
- Keys containing tokens, secrets, passwords, authorization values, cookies, or API keys are redacted before email construction. Private attachment bytes must never be added to reporter context.

Pro Forma Manager and Land Master retain their proven embedded reporters. Budget Manager, Contract Management, Tax Center, and Milestone Gantt use the self-contained `critical-error-reporter.js` asset copied into each immutable release.

Contract Management preview mode intentionally loads empty collections. Identifiable contract, LOI, contact, property, financial, and token-like demo fixtures are not stored in the public widget source or release assets.

## Regression checks

1. Trigger a synthetic audit-level error after Creator SDK initialization.
2. Confirm one email arrives with the widget name, version, primary error, runtime context, and recent audit trail.
3. Trigger the identical error again within ten minutes and confirm it is suppressed.
4. Trigger an uncaught error and an unhandled rejection and confirm both are captured.
5. Open the widget without the Creator SDK and confirm no delivery call is attempted.

## Alert fix instructions — October 26, 2026

Every module’s critical-error email requests **THE MOST ROBUST AND CORRECT FUCKING PATCH**. This includes the embedded Pro Forma and Land & Projects reporters and every standalone reporter asset. The requested wording replaces the earlier smallest/minimal-fix language. Email routing, recipients, redaction, batching, deduplication and save handling keep their existing behavior.

This is a frontend wording release; no Creator form, field, function or Custom API changes or Creator deployment are required. Existing reporter checks verify body generation, redaction and deduplication. Repository validation and the Pages build remain required. No synthetic alert is sent to a real recipient for this wording-only change.

Budget Production is rebuilt from its existing 122.29.71 baseline, while Development retains its existing 122.29.76 behavior. This avoids promoting unrelated Development changes.

Rollback: restore the previous environment mappings below; immutable historical releases are unchanged.

| Module | Previous Production | New Production | New Development |
| --- | --- | --- | --- |
| proforma-manager | 1.80.133 | 1.80.134 | 1.80.134 |
| budget-manager | 122.29.71 | 122.29.77 | 122.29.78 |
| land-master | 8.17.5 | 8.17.6 | 8.17.6 |
| contract-management | 1.62.37 | 1.62.38 | 1.62.38 |
| tax-center | 19.17.33 | 19.17.34 | 19.17.34 |
| milestone-gantt | 1.1.19 | 1.1.20 | 1.1.20 |
| manage-lots | 0.13.11 | 0.13.12 | 0.13.12 |
| settings-manager | 1.6.3 | 1.6.4 | 1.6.4 |
| lot-sales-explorer | 1.5.61 | 1.5.62 | 1.5.62 |
| forecast-manager | 1.7.18 | 1.7.19 | 1.7.19 |
| crew-locations | 1.2.3 | 1.2.4 | 1.2.4 |
