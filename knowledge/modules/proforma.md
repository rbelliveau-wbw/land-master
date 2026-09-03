
# Proforma Module

## Scope

Pro forma creation and editing, phases/months, additional costs, purchasing company, seller/property LOI data, Writer-generated LOI documents, comparison views, and approvals.

## Approval flow

Current intended single sequence:

```text
VP → Legal → CFO → COO
```

Approval configuration is editable through the Proforma widget, subject to permissions and active-chain protections.

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

**Widget (Proforma Manager 1.69.0+).** The AI Review modal reads history from report **`All_Proforma_AI_Reviews`** (candidates in `CFG.reportCandidates`; a missing report reads as empty history) with criteria `(Pro_Forma == <id>)`, shows the record's current numbers beside the selected run's `Deal_Snapshot`, and runs a new review through `invokeAiReviewApi`. The list row chip and the record-rail button read the Pro Forma's own `AI_Review_*` fields, so `All_Pro_Formas_All_Fields` must include them. Running is gated by `perms().aiReview`, which `getUserAccess` returns as `pfAiReview` from the `User_Access.AI_Review` checkbox; viewing history has no gate. Only the `openai` provider is wired: Deluge takes the Connection name as a literal, so OpenRouter would need its own Connection and a second `invokeurl` block.

## Duplicate (fork)

`Duplicate` in the Pro Forma row's three-dot menu creates a forked Pro Forma. It is **not** a
field-by-field copier — copiers drift the moment a field is added. The flow is:

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
