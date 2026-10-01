# Compact import dialogs

Land & Projects 8.12.6 uses a content-sized dialog for Attach and the spreadsheet-checking progress page. Both cap their width at 760px and height to the viewport, with scrollable content if needed. Review and creation with the lot table retain their larger workspace.

Changed: spreadsheet import JS/CSS, widget version and release, version checks, style guidance, and production mapping. No forms, fields, functions, APIs, permission settings, or Creator backend deployment change.

Regression: Attach with and without a file/error, progress and cancel, transition to the larger review table, mobile layout, and centered close icon. Rollback: production Land Master mapping to 8.12.5.
