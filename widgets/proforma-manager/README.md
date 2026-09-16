
# Proforma Manager

Pro forma input, LOI workflow, comparison, and configurable sequential approvals.

Current release: `1.77.3`. The main report shares Budget’s softer blue headers and alternating rows through `src/app/report-layout.css`.

## Baseline

- Version: `1.44.6`
- Original upload: `proforma-widget-v1.44.6-approval-route-builder.zip`
- Extracted source: `src/`
- Immutable original: `baseline/proforma-widget-v1.44.6-approval-route-builder.zip`
- Initial external release: `../../releases/proforma-manager/1.44.6/`

The extracted source is intentionally preserved as a monolithic Creator widget baseline. Do not refactor it merely to make it look cleaner. Establish behavioral tests first, then make targeted changes.

## Entry points

- Creator package entry: `src/app/widget.html`
- External-hosting entry after release: `index.html`
- Creator package manifest: `src/plugin-manifest.json`

## Common commands

```bash
npm run validate
npm run package:creator -- proforma-manager
npm run release -- proforma-manager <new-version>
npm run build:pages
```

## Comments (1.78.0)

Version 1.78.1 adds Creator 12-hour timestamp parsing, reconciles system display names with login emails for author controls, keeps actions visible, and simplifies the thread header and composer labels.

Version 1.78.2 accepts the live Creator `MM/DD/YYYY hh:mm:ss AM/PM` timestamp format and prioritizes Creator's canonical login identity, which is `wbdevelopment` for the administrator session.

Version 1.78.3 adds the single administrator mapping from `rbelliveau@wbdevelopment.com` to Creator's legacy `wbdevelopment` author value. It only exposes controls for Robby's own eligible rows; Creator validation remains the authorization check for the write.

Version 1.79.0 moves Comments into a modal opened from the record header icon. The icon displays the log count and highlights active comments from the last seven days without moving the user away from the open Pro Forma view.

Version 1.79.1 keeps the comment icon beside the record navigation across Dashboard, Edit, Approvals, and Attachments. It refines the modal to use a direct title and inline message editing with explicit Save and Cancel controls.

Version 1.79.2 keeps the Pro Forma identity and timeline visible on each record tab, moves the header Comments icon to the right of the record navigation and enlarges it by 10%, and adds the same Comments modal action to every saved Pro Forma in the list. The list action is intentionally independent of edit permission, matching the record-header control.

The record Comments tab reads Comment_Log_Report scoped to Pro_Forma and uses the Creator SDK to add Comment_Log records and update the report. Comment is mandatory multiline text; Project, Budget and Pro_Forma are optional parent lookups with at least one required by validation. User, Author_Name, Edited and Deleted are server-owned audit fields. Author_Name is stamped from User_Access.Full_Name with zoho.loginuser fallback. Added_Time, Modified_Time and Added_User use Creator system fields.

Deploy Validate_Comment_Log (Created or Edited / Validations on form submission) with the form and report before live testing. No Custom API changes are needed. SDK writes do not skip workflows. Validation enforces author-only changes within 24 hours of Added_Time, keeps parent and author immutable, marks edits, and replaces deleted content with Deleted by user while retaining its record. Comments are standalone and never copied when duplicating a Pro Forma.

The thread supports safe Markdown formatting, emoji, quote replies, search, copy, date separators, user colors and retained in-session drafts. Live SDK workflow execution and ordinary-user permissions still require DEV verification after the user-managed Creator deployment. Local browser create/edit/delete checks and automated identity, expiry and HTML-escaping tests passed. Roll back the widget by restoring the development/production mappings to 1.77.3; retain Comment_Log data and validation.
