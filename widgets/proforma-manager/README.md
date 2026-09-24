
# Proforma Manager

Pro forma input, LOI workflow, comparison, and configurable sequential approvals.

Current release: `1.80.26`. The main report shares Budget’s softer blue headers and alternating rows through `src/app/report-layout.css`.

## Lot pricing and draft flow (1.80.26)

Lot Mix and PID/MUD use explicit Add actions with centered SVG plus icons and clearly outlined editable cells. Typing in Lot Mix never creates a second row; repeated Add clicks reuse an untouched blank row. The unsaved title card follows the draft name, territory, start, and calculated completion. New Pro Formas unlock editor tabs in order as each preceding pane passes validation, and Lot Mix changes seed the Lot Sales phase plan immediately. Duplicates prepare the same phase draft when the Creator save API reports support. Same for all phases confirms before replacing later inputs and then locks those inputs except Lots in phase. Creator environments without phase-sales support retain the legacy flow until the backend is published. Rollback: map Production to `1.80.24`.

## Financial input visibility refinement (1.80.10)

Purchase and sale installment rows always outline Month, %, and Amount while editable because those generated rows arrive prefilled. PID/MUD rows use Month, Amount, Type, Date order, and both blank Month and Amount fields highlight on a newly added row. The Purchase Installments count control is capped near half its prior width. Locked controls remain neutral. Frontend only; no Creator form, field, function, or Custom API changed. Regression: generated purchase/sale rows, PID/MUD new and complete rows, locked inputs, derived dates, and installment recalculation. Rollback: map production proforma-manager to `1.80.9`.

## Editable financial input guidance (1.80.9)

Land Purchase / Sale and PIDs/MUD now reuse Additional Costs' pale-blue, blue-border guidance for incomplete editable values. Required purchase-installment count and blank row amounts pulse first; dependent month fields and incomplete optional sale pairs use the steady outline. Complete, calculated, read-only, and untouched optional fields remain neutral. Frontend only; no Creator form, field, function, or Custom API changed. Regression: purchase rows, optional sale pairs, PID/MUD row sequencing, locked inputs, and completed values. Rollback: map production proforma-manager to `1.80.6`.

## Simplified packet date (1.80.6)

Downloaded and emailed approval PDFs use `<Sanitized Pro Forma Name>_Proforma_Packet_YYYY-MM-DD.pdf`. The widget, packet builder, authenticated download API, and approval-email fallback all use the same name; the compact server timestamp and record ID are omitted. Creator functions affected: `PF_Build_Proforma_Approval_PDF`, `Get_Proforma_Approval_PDF`, and `Send_Proforma_Approval_Email_With_Context`. Regression: named and fallback packets, special-character cleanup, a single generation date, browser downloads, API responses, and email attachments. Rollback: map production proforma-manager to `1.80.5` and restore the three prior Creator function bodies.

## Readable approval packet filenames (1.80.5)

Downloaded approval PDFs begin with the sanitized Pro Forma name, followed by `Proforma_Packet`, the server generation timestamp, and the export date. For example, `Corsicana Trails (ORIGINAL) / Phase #1` becomes `Corsicana_Trails_ORIGINAL_Phase_1_Proforma_Packet_20260922_103315_2026-09-22.pdf`; record IDs and filesystem-sensitive punctuation are omitted. Regression: named and fallback packets, special-character cleanup, retained timestamps, and packet export behavior. Rollback: map production proforma-manager to `1.80.4`.

## Duplicate icon correction (1.80.4)

The Pro Forma action menu and unsaved-duplicate banner use the complete standard copy icon. Both document outlines remain recognizable at the compact menu size instead of reducing the back sheet to a stray mark. Regression: Duplicate action wiring, permissions, save safeguards, and exact icon geometry. Rollback: map production proforma-manager to `1.80.3`.

## Custom calendar navigation correction (1.80.3)

The Offer calendar uses centered SVG chevrons for previous and next month navigation. Opening a blank date now starts on the current month instead of displaying an invalid `undefined 0` heading; a defensive fallback also protects the picker from malformed seed values. Regression: blank, populated, and malformed date initialization plus navigation icon geometry. Rollback: map production proforma-manager to `1.80.2`.

## Offer controls and PDF cleanup (1.80.2)

Response Date, Effective Date, and Projected Hard Close use the widget's custom calendar instead of native browser date controls. Buyer Broker and Seller Broker share one row, and optional Offer fields explain when they can be blank or should use `None`. Opening Offer no longer marks an untouched Pro Forma dirty, so Cancel exits without a discard prompt unless the user actually changes a value.

