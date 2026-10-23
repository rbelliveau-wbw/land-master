# Settings Manager 1.6.1

Implements the approved Settings workspace and the user's October 23 cleanup.
Each menu destination has its own screen. Approval Rules, Approvers, Roles,
Test Route and Change History reuse the existing approval editor, native
transport, audited saves and recovery behavior inside Settings.

The Configuration caption/badge and Open in Creator/Refresh buttons are removed.
Specific Check Status recovery and Workflow Log's Load Runs action remain
available. Shorter help, searchable curve controls, centered SVG icons, retained
drafts and workflow filters, and the corrected legacy COO threshold label are
included. No stored values or approval business rules are migrated.

## Scope

Changed files: Settings source HTML, workspace/picker styles and scripts,
approval editor/styles, Workflow Log, widget metadata, Settings README,
focused regression fixtures and design/review documentation. Immutable release
1.6.0 retains the reviewed candidate; 1.6.1 contains the approved cleanup.
Only Settings entries change in the widget and deployment manifests.

Forms and fields: existing Settings, Construction_Curve and approval settings
contracts are preserved. No form/field changes. Functions and Custom APIs:
unchanged, including the existing environment-specific Get_User_Access_Lean
and Manage_Approval_Policies calls. No Creator deployment is required.

The isolated release starts from current main and excludes unrelated
Construction/integration edits in the shared working checkout. Development and
Production map to 1.6.1. The stable Creator widget URL is preserved.

## Verification and rollback

Local release gates passed on October 23, 2026: full `npm run validate`,
`npm run build:pages` (33 environment paths), the desktop workspace `--export`
fixture and the embedded-approval browser fixture. The exported sample works
offline. The tests also confirm removed labels/actions stay absent across all
Settings destinations. CI/Pages completion and the live read-only post-deploy
check are monitored after pushing the release commit.

Release gates: `npm run validate`, `npm run build:pages`, desktop Settings
workspace and embedded-approval browser fixtures. Check that exactly one screen
is visible, drafts and Workflow Log filters survive navigation, threshold
precision is preserved, unknown replies use read-only recovery, new-rule
progress remains modal, and removed labels/actions stay absent. The mockups use
sample data; live post-deployment inspection is read-only.

Rollback: restore the Settings environment mapping to immutable **1.5.20** and
rebuild Pages. No data repair is required. Existing Creator migration and access
gates remain authoritative.
