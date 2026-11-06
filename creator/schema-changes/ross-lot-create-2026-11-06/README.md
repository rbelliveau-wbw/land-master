# Ross Lot Creation Restriction

Ross (`ross@wbdevelopment.com`) is assigned to **Accounting - Lot Management -
Ross** in Production. His **Accounting** role is unchanged. Creator release
**9.160** was published through Stage and Production after the user explicitly
instructed the agent to promote in Creator.

The new permission set was created with Creator's native Duplicate action from
**Accounting - Lot Management**. Only Create (the UI's Access column) was
removed from `Lots`, `Mass_Create_Lots`, and `Mass_Create_Lots_Subform`. The
original profile and other users' assignments were not changed.

## Preserved Editing

Both saved profiles were reopened. All 106 module rows were compared: only the
three Create checkboxes differed. Lot Edit remains enabled on `All_Active_Lots`,
`All_Active_Lots_List_View`, and `All_Active_Lots_Spreadsheet`, with View All,
Modify All, and Export retained. The report selections were inspected individually.
Field permissions, API/security settings, and per-user `User_Access` flags were
inherited or left unchanged.

Keep **Create on `Mass_Update_Lots`** enabled: submitting that helper performs
mass edits of existing lots. Preserve its View All, Modify All, and
`All_Mass_Updates` Edit grant. `Lot_Search` Create and existing takedown rights
also remain enabled.

## Native Enforcement

The `Lots` create deny covers native single creation and SDK inserts used by
the spreadsheet importer. The mass-create workflow inserts lots directly, so
its own `Mass_Create_Lots` helper Create grant was removed as well. Its active
workflow runs on add; retaining Edit on existing helper records does not rerun
that insertion workflow.

This is a native permission change. No widget code or release, function, Custom
API, field, or widget environment mapping was changed. Existing custom import
or create controls can remain visible; native authorization rejects prohibited
inserts. A separate client-only Ross email rule was intentionally not added.

## Publication Dependencies

Creator required three components for the profile release:

- The new Ross-only profile.
- `Contract` form properties. All 79 rendered lines matched Stage exactly;
  [the captured properties](required-contract-form.ds) record that comparison.
- An empty `Construction_Review_Log` form definition referenced by the cloned
  profile. Its fields, report, workflows, and functions were not selected.

The other pending Construction review changes and profile edits were left out.
This publication does **not** establish that the Construction rejection feature
is installed in Production.

## Verification and Rollback

[permissions.json](permissions.json) records native IDs, release scope, and the
saved Production assignment. [native-profile-comparison.json](native-profile-comparison.json)
records the module comparison and inherited grants.

Verification used the native saved profiles, report Edit selections, Stage and
Production version displays, and Ross's saved user assignment. Ross was not
impersonated and no business records were created or edited for testing.
Regression scenarios for a future authenticated Ross session are: reject single
creation, duplication, mass creation, and import inserts; allow individual and
spreadsheet edits, mass updates, and his existing takedown operations.

To roll back, reassign **only Ross** to the unchanged **Accounting - Lot
Management** profile. No widget-release or business-data rollback is required.
