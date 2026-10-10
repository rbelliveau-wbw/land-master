# Attachments

This is the shared design contract for Legal, Budget and Pro Forma attachment
actions and workspaces. Legal's `showAttachmentsModal` is the visual reference.
The required main-list flow is a paperclip action that opens an attachment
modal for that record, retaining the list's filters, selection and scroll.
Budget 122.28.18 and Pro Forma 1.80.64 implement this main-list flow, sharing
their existing file rows and action paths with their record workspaces. Their
actual-source regression tests cover modal scope, permissions, counts and
retaining the underlying list. The user waived native UI gates for this
presentation increment; live upload/delete coverage is recorded separately.

## Appearance

- Pair the paperclip action with the comment action. Use the pale-blue compact
  control: `#f4f8ff` surface, `#cbd9eb` border, `#285b97` icon, square rounded
  corners and a count badge at the lower-right edge. Compact row size is
  `28.75px` with a `16.1px` SVG. Keep hover changes to color, border and shadow,
  using `180ms ease`; reserve room so badges remain visible. Keep a `7px` gap
  between adjacent comment and attachment controls in the main-list action row.
- Use Legal's blue modal top rail, compact uppercase file count above the
  record name, a `940px` maximum width, and a neutral `32px` centered SVG Close
  with a `9px` radius. Keep the name readable with truncation
  and the full name accessible. Cap the modal to the viewport and scroll its
  body; keep identity and actions reachable on narrow screens.
- Place a dashed drop area and **Choose Files** above the list. Show file-type
  badges, blue filenames, compact date and **Added by** metadata. Align matching
  square Preview, Download and Delete controls. Use a restrained red Delete
  hover treatment and short empty/error labels.
- Legal alone keeps its **Email** switch and existing approval-email meaning.
  Omit the small instructional footer. File limits come from the module's
  actual backend/upload contract, rather than copying Legal's limit elsewhere.

## Counts, ownership and provenance

Load complete attachment counts for the visible record scope in the background.
Show loading and unavailable states distinctly; display zero only after a
complete successful read. Scope each file to its exact parent ID. A late reply
for another record or a closed modal cannot replace or reopen the current view.
Refresh the affected row badge after a verified upload or deletion, including
operations performed from a different attachment surface.

**Added by** means the persisted original `Contract_Version.Added_User`.
Resolve its explicit username/email to one exact, case-insensitive User Access
roster match and display that row's `fullName`. The roster adds `userName`,
`approverEmail` and `fullName` while preserving its older keys. Preserve a real
saved username as fallback when a full name is unavailable; missing provenance
stays unavailable. Do not use the current actor, last editor, an email prefix
or an ID as an invented author. Ensure the report actually returns Added User
in both Quick View and Detail View: SDK1 reads use Quick View, while SDK2
`field_config:all` includes Detail View fields. A late roster reply updates
saved-author text without replacing an open dialog, list or editor draft. See the
[backend roster contract](../../docs/creator-lean-access-contract.md).

## File actions and accessibility

Open Preview inside the widget first. Preserve the original file bytes,
filename and supported preview behavior; retain an explicit download/open
action when the format cannot be previewed. Preview and download retain their
existing read permissions. Upload and Delete retain each module's write guards
at both the visible controls and callable action entry points. A common design
does not introduce a permission grant, owner alias or broader data scope.

Use a named `role="dialog"` with `aria-modal="true"`, trapped focus, inert
background, visible focus outlines and a return to the originating paperclip
when closed. Give icon-only actions meaningful accessible labels; provide a
keyboard-operated Choose Files alternative to dropping files. Escape follows
the modal's safe-close rule. Use the widget's Delete confirmation and return to
the same record's workspace on cancel; never use a native browser dialog.

During a write, block duplicate and conflicting file actions and retain the
mounted record context. Report errors beside the files and preserve reviewable
results. A created child ID does not prove file upload succeeded: require the
native FILE success acknowledgement and confirm the same child ID and parent.
Native `code:3000` without an explicit API failure confirms that captured upload;
filename and filepath metadata are optional. Do not compare refreshed file
metadata after that acknowledgement: Creator can sanitize filenames or omit
file fields. This supersedes the former automatic file-metadata equality gate.
Unknown outcomes retain their inputs and require read-only recovery; they
cannot trigger another insert, upload, alias retry or cleanup without proof.
An unrecognized upload acknowledgement is not the final outcome: after its
native call settles, perform the module's existing exact saved-file verification
once automatically. If that fresh evidence confirms the captured child, parent
and file, finish successfully without making the user press Recheck. If it does
not, retain the inline review and read-only recovery. Contract's Email switch
controls inclusion in approval emails; it is not a prerequisite for creating
or uploading a file, and uploading preserves its persisted value.
Contract and Pro Forma attachment uploads use the existing attachment workspace
for feedback (requested October 7, 2026). Keep that modal mounted and show a
compact spinner with a polite upload/checking status; do not open a second
Contract-fields or Save Pro Forma dialog. Stop the spinner when the operation
settles, retain a readable inline failure, and keep read-only Check status
available for an unknown outcome. Pending native requests and reconciliation
hold Close/Escape and conflicting file actions. A terminal review may be
dismissed without clearing its captured review or replaying a write. Successful
verification patches the file list/count in place. Respect reduced motion.
Budget retains its existing inline upload/recheck flow. Preserve the internal
per-file destination ledger and partial/unknown states from
[transfer progress](transfer-progress.md) in every module; the simpler feedback
does not change persisted success predicates or permissions.

## Source references

Contract attachment and approver Email switches send Creator checkbox strings
(`"true"`/`"false"`) in either direction. Restore controls after settled success or
failure. Normalize Contract Version's configured Yes/No Email labels when reading
the attachment report so a saved on switch remains on after refresh, including
after a remounted approval surface. Pending writes still hold
controls; unknown outcomes retain their no-replay guard while allowing dismissal
after the native request settles. See [Contract recovery regressions](../../docs/contracts-create-and-permission-recovery-2026-10-10.md).

- [Legal widget](../../widgets/contract-management/src/app/widget.html):
  `showAttachmentsModal`, `attachmentsPanel`, `attachmentAuthorLabel`.
- [Budget widget](../../widgets/budget-manager/src/app/widget.html): attachment
  normalization, parent-scoped loading and file actions.
- [Pro Forma widget](../../widgets/proforma-manager/src/app/widget.html):
  `normalizePfAttachment`, `loadPfAttachments` and attachment actions.
- [Shared compact controls](../../widgets/proforma-manager/src/app/comments.css).

Before release, check the main-list flow, long filenames, narrow screens,
keyboard/focus/Close, loading/error/verified-zero counts, original author,
read-only users, pending/unknown writes and returning from Preview/Delete.
