
# Proforma Module

## Compact Lot Sales editor and detailed export (1.80.19, 2026-09-24)

Lot Sales is a separate editor tab immediately after Project Schedule. Its phase cards use a compact, capped-width layout with a schedule timeline; Monthly/Quarterly and the shared-settings/escalator switches use pill controls. Project Start and Esc Start Date use a custom month/year picker. A newly selected month saves as its first day. A blank Esc Start Date defaults to the first sale month for that phase, and an auto-filled date follows schedule changes until the user explicitly selects another month. Existing saved dates are not silently changed. The Months & Phases preview and the existing Excel export now show phase-sale inputs and the six monthly pricing/escalator components; new columns stay blank on legacy records.

This release changes only the externally hosted widget. Production phase-sales saves remain DEV-only; no Creator fields, functions, workflows, Custom APIs, or records are changed by the UI promotion. Regression: tab order, phase editing, balanced allocations, month picker keyboard/viewport behavior, first-day date saves, auto versus explicit Esc dates, locked/read-only controls, preview and Excel fields, and legacy blanks. Rollback: map Development and Production to widget `1.80.18`.

## Rejection progress and button (1.80.16)

Reject keeps a white, red-outlined button at rest and on hover. With a required note, it opens the existing paced approval modal. `Handle_Proforma_Approval_Action` accepts `CheckReject` and `RepairReject` through its existing Custom API. Success requires the rejecting row's note, one Pending VP row, no Approved rows, Pending Approval parent status, and VP role, address, and delivery stamp. A first-row self-restart uses the acknowledged write or a changed stamp to avoid mistaking a previously saved identical note for a completed rejection. The repair can send missing mail only for a distinct rejected row. Notification or route failures remain visible until dismissal. Creator deployment: `Handle_Proforma_Approval_Action`; no new fields or Custom APIs. Regression: rejection from VP and later steps, email failure, owner notification failure, ambiguous response, keyboard and duplicate click. Rollback: widget `1.80.15` and prior function body.

## Construction gate polish (1.80.15, 2026-09-24)

The widget gate drops the unclear “Pro Forma development preview” line and uses a compact hard-hat graphic with restrained blue and amber accents. The access code is masked in the input; the code, tab-session unlock behavior, and DEV-only phase-sales save boundary are unchanged. The legacy-to-phase preview now says why the one-time change is needed and clarifies that Approve stages the mapping in memory; only Save persists it. This is still a client-side UI gate, not authentication. Development and Production map to `1.80.15`; Stage remains at `1.80.13`. No Creator forms, fields, functions, or Custom APIs change. Regression: fresh-session gate layout at desktop and phone widths, keyboard entry, incorrect and correct code, tab-session persistence, legacy Pro Forma navigation after unlock, suggested-phase copy and staging before Save. Rollback: map Development and Production back to `1.80.14`.

## Production widget preview gate (1.80.14, 2026-09-24)

The Production Pro Forma widget maps to immutable release `1.80.14`. Its Under Construction access-code overlay covers the widget for every user and remembers an unlock only for the current browser tab session. The code is embedded client-side, so this is a UI deterrent, not secure authentication or a substitute for Creator permissions. Production Creator functions and schema are unchanged; phase-level lot-sales saves remain DEV-only, while unmigrated Pro Formas continue using legacy calculations. Regression: overlay on fresh Production sessions, unlocked navigation and legacy edit/save, and explicit rejection of phase-level saves outside DEV. Rollback: map Production back to `1.80.13`; no Production record migration is part of this promotion.

## Send for Approvals progress (1.80.13)

The Send for Approvals confirmation now opens a Pro Forma styled, accessible three-step progress dialog. The existing `Start_Proforma_Approval_Chain` Custom API accepts a JSON string in its existing `proformaId` argument for targeted `Check` and one `Repair` mode. The widget polls that record about once per second, requires the parent Pending Approval and locked, the first row as the only Pending approval with no Approved rows, and a populated delivery stamp, role, and address. Its display advances at 560 ms per step, stays open at success or failure, and ends after 20 seconds with Retry email or Try again. The backend leaves `Sent_Date` blank until its existing email helper succeeds, and a repeated Start avoids duplicate delivery after a lost response. Publish the updated Creator function before promoting `1.80.13`. Regression: initial send, delayed email, failed email, ambiguous response, retry, duplicate click, keyboard focus/Tab/Escape, and Submit to Legal. Rollback: restore `1.80.12` and the prior Start function body.

## Approval packet one-sheet layout (Creator Development, 2026-09-22)

Pro Forma delete/archive confirmations name the record. Delete checks for a linked LOI worksheet before showing a destructive confirmation; linked LOIs instead produce a protected-record modal offering Archive. `proforma_save` repeats the LOI guard and deletes only `Comment_Log` rows whose `Pro_Forma` matches the deleted record, along with its other financial children. Packet reimbursement subtotals sit in their section headings, the sale heading reads **Land Sale Installments**, and Comments use up to three dated cards per row with overflow into later cards and pages. The widget is published independently from the Creator functions; environment publication of the functions remains with the user.

