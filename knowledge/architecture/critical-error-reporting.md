# Critical Error Reporting

All six externally hosted widgets send critical runtime failures through the existing Creator Custom API `Report_Proforma_Widget_Error`. The matching Creator function is `reportProformaWidgetError`; it sends the report to the configured engineering recipient.

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
