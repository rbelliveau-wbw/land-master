# Budget Link to Record — 122.29.58

User direction October 20: remove the second review screen. Link to Record now
keeps its searchable rows visible, highlights the selected row, and enables
**Save** in the same footer. Request choices say “Choose a request to link this
attachment to.” Selection, search, Cancel and Escape make no native writes.
Both directions (Budget file → request and request → existing Budget file) use
this single-screen flow. Native association, scope/permission guards, pending
Close/duplicate-write locks, unknown-outcome read-only recovery, and retained
Budget files are unchanged. Draft attachments from 122.29.57 are unchanged.

Changed files: request-attachments.js/.css, widget.html version keys, focused
browser regression, component/module guides and release metadata. No forms,
fields, reports, Deluge functions or Custom APIs changed. **Nothing to promote
in Creator** for this release.

Regression: disabled Save before selection, highlighted row, selection/Cancel
make no write, one Save links the exact original file without copying it, keyboard focus stays
on the selected row, filtering it away disables Save,
saved PO/Mod/Check/Wire tabs, pre-create file queue and upload, focus/Close,
permissions and reduced motion. Full validation and Pages build are required.
Production UI checks are read-only; browser fixtures simulate native writes.
Rollback: Budget Production mapping **122.29.57**; keep immutable releases.