The approval packet dashboard mirrors the acquisition one-sheet: owners live under the Pro Forma name; returns and flow totals use compact horizontal bands; Current Step is a standalone card; and Site Info, Lot Sales, Land Purchase, Timeline, Costs, PID/MUD reimbursements, and Additional Cost previews follow the approved four-column order. Lot Mix comes from `Lot_Mix_Row`; recurring takedown remains monthly; First Lot Sale and DEV VP are omitted. **Const Add'l Cost / Lot** is `Construction_Cost_Addl / Lots`. The Additional Costs, Reimbursements and Notes pages flow through three columns with Development first, Construction second, separate Impact Fees and Reimbursements sections and subtotals, then Land Sale Installment Details. Development and Construction detail rows come from the Pro Forma's linked `Additional_Costs_Development` and `Additional_Costs_Construction` grids. Both dashboard and detail headings use **Development Add'l Costs** and **Construction Add'l Costs**. The packet never invents an “Unitemized Development” row when a stored total lacks accessible detail rows. Reimbursement rows are excluded from Development and Construction cost totals and their reconciliation. PID/MUD installments stay on their own schedule page with a subtotal. Offer Summary and Offer Details pages remain, while the comment history heading is shortened to **Comments**. Functions: `PF_Build_Proforma_Approval_PDF` and `PF_PDF_Flow_Pages`. No form, field, workflow, or Custom API contract changed. The revised builder was saved in Creator Development. Stage and Production publication is reserved for the user. Regression: empty/populated lot mixes, zero lots, monthly takedown, purchase/sale/PID installments, mixed cost departments, linked Development rows, missing detail rows, long notes, pagination, Offer pages, reimbursement detail, and comments. Rollback: restore both previous function bodies from git.

## Financial input visibility refinement (1.80.10)

Purchase and sale installment rows always outline their editable Month, %, and Amount fields, including prefilled generated rows. PID/MUD is ordered Month, Amount, Type, Date and highlights both blank Month and Amount on new rows. The Purchase Installments count field is narrower. Locked controls remain neutral. Frontend only; no Creator schema or API change. Regression: generated installments, PID/MUD blank and complete rows, locked inputs, dates, and recalculation. Rollback: promote widget `1.80.9`.

## Editable financial input guidance (1.80.9)

Land Purchase / Sale and PIDs/MUD use the Additional Costs input-guidance treatment for incomplete editable values. The first missing value pulses with a pale-blue field and blue border; dependent missing values keep a steady outline. Optional Land Sale fields remain neutral until one side of the sale pair is entered. Read-only, calculated, complete, and locked controls do not receive guidance. Frontend only; no Creator schema or API change. Regression: purchase installments, optional sales, PID/MUD sequencing, complete rows, and locked inputs. Rollback: promote widget `1.80.6`.

## Simplified packet date (1.80.6)

Browser downloads, Creator API responses, and approval-email attachments use `<Sanitized Pro Forma Name>_Proforma_Packet_YYYY-MM-DD.pdf`. The redundant `YYYYMMDD_HHMMSS` timestamp and record ID are omitted; the ISO date reflects generation. Functions: `PF_Build_Proforma_Approval_PDF`, `Get_Proforma_Approval_PDF`, and `Send_Proforma_Approval_Email_With_Context`. No form, field, or Custom API name changed. Regression: named and fallback packets, special-character cleanup, a single generation date, browser downloads, API responses, and email attachments. Rollback: promote widget `1.80.5` and restore the three prior function bodies.

## Readable approval packet filenames (1.80.5)

Browser-downloaded approval PDFs use `<Sanitized Pro Forma Name>_Proforma_Packet_<server timestamp>_<export date>.pdf`. Unsafe punctuation and the internal record ID are removed; the existing generation timestamp and ISO export date remain. The server packet contract is unchanged because the widget derives the final download name from the loaded Pro Forma and the timestamp already returned by Creator. Regression: named and fallback packets, special-character cleanup, retained timestamps, and packet export behavior. Rollback: promote widget `1.80.4`.

## Duplicate icon correction (1.80.4)

The row action menu and unsaved-copy banner render the same complete two-sheet copy icon. This is a presentation-only correction; Duplicate permissions, source isolation, staging, and save behavior are unchanged. Regression: Duplicate action wiring, permissions, save safeguards, and exact icon geometry. Rollback: promote widget `1.80.3`.

## Custom calendar navigation correction (1.80.3)

Offer date pickers render their month navigation with centered SVG chevrons. A blank field now seeds the picker from today's date, and invalid seed parts fall back to the browser's current month rather than producing `undefined 0`. No form, field, function, Custom API, or Creator workflow contract changed. Regression: blank, populated, and malformed date initialization plus previous/next control rendering. Rollback: promote widget `1.80.2`.

## Custom Offer dates and PDF field normalization (1.80.2)

Response Date, Effective Date, and Projected Hard Close use the shared in-widget calendar picker and validate ISO dates before save; no native browser date input remains. Buyer Broker and Seller Broker share a row, with concise blank/`None` guidance on optional Offer fields. Loading a worksheet may display today's Effective Date default, but only a user edit sets `loiDirty`; opening Offer and immediately cancelling therefore leaves without the discard modal.

