
# Contracts Module

## Lot picker, row details, and destructive-action access (1.58.0)

The lot picker now queries All_Active_Lots_Contracts_View by each selected Subdivision ID. The former app-wide cache stops at 5,000 rows and can omit entire subdivisions. Scoped results merge without discarding other subdivision lots; loading/errors are distinguished from a successful empty result. The native report, lot eligibility, claims, and completion rules remain unchanged.

Contract names have a paperclip/count opening the existing attachments modal. Lot contracts also show Number_of_Lots (or selected Lots1 count), Initial_Takedown / Initial_Takedown_Days, and Subsequent_Takedown_Lots / Subsequent_Takedown_Days. Attachment counts refresh when the modal repaints.

User_Access.Delete_Archive_Contracts is explicitly named by the user and is exposed as ctDeleteArchive by creator/functions/getUserAccess.dg. Archive/Unarchive and the new Delete menu action require a known, found access response with this flag true. Missing flags and failed access reads deny these actions even when general editing is allowed. Handlers and the parent-contract SDK mutation helpers repeat the check. Delete uses the existing exact-ID SDK path and an in-widget confirmation; completed-contract locks remain enforced. Creator's native record permissions and relationship constraints still govern deletion; the widget does not manually cascade through child records.

Creator deployment required: confirm the boolean User_Access.Delete_Archive_Contracts field exists, then publish the updated getUserAccess function behind Get_User_Access in the applicable Creator environments. GitHub Pages cannot publish Deluge. Until then, destructive controls remain hidden. No new Custom API is introduced; approval tokens and LOI review behavior are unchanged.

Validation: scripts/test-contract-picker-access.mjs covers scoped queries, string IDs, preserved cached rows, errors, deny-by-default permission combinations, exact-ID delete requests, unauthorized delete invocation, attachment click behavior, and lot/cadence summaries. Full repository validation and Pages build are required. Rollback widget: 1.57.1 via the production mapping. The additive getUserAccess response key is backward compatible.

## New contract and lot-picker presentation (1.57.1)

New Contract is the enlarged main modal title; the redundant Create Contract heading is removed. New-contract dropdowns use white backgrounds and visible borders. Choose lots builds its subdivision choices from the contract selection and resolves names from loaded Subdivision records, then lot lookup display names, including when there are no lots. Async loads repaint the custom combo rather than inserting native option elements into its button. Existing Subdivision.Subdivision_Name and lot subdivision lookups are read only; no fields, functions, Custom APIs, or Creator deployment changes. Regression checks cover no lots, ID-only lookup, display-name fallback, missing names, and allowed-subdivision scope; also verify contract creation, dropdown selection, and Choose lots after loading. Rollback: `1.57.0`.

## Scope

Contracts, contract versions, schedules/actions, approvals, attachments, and LOI legal review.

## LOI review

The current contract widget supports token-based legal review using `tokenId`. Preserve token validation, review status, legal note, and Proforma/Contract linkage.

## Attachments

`Contract_Version` is also used by Budget attachments. Confirm the correct parent lookup (`Contract1` versus `Budget`) before changing shared attachment logic.

Contracts use one `Contract_Version` record per file with `Contract1` as the
parent lookup and `File_field1` as the upload field. Attachment record creation,
deletion, and exact-byte reads use these Custom APIs first:

- `Create_Contract_Attachment_Record` → `createContractAttachmentRecord`
- `Delete_Contract_Attachment` → `deleteContractAttachment`
- `Get_Contract_Attachment_Preview` → `getContractAttachmentPreview`

`Get_Contract_Attachment_Preview` supplies the same base64 bytes to both the
in-widget preview and download paths. The function must verify both the
`Contract_Version.ID` and `Contract1` parent before returning a file.