`PF_Build_Proforma_Approval_PDF` now uses the Offer's today default when an older worksheet has no Effective Date, emits each County and City once across multiple Property rows, and uses title case for field labels such as `County/City`. The function was compiled and saved in Creator Development with this release. Regression: all three calendar controls, entered/cleared date persistence, untouched Cancel, broker layout and copy, missing/stored Effective Date packets, and repeated/mixed County and City values. Rollback: map production proforma-manager to `1.80.1` and restore the previous `PF_Build_Proforma_Approval_PDF` body from git.

## Offer packet and document export (1.80.0)

The Offer form now exposes editable Effective Date, Projected Hard Close, and Authorized Signer fields. A missing Effective Date defaults to today; the save path preserves explicit clearing of Projected Hard Close and Authorized Signer. The export modal adds LOI/Contract Word download. It supports exactly one seller with one or more Property parcel records, combining their parcel IDs and unique county/city values in the Writer merge; multiple sellers or no parcels require manual preparation.

Approval packet PDFs use flowing two-column cost and note pages, a complete MUD/PID/TIRZ installment schedule, wrapped owner and Offer text, and a separate comment-history page only when comments exist. Closed Pro Formas keep the Edit button in its list position as a disabled grey control. Creator functions must be published separately from the externally hosted widget release. Rollback: map production proforma-manager to `1.79.14` and restore the prior Creator function bodies.

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

Version 1.79.3 brings the list control to parity with the record header: it displays the Comment Log count and the teal/new-activity state, using the same seven-day activity rule. The comment summaries load once for the list and refresh the buttons without interrupting list navigation.

Version 1.79.4 shares the Comment Log component with Contracts and Budget Manager. It assigns the first eight distinct comment authors in a thread distinct colors, then repeats the palette for additional authors. Contract comments use the Contract lookup; Project and Budget comments retain their own parent lookups.

The record Comments tab reads Comment_Log_Report scoped to Pro_Forma and uses the Creator SDK to add Comment_Log records and update the report. Comment is mandatory multiline text; Project, Budget, Pro_Forma and Contract are optional parent lookups with at least one required by validation. User, Author_Name, Edited and Deleted are server-owned audit fields. Author_Name is stamped from User_Access.Full_Name with zoho.loginuser fallback. Added_Time, Modified_Time and Added_User use Creator system fields.

Deploy Validate_Comment_Log (Created or Edited / Validations on form submission) with the form and report before live testing. No Custom API changes are needed. SDK writes do not skip workflows. Validation enforces author-only changes within 24 hours of Added_Time, keeps parent and author immutable, marks edits, and replaces deleted content with Deleted by user while retaining its record. Comments are standalone and never copied when duplicating a Pro Forma.

The thread supports safe Markdown formatting, emoji, quote replies, search, copy, date separators, user colors and retained in-session drafts. Live SDK workflow execution and ordinary-user permissions still require DEV verification after the user-managed Creator deployment. Local browser create/edit/delete checks and automated identity, expiry and HTML-escaping tests passed. Roll back the widget by restoring the development/production mappings to 1.77.3; retain Comment_Log data and validation.

## Navarro County (1.79.13)

Added `Navarro` to County choices for existing and new Property rows. Existing choices and persistence behavior are retained. Creator County picklists are audited separately. Regression: select Navarro, retain existing counties, and validate the production Pages artifact. Rollback: restore the production mapping to `1.79.12`.

## Number formatting and Special Provisions (1.79.14)

Numeric Pro Forma inputs show thousands separators when focus leaves the field and return to plain numeric text for editing, preserving the existing model and Creator payload values. The Offer tab now shows Special Provisions once, defaults blank values to `None`, and notes that `None` is the expected entry when no provisions apply. No Creator deployment is required. Regression: edit a large numeric value, tab away, reopen it, save it, and verify the stored numeric value is unchanged; open an Offer with blank provisions and verify it displays `None`. Rollback: restore the production mapping to `1.79.13`.

## Persistent Edit action and active approval notes (1.80.1)

Every Pro Forma row now shows Edit. Records the viewer can edit retain the blue action; records outside an owned-only user's scope show a gray disabled action with an ownership-specific reason. Closed records and completed approval flows also show the disabled action with the applicable explanation. An assigned approval owner can now type and save the active approval note even when the surrounding Pro Forma is read-only because they do not own it. Existing `canEditPf`, approval ownership, and direct-route guards remain authoritative. No forms, fields, functions, Custom APIs, or Creator deployment change. Regression: all-access, owned-only owned/unowned, no-edit-access, closed and completed-approval rows, and an active approver on an unowned Pro Forma. Rollback: restore the production mapping to `1.80.0`.