`PF_Build_Proforma_Approval_PDF` mirrors the Effective Date default for older worksheets whose stored value is null, deduplicates Property County and City values while preserving first-seen order, and renders title-case labels including `County/City`. Creator Development contains the compiled function. Affected fields: `Add_Pro_Forma.Response_Date`, `LOI_Worksheet.Assumed_Effective_Date`, `LOI_Worksheet.Projected_Hard_Close_Date`, `LOI_Worksheet.Buyer_Broker`, `LOI_Worksheet.Seller_Broker`, `Property.County`, and `Property.City`. No Custom API contract changed. Regression: custom calendar mouse/keyboard use, date entry and clearing, untouched Cancel, missing and stored Effective Date packets, repeated County/City values, and mixed County/City order. Rollback: promote widget `1.80.1` and restore the previous PDF function body.

## Offer packet, saved dates, and Word export (1.80.0)

The approval packet extends the first-page reimbursement schedule to the bottom of the page, flows Additional Costs and notes in two columns, and adds complete MUD/PID/TIRZ installment pages sourced only from `Land_Installments` rows whose type is `PID/MUD`. Offer text and acquisition-owner names wrap without clipping, the old "Deal Economics" wording is removed, and comment history moves to dedicated pages that are omitted when no comments exist. `PF_PDF_Flow_Pages` handles flowing text blocks and `PF_PDF_Compile` supports packet-wide continuation pages.

The Offer form exposes `LOI_Worksheet.Assumed_Effective_Date`, `LOI_Worksheet.Projected_Hard_Close_Date`, and `Add_Pro_Forma.Authorized_Signer_for_Seller`. Effective Date defaults to the current date when empty and remains editable. Projected Hard Close and Authorized Signer support enter, change, and clear operations. Earnest-money timing preserves relative text such as "90 days after execution" when no calendar due date exists.

The export modal adds **LOI/Contract**. It reuses `Get_Proforma_Approval_PDF` with `format: "docx"`, calls the shared `PF_Build_LOI_Document` merge helper, and downloads the Writer result without creating a Contract, Contract Version, approval submission, or email. Exactly one Builder seller and at least one Property parcel record are required. All parcel IDs and unique county/city values are combined into the existing Writer merge fields; multiple sellers or no parcels return a manual-preparation message. Development uses the existing `Get_Proforma_Approval_PDF` Custom API, and production uses `Get_Proforma_Approval_PDF1`; both target the same named function in their environment.

Closed Pro Formas keep a grey disabled Edit button between View and Comments for users who otherwise have edit access. Regression coverage includes packet pagination and long text, optional comments, correct reimbursement type filtering, date/signer persistence contracts, DOCX boundaries, and closed-row alignment. Creator function drafts were compiled in Development; Creator publishing remains a separate human action. Rollback: map production proforma-manager to `1.79.14` and restore the previous Creator function bodies from git.

## Attorney-readable Offer packet (Creator function update, 2026-09-15)

The approval packet uses **Offer** for all user-facing PDF headings and consolidates the Offer
economics, sellers and contacts, buyer and property identifiers, timing, deposits, extensions,
special provisions, and legal note onto one 17 x 11 landscape page. Additional Cost detail pages
use fixed-height two-line rows, omit the misleading combined total, and render Reimbursements rows
with a green credit treatment on both the executive preview and detail pages. Overflow rows retain
their `Proforma_Item` IDs and are reloaded for detail-page rendering, preventing every overflow row
from resolving to the final Additional Cost in the source loop. Creator functions:
`PF_Build_Proforma_Approval_PDF` and `PF_PDF_Compile`; no form, field, workflow, or Custom API
contract changes. Regression: empty and populated Offer fields, multiple sellers/properties,
reimbursement and ordinary cost rows, detail-page continuation, and mixed-size PDF compilation.
Rollback: restore the previous two function bodies from git.

## Offer tab, rejection restart, owner names (1.76.0)

The editor's `LOI` tab is now labelled **Offer** (it covers the LOI and the contract); the
`data-pane="loi"` hook, the `LOI_Worksheet` record, and `Submit LOI to Legal` are unchanged.
The Properties section opens with a one-line note, *one parcel per row* — a single CAD /
Property ID per Property row. **Amount Per Acre** on the Offer tab is checked against
**Land Cost $ / Acre** on General Information exactly the way Property acres are checked
against Total Acres: a live green/red readout under the field and a save-blocking validation
error on the Offer pane (`loiPriceCheck`, cents precision, judged only once both sides carry a
value). Rejecting an approval now **restarts the chain at step 1 and emails every Pro Forma
owner** — see *Approval flow*. Approval emails and the PDF packet carry the owners' names in the
header. Creator side: `Handle_Proforma_Approval_Action`, `Send_Proforma_Approval_Email_With_Context`,
`PF_Build_Proforma_Approval_PDF` and the public `Proforma_Approval_Response` page; owner names read
`User_Access.Full_Name` (new field) and fall back to the login trimmed at `@` / `_`.
Regression: Offer tab render, acre + price readouts, save validation, Reject on every pending
step, mock reject restart. Rollback: `1.75.18` (widget) and the previous function bodies in git.

## Centered record navigation (1.75.18)

