# Attachment presentation and original uploader names

Budget 122.28.17 and Pro Forma 1.80.63 adopt Legal's attachment header, upload area, file metadata and icon controls. Legal 1.60.44 removes its small instructional footer. Email selection remains exclusive to Legal. Existing upload, preview, download, deletion, approval and navigation paths are retained.

Added by uses the original `Contract_Version.Added_User`, matched uniquely to the User Access roster's `User`/`Approver_Email`, and displays `Full_Name`. It never substitutes the last editor or current viewer. Ambiguous identities retain the recorded creator label. Blank names retain that label rather than inventing a name.

The existing `getUserAccess` and `getUserAccessLean` roster adds `userName`, `approverEmail` and `fullName`. Legacy roster values, permission flags, full owner maps, wrapper/argument conventions and lean scan behavior remain unchanged. The original identity and name fields already exist; no new form or permission fields are introduced.

Creator deployment is separate from GitHub Pages. Development changes were saved and reloaded: both access functions have only the three additive roster lines; `All_Contract_Versions` Web Detail View retains its six prior fields and appends the existing system Added User field. The lean function executed successfully with four roster rows and no Pro Forma owner map. The full response parity, native attachment gates, selective Stage/Production publishing and Production visual checks remain pending at candidate creation.

Focused tests execute the actual attachment normalizers, renderers and event paths. Coverage includes native scalar/structured creators, unique roster matching, ambiguity, escaping, IDs/file paths/dates/parents, read-only/busy controls, email exclusivity, footer removal and repeated drop/picker events producing one upload. Full `npm run validate` and `npm run build:pages` passed before candidate publication.

Development and Production maps select these three immutable releases. The user explicitly requested immediate attachment publication after the passing code checks and waived native UI gates for changes other than SDK migrations. Permanent Creator widget URLs are preserved through environment routing. Native UI review of attachment styling is therefore user-owned; the four remaining SDK migrations still require individual native Development testing.

Frontend rollback uses those previous Production releases. The additive roster keys are compatible with old consumers; retaining the report's original creator field also supports that rollback. Removing those backend additions, if needed, requires a separate selective Creator environment publication.

No live attachment creation/deletion, email send, approval or financial write is implied by the read-only visual gate. Native write coverage must be reported separately.
