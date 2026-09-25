
# Proforma Manager

Pro forma input, LOI workflow, comparison, and configurable sequential approvals.

Current release: `1.80.41`. The main report shares Budget’s softer blue headers and alternating rows through `src/app/report-layout.css`.

## Phase pricing detail and verified fractional save (1.80.41)

Lot Sales shows calendar dates beside month numbers, starts an untouched escalator the month after the phase's first sale, and labels its one-time markup Phase Increase. The phase summary shows final-sale per-lot price components, growth from the first sale, and a next-phase carry-forward percentage. Dashboard Cash Flow and Inflows show the same three sales components as detail below Finished Lot Sales; financial totals are unchanged. A fractional `Sale_Price_FF` is sent explicitly on the engine-triggering update, with a retry through the confirmed `All_Pro_Formas` report only on the specific zero-decimal validation error. The widget still requires server month and phase parity.

Live Production QA succeeded after the user published `Add_Pro_Forma.Sale_Price_FF` with **Max Digits 14, Decimal Points 2**. Max Digits 10 with Decimal Points 2 had still caused Creator's report update to fail on max digits. Test Pro Forma `4410926000004947002` saved blended `Sale_Price_FF = 1444.45` from a `1500.01`/LF Lot Mix price; its dashboard showed **$8,088,630** Gross Sales, **$6,658,630** Net Profit, 47 month rows, and January 2030 completion. After locking, phase navigation remained available and inputs stayed disabled. This validates the combined Production configuration and widget path, without isolating the reason for the earlier validation rejection. No Creator function, workflow, or Custom API changed with this release. Widget rollback: map Development and Production to `1.80.39`; manage Creator field precision separately.

## Two-decimal sale price save trigger (1.80.40)

Live Production testing rejected the direct-data retry with `2945 EXTRA_KEY_FOUND_IN_JSON`; the documented data envelope returned `3002` for the fractional `Sale_Price_FF` in that test. Development and Production were returned to `1.80.39`. The original test pricing was restored, saved, and relocked. The later Creator precision change and successful fractional retest are recorded under `1.80.41`. No Creator component changes were included in `1.80.40`.

## Repeated phase save after server recalculation (1.80.36)

Phase sales saves match existing rows by phase number. The Creator server already supports this lookup, and it prevents a stale row ID from blocking a second save in the same browser session after recalculation rebuilt phase rows. No Creator publish is needed. Regression: save, reopen, save again; verify the phase schedule, financial values, and restored delay. Rollback: map Development and Production to `1.80.35`.
## Phase-window additional costs (1.80.35)

Engineering and Construction hover/focus cards now show their own phase-window Add'l cost from calculated monthly rows, beside the existing phase base cost. Project Land Cost, project category totals, and Total Outflows are removed from individual phase cards; those figures remain on the dashboard KPI. Lot sales cards retain closing information. No Creator deployment is required. Regression: distinct and overlapping phases, stage month boundaries and paging, zero additional costs, lot sales detail, and legacy/v2 schedules. Rollback: map Production to `1.80.34`.

## Phase sales scenario and live validation (1.80.34)

Lot what-ifs carry scaled phase allocations into the active scenario and Revert All restores the baseline. Blank automatic escalator dates resolve before calculations, phase edits refresh the visible schedule without replacing the active input, and invalid phase plans disable Save and show unavailable financial figures. Phase delay tests cover construction dates and the timing of additional cost applications. This is widget-only; no Creator deployment is required. Regression: phase scenario isolation, escalator date, allocation validation and save guard, and timing of Engineering End, Construction Start, Construction End, Across Phases, and Specific Months costs. Rollback: map Development and Production to `1.80.33`.

## Outflow totals in phase hover cards (1.80.33)

The extra outflow section from `1.80.32` is removed. Existing Engineering and Construction phase cards show their corresponding project-wide Base and Add'l totals; every stage card also shows project Land Cost and Total Outflows. Phase-specific base cost remains separate from project totals. No Creator deployment is required. Regression: existing phase bar layout, all five outflow categories and grand total in the appropriate hover/focus cards, legacy and v2 schedules, page clipping, and cash-flow tabs. Rollback: map Production to `1.80.31` to retain the timeline without project outflow details; `1.80.32` restores the separate outflow tracks.

## Timeline project outflows (1.80.32)

The Timeline adds Total Outflows and five aligned spend tracks: Land Cost, Engineering Base, Ent/Eng Add'l, Construction Base, and Construction Add'l. Each row displays the exact dashboard category total; timed bars use the calculated monthly amounts and show the scheduled window amount and project totals on hover or keyboard focus. An outflow without allocated monthly spend is labeled accordingly. This is widget-only; no Creator deployment is required. Regression: all five totals and month positions, separated and consecutive spend months, 24-month paging, phase overlap, focus and hover, and cash-flow tabs. Rollback: map Production to `1.80.31`.

## Phase timeline duration bars and stage detail cards (1.80.31)

The Engineering, Construction, and Lot sales bars have compact squared styling and show each stage's full length in months, including on a clipped page. Hover or keyboard focus opens a stage-colored card with dates, model months, duration, phase lots, and the relevant calculated cost or modeled closing and sales totals. This is widget-only; no Creator deployment is required. Regression: legacy and v2 phase schedules, stage overlap, short and clipped bars, tooltips, keyboard focus, 24-month paging, and existing cash-flow tabs. Rollback: map Production to `1.80.30`.

## Dashboard phase timeline (1.80.30)

The Timeline pill beside Cash Flow, Inflows, and Outflows shows Engineering, Construction, and Lot sales windows for every phase on the dashboard's shared 24-month axis. Hover or focus a stage for dates, model months, duration, phase lots, and relevant calculated cost or actual modeled closing totals. The colored sales window can contain months without closings. This is widget-only; no Creator deployment is required. Regression: legacy and v2 phase schedules, overlap, page boundaries, no-closing windows, tooltips, narrow-screen controls, empty schedules, and existing cash-flow tabs. Rollback: map Production to `1.80.29`.

## Phase schedule save guard (1.80.29)

The phase schedule version check treats a temporarily missing editor model as inactive instead of throwing during the save's verification flow. Persisted v2 and unsaved phase drafts still activate the phase schedule. This is a widget-only fix; no Creator deployment is required. Regression: duplicate and save a phase-based Pro Forma, verify generated months and phases, and confirm both persisted and draft schedules still activate. Rollback widget release: `1.80.28`.

## Compact add actions and centered delete icons (1.80.28)

Lot Mix and PID/MUD add buttons show “Add” with contextual accessible names. Each row's delete icon is centered in its action cell. Production maps to `1.80.28`; Creator environment promotion remains with the user. Rollback widget release: `1.80.26`.

## Partial save retry (1.80.27)

If Creator saves the parent record but a later phase or lot-mix write fails, the editor retains that record ID, shows Save incomplete, and lets the user retry without creating another Pro Forma. Creator Development also uses fetched-record counts to insert missing phase rows and reject phase IDs from another Pro Forma. Creator promotion remains with the user. Rollback widget release: `1.80.26`.

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