Equal outer grid columns center the record navigation independently of title and owner widths. On narrower screens the navigation remains centered on its own row. Browser measurements verified exact centering at 2200px and 900px with no page overflow. Presentation CSS, version metadata, release, and production mapping only; no forms, fields, functions, Custom APIs, or Creator deployment changes. Regression: dashboard/edit tabs, populated/empty owners, long titles, and responsive header. Rollback: `1.75.17`.

## Existing record header styling (1.75.17)

The existing record bar now uses the Budget header palette: rounded border, subtle gradient, blue edge accent, and larger title. Existing back button, project dates, view switcher, owners, and dirty indicator are retained. Long names wrap; narrow navigation scrolls horizontally to preserve the animated single-row selection pill. Desktop header fixture and 390px overflow checked. CSS and release metadata only; no forms, fields, functions, Custom APIs, or Creator deployment changes. Regression: dashboard/edit/attachments, title/date wrapping, owner visibility, and view-switch navigation. Rollback: `1.75.16`.

## Back-button cursor (1.75.16)

The existing Pro Forma back-button design is retained, with an explicit pointer cursor on the button and SVG and a visible keyboard-focus outline. Attachment return also uses a pointer. The proposed budget-style title card remains a standalone mockup and is not part of this release. No forms, fields, functions, Custom APIs, or Creator deployment changes. Regression: list return, attachment return, hover and keyboard focus. Rollback: `1.75.15`.

## Scope

Pro forma creation and editing, phases/months, additional costs, purchasing company, seller/property LOI data, Writer-generated LOI documents, comparison views, and approvals.

The Pro Forma list always renders View and Edit for every row. Edit is blue when `canEditPf` allows the record and remains visible in a gray disabled state when the viewer lacks access or the approval flow is complete. For owned-only users, the disabled action explains that they can edit only Pro Formas they own. This is presentation feedback only; the existing permission and direct-route guards remain authoritative.

The Pro Forma read-only state excludes the Approvals pane. Controls in that pane are rendered only after their own approval permissions pass, so the assigned owner can enter and save a pending approval note even when they cannot edit the surrounding Pro Forma.

## Approval flow

Current intended single sequence:

```text
VP → Legal → CFO → COO
```

Approval configuration is editable through the Proforma widget, subject to permissions and active-chain protections.

Rejection (any step, 1.76.0): a Reject with a note **restarts the chain from step 1**. The
rejecting row keeps `Rejected` and its note, every other row returns to `Not Sent` with dates and
notes cleared, and step 1 becomes `Pending` and receives the approval email with the rejection
note (subject `Pro Forma returned by <role>: <name>`). Every Pro Forma owner
(`Add_Pro_Forma.Owner` → `User_Access.Approver_Email`, else `User` when it is an email) gets a
separate "Pro Forma rejected by <role>" email with the note; that email is non-fatal — a send
failure only changes the response message. If the step-1 email fails the whole chain is
restored from a snapshot. Step 1 can reject too: it simply re-opens as Pending with its own
note. The Pro Forma stays `Pending Approval` and locked; use Cancel & Reset to edit it. The old
behaviour returned the Pro Forma to the previous approver, which the CFO/COO found useless
(they cannot fix anything) — the VP answers the objection and Acquisition is kept informed.

Pro Forma approval access is independent from Budget approval access:

- `Edit_All_Pro_Forma_Approvals` shows the Approvals navigation and editor tab, allows action on every Pro Forma approval row, and allows inactive-route configuration and flow cancellation.
- `Edit_Owned_Pro_Forma_Approvals` shows the Approvals navigation and editor tab, but allows approval actions only when the row's approver email matches the signed-in user's email (using the same full-email/username normalization as Budget approvals).
- Users with neither field do not see Pro Forma approval navigation, dashboard/list approval routes, or the editor Approvals tab, and direct approval routes/actions are blocked.
- Budget fields `Edit_All_Approvals` and `Edit_Owned_Approvals` do not grant Pro Forma approval access.

These two fields were added live after the currently committed Creator export. Refresh the `.ds` export to regenerate `creator/generated/fields/User_Access.json`; do not treat the older generated file as evidence that the live fields are absent.

Approval lock rules:

- Starting an approval flow locks the Pro Forma inputs.
- While any approval step has started, the Pro Forma cannot be unlocked; the approval flow must be cancelled first.
- Once every approval step is approved (or the Pro Forma lifecycle status is `Approved`), the Pro Forma remains locked and read-only until an approval administrator cancels and resets the flow.
- Cancelling an in-progress or completed approval flow resets every approval row to `Not Sent`, clears approval notes and dates, returns the lifecycle status to `Draft`, and restores the normal lock control so the route can be edited and restarted.
- The LOI Worksheet remains editable under a manual input lock, but becomes read-only as soon as the approval flow starts. Its privileged save operation enforces the same rule server-side.
- `Submit LOI to Legal` is shown only after every approval step is approved, inside the Pro Forma row's three-dot action menu.

Approval submission readiness:

