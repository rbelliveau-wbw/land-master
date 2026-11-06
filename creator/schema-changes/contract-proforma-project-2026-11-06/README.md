# Contract Pro Forma / Project

The new `Contract.Proforma` lookup belongs to Legal acquisition contracts. It is
single-select, optional for legacy records, and displays `Add_Pro_Forma.Name`.
`Create_LOI_Contract` receives the exact Pro Forma ID from Send to Legal and sets
the lookup for both PSA and LOI when creating or reusing a Contract. The existing
submission permission, approved/locked/active preflight, attachments, action
templates and token-based review remain in place.

The Development lookup and `Create_LOI_Contract` were installed and reopened on
November 6, 2026. After correcting the persisted field link name to `Proforma`,
the function compiled successfully; a full browser reload confirmed the source
lookup assignments, identity query, reverse-ownership guard and fallback return.
Only the create/reuse changes were applied to the current native function,
preserving its other code. No submission or notification was executed.
Other installation statuses are recorded separately in [change.json](change.json).
These fragments are candidates, not an exported schema or proof of publication.
Generated October metadata and historical snapshots are preserved.

Development `All_Contracts1` and `All_Contracts` expose the saved Pro Forma
column. Existing subdivision codes/project scope and project names/territory
were verified in their report headers. The picker Quick View is restricted;
record clicks do nothing and all record-detail/action entry points were removed.
Its default Detail View remains, with no profile grants assigned yet. The native
`All_Contracts_v2` Board remains unchanged and is still listed as a candidate.
Full repository validation and the Pages build passed for widget candidate
`1.62.55`; no live Send to Legal or business-record write was executed.

Install the components in `change.json` order. Add only the listed report fields
from [reports.json](reports.json); preserve each report's existing criteria,
layouts, actions and native record scope. The new picker report returns only
`ID`, `Name`, `Territory` and `LOI_Contract`, with no Pro Forma editing or
financial/token access. Apply [permissions.json](permissions.json) to existing
Legal profiles, preserving all current edit-all/edit-owned distinctions and excluding
Construction-only profiles. Verify field visibility with a non-admin Legal
account as well as Admin. Minimize both the picker report's Quick View and
Detail View to those same fields, or disable record-detail navigation, before
granting access. A minimized Quick View does not limit default Detail View.
Remove default edit, export, related-list and custom-action exposure as needed.

Append the validation fragment as a Contract Created or Edited / Validations on
form submission action after the existing validation. Append the visibility
fragment to existing on-load and Contract Type on-user-input actions. Preserve
all existing Construction, city, parent-master and lot validation actions.
Compile and reopen `creator/functions/Create_LOI_Contract.dg` only after the
lookup exists. Its existing Custom API name and argument stay unchanged.

Before user promotion, check Development SDK reads for `Proforma` and
`Subdivision_Code`, edit permission separation, source identity reuse after a
rename, PSA/LOI subtype separation, duplicate-source rejection, and unchanged
lot/subdivision mismatch protection. A real Send to Legal creates a document and
may notify Legal; do not trigger one just to check report visibility. An offline
regression is not a native compiler or live submission test.

Creator publication remains the user's step. The hosted release can be promoted
separately, but new links and the dedicated picker require these Creator
components to be published. Rollback instructions are in `change.json`.