- Sending for approvals requires a selected Purchasing Company, at least one Seller, and at least one Property.
- Every linked Seller must have Seller Name, Email, Phone, Street Address, and City/State/ZIP.
- Every linked Property must have Common Name, CAD/Property ID, Facility ID, County, City, positive Acres, Seller, and the Purchasing Company.
- These requirements are enforced in both the widget and `Start_Proforma_Approval_Chain` so direct API calls cannot bypass them.
- An active or completed chain can be cancelled by a user with `Edit_All_Pro_Forma_Approvals` from the Approvals tab with `Cancel & Reset Approvals`. The action clears approval statuses, notes, and dates, returns the lifecycle status to `Draft`, unlocks inputs, and makes the route restartable.
- Approval start, action, and reset APIs write the lifecycle status directly in Deluge. The widget must not follow those calls with a REST header update, because a header update fires `RUN_EVERYTHING_ON_SUCCESS` and can exhaust the Deluge statement limit on large Pro Formas.

## LOI fields

Important Proforma LOI fields include:

`Acquisition_Email`, `Amount_per_Acre`, `Amount_per_Extension`, `Authorized_Signer_for_Seller`, `Broker_Buyer`, `Broker_Seller`, `Buying_Entity`, `CAD_ID`, `Closing_Days_Feas`, `Days_per_Extension`, `Earnest_Money`, `Extensions`, `Initial_Feasibility_Days`, `Property_City`, `Property_County`, `Response_Date`, `Seller`, `Seller_City_State_ZIP`, `Seller_Email`, `Seller_Phone`, `Special_Provisions`, `Street_Address`, and `Total_Acres`.

Always verify against `creator/generated/fields/Add_Pro_Forma.json` before implementation.

LOI Seller and Property rows also persist live fields added after the committed Creator export:

- `Builder.Street_Address` and `Builder.City_State_ZIP` are displayed for existing Sellers and collected for staged Sellers.
- `Property.City` is displayed for existing Properties and collected as a picklist for staged Properties. Its choices mirror the canonical `Contract.City` Creator picklist, while retaining any previously stored value that is not yet in that reference list.
- Every Property created by the Pro Forma LOI workflow is stamped with `Property.LOI = true`.

These fields follow the normal LOI staging, validation, save, and approval-lock rules. Refresh the `.ds` export to regenerate the Builder and Property field metadata; do not treat the older generated files as evidence that the live fields are absent.

The Seller and Property grids use explicit per-column widths, polished field controls, and horizontal overflow at narrower viewport sizes so adding address fields does not compress or misalign the rows.

## Numeric precision

`Add_Pro_Forma.Land_Cost_Acre` is a whole-dollar Creator currency field. The widget normalizes it to zero decimal places before calculation and save, then rescales purchase installments to the resulting land cost. `proforma_save` also applies `.round(0)` as a server-side safeguard. This prevents Creator error `3002` during the workflow-triggering header update.

## Per-unit additional costs

`Proforma_Item` stores optional `Unit` and `Per_Unit` inputs. In the Proforma Manager, a row-local, widget-only **Per Unit** toggle exposes those inputs and makes `Add_l_Cost` read-only. The supported units map to the Pro Forma header as follows: `Acre` → `Total_Acres`, `Lot` → `Lots`, and `LF` → `Total_Street_LF`.

The widget calculates `Add_l_Cost = Per_Unit × selected header quantity` and persists the resulting `Add_l_Cost` alongside the two source inputs. All schedules, rollups, exports, reports, PDFs, and downstream Creator workflows continue to consume only `Add_l_Cost`; no downstream formula branches on the unit fields or the widget toggle.

The Pro Forma list displays each record's Creator system creation date from `Added_Time`
(with `Created_Time`, `Added_On`, and `Created_On` fallbacks) beside the record name.

## Writer template

Current known LOI Writer merge template ID:

```text
6kuqna9b27e6fe95b4f75a3920de1ff048543
```

Connection name: `zoho_writer`.

## Primary action

The `New Pro Forma` action is the visually prominent primary action in the portfolio toolbar. Preserve its icon, high-contrast treatment, keyboard focus state, and responsive behavior.

## Attachments

Pro Forma attachments use one `Contract_Version` record per file, matching the Budget attachment pattern:

- parent lookup: `Pro_Forma` (the `Add_Pro_Forma` record ID)
- child report: `All_Contract_Versions`
- file field: `File_field1`
- create API/function: `Create_Proforma_Attachment_Record` / `createProformaAttachmentRecord`
- delete API/function: `Delete_Proforma_Attachment` / `deleteProformaAttachment`
- preview API/function: `Get_Proforma_Attachment_Preview` / `getProformaAttachmentPreview`

The widget exposes the attachment workspace from both Dashboard and Edit. It supports multiple-file upload, embedded PDF/image/text/media preview, download, and delete, subject to ordinary Pro Forma edit permissions. The persistent `Pro Forma List` action is the canonical route back to the portfolio.

The current committed Creator export predates the live `Contract_Version.Pro_Forma` field. Do not add it manually to `creator/generated/`; refresh the `.ds` export after the live Creator configuration is published.

## AI review

`PF_AI_Review(string payload)` judges one Pro Forma against the founder's criteria held on the Settings singleton (`PF_Review_Criteria`, `PF_Review_Provider`, `PF_Review_Model`, `PF_Review_Criteria_Updated`; edited in Settings Manager). Custom API link names follow `docs/custom-api-environment-routing.md`: **`Review_PF`** in Production and **`Review_PF_DEV`** in Development (the widget calls `Review_PF` and `LMRuntime.apiName()` adds the suffix). Both are POST, JSON, OAuth2, all users, returning the function's string. Payload envelope is the Save_PF shape, `{"payload": "{\"proformaId\": ..., \"reviewedBy\": ..., \"dryRun\": false}"}`; the function also accepts the bare JSON body or a bare record id. The widget must send `reviewedBy`: a Custom API runs as the authorising administrator, so `zoho.loginuserid` inside the function is not the requester.

The function sends a compact deal summary (headline numbers with pre-computed ratios, plus the `Lot_Mix_Row` children), never the raw record, to OpenAI chat completions through the Connection with link name `openai` (`response_format: json_object`, `max_completion_tokens` 2000, no temperature) and normalises the reply to `{verdict: Pass|Watch|Fail, score: 0-100, summary, meets[], misses[], questions[]}`. Each run is inserted as a `Proforma_AI_Review` record (Pro_Forma lookup, Verdict, Score, Summary, Meets, Misses, Questions, Deal_Snapshot, Reviewed_On, Model, Criteria_Version, Reviewed_By), and the Pro Forma's `AI_Review_Verdict`, `AI_Review_Score`, `AI_Review_Summary`, `AI_Reviewed_On` and `AI_Review_Criteria_Version` are stamped by fetch-assign. Production can silently drop fetch-assign writes, so the widget re-writes those five fields through the REST update after a successful response (the date in the app format `dd-MMM-yyyy HH:mm:ss`, with a second attempt without the date if Creator rejects it).

**Widget (Proforma Manager 1.69.0+).** The AI Review modal reads history from report **`All_Proforma_AI_Reviews`** (candidates in `CFG.reportCandidates`; a missing report reads as empty history) with criteria `(Pro_Forma == <id>)`, shows the record's current numbers beside the selected run's `Deal_Snapshot`, and runs a new review through `invokeAiReviewApi`. The record-rail button reads the Pro Forma's own `AI_Review_*` fields, so `All_Pro_Formas_All_Fields` must include them. Running is gated by `perms().aiReview`, which `getUserAccess` returns as `pfAiReview` from the `User_Access.AI_Review` checkbox; viewing history has no gate. Only the `openai` provider is wired: Deluge takes the Connection name as a literal, so OpenRouter would need its own Connection and a second `invokeurl` block.

## Duplicate (fork)

`Duplicate` in the Pro Forma row's three-dot menu creates a forked Pro Forma. It is **not** a
field-by-field copier — copiers drift the moment a field is added. The flow is:

The action is visible and executable only when the current user's `User_Access` record is in
the Pro Forma's `Owner` lookup or the user has `Edit_All_Proformas`. Ownership alone permits
Duplicate; it does not depend on the separate `Edit_Owned_Proformas` grant.

```text
loadDetail(sourceId) → recordToModel() → forkModel() → editor (unsaved, id = null) → normal Save
```

- `forkModel` deep-copies the model, clears `ID` and `_stored`, renames via `forkName`
  (`"Bell Sharkey" → "Bell Sharkey (Duplicate)"`, then `(Duplicate 2)`… on collision),
  forces `Status = Draft` and `Lock_Inputs = false`, sets `Owner` to the creating user, and
  strips the row ID from every collection in `FORK_CHILD_LISTS`.
- Nothing is written until the user presses Save. Save runs the ordinary pipeline with
  `id: ""`, so `Save_PF` inserts a new `Add_Pro_Forma` and new children, and the header
  touch fires `RUN_EVERYTHING_ON_SUCCESS` to regenerate months and phases.
- A child row that kept its ID would be an **update of the source's row**. Stripping every
  ID is what makes the copy purely additive; `scripts/test-proforma-duplicate.mjs` asserts it
  along with the source model being byte-identical after a fork.

What a duplicate deliberately does not carry: approvals (`Budget_Approvals`), AI review
records and the `AI_Review_*` stamps, attachments (`Contract_Version`), the LOI Worksheet and
its Sellers/Properties, `LOI_Legal_Status` / `LOI_Approval_Token` / `LOI_Contract`, `Archive`,
and every server-computed total. Most of these are excluded by construction: the copy only
carries what `HEADER_FIELDS` and `buildSavePayload` carry. LOI *header* fields are in
`HEADER_FIELDS` and are copied, since a fork is normally the same deal.

**Keeping it in sync.** A new header field forks for free once it is in `HEADER_FIELDS`. A new
child collection does not: add it to `FORK_CHILD_LISTS` as well, or its rows are copied with
their source IDs and the save overwrites the original Pro Forma's rows.
`scripts/test-proforma-duplicate.mjs` fails the build if `newModel` or `buildSavePayload`
gains a collection that `FORK_CHILD_LISTS` does not list.

## Save-path record-ID guards

Three writes in the save pipeline build Creator criteria from the Pro Forma ID, and one of
them (`deleteAllByCriteria` in the month/phase client fallback) deletes by that criteria. A
blank ID turns `Proforma == <id>` into an unfiltered match, so a failed create could delete
other Pro Formas' month and phase rows. Guards, all covered by the test:

- the save pipeline throws before any ID-keyed step when the create returned no ID;
- `writeLotMixViaSDK` returns early on a blank ID;
- `deleteAllByCriteria` refuses a criteria whose operand is missing.

## AI review history read

The history list reads `All_Proforma_AI_Reviews` with criteria `(Pro_Forma == <id>)`. A Creator
report rejects a criteria naming a column that is **not in its quick view** with code `3330`,
and `sdkGetAll` answers a criteria rejection by trying the NEXT report-name candidate — none of
which exist — so a report that is present but missing the `Pro_Forma` column previously read as
"no reviews report at all" and the modal showed `Review history is unavailable here.`

`loadAiReviews` now retries the same report **without criteria** and scopes the rows in the
widget, the way Pro Forma attachments already recover. The scoping rule inverts between the two
reads: the filtered read keeps a row whose lookup is display-value-only, the unfiltered read
drops any row that cannot prove it belongs to this record.

If the unfiltered read returns rows but none names a Pro Forma, the column really is absent from
the quick view — the empty state then carries the reason as a tooltip and the audit log names the
report and field. **The Creator-side fix is to add `Pro_Forma` to the `All_Proforma_AI_Reviews`
quick view and publish the report component**, which also restores the cheaper filtered read.
Covered by `scripts/test-proforma-ai-review-history.mjs`.

## Dashboard Total column

The dashboard's monthly table (`renderFlowTable`) paginates 24 months at a time. A frozen
**Total** column sits between Category and the first month on every tab (Cash Flow, Inflows,
Outflows), sticky at `left:220px` beside the Category column.

- The total is summed over the **whole** `c.agg`, never the visible `cols` window — paging the
  months must not change it.
- It carries no colour of its own (`<td class="tot mono">`): the section band and the row's own
  class already style it, and it never takes the red `neg` class.
- Section rows are shown **unsigned** — Inflows/Outflows is context enough.
- The two cash-flow rows are the exception. `Cash Flow Monthly` keeps its sign (no section above
  it says which way the money went, and a loss shown positive reads backwards), and
  `Cash Flow Cumulative` takes its **last** month rather than a sum — it is a running balance, so
  summing it would add the balance to itself.

Every row builder must emit exactly one total cell or the columns shear: `row`, both `rowX`
branches, the three phase loops, and both `sect` branches (the month-strip band gets an empty
`<td class="tot">`, the full-width band spans `FLOW_COLS+2`). Covered by
`scripts/test-proforma-flow-total.mjs`.

### AI review history diagnostic

`diagnoseAiReviewHistory(pfId)` writes one audit entry, **`AI REVIEW HISTORY DIAGNOSTIC — copy
this entry`**, at WARN (so it never triggers the automatic error email). It bare-reads every
candidate report name in turn and then tries the criteria read, recording the raw Creator answer
for each — code, row count, the first row's column names, whether the `Pro_Forma` key came back
at all, and each row's resolved Pro Forma id. Read it like this:

| What the probes show | What it means |
| --- | --- |
| every candidate `2894` / no report named | the report is not published in **this** environment |
| bare read ok, criteria read errors | the criteria is being refused — the code says why |
| bare read ok, `proformaFieldPresent: false` | the column is not in the report's quick view |
| rows returned, no `resolvedPfIds` match | the rows live in another environment's app |

It runs once per session when the history read fails, and again on every press of the modal's
Refresh button. It also runs when the history reads back **empty on a record that already carries
an `AI_Review_Verdict`** — the list chip reads those stamps, so a verdict with no history means
the rows are somewhere the read cannot see.

### Report link name (the actual 2894 cause)

The AI review history report is **`All_Proforma_Ai_Reviews`** — lower-case `Ai`. Creator
title-cases each word when it auto-names a report, so the form `Proforma_AI_Review` produced
`All_Proforma_Ai_Reviews`, not `All_Proforma_AI_Reviews`. Report link names are case-sensitive to
the record API, so the all-caps spelling returned `2894 — No report named ... found` on every
read, filtered and unfiltered alike, in an environment where the report was present the whole
time. The Deluge insert keeps using the form name `Proforma_AI_Review`; only the report differs.

Two guards came out of this:

- `CFG.reportCandidates` is keyed by the configured report name — a key that matches no value in
  `CFG.reports` is a fallback list `candidates()` can never reach.
  `scripts/test-proforma-ai-review-history.mjs` fails the build on that drift.
- **Open follow-up:** refresh the `.ds` export so `creator/generated/reports.json` carries the
  live report list, then have `validate-repo.mjs` check every `CFG.reports.*` value against it.
  That is the guard that would have caught this one before it shipped.

## 1.75.10 — main report palette

Frontend-only: `widgets/proforma-manager/src/app/report-layout.css` is scoped to `#vList`, with its stylesheet link/version in `widget.html`. Budget-style blue report headers, territory separators, and alternating rows reduce white glare. All report columns/actions, owner editing, audit, approvals, calculations, LOI, fields, Creator functions, and Custom APIs retain existing behavior.

Regression: visually check main report with local mock data, retain horizontal scrolling and action controls; run `npm run validate` and `npm run build:pages`. No Creator backend publication required. Rollback: restore production proforma-manager mapping to `1.75.9` and rebuild Pages.

## Scenario site inputs (1.75.11)

Scenario Analysis includes Acres (Total_Acres), LF Street (Total_Street_LF), and Lot Size in front feet (Lot_Size_Ft), alongside the existing ten drivers. Controls are grouped into Site & Lots, Pricing, Sales Pace, and Schedule. Acres and lot size retain two decimal places; street length is a whole-foot quantity. Baseline comparisons, pins, Revert all, Refresh, and sensitivity ranking include all thirteen drivers.

Changing Acres rescales purchase installments using the same path as Land Cost / Acre, preserving payment timing. Acre-, LF-, and lot-based additional costs are recalculated for the scenario quantity; manual additional costs remain fixed. Sensitivity calculations copy dependent rows so they cannot mutate the active scenario. Lot size changes the average front footage used for revenue without rewriting the saved lot mix. All changes are local what-if inputs; no Creator records, forms, functions, or Custom APIs change and no Creator deployment is required.

Regression coverage: scripts/test-proforma-scenarios.mjs checks profit, IRR, installment totals/timing, per-unit costs, baseline isolation, decimal input, and snapshots. Browser verification covers editing, steppers, keyboard arrows, fractional deltas, pin/revert/refresh, and 1600/1024/768/390px layouts. Required release checks: npm run validate and npm run build:pages. Rollback: map production proforma-manager back to 1.75.10 and redeploy Pages.

### Compact scenario controls (1.75.12)

The assumption controls use four compact columns with inline labels and values, subtle dividers, and 26px-high steppers. Container queries switch to two columns in narrower cards and stack labels above inputs on phones. Edited inputs are highlighted; baseline values remain available in label tooltips and the comparison table. Removing the large group panels and reserved baseline rows substantially reduces vertical space without changing any calculation or event handler. Meeting mode uses the same fitted widths.

Verification: full repository validation and Pages build; browser editing, steppers, keyboard arrows, pin/revert/refresh, and responsive visual checks at 1600, 1024, 768, and 390px. Source, widget metadata, documentation, and immutable release files change; Creator forms, fields, functions, and Custom APIs do not. No Creator deployment required. Rollback: promote proforma-manager 1.75.11 through deploy/environments.json.

### Scenario MUD revenue toggle (1.75.14)

A compact MUD revenue switch in the Assumption Controls header includes or excludes scheduled PID/MUD receipts from the what-if calculation. It defaults to On to preserve the saved model calculation, including when the classification and scheduled receipts disagree. Off passes a shallow calculation copy with an empty pidMud list to the existing engine; original receipt amounts, dates, row IDs, and MUD_PID classification remain intact. Turning it back On restores the receipts. The private _scenarioMudRevenueEnabled flag is not a persisted header field.

The switch updates income, cash flow, profit, ROI, IRR/XIRR, peak cash, target headroom, and sensitivity calculations. Excluded receipts do not extend the scenario horizon. The comparison table shows MUD Revenue amounts and On/Off states for baseline, pinned scenarios, and the active scenario. Toggle-only changes count toward the change badge and enable Revert all. Pins capture the setting; Revert all restores the baseline setting, and Refresh resets from saved data.

Verification: full repository validation and Pages build; revenue exclusion, return changes, timed cash flow, restored results, unchanged receipt data/classification, no-receipt cases, sensitivity inheritance, and snapshots in scripts/test-proforma-scenarios.mjs. Browser checks cover toggle/keyboard, headroom, badge, pin/revert/refresh, and responsive layouts from 390 to 1600px. Only widget source, tests, docs, and release metadata change; no Creator forms, fields, functions, or Custom APIs change, and no Creator deployment is required. Rollback: map production proforma-manager to 1.75.12.

The 1.75.14 release also removes the explanatory note below Target Headroom and the AI review grade pill beneath each name in the main Pro Forma list. The record AI review action and review history remain available.

### MUD switch copy (1.75.15)

The scenario switch is labeled MUD and has no hover help text. Its accessible name and calculation behavior remain intact. Verification: repository validation, Pages build, and production preview label/tooltip check. Only widget copy, docs, and release metadata change; no Creator deployment required. Rollback: production proforma-manager 1.75.14.

## Template item backfill, run-once schedule (added 2026-09-11)

`creator/workflows/Backfill_Template_Items_Once_Proforma.dg` is a Creator Schedule (specific date
and time, Repeat: Once) that adds the 2026-09 Amenities template codes 3851-3867 to every Pro Forma,
routing Department "Construction" rows to `Pro_Forma_Const` and everything else to `Pro_Forma_Dev`
like proforma_save. New rows carry no `Add_l_Cost`, so totals do not move. Idempotent, one aggregate
count emailed at the end, ~2,800 statements against the 5,000-per-run schedule cap. The widget save
path deletes and re-inserts non-template rows from its payload, so a save from a stale session drops
the new rows; re-run the schedule if that happens.
